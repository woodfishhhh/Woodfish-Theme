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
import { showErrorMessage, showReloadPrompt, showRestartPrompt } from '../../ui/notifications';
import { getOutputChannel } from '../../ui/output';
import { hostName } from '../../ui/hostApp';
import { withProgressNotification } from '../../ui/progress';
import { readRuntimeAssets } from './assets';
import { writeValidatedFileAtomic } from './atomicFile';
import { syncWorkbenchChecksum } from './checksums';
import {
  BACKUP_SUFFIX,
  BOOTSTRAP_FILE_HEADER,
  BOOTSTRAP_FILE_NAME,
  cleanInstallation,
  getBootstrapFilePath,
  isValidWorkbenchDocument,
  stripWoodfishPayloads,
} from './cleanup';
import { describeWriteFailure } from './errors';
import { isNativeWindowActive } from './glass';
import { recordInstallation } from './installManifest';
import { locateWorkbench, WorkbenchLocation } from './locator';
import {
  installNativeWindow,
  isNativeWindowComplete,
  isNativeWindowInstalled,
  uninstallNativeWindow,
} from './nativeWindow';
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
import { hasWoodfishPayload, injectWorkbenchPayload } from './workbenchPatcher';

const PAYLOAD_SCHEMA_VERSION = 5;

