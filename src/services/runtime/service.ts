import * as crypto from 'crypto';
import * as fs from 'fs';
import * as vscode from 'vscode';
import {
  readCurrentColorTheme,
  readRuntimeSettings,
  setColorTheme,
} from '../../config/featureFlags';
import { WOODFISH_THEME_NAME } from '../../constants/config';
import { getOutputChannel } from '../../ui/output';
import { withProgressNotification } from '../../ui/progress';
import { showInfoMessage, showReloadPrompt } from '../../ui/notifications';
import { readRuntimeAssets } from './assets';
import { getWorkbenchHtmlPath } from './locator';
import { buildRuntimeCss } from './payloadBuilder';
import {
  clearRuntimeInstallState,
  readRuntimeInstallState,
  writeRuntimeInstallState,
} from './state';
import {
  hasWoodfishPayload,
  injectWorkbenchPayload,
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

  public async initializeOnStartup(): Promise<void> {
    const settings = readRuntimeSettings();
    if (!settings.runtime.enabled) {
      await this.removePayload({ showPrompt: false });
      return;
    }

    if (!settings.runtime.reapplyOnStartup) {
      return;
    }

    await this.syncWithCurrentSettings({ showPrompt: false });
  }

  public async enableTheme(): Promise<void> {
    await withProgressNotification('正在启用 Woodfish 一体化主题...', async () => {
      const settings = readRuntimeSettings();
      if (settings.runtime.autoSwitchTheme && !this.isWoodfishThemeActive()) {
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
      const settings = readRuntimeSettings();
      if (!settings.runtime.enabled) {
        await this.removePayload(options);
        return;
      }

      if (!this.isWoodfishThemeActive()) {
        await this.removePayload({ ...options, showPrompt: false });
        showInfoMessage('当前未使用 Woodfish Dark，已暂停一体化特效注入');
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

    if (!fs.existsSync(backupPath) || options.restoreBackup) {
      fs.writeFileSync(backupPath, currentHtml, 'utf-8');
    }

    const payload = buildPayloadDocument(css, payloadHash);
    const nextHtml = injectWorkbenchPayload(currentHtml, payload);
    const changed = nextHtml !== currentHtml;

    if (changed) {
      fs.writeFileSync(workbenchPath, nextHtml, 'utf-8');
      getOutputChannel().appendLine(`Applied integrated runtime to ${workbenchPath}`);
    }

    await writeRuntimeInstallState(this.context, {
      workbenchPath,
      backupPath,
      payloadHash,
      vscodeVersion: vscode.version,
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
    if (!hasWoodfishPayload(currentHtml)) {
      return;
    }

    const state = readRuntimeInstallState(this.context);
    const shouldRestore =
      options.restoreBackup === true && state.backupPath && fs.existsSync(state.backupPath);
    const nextHtml = shouldRestore
      ? fs.readFileSync(state.backupPath!, 'utf-8')
      : removeWorkbenchPayload(currentHtml);

    if (nextHtml !== currentHtml) {
      fs.writeFileSync(workbenchPath, nextHtml, 'utf-8');
      getOutputChannel().appendLine(`Removed integrated runtime from ${workbenchPath}`);
      if (options.showPrompt !== false) {
        await showReloadPrompt('Woodfish 主题样式已移除，请重新加载 VS Code。');
      }
    }
  }
}
