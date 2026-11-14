import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { Io } from '../cli/io';
import { WoodfishPaths } from '../paths';
import { CodexPlatform } from '../platform';

export interface CommandContext {
  paths: WoodfishPaths;
  io: Io;
  /** Created lazily so commands that do not touch the OS work everywhere. */
  platform: () => CodexPlatform;
  /** Path of the running CLI script; empty when the CLI is the single-file exe itself. */
  cliPath: string;
  /** What runs the script: node.exe, the single-file exe, or an Electron app (VS Code). */
  nodePath: string;
  /** `nodePath` is an Electron app that only acts as Node with ELECTRON_RUN_AS_NODE=1. */
  electronRunAsNode?: boolean;
  fetchImpl?: typeof fetch;
}

/** Exit codes: 0 ok, 1 failure, 2 usage error, 3 consent required, 4 confirmation required. */
export const EXIT = {
  ok: 0,
  failure: 1,
  usage: 2,
  consentRequired: 3,
  confirmRequired: 4,
} as const;

export interface SelfCommand {
  command: string;
  args: string[];
}

/** The command line that runs this CLI again (the watcher it spawns). */
export function selfCommand(context: CommandContext, args: readonly string[]): SelfCommand {
  return {
    command: context.nodePath,
    args: [...(context.cliPath ? [context.cliPath] : []), ...args],
  };
}

/** Environment for {@link selfCommand}: an Electron runtime needs ELECTRON_RUN_AS_NODE back. */
export function selfEnv(context: CommandContext): NodeJS.ProcessEnv {
  return context.electronRunAsNode ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : process.env;
}

/** Copies `source` over `target` unless it is the same file or already identical. */
function refreshCopy(source: string, target: string): void {
  if (path.resolve(source) === path.resolve(target)) {
    return;
  }
  if (fs.existsSync(target) && fs.readFileSync(source).equals(fs.readFileSync(target))) {
    return;
  }
  try {
    fs.copyFileSync(source, target);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EBUSY' && code !== 'EPERM') {
      throw error;
    }
    // A running exe cannot be overwritten, but it can be moved aside (deleted on a later run).
    fs.renameSync(target, `${target}.${Date.now()}.old`);
    fs.copyFileSync(source, target);
  }
}

/**
 * Copies the running CLI into the runtime folder and returns the command line that runs the
 * copy. The logon task and the Start menu entry use it, so clearing npx's cache, updating the
 * VS Code extension or deleting the downloaded exe never breaks them; running the command
 * that installed them again refreshes the copy.
 */
export function installPrivateCopy(context: CommandContext): SelfCommand {
  const dir = context.paths.runtimeDir;
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.old'))) {
    try {
      fs.rmSync(path.join(dir, name), { force: true });
    } catch {
      // Still running; removed next time.
    }
  }
  if (!context.cliPath) {
    const exe = path.join(dir, 'woodfish.exe');
    refreshCopy(context.nodePath, exe);
    return { command: exe, args: [] };
  }
  const script = path.join(dir, 'woodfish.js');
  refreshCopy(context.cliPath, script);
  if (!context.electronRunAsNode) {
    return { command: context.nodePath, args: [script] };
  }
  // A logon task or a shortcut cannot set environment variables; a batch file can. cmd.exe
  // reads it in the console code page, so switch to UTF-8 before the line with the path.
  const batch = path.join(dir, 'woodfish.cmd');
  const lines = [
    '@echo off',
    'chcp 65001 >nul',
    'set ELECTRON_RUN_AS_NODE=1',
    `"${context.nodePath}" "%~dp0woodfish.js" %*`,
    '',
  ];
  fs.writeFileSync(batch, lines.join('\r\n'), 'utf8');
  return { command: 'cmd.exe', args: ['/d', '/c', batch] };
}

export class CommandError extends Error {
  public constructor(
    message: string,
    public readonly exitCode: number = EXIT.failure
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Polls `check` until it returns a value (not undefined/false) or the timeout passes. */
export async function waitFor<T>(
  check: () => Promise<T | undefined | false> | T | undefined | false,
  timeoutMs: number,
  intervalMs = 500
): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value !== undefined && value !== false) {
      return value;
    }
    if (Date.now() >= deadline) {
      return undefined;
    }
    await sleep(intervalMs);
  }
}

/** True if the port can be bound on loopback right now. */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

/** A random free loopback port in [20000, 60999]. */
export async function pickFreePort(random: () => number = Math.random): Promise<number> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const port = 20000 + Math.floor(random() * 41000);
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new CommandError('找不到可用的本机端口');
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}