function buildBootstrapFileContent(bootstrap: string): string {
  return `${BOOTSTRAP_FILE_HEADER}\n${bootstrap}\n`;
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

function resolveBackupPath(workbenchPath: string, state: RuntimeInstallState): string {
  const defaultBackupPath = `${workbenchPath}${BACKUP_SUFFIX}`;
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

type ChangeSummary = {
  workbench: boolean;
  restart: boolean;
};

export function shouldInstallRuntime(settings: ThemeRuntimeSettings): boolean {
  return (
    settings.overlay.enabled &&
    (settings.syntaxGradient.enabled ||
      settings.glow.enabled ||
      settings.cursor.enabled ||
      settings.glass.enabled)
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
  /** Serializes every operation that writes into the VS Code installation. */
  private fileLock: Promise<void> = Promise.resolve();
  private runningTasks = 0;
  private waitingTasks = 0;
  /** Set once this process rewrote `product.json`; VS Code only re-reads it on a full restart. */
  private checksumUpdated = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Runs `task` immediately when nothing else is touching the installation,
   * otherwise after every earlier task. Starting synchronously when idle keeps
   * the existing sync-coalescing semantics unchanged.
   */
  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const start = (): Promise<T> => {
      this.runningTasks += 1;
      return task().finally(() => {
        this.runningTasks -= 1;
      });
    };

    let run: Promise<T>;
    if (this.runningTasks === 0 && this.waitingTasks === 0) {
      run = start();
    } else {
      this.waitingTasks += 1;
      run = this.fileLock.then(() => {
        this.waitingTasks -= 1;
        return start();
      });
    }
    this.fileLock = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

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

  public getLocation(): WorkbenchLocation | null {
    return locateWorkbench(vscode.env?.appRoot);
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
    const location = this.getLocation();
    const currentHtml = this.readWorkbenchHtml(location);
    const settings = readRuntimeSettings();

    if (!shouldInstallRuntime(settings)) {
      const hasLeftovers =
        (currentHtml !== null && hasWoodfishPayload(currentHtml)) ||
        (location !== null && this.hasManagedBootstrapFile(location.workbenchPath)) ||
        (location !== null && isNativeWindowInstalled(location.appRoot));
      if (hasLeftovers) {
        await this.exclusive(() => this.removePayload({ showPrompt: false }));
      }
      return;
    }

    if (!this.hasExpectedPayload(currentHtml, location, settings)) {
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
      await this.exclusive(() => this.removePayload({ showPrompt: true }));
    });
  }

  public async repairWorkbench(): Promise<void> {
    await withProgressNotification('正在修复 Woodfish workbench 注入...', async () => {
      await this.syncWithCurrentSettings({ showPrompt: true, restoreBackup: true });
    });
  }

  public async completeUninstall(): Promise<void> {
    let nativeRemoved = false;
    await withProgressNotification('正在彻底移除 Woodfish 通用叠层...', async () => {
      await setOverlayEnabled(false);
      await this.exclusive(async () => {
        await this.removePayload({ showPrompt: false, restoreBackup: true });
        const location = this.getLocation();
        if (location) {
          const report = cleanInstallation(location.appRoot);
          nativeRemoved = report.nativeWindowRemoved;
          for (const error of report.errors) {
            getOutputChannel().appendLine(`Cleanup warning: ${error}`);
          }
        }
        await clearRuntimeInstallState(this.context);
      });
    });
    if (nativeRemoved) {
      await showRestartPrompt(
        `Woodfish 已彻底清理，系统级窗口材质需要完全退出 ${hostName()} 后生效。`
      );
      return;
    }
    await showReloadPrompt(`Woodfish 运行时注入已清理，请重新加载 ${hostName()}。`, {
      checksumUpdated: this.checksumUpdated,
    });
  }

  public syncWithCurrentSettings(options: SyncOptions = {}): Promise<void> {
    this.queuedSyncOptions = mergeSyncOptions(this.queuedSyncOptions, options);
    if (!this.activeSync) {
      this.activeSync = this.exclusive(() => this.drainSyncQueue()).finally(() => {
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
        await this.removePayload({ ...options, showPrompt: false });
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

  private buildPayload(settings: ThemeRuntimeSettings): RuntimePayload {
    return buildRuntimePayload(settings, readRuntimeAssets(this.context, readCurrentColorTheme()));
  }

  private hasExpectedPayload(
    currentHtml: string | null,
    location: WorkbenchLocation | null,
    settings: ThemeRuntimeSettings
  ): boolean {
    if (!currentHtml || !location || !hasWoodfishPayload(currentHtml)) {
      return false;
    }

    const nativeWanted = isNativeWindowActive(settings.glass);
    const nativeOnDisk = nativeWanted
      ? isNativeWindowComplete(location.appRoot)
      : isNativeWindowInstalled(location.appRoot);
    if (nativeWanted !== nativeOnDisk) {
      return false;
    }

    const payload = this.buildPayload(settings);
    const payloadHash = hashPayload(payload);
    return (
      currentHtml.includes(buildPayloadDocument(payload, payloadHash)) &&
      this.hasExpectedBootstrapFile(location.workbenchPath, payload.bootstrap)
    );
  }

  private readWorkbenchHtml(
    location: WorkbenchLocation | null = this.getLocation()
  ): string | null {
    if (!location || !fs.existsSync(location.workbenchPath)) {
      return null;
    }

    return fs.readFileSync(location.workbenchPath, 'utf-8');
  }

  private wrapWriteFailure(error: unknown, targetPath: string): Error {
    const message = describeWriteFailure(error, {
      platform: process.platform,
      targetPath,
      appName: vscode.env?.appName,
    });
    return new Error(message);
  }

  private syncChecksum(location: WorkbenchLocation, settings: ThemeRuntimeSettings): void {
    if (!settings.runtime.fixChecksums) {
      return;
    }
    try {
      const result = syncWorkbenchChecksum(
        location.appRoot,
        location.relativePath,
        location.workbenchPath
      );
      if (result === 'updated') {
        this.checksumUpdated = true;
        getOutputChannel().appendLine('Updated product.json checksum for the patched workbench');
      }
    } catch (error) {
      // The checksum only silences VS Code's “installation appears to be corrupt”
      // notice; failing to update it must not undo a successful injection.
      const message = error instanceof Error ? error.message : String(error);
      getOutputChannel().appendLine(`Checksum sync skipped: ${message}`);
    }
  }

  private syncNativeWindow(location: WorkbenchLocation, settings: ThemeRuntimeSettings): boolean {
    const wanted = isNativeWindowActive(settings.glass);
    try {
      if (wanted) {
        const hookSource = readRuntimeAssets(
          this.context,
          readCurrentColorTheme()
        ).nativeWindowHook;
        return installNativeWindow(location.appRoot, hookSource, settings.glass.nativeWindow)
          .requiresRestart;
      }
      return uninstallNativeWindow(location.appRoot).requiresRestart;
    } catch (error) {
      throw this.wrapWriteFailure(error, path.join(location.appRoot, 'out', 'main.js'));
    }
  }

  private async applyPayload(options: SyncOptions): Promise<void> {
    const location = this.getLocation();
    if (!location || !fs.existsSync(location.workbenchPath)) {
      throw new Error(
        `未找到 ${hostName()} 的 workbench.html。请确认使用的是桌面版（网页版和 Remote 服务器端不支持注入），然后运行“修复 Woodfish 注入”。`
      );
    }

    const settings = readRuntimeSettings();
    if (!shouldInstallRuntime(settings)) {
      await this.removePayload(options);
      return;
    }

    let summary: ChangeSummary;
    try {
      summary = await this.writeWorkbenchPayload(location, settings, options);
    } catch (error) {
      throw this.wrapWriteFailure(error, location.workbenchPath);
    }
    summary.restart = this.syncNativeWindow(location, settings) || summary.restart;
    this.syncChecksum(location, settings);
    recordInstallation(this.context.extensionPath, location.appRoot);

    if (options.showPrompt === false) {
      return;
    }
    if (summary.restart) {
      await showRestartPrompt(
        `Woodfish 系统级窗口材质已更新，需要完全退出 ${hostName()} 再重新打开才会生效。`
      );
    } else if (summary.workbench) {
      await showReloadPrompt(`Woodfish 通用叠层已更新，请重新加载 ${hostName()}。`, {
        checksumUpdated: this.checksumUpdated,
      });
    }
  }

  private async writeWorkbenchPayload(
    location: WorkbenchLocation,
    settings: ThemeRuntimeSettings,
    options: SyncOptions
  ): Promise<ChangeSummary> {
    const { workbenchPath } = location;
    const currentHtml = fs.readFileSync(workbenchPath, 'utf-8');
    const payload = this.buildPayload(settings);
    const payloadHash = hashPayload(payload);
    const payloadDocument = buildPayloadDocument(payload, payloadHash);
    let bootstrapChanged = false;
    if (payload.bootstrap.length > 0) {
      bootstrapChanged = this.writeBootstrapFile(workbenchPath, payload.bootstrap);
    }
    const state = readRuntimeInstallState(this.context);
    const backupPath = resolveBackupPath(workbenchPath, state);
    const currentBaseline = stripWoodfishPayloads(currentHtml);
    let backup = this.readValidBackup(workbenchPath, state);
    if (!backup) {
      writeValidatedFileAtomic(backupPath, currentBaseline, isValidWorkbenchDocument);
      backup = {
        html: currentBaseline,
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

    return { workbench: changed || bootstrapChanged, restart: false };
  }

  private async removePayload(options: SyncOptions): Promise<void> {
    const location = this.getLocation();
    if (!location || !fs.existsSync(location.workbenchPath)) {
      return;
    }

    const { workbenchPath } = location;
    const settings = readRuntimeSettings();
    let htmlChanged = false;
    let bootstrapChanged = false;
    try {
      const currentHtml = fs.readFileSync(workbenchPath, 'utf-8');
      const state = readRuntimeInstallState(this.context);
      const backup =
        options.restoreBackup === true ? this.readValidBackup(workbenchPath, state) : null;
      const nextHtml = stripWoodfishPayloads(backup?.html ?? currentHtml);
      htmlChanged = nextHtml !== currentHtml;

      if (htmlChanged) {
        writeValidatedFileAtomic(workbenchPath, nextHtml, isValidWorkbenchDocument);
        getOutputChannel().appendLine(`Removed integrated runtime from ${workbenchPath}`);
      }
      bootstrapChanged = this.removeBootstrapFile(workbenchPath);
      if (htmlChanged || bootstrapChanged) {
        await writeRuntimeInstallState(this.context, {
          ...state,
          payloadHash: undefined,
          bootstrapPath: undefined,
          bootstrapHash: undefined,
        });
      }
    } catch (error) {
      throw this.wrapWriteFailure(error, workbenchPath);
    }

    let restart = false;
    try {
      restart = uninstallNativeWindow(location.appRoot).requiresRestart;
    } catch (error) {
      throw this.wrapWriteFailure(error, path.join(location.appRoot, 'out', 'main.js'));
    }
    if (htmlChanged || restart) {
      this.syncChecksum(location, settings);
    }

    if (options.showPrompt === false) {
      return;
    }
    if (restart) {
      await showRestartPrompt(
        `Woodfish 已移除系统级窗口材质，需要完全退出 ${hostName()} 再重新打开。`
      );
    } else if (htmlChanged || bootstrapChanged) {
      await showReloadPrompt(`Woodfish 通用叠层已移除，请重新加载 ${hostName()}。`, {
        checksumUpdated: this.checksumUpdated,
      });
    }
  }

  private hasExpectedBootstrapFile(workbenchPath: string, bootstrap: string): boolean {
    const bootstrapPath = getBootstrapFilePath(workbenchPath);
    if (!fs.existsSync(bootstrapPath)) {
      return bootstrap.length === 0;
    }

    const current = fs.readFileSync(bootstrapPath, 'utf-8');
    if (bootstrap.length === 0) {
      return !current.startsWith(BOOTSTRAP_FILE_HEADER);
    }

    return current === buildBootstrapFileContent(bootstrap);
  }

  private hasManagedBootstrapFile(workbenchPath: string): boolean {
    const bootstrapPath = getBootstrapFilePath(workbenchPath);
    if (!fs.existsSync(bootstrapPath)) {
      return false;
    }

    return fs.readFileSync(bootstrapPath, 'utf-8').startsWith(BOOTSTRAP_FILE_HEADER);
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
      showErrorMessage(`自动同步失败: ${message}`);
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
