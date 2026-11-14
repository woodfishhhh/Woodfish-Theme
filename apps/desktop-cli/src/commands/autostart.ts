import * as fs from 'fs';
import { RISK_TEXT_SHA256 } from '../cli/consent';
import { isDebugPortAlive } from '../cdp/http';
import { readJson, writeJson, loadSettings, loadWatcherState } from '../store';
import { CodexInstallation, CodexPlatform, CodexRuntimeState } from '../platform';
import {
  CommandContext,
  CommandError,
  EXIT,
  installPrivateCopy,
  isProcessAlive,
  sleep,
} from './context';
import { ensureConsent, runWatcher, startCodexWithPort, waitForExit } from './inject';

/** Codex started this recently (by the user, without a port) is restarted with one. */
export const FRESH_START_SECONDS = 90;
/** A Codex started with a port gets this long to open it (`launch` waits as long). */
export const PORT_STARTUP_SECONDS = 45;
const POLL_MS = 2000;
const MAX_LOG_BYTES = 1024 * 1024;

export type DaemonAction = 'idle' | 'attach' | 'wait' | 'restart' | 'leave';

export interface DaemonObservation {
  running: boolean;
  mainPid: number | null;
  ageSeconds: number | null;
  debugPortAlive: boolean;
  /** Codex was started with a debugging port (it may not answer yet). */
  portRequested: boolean;
  /** A `launch` watcher already serves this port. */
  otherWatcherAlive: boolean;
  /** The Codex process the daemon already decided about. */
  handledPid: number | null;
}

/**
 * What the daemon does with what it sees. It never kills a Codex session that has been
 * running for a while: only a fresh start without a port is restarted, once per process.
 */
export function decideDaemonAction(seen: DaemonObservation): DaemonAction {
  if (!seen.running || seen.mainPid === null) {
    return 'idle';
  }
  if (seen.debugPortAlive) {
    return seen.otherWatcherAlive ? 'wait' : 'attach';
  }
  // A launch in progress (`launch`, the Start menu entry): the port answers seconds later.
  if (seen.portRequested && seen.ageSeconds !== null && seen.ageSeconds <= PORT_STARTUP_SECONDS) {
    return 'wait';
  }
  if (seen.mainPid === seen.handledPid) {
    return 'leave';
  }
  return seen.ageSeconds !== null && seen.ageSeconds <= FRESH_START_SECONDS ? 'restart' : 'leave';
}

interface DaemonState {
  pid: number;
  startedAt: string;
}

function daemonLogger(context: CommandContext): (message: string) => void {
  fs.mkdirSync(context.paths.runtimeDir, { recursive: true });
  try {
    if (fs.statSync(context.paths.daemonLog).size > MAX_LOG_BYTES) {
      fs.rmSync(context.paths.daemonLog, { force: true });
    }
  } catch {
    // No log yet.
  }
  return (message) =>
    fs.appendFileSync(context.paths.daemonLog, `[${new Date().toISOString()}] ${message}\n`);
}

/**
 * The running Codex. The installation is looked up once, and again only when no Codex
 * process matches it (a Store update moves the install folder).
 */
function observeCodex(
  platform: CodexPlatform,
  known: CodexInstallation | null
): { installation: CodexInstallation | null; state: CodexRuntimeState | null } {
  if (!platform.isRunning()) {
    return { installation: known, state: null };
  }
  let installation = known ?? platform.discover();
  let state = installation ? platform.inspect(installation) : null;
  if (installation && !state?.main) {
    const fresh = platform.discover();
    if (fresh && fresh.installLocation !== installation.installLocation) {
      installation = fresh;
      state = platform.inspect(fresh);
    }
  }
  return { installation, state };
}

/**
 * Sleeps between polls while Codex is closed, but wakes as soon as anything in Codex's data
 * folder changes. Codex writes there within a second of starting, long before its window
 * shows (about 7 s on the test machine), so a start from the user's own shortcut is
 * restarted before a window appears. Plain polling remains when the folder is missing or
 * cannot be watched; the watch is closed while Codex runs, since it writes there constantly.
 */
