import { spawn } from 'child_process';
import * as fs from 'fs';
import { applyCodexSettingsPatch } from '@woodfish/adapter-codex';
import { RISK_TEXT, RISK_TEXT_SHA256 } from '../cli/consent';
import { confirm } from '../cli/io';
import { fetchTargets, isDebugPortAlive } from '../cdp/http';
import { isMainWindowTarget, looksLikeCodexTargets } from '../cdp/targets';
import { evaluateInMainWindows } from '../inject/pages';
import { DISPOSE_EXPRESSION, OVERLAY_STATE_EXPRESSION, loadOverlayBundle } from '../inject/payload';
import { startWatcher, watchFile } from '../inject/watcher';
import { CodexInstallation, CodexPlatform, CodexRuntimeState } from '../platform';
import { loadSettings, loadWatcherState, saveSettings, saveWatcherState, sha256 } from '../store';
import {
  CommandContext,
  CommandError,
  EXIT,
  isProcessAlive,
  pickFreePort,
  waitFor,
} from './context';

const CODEX_PLUS_DEFAULT_PORT = 9229;

export interface OverlayState {
  url: string;
  controller: { version: string; build: string; source: string } | null;
  active: string | null;
  degraded: string[];
  probe: Record<string, number> | null;
  theme: string | null;
  accent: string;
  surface: string;
  styles: number;
  painted: number;
}

async function ensureConsent(context: CommandContext, acceptRisk: boolean): Promise<void> {
  const settings = loadSettings(context.paths);
  if (settings.consent?.riskTextSha256 === RISK_TEXT_SHA256) {
    return;
  }
  context.io.out(RISK_TEXT);
  context.io.out('');
  let accepted = acceptRisk;
  if (!accepted) {
    if (!context.io.interactive) {
      throw new CommandError(
        '需要先同意上面的风险说明：请在终端中交互运行，或加上 --accept-risk',
        EXIT.consentRequired
      );
    }
    accepted = (await context.io.ask('输入 yes 表示同意并继续：')).toLowerCase() === 'yes';
  }
  if (!accepted) {
    throw new CommandError('未同意风险说明，已取消', EXIT.consentRequired);
  }
  saveSettings(context.paths, {
    ...settings,
    consent: { riskTextSha256: RISK_TEXT_SHA256, acceptedAt: new Date().toISOString() },
  });
}

function requireInstallation(platform: CodexPlatform): CodexInstallation {
  const installation = platform.discover();
  if (!installation) {
    throw new CommandError('没有找到 Codex 桌面端，请先从 Microsoft Store 安装');
  }
  return installation;
}

async function waitForExit(
  platform: CodexPlatform,
  installation: CodexInstallation
): Promise<void> {
  const exited = await waitFor(() => platform.inspect(installation).main === null, 15000);
  if (!exited) {
    throw new CommandError('Codex 没有在 15 秒内退出，请手动从托盘退出后重试');
  }
}

/** Ends running Codex after confirmation. Returns false if the user declined. */
async function stopCodex(
  context: CommandContext,
  platform: CodexPlatform,
  installation: CodexInstallation,
  state: CodexRuntimeState,
  assumeYes: boolean,
  reason: string
): Promise<boolean> {
  if (!state.main) {
    return true;
  }
  const ok = await confirm(
    context.io,
    `${reason}需要重启 Codex。关闭窗口只会缩到托盘，所以会结束 Codex 的全部进程，正在运行的任务可能被中断。继续吗？`,
    assumeYes
  );
  if (!ok) {
    return false;
  }
  platform.stop(installation, state);
  await waitForExit(platform, installation);
  return true;
}

function spawnWatcher(context: CommandContext, port: number): number {
  fs.mkdirSync(context.paths.runtimeDir, { recursive: true });
  const log = fs.openSync(context.paths.watcherLog, 'a');
  const child = spawn(
    context.nodePath,
    [context.cliPath, 'codex', 'watch', '--port', String(port)],
    {
      detached: true,
      stdio: ['ignore', log, log],
      windowsHide: true,
    }
  );
  child.unref();
  fs.closeSync(log);
  if (!child.pid) {
    throw new CommandError('无法启动后台监视进程');
  }
  return child.pid;
}

