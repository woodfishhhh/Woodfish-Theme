import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  readCurrentColorTheme,
  readFeatureFlags,
  readRuntimeSettings,
  setColorTheme,
} from '../../config/featureFlags';
import { FeatureFlags, RuntimeStatusSnapshot } from '../../types/features';
import { showErrorMessage, showInfoMessage, showReloadPrompt } from '../../ui/notifications';
import { getOutputChannel } from '../../ui/output';
import { withProgressNotification } from '../../ui/progress';
import { readRuntimeAssets } from './assets';
import { writeValidatedFileAtomic } from './atomicFile';
import { getWorkbenchHtmlPath } from './locator';
import { buildRuntimeCss } from './payloadBuilder';
import { deriveRuntimeStatus } from './status';
import {
  clearRuntimeInstallState,
  readLastSelectedThemeLabel,
  readRuntimeInstallState,
  RuntimeInstallState,
  writeLastSelectedThemeLabel,
  writeRuntimeInstallState,
} from './state';
import {
  DEFAULT_WOODFISH_THEME_LABEL,
  isWoodfishTheme,
  resolveWoodfishTheme,
} from './themeRegistry';
import {
  hasWoodfishPayload,
  injectWorkbenchPayload,
  removeKnownLegacyWoodfishPayloads,
  removeWorkbenchPayload,
} from './workbenchPatcher';

function buildPayloadDocument(css: string, payloadHash: string): string {
  return [
    `<style data-woodfish-theme="runtime" data-woodfish-hash="${payloadHash}">`,
    css,
    '</style>',
    '<script data-woodfish-theme="bootstrap">',
    "(() => { document.documentElement.dataset.woodfishRuntime = 'active'; })();",
    '</script>',
  ].join('\n');
}

function hashPayload(css: string): string {
  return crypto.createHash('sha256').update(css).digest('hex');
}

