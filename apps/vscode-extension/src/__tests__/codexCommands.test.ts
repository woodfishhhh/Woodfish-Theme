const handlers = new Map<string, () => Promise<void>>();
const warnings: Array<{ message: string; detail: string; buttons: string[] }> = [];
let warningAnswers: Array<string | undefined> = [];

jest.mock(
  'vscode',
  () => ({
    commands: {
      registerCommand: jest.fn((command: string, callback: () => Promise<void>) => {
        handlers.set(command, callback);
        return { dispose: jest.fn() };
      }),
    },
    window: {
      showWarningMessage: jest.fn(
        (message: string, options: { detail: string }, ...buttons: string[]) => {
          warnings.push({ message, detail: options.detail, buttons });
          return Promise.resolve(warningAnswers.shift());
        }
      ),
      showInformationMessage: jest.fn().mockResolvedValue(undefined),
      showErrorMessage: jest.fn(),
      withProgress: jest.fn((_options: unknown, task: () => Promise<unknown>) => task()),
    },
    ProgressLocation: { Notification: 15 },
    env: { appName: 'Visual Studio Code' },
  }),
  { virtual: true }
);

const cliCalls: string[][] = [];
let cliResults: Array<{ code: number; stdout: string; stderr: string }> = [];

jest.mock('../services/codexCli', () => {
  const actual: typeof import('../services/codexCli') = jest.requireActual('../services/codexCli');
  return {
    ...actual,
    codexCliUnsupported: () => undefined,
    locateCodexCli: () => 'C:\\ext\\out\\woodfish.js',
    runCodexCli: (_cli: string, args: string[]) => {
      cliCalls.push(args);
      return Promise.resolve(cliResults.shift() ?? { code: 0, stdout: '', stderr: '' });
    },
  };
});

jest.mock('../ui/output', () => ({
  getOutputChannel: () => ({ appendLine: jest.fn(), show: jest.fn() }),
}));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { registerCodexCommands } from '../commands/codex';
import type { CommandDeps } from '../commands/types';
import { COMMANDS } from '../constants/commands';

// The commands above use the mocked runner; the helpers are tested for real.
const { codexCliError, codexCliUnsupported, locateCodexCli, restartCodexDaemonIfStopped } =
  jest.requireActual<typeof import('../services/codexCli')>('../services/codexCli');

const deps = { extensionContext: { extensionPath: 'C:\\ext' } } as unknown as CommandDeps;
const ok = { code: 0, stdout: '', stderr: '' };

beforeEach(() => {
  handlers.clear();
  warnings.length = 0;
  cliCalls.length = 0;
  jest.clearAllMocks();
  registerCodexCommands(deps);
});

describe('为 Codex 启用 Woodfish', () => {
  it('shows the CLI risk text, asks before restarting Codex, then turns on autostart', async () => {
    cliResults = [
      { code: 3, stdout: '开启 Woodfish 注入效果前，请先了解：\n\n', stderr: '错误：需要先同意' },
      { code: 4, stdout: '', stderr: '错误：需要重启正在运行的 Codex' },
      ok,
      ok,
    ];
    warningAnswers = ['同意并启用', '重启 Codex'];
    await handlers.get(COMMANDS.codexEnable)?.();

    expect(cliCalls).toEqual([
      ['codex', 'launch'],
      ['codex', 'launch', '--accept-risk'],
      ['codex', 'launch', '--accept-risk', '--yes'],
      ['codex', 'autostart', 'on'],
    ]);
    expect(warnings[0].detail).toContain('开启 Woodfish 注入效果前');
    expect(warnings[0].detail).toContain('原来的 Codex 快捷方式不会被修改');
    expect(warnings[1].message).toBe('需要重启 Codex');
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
  });

  it('stops when the risk is not accepted', async () => {
    cliResults = [{ code: 3, stdout: 'risk', stderr: '' }];
    warningAnswers = [undefined];
    await handlers.get(COMMANDS.codexEnable)?.();
    expect(cliCalls).toEqual([['codex', 'launch']]);
  });

  it('reports what the CLI printed when it fails', async () => {
    cliResults = [
      { code: 1, stdout: '', stderr: '错误：没有找到 Codex 桌面端，请先从 Microsoft Store 安装\n' },
    ];
    await handlers.get(COMMANDS.codexEnable)?.();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('没有找到 Codex 桌面端')
    );
    expect(cliCalls).toHaveLength(1);
  });
});

describe('为 Codex 停用 / 卸载 Woodfish', () => {
  it('removes the logon task and the effects, and restarts Codex only when asked', async () => {
    warningAnswers = ['停用并重启 Codex'];
    await handlers.get(COMMANDS.codexDisable)?.();
    expect(cliCalls).toEqual([
      ['codex', 'autostart', 'off'],
      ['codex', 'stop-inject'],
      ['codex', 'relaunch', '--normal', '--yes'],
    ]);
  });

  it('keeps the effects folder VS Code shares when uninstalling', async () => {
    warningAnswers = ['卸载'];
    await handlers.get(COMMANDS.codexUninstall)?.();
    expect(cliCalls).toEqual([['codex', 'uninstall', '--keep-settings']]);
  });
});

describe('codexCli helpers', () => {
  it('needs Windows and Node 22', () => {
    expect(codexCliUnsupported('VS Code', 'darwin', '22.0.0')).toContain('Windows');
    expect(codexCliUnsupported('Cursor', 'win32', '20.18.1')).toContain(
      'Cursor 自带的 Node.js 是 20.18.1'
    );
    expect(codexCliUnsupported('VS Code', 'win32', '24.22.1')).toBeUndefined();
  });

  it('takes the last error line without its prefix', () => {
    expect(codexCliError({ code: 1, stdout: '', stderr: 'a\n错误：坏了\n' })).toBe('坏了');
    expect(codexCliError({ code: 2, stdout: '', stderr: '' })).toBe('退出码 2');
  });

  it('finds the packaged CLI before the repository build', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-ext-'));
    const extension = path.join(root, 'vscode-extension');
    fs.mkdirSync(path.join(root, 'desktop-cli', 'out'), { recursive: true });
    fs.mkdirSync(path.join(extension, 'out'), { recursive: true });
    expect(locateCodexCli(extension)).toBeUndefined();
    fs.writeFileSync(path.join(root, 'desktop-cli', 'out', 'woodfish.js'), '');
    expect(locateCodexCli(extension)).toBe(path.join(root, 'desktop-cli', 'out', 'woodfish.js'));
    fs.writeFileSync(path.join(extension, 'out', 'woodfish.js'), '');
    expect(locateCodexCli(extension)).toBe(path.join(extension, 'out', 'woodfish.js'));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('restarts the daemon task only when it ran on this editor and is gone', () => {
    const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-run-'));
    const env = { WOODFISH_RUNTIME_DIR: runtime };
    const start = jest.fn();
    expect(restartCodexDaemonIfStopped(env, start, 'win32')).toBe(false);
    fs.writeFileSync(path.join(runtime, 'woodfish.cmd'), '');
    fs.writeFileSync(path.join(runtime, 'codex-daemon.json'), JSON.stringify({ pid: process.pid }));
    expect(restartCodexDaemonIfStopped(env, start, 'win32')).toBe(false);
    fs.rmSync(path.join(runtime, 'codex-daemon.json'));
    expect(restartCodexDaemonIfStopped(env, start, 'win32')).toBe(true);
    expect(restartCodexDaemonIfStopped(env, start, 'darwin')).toBe(false);
    expect(start).toHaveBeenCalledTimes(1);
    fs.rmSync(runtime, { recursive: true, force: true });
  });
});