function stopWatcher(context: CommandContext): void {
  const state = loadWatcherState(context.paths);
  if (state && isProcessAlive(state.pid)) {
    try {
      process.kill(state.pid);
    } catch {
      // Already gone.
    }
  }
  saveWatcherState(context.paths, undefined);
}

export async function readOverlayStates(
  context: CommandContext,
  port: number
): Promise<OverlayState[]> {
  return (await evaluateInMainWindows(port, OVERLAY_STATE_EXPRESSION, {
    fetchImpl: context.fetchImpl,
  })) as OverlayState[];
}

export interface LaunchOptions {
  assumeYes: boolean;
  acceptRisk: boolean;
}

/** `woodfish codex launch`: start Codex with a debugging port and keep the overlay injected. */
export async function launchCommand(
  context: CommandContext,
  options: LaunchOptions
): Promise<number> {
  await ensureConsent(context, options.acceptRisk);
  const platform = context.platform();
  if (platform.isElevated()) {
    throw new CommandError('请不要以管理员身份运行：商店版 Codex 在管理员权限下无法带参数启动');
  }
  const installation = requireInstallation(platform);
  const state = platform.inspect(installation);
  let port: number;

  if (
    state.main &&
    state.debugPort &&
    (await isDebugPortAlive(state.debugPort, context.fetchImpl))
  ) {
    port = state.debugPort;
    context.io.out(`Codex 已开启调试端口 ${port}，直接接入。`);
    if (port === CODEX_PLUS_DEFAULT_PORT) {
      context.io.out(
        '这个端口看起来是 Codex++ 打开的；若同时启用了 Woodfish 用户脚本，用户脚本会优先生效。'
      );
    }
  } else {
    const stopped = await stopCodex(
      context,
      platform,
      installation,
      state,
      options.assumeYes,
      '为开启注入，'
    );
    if (!stopped) {
      context.io.out('已取消。');
      return EXIT.failure;
    }
    port = await pickFreePort();
    context.io.out(`正在以本机调试端口 ${port} 启动 Codex……`);
    platform.launchWithPort(installation, port);
    const ready = await waitFor(async () => {
      try {
        const targets = await fetchTargets(port, context.fetchImpl);
        return looksLikeCodexTargets(targets) && targets.some(isMainWindowTarget);
      } catch {
        return false;
      }
    }, 45000);
    if (!ready) {
      throw new CommandError(
        'Codex 启动后没有打开调试端口，可能是 Codex 更新后不再支持。可改用 `woodfish codex theme apply`。'
      );
    }
    const relaunched = platform.inspect(installation);
    if (relaunched.debugPort !== port) {
      throw new CommandError(`端口 ${port} 上响应的不是刚启动的 Codex，已停止`);
    }
  }

  const bundleSha256 = sha256(loadOverlayBundle());
  const watcher = loadWatcherState(context.paths);
  const reusable =
    watcher &&
    watcher.port === port &&
    watcher.bundleSha256 === bundleSha256 &&
    isProcessAlive(watcher.pid);
  if (!reusable) {
    stopWatcher(context);
    const pid = spawnWatcher(context, port);
    saveWatcherState(context.paths, {
      pid,
      port,
      startedAt: new Date().toISOString(),
      bundleSha256,
    });
  }

  const states = await waitFor(async () => {
    try {
      const result = await readOverlayStates(context, port);
      return result.length > 0 && result.every((page) => page.controller) ? result : undefined;
    } catch {
      return undefined;
    }
  }, 20000);
  if (!states) {
    throw new CommandError(`效果没有在 20 秒内生效，请查看日志：${context.paths.watcherLog}`);
  }
  const userScript = states.some((page) => page.controller?.source === 'userscript');
  context.io.out(
    userScript
      ? '已接入。当前由 Codex++ 用户脚本提供效果，Woodfish 注入会自动让位。'
      : `已开启 Woodfish 效果（${states.length} 个窗口）。修改设置：woodfish codex settings --set …`
  );
  context.io.out(
    '撤下效果：woodfish codex stop-inject；关闭调试端口：woodfish codex relaunch --normal'
  );
  return EXIT.ok;
}

