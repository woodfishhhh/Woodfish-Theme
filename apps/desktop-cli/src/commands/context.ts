import * as net from 'net';
import { Io } from '../cli/io';
import { WoodfishPaths } from '../paths';
import { CodexPlatform } from '../platform';

export interface CommandContext {
  paths: WoodfishPaths;
  io: Io;
  /** Created lazily so commands that do not touch the OS work everywhere. */
  platform: () => CodexPlatform;
  /** Path of the running CLI script, used to spawn the watcher and create shortcuts. */
  cliPath: string;
  nodePath: string;
  fetchImpl?: typeof fetch;
}

/** Exit codes: 0 ok, 1 failure, 2 usage error, 3 consent required. */
export const EXIT = { ok: 0, failure: 1, usage: 2, consentRequired: 3 } as const;

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
