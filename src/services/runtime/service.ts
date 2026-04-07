import * as crypto from 'crypto';
import * as fs from 'fs';
import * as vscode from 'vscode';
import {
  readCurrentColorTheme,
  readFeatureFlags,
  readRuntimeSettings,
  setColorTheme,
} from '../../config/featureFlags';
import { WOODFISH_THEME_NAME } from '../../constants/config';
import { FeatureFlags, RuntimeStatusSnapshot } from '../../types/features';
import { showInfoMessage, showReloadPrompt } from '../../ui/notifications';
import { getOutputChannel } from '../../ui/output';
import { withProgressNotification } from '../../ui/progress';
import { readRuntimeAssets } from './assets';
import { getWorkbenchHtmlPath } from './locator';
import { buildRuntimeCss } from './payloadBuilder';
import { deriveRuntimeStatus } from './status';
import {
  clearRuntimeInstallState,
  readRuntimeInstallState,
  writeRuntimeInstallState,
} from './state';
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

function mergeLegacyPayloads(
  current: string[] | undefined,
  incoming: string[]
): string[] | undefined {
  if (incoming.length === 0 && (!current || current.length === 0)) {
    return undefined;
  }

  const merged = new Set<string>(current ?? []);
  for (const fragment of incoming) {
    merged.add(fragment);
  }

  return [...merged];
}

function restoreLegacyPayloads(html: string, legacyPayloads: string[]): string {
  if (legacyPayloads.length === 0) {
    return html;
  }

  const block = legacyPayloads.join('\n');
  if (html.includes('</head>')) {
    return html.replace('</head>', `${block}\n</head>`);
  }

  if (html.includes('</html>')) {
    return html.replace('</html>', `${block}\n</html>`);
  }

  return `${html}\n${block}`;
}

type SyncOptions = {
  showPrompt?: boolean;
  restoreBackup?: boolean;
};

export class IntegratedThemeService {
  private syncInFlight = false;
  private queuedSync = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public registerLifecycle(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration('woodfishTheme') ||
          event.affectsConfiguration('workbench.colorTheme')
        ) {
          void this.syncWithCurrentSettings({ showPrompt: true });
        }
      })
    );
  }

  public getRuntimeStatus(features: FeatureFlags = readFeatureFlags()): RuntimeStatusSnapshot {
    return deriveRuntimeStatus({
      activeTheme: readCurrentColorTheme(),
      hasPayload: this.hasCurrentPayload(),
      features,
    });
  }

  public async initializeOnStartup(): Promise<void> {
    const status = this.getRuntimeStatus();

    if (status.isWoodfishTheme) {
      if (!this.hasExpectedPayload()) {
        await this.syncWithCurrentSettings({ showPrompt: false });
      }
      return;
    }

    if (status.hasPayload) {
      await this.removePayload({ showPrompt: false });
    }
  }

  public async enableTheme(): Promise<void> {
    await withProgressNotification('正在启用 Woodfish 一体化主题...', async () => {
      if (!this.isWoodfishThemeActive()) {
        await setColorTheme(WOODFISH_THEME_NAME);
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

  public async syncWithCurrentSettings(options: SyncOptions = {}): Promise<void> {
    if (this.syncInFlight) {
      this.queuedSync = true;
      return;
    }

    this.syncInFlight = true;
    try {
      if (!this.isWoodfishThemeActive()) {
        const runtimeStatus = this.getRuntimeStatus();
        if (runtimeStatus.hasPayload) {
          await this.removePayload({ ...options, showPrompt: false });
        }

        if (runtimeStatus.state === 'paused') {
          showInfoMessage('当前未使用 Woodfish Dark，已暂停一体化特效注入');
        }
        return;
      }

      await this.applyPayload(options);
    } finally {
      this.syncInFlight = false;
      if (this.queuedSync) {
        this.queuedSync = false;
        void this.syncWithCurrentSettings({ showPrompt: false });
      }
    }
  }

  private isWoodfishThemeActive(): boolean {
    return readCurrentColorTheme() === WOODFISH_THEME_NAME;
  }

  private hasCurrentPayload(): boolean {
    const currentHtml = this.readWorkbenchHtml();
    return currentHtml ? hasWoodfishPayload(currentHtml) : false;
  }

  private hasExpectedPayload(): boolean {
    const currentHtml = this.readWorkbenchHtml();
    if (!currentHtml || !hasWoodfishPayload(currentHtml)) {
      return false;
    }

    const settings = readRuntimeSettings();
    const css = buildRuntimeCss(settings, readRuntimeAssets(this.context));
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
    const assets = readRuntimeAssets(this.context);
    const settings = readRuntimeSettings();
    const css = buildRuntimeCss(settings, assets);
    const payloadHash = hashPayload(css);
    const state = readRuntimeInstallState(this.context);
    const backupPath = state.backupPath ?? `${workbenchPath}.woodfish-backup`;
    const withoutCurrentPayload = removeWorkbenchPayload(currentHtml);
    const legacyCleanup = removeKnownLegacyWoodfishPayloads(withoutCurrentPayload);
    const nextHtml = injectWorkbenchPayload(
      legacyCleanup.html,
      buildPayloadDocument(css, payloadHash)
    );
    const changed = nextHtml !== currentHtml;

    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, currentHtml, 'utf-8');
    }

    if (changed) {
      fs.writeFileSync(workbenchPath, nextHtml, 'utf-8');
      getOutputChannel().appendLine(`Applied integrated runtime to ${workbenchPath}`);
    }

    await writeRuntimeInstallState(this.context, {
      workbenchPath,
      backupPath,
      payloadHash,
      vscodeVersion: vscode.version,
      legacyPayloads: mergeLegacyPayloads(
        state.legacyPayloads,
        legacyCleanup.removed.map((match) => match.fragment)
      ),
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
    const cleanedHtml = removeWorkbenchPayload(currentHtml);
    const nextHtml =
      options.restoreBackup === true && state.legacyPayloads && state.legacyPayloads.length > 0
        ? restoreLegacyPayloads(cleanedHtml, state.legacyPayloads)
        : cleanedHtml;

    if (nextHtml === currentHtml) {
      return;
    }

    fs.writeFileSync(workbenchPath, nextHtml, 'utf-8');
    getOutputChannel().appendLine(`Removed integrated runtime from ${workbenchPath}`);

    await writeRuntimeInstallState(this.context, {
      ...state,
      payloadHash: undefined,
    });

    if (options.showPrompt !== false) {
      await showReloadPrompt('Woodfish 主题样式已移除，请重新加载 VS Code。');
    }
  }
}