export function codexStartNaps(dir: string | null): {
  sleep: (ms: number) => Promise<void>;
  stop: () => void;
} {
  let watcher: fs.FSWatcher | null = null;
  let wake: (() => void) | null = null;
  const stop = (): void => {
    watcher?.close();
    watcher = null;
  };
  const sleepOrWake = (ms: number): Promise<void> => {
    if (!watcher && dir && fs.existsSync(dir)) {
      try {
        watcher = fs.watch(dir, { recursive: true }, () => wake?.());
        watcher.on('error', stop);
      } catch {
        watcher = null;
      }
    }
    return new Promise((resolve) => {
      const done = (): void => {
        clearTimeout(timer);
        wake = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      wake = done;
    });
  };
  return { sleep: sleepOrWake, stop };
}

/**
 * Hidden `woodfish codex daemon`, started at logon by the autostart task. Keeps the effects
 * on across Codex restarts and Store updates (the install folder is looked up again for
 * every Codex start).
 */
export async function daemonCommand(
  context: CommandContext,
  options: { maxIterations?: number; pollMs?: number } = {}
): Promise<number> {
  const log = daemonLogger(context);
  if (loadSettings(context.paths).consent?.riskTextSha256 !== RISK_TEXT_SHA256) {
    log('还没有同意调试端口的风险说明，常驻进程退出');
    return EXIT.consentRequired;
  }
  const other = readJson<DaemonState>(context.paths.daemonStateFile);
  if (other && other.pid !== process.pid && isProcessAlive(other.pid)) {
    log(`常驻进程 ${other.pid} 已在运行，本进程退出`);
    return EXIT.ok;
  }
  writeJson(context.paths.daemonStateFile, {
    pid: process.pid,
    startedAt: new Date().toISOString(),
  });
  log('常驻进程已启动');

  const platform = context.platform();
  let installation: CodexInstallation | null = null;
  try {
    installation = platform.discover();
    // Remembered by the platform: spares the first restart a PowerShell round trip.
    platform.isElevated();
  } catch (error) {
    log(`出错：${(error as Error).message}`);
  }
  const naps = codexStartNaps(installation ? platform.userDataDir(installation) : null);
  let handledPid: number | null = null;
  for (let iteration = 0; iteration !== options.maxIterations; iteration += 1) {
    let action: DaemonAction = 'idle';
    try {
      const seen = observeCodex(platform, installation);
      installation = seen.installation;
      const state = seen.state;
      const port = state?.debugPort ?? null;
      const watcher = loadWatcherState(context.paths);
      action = decideDaemonAction({
        running: Boolean(state?.main),
        mainPid: state?.main?.pid ?? null,
        ageSeconds: state?.main?.ageSeconds ?? null,
        debugPortAlive: port !== null && (await isDebugPortAlive(port, context.fetchImpl)),
        portRequested: port !== null,
        otherWatcherAlive:
          watcher !== undefined &&
          watcher.pid !== process.pid &&
          watcher.port === port &&
          isProcessAlive(watcher.pid),
        handledPid,
      });
      if (action !== 'idle') {
        naps.stop();
      }
      if (action === 'attach' && port !== null) {
        await runWatcher(context, port, log);
        continue;
      }
      if (action === 'restart' && installation && state?.main) {
        handledPid = state.main.pid;
        log(
          `Codex（进程 ${state.main.pid}，已启动 ${state.main.ageSeconds ?? '?'} 秒）没有调试端口，重启为带效果的 Codex`
        );
        platform.stop(installation, state);
        await waitForExit(platform, installation);
        const started = await startCodexWithPort(
          { ...context, io: { ...context.io, out: log } },
          platform,
          installation
        );
        log(`Codex 已带端口 ${started} 重启`);
        continue;
      }
      if (action === 'leave' && state?.main && handledPid !== state.main.pid) {
        handledPid = state.main.pid;
        log(
          `Codex（进程 ${state.main.pid}）已运行一段时间且没有调试端口，不打断它；下次启动 Codex 时生效`
        );
      }
    } catch (error) {
      log(`出错：${(error as Error).message}`);
    }
    await (action === 'idle' ? naps.sleep : sleep)(options.pollMs ?? POLL_MS);
  }
  naps.stop();
  return EXIT.ok;
}

function stopDaemon(context: CommandContext): void {
  const state = readJson<DaemonState>(context.paths.daemonStateFile);
  if (state && state.pid !== process.pid && isProcessAlive(state.pid)) {
    try {
      process.kill(state.pid);
    } catch {
      // Already gone.
    }
  }
  fs.rmSync(context.paths.daemonStateFile, { force: true });
}

/** `woodfish codex autostart [on|off]`: keep the effects on after restarts and updates. */
export async function autostartCommand(
  context: CommandContext,
  mode: string | undefined,
  options: { acceptRisk: boolean }
): Promise<number> {
  const platform = context.platform();
  if (mode === undefined) {
    const command = platform.readAutostart();
    const daemon = readJson<DaemonState>(context.paths.daemonStateFile);
    context.io.out(command ? `自动恢复：已开启（${command}）` : '自动恢复：未开启');
    context.io.out(
      `常驻进程：${daemon && isProcessAlive(daemon.pid) ? `${daemon.pid} 运行中` : '未运行'}`
    );
    return EXIT.ok;
  }
  if (mode === 'off') {
    stopDaemon(context);
    context.io.out(
      platform.removeAutostart() ? '已关闭自动恢复，并删除了登录任务。' : '自动恢复本来就没有开启。'
    );
    return EXIT.ok;
  }
  if (mode !== 'on') {
    throw new CommandError('用法：woodfish codex autostart [on|off]', EXIT.usage);
  }
  await ensureConsent(context, options.acceptRisk);
  stopDaemon(context);
  const copy = installPrivateCopy(context);
  platform.installAutostart({
    execute: 'conhost.exe',
    args: ['--headless', copy.command, ...copy.args, 'codex', 'daemon'],
  });
  context.io.out('已开启自动恢复：登录 Windows 后，Woodfish 会在后台常驻（无窗口、普通权限）。');
  context.io.out(
    `之后 Codex 每次不带调试端口启动（开机、用原来的快捷方式打开、商店更新后），Woodfish 会马上把它重启为带效果的 Codex，通常在它的窗口出现之前，所以只是比平时晚几秒出现；已运行超过 ${FRESH_START_SECONDS} 秒的 Codex 不会被打断。`
  );
  context.io.out(
    '你原来的 Codex 快捷方式不会被修改。想省掉这次重启：woodfish codex shortcut 会在开始菜单另加一个“Woodfish Codex”，直接带效果启动。'
  );
  context.io.out(`日志：${context.paths.daemonLog}；关闭：woodfish codex autostart off`);
  return EXIT.ok;
}

/** Used by `uninstall`: removes the logon task and stops the daemon. */
export function removeAutostart(context: CommandContext): void {
  stopDaemon(context);
  if (context.platform().removeAutostart()) {
    context.io.out('已删除自动恢复的登录任务。');
  }
}
