import * as fs from 'fs';
import * as path from 'path';
import { RISK_TEXT_SHA256 } from '../cli/consent';
import { isDebugPortAlive } from '../cdp/http';
import { readJson, writeJson, loadSettings, loadWatcherState } from '../store';
import { CommandContext, CommandError, EXIT, isProcessAlive, sleep } from './context';
import { ensureConsent, runWatcher, startCodexWithPort, waitForExit } from './inject';

/** Codex started this recently (by the user, without a port) is restarted with one. */
export const FRESH_START_SECONDS = 90;
const POLL_MS = 2000;
const MAX_LOG_BYTES = 1024 * 1024;

export type DaemonAction = 'idle' | 'attach' | 'wait' | 'restart' | 'leave';

export interface DaemonObservation {
  running: boolean;
  mainPid: number | null;
  ageSeconds: number | null;
  debugPortAlive: boolean;
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
  let handledPid: number | null = null;
  for (let iteration = 0; iteration !== options.maxIterations; iteration += 1) {
    try {
      const running = platform.isRunning();
      const installation = running ? platform.discover() : null;
      const state = installation ? platform.inspect(installation) : null;
      const port = state?.debugPort ?? null;
      const watcher = loadWatcherState(context.paths);
      const action = decideDaemonAction({
        running: Boolean(state?.main),
        mainPid: state?.main?.pid ?? null,
        ageSeconds: state?.main?.ageSeconds ?? null,
        debugPortAlive: port !== null && (await isDebugPortAlive(port, context.fetchImpl)),
        otherWatcherAlive:
          watcher !== undefined &&
          watcher.pid !== process.pid &&
          watcher.port === port &&
          isProcessAlive(watcher.pid),
        handledPid,
      });
      if (action === 'attach' && port !== null) {
        await runWatcher(context, port, log);
        continue;
      }
      if (action === 'restart' && installation && state?.main) {
        handledPid = state.main.pid;
        log(`Codex（进程 ${state.main.pid}）没有调试端口，重启为带效果的 Codex`);
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
    await sleep(options.pollMs ?? POLL_MS);
  }
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
  // The task runs a private copy of this single-file CLI, so moving or updating the
  // checkout never breaks it; `autostart on` again refreshes the copy.
  const installed = path.join(context.paths.runtimeDir, 'woodfish.js');
  fs.mkdirSync(context.paths.runtimeDir, { recursive: true });
  if (path.resolve(context.cliPath) !== path.resolve(installed)) {
    fs.copyFileSync(context.cliPath, installed);
  }
  platform.installAutostart({
    execute: 'conhost.exe',
    args: ['--headless', context.nodePath, installed, 'codex', 'daemon'],
  });
  context.io.out('已开启自动恢复：登录 Windows 后，Woodfish 会在后台常驻（无窗口、普通权限）。');
  context.io.out(
    `之后 Codex 每次不带调试端口启动（开机、手动打开、商店更新后），Woodfish 会在启动后几秒内把它重启为带效果的 Codex；已运行超过 ${FRESH_START_SECONDS} 秒的 Codex 不会被打断。`
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
