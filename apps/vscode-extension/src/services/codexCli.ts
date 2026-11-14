import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * The Woodfish CLI for the Codex desktop app (apps/desktop-cli), shipped inside the VSIX as
 * out/woodfish.js (scripts/bundle.js). It runs on the editor's own Electron as Node, so
 * nobody needs to install Node.js; the GitHub Release (and later npm) carries the same file.
 */

/** The CLI's exit codes the commands react to (apps/desktop-cli/src/commands/context.ts). */
export const CODEX_CLI_EXIT = { ok: 0, consentRequired: 3, confirmRequired: 4 } as const;

export interface CodexCliResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Packaged copy first, then the repository build when running from source. */
export function locateCodexCli(extensionPath: string): string | undefined {
  return [
    path.join(extensionPath, 'out', 'woodfish.js'),
    path.resolve(extensionPath, '..', 'desktop-cli', 'out', 'woodfish.js'),
  ].find((candidate) => fs.existsSync(candidate));
}

/** Why the CLI cannot run in this editor, or undefined when it can. */
export function codexCliUnsupported(
  host: string,
  platform: NodeJS.Platform = process.platform,
  nodeVersion: string = process.versions.node
): string | undefined {
  if (platform !== 'win32') {
    return 'Codex 桌面端目前只支持 Windows 上的 Microsoft Store 版';
  }
  if (Number(nodeVersion.split('.')[0]) < 22) {
    return `${host} 自带的 Node.js 是 ${nodeVersion}，Woodfish 的 Codex 工具需要 22 或更高。可以改用 GitHub Release 里的 woodfish.exe（不用装 Node.js）`;
  }
  return undefined;
}

/** Runs the CLI with the editor's executable as Node (ELECTRON_RUN_AS_NODE=1). */
export function runCodexCli(cliPath: string, args: readonly string[]): Promise<CodexCliResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [cliPath, ...args],
      {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        windowsHide: true,
        timeout: 180000,
        maxBuffer: 4 * 1024 * 1024,
        encoding: 'utf8',
      },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
        resolve({ code, stdout, stderr: stderr || (error && code === 1 ? error.message : '') });
      }
    );
  });
}

/** The last line the CLI wrote to stderr, without its `错误：` prefix. */
export function codexCliError(result: CodexCliResult): string {
  const lines = result.stderr.trim().split(/\r?\n/).filter(Boolean);
  const last = lines.at(-1) ?? result.stdout.trim().split(/\r?\n/).at(-1) ?? '';
  return last.replace(/^错误：/, '') || `退出码 ${result.code}`;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** The CLI's runtime folder (`%LOCALAPPDATA%\Woodfish`): private copy, daemon state, logs. */
export function codexRuntimeDir(env: NodeJS.ProcessEnv = process.env): string {
  const localAppData = env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
  return env.WOODFISH_RUNTIME_DIR ?? path.join(localAppData, 'Woodfish');
}

/**
 * Whether the Codex part runs on this editor: 「为 Codex 启用 Woodfish」 leaves a
 * `woodfish.cmd` that starts the CLI with the editor's executable.
 */
export function codexRunsOnEditor(
  executablePath: string = process.execPath,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  try {
    const batch = fs.readFileSync(path.join(codexRuntimeDir(env), 'woodfish.cmd'), 'utf8');
    return batch.toLowerCase().includes(`"${executablePath.toLowerCase()}"`);
  } catch {
    return false;
  }
}

/**
 * VS Code's updater ends every process that runs its Code.exe, including the Codex daemon
 * 「为 Codex 启用 Woodfish」 runs on it (its batch file `woodfish.cmd` is the sign). When
 * the editor starts and the daemon is gone, the logon task is started again.
 */
export function restartCodexDaemonIfStopped(
  env: NodeJS.ProcessEnv = process.env,
  startTask: () => void = startDaemonTask,
  platform: NodeJS.Platform = process.platform
): boolean {
  if (platform !== 'win32') {
    return false;
  }
  const runtimeDir = codexRuntimeDir(env);
  if (!fs.existsSync(path.join(runtimeDir, 'woodfish.cmd'))) {
    return false;
  }
  try {
    const state = JSON.parse(
      fs.readFileSync(path.join(runtimeDir, 'codex-daemon.json'), 'utf8')
    ) as { pid?: unknown };
    if (typeof state.pid === 'number' && isAlive(state.pid)) {
      return false;
    }
  } catch {
    // No daemon has run yet, or `autostart off` removed its state: the task decides.
  }
  startTask();
  return true;
}

/** A missing task (autostart off) just makes schtasks fail quietly. */
function startDaemonTask(): void {
  execFile(
    'schtasks.exe',
    ['/Run', '/TN', '\\Woodfish\\Woodfish Codex'],
    { windowsHide: true },
    () => undefined
  );
}
