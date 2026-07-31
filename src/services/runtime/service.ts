import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  readCurrentColorTheme,
  readFeatureFlags,
  readRuntimeSettings,
  setOverlayEnabled,
} from '../../config/featureFlags';
import { FeatureFlags, RuntimeStatusSnapshot, ThemeRuntimeSettings } from '../../types/features';
import { showErrorMessage, showReloadPrompt } from '../../ui/notifications';
import { getOutputChannel } from '../../ui/output';
import { withProgressNotification } from '../../ui/progress';
import { readRuntimeAssets } from './assets';
import { writeValidatedFileAtomic } from './atomicFile';
import { getWorkbenchHtmlPath } from './locator';
import { buildRuntimePayload, RuntimePayload } from './payloadBuilder';
import { deriveRuntimeStatus } from './status';
import {
  clearRuntimeInstallState,
  readLastSelectedThemeLabel,
  readRuntimeInstallState,
  RuntimeInstallState,
  writeLastSelectedThemeLabel,
  writeRuntimeInstallState,
} from './state';
import { isWoodfishTheme } from './themeRegistry';
import {
  hasWoodfishPayload,
  injectWorkbenchPayload,
  removeKnownLegacyWoodfishPayloads,
  removeWorkbenchPayload,
} from './workbenchPatcher';

const PAYLOAD_SCHEMA_VERSION = 4;
const BOOTSTRAP_FILE_NAME = 'woodfish-overlay-bootstrap.js';
const BOOTSTRAP_FILE_HEADER = '/* WOODFISH_THEME_BOOTSTRAP - managed file */';

function buildBootstrapFileContent(bootstrap: string): string {
  return `${BOOTSTRAP_FILE_HEADER}\n${bootstrap}\n`;
}

function getBootstrapFilePath(workbenchPath: string): string {
  return path.join(path.dirname(workbenchPath), BOOTSTRAP_FILE_NAME);
}

function buildPayloadDocument(payload: RuntimePayload, payloadHash: string): string {
  const parts = [
    `<style data-woodfish-theme="runtime" data-woodfish-hash="${payloadHash}">`,
    payload.css,
    '</style>',
  ];
  if (payload.bootstrap.length > 0) {
    parts.push(
      `<script defer src="./${BOOTSTRAP_FILE_NAME}?v=${payloadHash}" data-woodfish-theme="bootstrap" data-woodfish-schema="${PAYLOAD_SCHEMA_VERSION}"></script>`
    );
  }
  return parts.join('\n');
}