/** Hidden `woodfish codex watch --port P`: the long-running injector. */
export async function watchCommand(context: CommandContext, port: number): Promise<number> {
  const log = (message: string): void => context.io.out(`[${new Date().toISOString()}] ${message}`);
  const watcher = await startWatcher({
    port,
    bundle: loadOverlayBundle(),
    loadSettings: () => loadSettings(context.paths).codex,
    watchSettings: watchFile(context.paths.settingsFile),
    saveSettingsPatch: (patch: unknown): void => {
      const stored = loadSettings(context.paths);
      saveSettings(context.paths, {
        ...stored,
        codex: applyCodexSettingsPatch(stored.codex, patch),
      });
    },
    log,
    fetchImpl: context.fetchImpl,
  });
  saveWatcherState(context.paths, {
    pid: process.pid,
    port,
    startedAt: new Date().toISOString(),
    bundleSha256: sha256(loadOverlayBundle()),
  });
  log(`监视进程已启动，端口 ${port}，已注入 ${watcher.pages()} 个窗口`);
  await watcher.closed;
  if (loadWatcherState(context.paths)?.pid === process.pid) {
    saveWatcherState(context.paths, undefined);
  }
  return EXIT.ok;
}

/** `woodfish codex stop-inject`: remove the overlay now; the port closes on restart. */
export async function stopInjectCommand(context: CommandContext): Promise<number> {
  const watcher = loadWatcherState(context.paths);
  stopWatcher(context);
  const platform = context.platform();
  const installation = platform.discover();
  const port =
    watcher?.port ?? (installation ? platform.inspect(installation).debugPort : null) ?? null;
  if (port && (await isDebugPortAlive(port, context.fetchImpl))) {
    await evaluateInMainWindows(port, DISPOSE_EXPRESSION, { fetchImpl: context.fetchImpl });
    const states = await readOverlayStates(context, port);
    const leftovers = states.filter(
      (page) => page.controller?.source === 'cdp' || (page.controller === null && page.styles > 0)
    );
    if (leftovers.length > 0) {
      throw new CommandError('部分窗口的效果没有完全撤下，请重启 Codex');
    }
    context.io.out('已撤下 Woodfish 注入效果。');
    context.io.out('调试端口要等 Codex 重启后才会关闭：woodfish codex relaunch --normal');
  } else {
    context.io.out('当前没有运行中的注入。');
  }
  return EXIT.ok;
}

/** `woodfish codex relaunch --normal`: restart Codex without a debugging port. */
export async function relaunchNormalCommand(
  context: CommandContext,
  assumeYes: boolean
): Promise<number> {
  stopWatcher(context);
  const platform = context.platform();
  const installation = requireInstallation(platform);
  const state = platform.inspect(installation);
  if (!(await stopCodex(context, platform, installation, state, assumeYes, '为关闭调试端口，'))) {
    context.io.out('已取消。');
    return EXIT.failure;
  }
  platform.launchNormal(installation);
  context.io.out('已正常启动 Codex，调试端口已关闭。');
  return EXIT.ok;
}

/**
 * Restarts Codex if it is running (used after native theme changes). When the effects
 * are injected, Codex comes back with them; otherwise it restarts without a port.
 */
export async function restartForNativeTheme(
  context: CommandContext,
  assumeYes: boolean
): Promise<void> {
  const platform = context.platform();
  const installation = platform.discover();
  if (!installation) {
    return;
  }
  const state = platform.inspect(installation);
  if (!state.main) {
    context.io.out('下次启动 Codex 时生效。');
    return;
  }
  const watcher = loadWatcherState(context.paths);
  const injected = Boolean(watcher && isProcessAlive(watcher.pid));
  if (!(await stopCodex(context, platform, installation, state, assumeYes, '为让配色生效，'))) {
    context.io.out('配色将在 Codex 下次重启后生效。');
    return;
  }
  stopWatcher(context);
  if (injected) {
    // Consent was given when the effects were first injected; Codex is already stopped.
    await launchCommand(context, { assumeYes: true, acceptRisk: false });
    context.io.out('配色会在启动后十几秒内加载，Woodfish 效果保持开启。');
    return;
  }
  platform.launchNormal(installation);
  context.io.out('已重启 Codex，配色会在启动后十几秒内加载。');
}

export { stopWatcher };