function hashDocument(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function isValidWorkbenchDocument(content: string): boolean {
  const normalized = content.toLowerCase();
  return normalized.includes('<html') && normalized.includes('</html>');
}

function resolveBackupPath(workbenchPath: string, state: RuntimeInstallState): string {
  const defaultBackupPath = `${workbenchPath}.woodfish-backup`;
  const storedBackupPath = state.backupPath;

  if (!storedBackupPath) {
    return defaultBackupPath;
  }

  if (state.workbenchPath && state.workbenchPath !== workbenchPath) {
    return defaultBackupPath;
  }

  if (
    path.dirname(path.normalize(storedBackupPath)) !==
    path.dirname(path.normalize(defaultBackupPath))
  ) {
    return defaultBackupPath;
  }

  return storedBackupPath;
}

type SyncOptions = {
  showPrompt?: boolean;
  restoreBackup?: boolean;
};

type ValidBackup = {
  html: string;
  path: string;
};

function mergeSyncOptions(current: SyncOptions | null, incoming: SyncOptions): SyncOptions {
  if (!current) {
    return { ...incoming };
  }

  return {
    showPrompt: current.showPrompt !== false || incoming.showPrompt !== false,
    restoreBackup: current.restoreBackup === true || incoming.restoreBackup === true,
  };
}

export class IntegratedThemeService {
  private activeSync: Promise<void> | null = null;
  private queuedSyncOptions: SyncOptions | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public registerLifecycle(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration('woodfishTheme') ||
          event.affectsConfiguration('workbench.colorTheme') ||
          event.affectsConfiguration('workbench.colorCustomizations')
        ) {
          this.runBackgroundSync({ showPrompt: true });
        }
      })
    );
  }

  public getRuntimeStatus(
    features: FeatureFlags = readFeatureFlags(),
    currentHtml: string | null = this.readWorkbenchHtml()
  ): RuntimeStatusSnapshot {
    return deriveRuntimeStatus({
      activeTheme: readCurrentColorTheme(),
      hasPayload: currentHtml ? hasWoodfishPayload(currentHtml) : false,
      features,
    });
  }

  public async initializeOnStartup(): Promise<void> {
    const currentHtml = this.readWorkbenchHtml();
    const status = this.getRuntimeStatus(readFeatureFlags(), currentHtml);

    if (status.isWoodfishTheme) {
      if (!this.hasExpectedPayload(currentHtml)) {
        await this.syncWithCurrentSettings({ showPrompt: false });
      }
      return;
    }

    if (status.hasPayload) {
      await this.removePayload({ showPrompt: false });
    }
  }

  public getThemeLabelForEnable(): string {
    const activeTheme = readCurrentColorTheme();
    if (isWoodfishTheme(activeTheme)) {
      return activeTheme;
    }

    const rememberedTheme = readLastSelectedThemeLabel(this.context);
    if (rememberedTheme && isWoodfishTheme(rememberedTheme)) {
      return rememberedTheme;
    }

    return DEFAULT_WOODFISH_THEME_LABEL;
  }

  public async enableTheme(): Promise<void> {
    await withProgressNotification('正在启用 Woodfish 一体化主题...', async () => {
      const nextTheme = this.getThemeLabelForEnable();
      if (readCurrentColorTheme() !== nextTheme) {
        await setColorTheme(nextTheme);
      }

      if (readLastSelectedThemeLabel(this.context) !== nextTheme) {
        await writeLastSelectedThemeLabel(this.context, nextTheme);
      }

      await this.syncWithCurrentSettings({ showPrompt: true });
    });
  }

  public async disableTheme(): Promise<void> {
    await withProgressNotification('正在关闭 Woodfish 一体化主题...', async () => {
      await this.removePayload({ showPrompt: true });
    });
  }

  public async repairWorkbench(): Promise<void> {
    await withProgressNotification('正在修复 Woodfish workbench 注入...', async () => {
      await this.syncWithCurrentSettings({ showPrompt: true, restoreBackup: true });
    });
  }

  public async completeUninstall(): Promise<void> {
    await withProgressNotification('正在彻底移除 Woodfish 一体化主题...', async () => {
      await this.removePayload({ showPrompt: false, restoreBackup: true });
      await clearRuntimeInstallState(this.context);
    });
    await showReloadPrompt('Woodfish 运行时注入已清理，请重新加载 VS Code。');
  }

  public syncWithCurrentSettings(options: SyncOptions = {}): Promise<void> {
    this.queuedSyncOptions = mergeSyncOptions(this.queuedSyncOptions, options);
    if (!this.activeSync) {
      this.activeSync = this.drainSyncQueue().finally(() => {
        this.activeSync = null;
        this.queuedSyncOptions = null;
      });
    }

    return this.activeSync;
  }

  private async drainSyncQueue(): Promise<void> {
    while (this.queuedSyncOptions) {
      const options = this.queuedSyncOptions;
      this.queuedSyncOptions = null;
      await this.performSync(options);
    }
  }

  private async performSync(options: SyncOptions): Promise<void> {
    try {
      if (!this.isWoodfishThemeActive()) {
        const runtimeStatus = this.getRuntimeStatus();
        if (runtimeStatus.hasPayload) {
          await this.removePayload({ ...options, showPrompt: false });
        }

        if (runtimeStatus.state === 'paused') {
          showInfoMessage('当前未使用 Woodfish 主题，已暂停一体化特效注入');
        }
        return;
      }

      const activeTheme = readCurrentColorTheme();
      if (
        isWoodfishTheme(activeTheme) &&
        readLastSelectedThemeLabel(this.context) !== activeTheme
      ) {
        await writeLastSelectedThemeLabel(this.context, activeTheme);
      }

      await this.applyPayload(options);
    } catch (error) {
      this.queuedSyncOptions = null;
      throw error;
    }
  }

  private isWoodfishThemeActive(): boolean {
    return resolveWoodfishTheme(readCurrentColorTheme()) !== undefined;
  }

  private hasExpectedPayload(currentHtml: string | null = this.readWorkbenchHtml()): boolean {
    if (!currentHtml || !hasWoodfishPayload(currentHtml)) {
      return false;
    }

    const activeTheme = readCurrentColorTheme();
    if (!isWoodfishTheme(activeTheme)) {
      return false;
    }

    const settings = readRuntimeSettings();
    const css = buildRuntimeCss(settings, readRuntimeAssets(this.context, activeTheme));
    const payloadHash = hashPayload(css);
    return currentHtml.includes(`data-woodfish-hash="${payloadHash}"`);
  }

  private readWorkbenchHtml(): string | null {
    const workbenchPath = getWorkbenchHtmlPath();
    if (!workbenchPath || !fs.existsSync(workbenchPath)) {
      return null;
    }

    return fs.readFileSync(workbenchPath, 'utf-8');
  }

  private async applyPayload(options: SyncOptions): Promise<void> {
    const workbenchPath = getWorkbenchHtmlPath();
    if (!workbenchPath || !fs.existsSync(workbenchPath)) {
      throw new Error('未找到 VS Code workbench.html，当前版本暂不支持自动注入。');
    }

    const currentHtml = fs.readFileSync(workbenchPath, 'utf-8');
    const activeTheme = readCurrentColorTheme();
    const resolvedTheme = resolveWoodfishTheme(activeTheme);
    if (!resolvedTheme) {
      throw new Error('当前未选择内置 Woodfish 主题，无法写入运行时注入。');
    }

    const assets = readRuntimeAssets(this.context, resolvedTheme.label);
    const settings = readRuntimeSettings();
    const css = buildRuntimeCss(settings, assets);
    const payloadHash = hashPayload(css);
    const state = readRuntimeInstallState(this.context);
    const backupPath = resolveBackupPath(workbenchPath, state);
    const currentBaseline = this.cleanWoodfishPayloads(currentHtml);
    let backup = this.readValidBackup(workbenchPath, state);
    if (!backup) {
      const backupHtml = currentBaseline;
      writeValidatedFileAtomic(backupPath, backupHtml, isValidWorkbenchDocument);
      backup = {
        html: backupHtml,
        path: backupPath,
      };
    }

    const baselineHtml = options.restoreBackup === true ? backup.html : currentBaseline;
    const nextHtml = injectWorkbenchPayload(baselineHtml, buildPayloadDocument(css, payloadHash));
    const changed = nextHtml !== currentHtml;
    const backupHash = hashDocument(backup.html);

    if (changed) {
      writeValidatedFileAtomic(
        workbenchPath,
        nextHtml,
        (content) => isValidWorkbenchDocument(content) && hasWoodfishPayload(content)
      );
      getOutputChannel().appendLine(`Applied integrated runtime to ${workbenchPath}`);
    }

    await writeRuntimeInstallState(this.context, {
      ...state,
      stateVersion: 2,
      workbenchPath,
      backupPath: backup.path,
      backupHash,
      backupWorkbenchPath: workbenchPath,
      backupVscodeVersion: vscode.version,
      backupCreatedAt:
        state.backupHash === backupHash && state.backupCreatedAt
          ? state.backupCreatedAt
          : new Date().toISOString(),
      payloadHash,
      vscodeVersion: vscode.version,
      legacyPayloads: undefined,
    });

    if (changed && options.showPrompt !== false) {
      await showReloadPrompt('Woodfish 主题样式已更新，请重新加载 VS Code。');
    }
  }

  private async removePayload(options: SyncOptions): Promise<void> {
    const workbenchPath = getWorkbenchHtmlPath();
    if (!workbenchPath || !fs.existsSync(workbenchPath)) {
      return;
    }

    const currentHtml = fs.readFileSync(workbenchPath, 'utf-8');
    const state = readRuntimeInstallState(this.context);
    const backup =
      options.restoreBackup === true ? this.readValidBackup(workbenchPath, state) : null;
    const nextHtml = this.cleanWoodfishPayloads(backup?.html ?? currentHtml);

    if (nextHtml === currentHtml) {
      return;
    }

    writeValidatedFileAtomic(workbenchPath, nextHtml, isValidWorkbenchDocument);
    getOutputChannel().appendLine(`Removed integrated runtime from ${workbenchPath}`);

    await writeRuntimeInstallState(this.context, {
      ...state,
      payloadHash: undefined,
    });

    if (options.showPrompt !== false) {
      await showReloadPrompt('Woodfish 主题样式已移除，请重新加载 VS Code。');
    }
  }

  private cleanWoodfishPayloads(html: string): string {
    return removeKnownLegacyWoodfishPayloads(removeWorkbenchPayload(html)).html;
  }

  private runBackgroundSync(options: SyncOptions): void {
    void this.syncWithCurrentSettings(options).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      getOutputChannel().appendLine(`Background runtime sync failed: ${message}`);
      showErrorMessage(`自动同步失败: ${message}。可运行“修复 Woodfish 注入”重试。`);
    });
  }

  private readValidBackup(workbenchPath: string, state: RuntimeInstallState): ValidBackup | null {
    const backupPath = resolveBackupPath(workbenchPath, state);
    if (
      state.stateVersion !== 2 ||
      state.backupPath !== backupPath ||
      state.backupWorkbenchPath !== workbenchPath ||
      state.backupVscodeVersion !== vscode.version ||
      !state.backupHash ||
      !fs.existsSync(backupPath)
    ) {
      return null;
    }

    try {
      const html = fs.readFileSync(backupPath, 'utf-8');
      if (!isValidWorkbenchDocument(html) || hashDocument(html) !== state.backupHash) {
        return null;
      }

      return {
        html,
        path: backupPath,
      };
    } catch {
      return null;
    }
  }
}