function hashPayload(payload: RuntimePayload): string {
  return crypto
    .createHash('sha256')
    .update(`schema:${PAYLOAD_SCHEMA_VERSION}\0${payload.css}\0${payload.bootstrap}`)
    .digest('hex');
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

function shouldInstallRuntime(settings: ThemeRuntimeSettings): boolean {
  return (
    settings.overlay.enabled &&
    (settings.syntaxGradient.enabled || settings.glow.enabled || settings.cursor.enabled)
  );
}

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
    const settings = readRuntimeSettings();
    return deriveRuntimeStatus({
      activeTheme: readCurrentColorTheme(),
      hasPayload: currentHtml ? hasWoodfishPayload(currentHtml) : false,
      features,
      overlayEnabled: settings.overlay.enabled,
    });
  }

  public async initializeOnStartup(): Promise<void> {
    const currentHtml = this.readWorkbenchHtml();
    const settings = readRuntimeSettings();

    if (!shouldInstallRuntime(settings)) {
      const workbenchPath = getWorkbenchHtmlPath();
      if (
        currentHtml &&
        (hasWoodfishPayload(currentHtml) ||
          (workbenchPath ? this.hasManagedBootstrapFile(workbenchPath) : false))
      ) {
        await this.removePayload({ showPrompt: false });
      }
      return;
    }

    if (!this.hasExpectedPayload(currentHtml)) {
      await this.syncWithCurrentSettings({ showPrompt: true });
    }
  }

  public async enableTheme(): Promise<void> {
    await withProgressNotification('正在启用 Woodfish 通用叠层...', async () => {
      await setOverlayEnabled(true);
      await this.syncWithCurrentSettings({ showPrompt: true });
    });
  }

  public async disableTheme(): Promise<void> {
    await withProgressNotification('正在关闭 Woodfish 通用叠层...', async () => {
      await setOverlayEnabled(false);
      await this.removePayload({ showPrompt: true });
    });
  }

  public async repairWorkbench(): Promise<void> {
    await withProgressNotification('正在修复 Woodfish workbench 注入...', async () => {
      await this.syncWithCurrentSettings({ showPrompt: true, restoreBackup: true });
    });
  }

  public async completeUninstall(): Promise<void> {
    await withProgressNotification('正在彻底移除 Woodfish 通用叠层...', async () => {
      await setOverlayEnabled(false);
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
      const settings = readRuntimeSettings();
      if (!shouldInstallRuntime(settings)) {
        const currentHtml = this.readWorkbenchHtml();
        if (currentHtml && hasWoodfishPayload(currentHtml)) {
          await this.removePayload({ ...options, showPrompt: false });
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

  private hasExpectedPayload(currentHtml: string | null = this.readWorkbenchHtml()): boolean {
    if (!currentHtml || !hasWoodfishPayload(currentHtml)) {
      return false;
    }

    const workbenchPath = getWorkbenchHtmlPath();
    if (!workbenchPath) {
      return false;
    }

    const activeTheme = readCurrentColorTheme();
    const settings = readRuntimeSettings();
    if (!shouldInstallRuntime(settings)) {
      return false;
    }
    const payload = buildRuntimePayload(settings, readRuntimeAssets(this.context, activeTheme));
    const payloadHash = hashPayload(payload);
    return (
      currentHtml.includes(buildPayloadDocument(payload, payloadHash)) &&
      this.hasExpectedBootstrapFile(workbenchPath, payload.bootstrap)
    );
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
    const assets = readRuntimeAssets(this.context, activeTheme);
    const settings = readRuntimeSettings();
    if (!shouldInstallRuntime(settings)) {
      await this.removePayload(options);
      return;
    }
    const payload = buildRuntimePayload(settings, assets);
    const payloadHash = hashPayload(payload);
    const payloadDocument = buildPayloadDocument(payload, payloadHash);
    let bootstrapChanged = false;
    if (payload.bootstrap.length > 0) {
      bootstrapChanged = this.writeBootstrapFile(workbenchPath, payload.bootstrap);
    }
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
    const nextHtml = injectWorkbenchPayload(baselineHtml, payloadDocument);
    const changed = nextHtml !== currentHtml;
    const backupHash = hashDocument(backup.html);

    if (changed) {
      writeValidatedFileAtomic(
        workbenchPath,
        nextHtml,
        (content) =>
          isValidWorkbenchDocument(content) &&
          hasWoodfishPayload(content) &&
          content.includes(payloadDocument)
      );
      getOutputChannel().appendLine(`Applied integrated runtime to ${workbenchPath}`);
    }
    if (payload.bootstrap.length === 0) {
      bootstrapChanged = this.removeBootstrapFile(workbenchPath) || bootstrapChanged;
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
      bootstrapPath: payload.bootstrap.length > 0 ? getBootstrapFilePath(workbenchPath) : undefined,
      bootstrapHash:
        payload.bootstrap.length > 0
          ? hashDocument(buildBootstrapFileContent(payload.bootstrap))
          : undefined,
      vscodeVersion: vscode.version,
      legacyPayloads: undefined,
    });

    if ((changed || bootstrapChanged) && options.showPrompt !== false) {
      await showReloadPrompt('Woodfish 通用叠层已更新，请重新加载 VS Code。');
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
    const htmlChanged = nextHtml !== currentHtml;

    if (htmlChanged) {
      writeValidatedFileAtomic(workbenchPath, nextHtml, isValidWorkbenchDocument);
      getOutputChannel().appendLine(`Removed integrated runtime from ${workbenchPath}`);
    }
    const bootstrapChanged = this.removeBootstrapFile(workbenchPath);
    if (!htmlChanged && !bootstrapChanged) {
      return;
    }

    await writeRuntimeInstallState(this.context, {
      ...state,
      payloadHash: undefined,
      bootstrapPath: undefined,
      bootstrapHash: undefined,
    });

    if (options.showPrompt !== false) {
      await showReloadPrompt('Woodfish 通用叠层已移除，请重新加载 VS Code。');
    }
  }

  private cleanWoodfishPayloads(html: string): string {
    return removeKnownLegacyWoodfishPayloads(removeWorkbenchPayload(html)).html;
  }

  private hasExpectedBootstrapFile(workbenchPath: string, bootstrap: string): boolean {
    const bootstrapPath = getBootstrapFilePath(workbenchPath);
    if (!fs.existsSync(bootstrapPath)) {
      return bootstrap.length === 0;
    }

    const current = fs.readFileSync(bootstrapPath, 'utf-8');
    if (bootstrap.length === 0) {
      return !this.hasManagedBootstrapFile(workbenchPath, current);
    }

    return current === buildBootstrapFileContent(bootstrap);
  }

  private hasManagedBootstrapFile(workbenchPath: string, content?: string): boolean {
    const bootstrapPath = getBootstrapFilePath(workbenchPath);
    if (!fs.existsSync(bootstrapPath)) {
      return false;
    }

    const current = content ?? fs.readFileSync(bootstrapPath, 'utf-8');
    return current.startsWith(BOOTSTRAP_FILE_HEADER);
  }

  private writeBootstrapFile(workbenchPath: string, bootstrap: string): boolean {
    const bootstrapPath = getBootstrapFilePath(workbenchPath);
    const nextContent = buildBootstrapFileContent(bootstrap);

    if (fs.existsSync(bootstrapPath)) {
      const current = fs.readFileSync(bootstrapPath, 'utf-8');
      if (current === nextContent) {
        return false;
      }
      if (!current.startsWith(BOOTSTRAP_FILE_HEADER)) {
        throw new Error(`Woodfish refused to replace an unmanaged file: ${bootstrapPath}`);
      }
    }

    writeValidatedFileAtomic(
      bootstrapPath,
      nextContent,
      (content) => content === nextContent && content.startsWith(BOOTSTRAP_FILE_HEADER)
    );
    getOutputChannel().appendLine(`Applied overlay bootstrap to ${bootstrapPath}`);
    return true;
  }

  private removeBootstrapFile(workbenchPath: string): boolean {
    const bootstrapPath = getBootstrapFilePath(workbenchPath);
    if (!this.hasManagedBootstrapFile(workbenchPath)) {
      return false;
    }

    fs.unlinkSync(bootstrapPath);
    getOutputChannel().appendLine(`Removed overlay bootstrap from ${bootstrapPath}`);
    return true;
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
