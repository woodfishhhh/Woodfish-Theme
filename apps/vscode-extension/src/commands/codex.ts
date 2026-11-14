import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import {
  CODEX_CLI_EXIT,
  CodexCliResult,
  codexCliError,
  codexCliUnsupported,
  locateCodexCli,
  runCodexCli,
} from '../services/codexCli';
import { hostName } from '../ui/hostApp';
import { showInfoMessage } from '../ui/notifications';
import { getOutputChannel } from '../ui/output';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

const SHORTCUT_NOTE =
  '你原来的 Codex 快捷方式不会被修改。用它打开 Codex 时，Woodfish 会在窗口出现前把它带端口重启一次，所以比平时晚几秒出现；开始菜单里另加的“Woodfish Codex”会直接带效果启动。';

type Cli = (args: string[]) => Promise<CodexCliResult>;

/** The bundled CLI, or an error explaining why it cannot run here. */
function cliFor(deps: CommandDeps): Cli {
  const host = hostName();
  const unsupported = codexCliUnsupported(host);
  if (unsupported) {
    throw new Error(unsupported);
  }
  const cliPath = locateCodexCli(deps.extensionContext.extensionPath);
  if (!cliPath) {
    throw new Error('扩展里缺少 Codex 工具 out/woodfish.js，请重新安装扩展');
  }
  const output = getOutputChannel();
  return async (args) => {
    output.appendLine(`[Codex] woodfish ${args.join(' ')}`);
    const result = await runCodexCli(cliPath, args);
    for (const text of [result.stdout, result.stderr]) {
      if (text.trim()) {
        output.appendLine(text.trimEnd());
      }
    }
    return result;
  };
}

function ensureOk(result: CodexCliResult): CodexCliResult {
  if (result.code !== CODEX_CLI_EXIT.ok) {
    throw new Error(`${codexCliError(result)}（详情见输出面板 Woodfish Theme）`);
  }
  return result;
}

async function modal(
  message: string,
  detail: string,
  ...buttons: string[]
): Promise<string | undefined> {
  return vscode.window.showWarningMessage(message, { modal: true, detail }, ...buttons);
}

function progress<T>(title: string, task: () => Promise<T>): Thenable<T> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title },
    task
  );
}

/**
 * 「为 Codex 启用 Woodfish」: `woodfish codex launch`, then `autostart on`. The CLI keeps the
 * risk consent: without it, it prints the risk text and exits with 3; with Codex running,
 * it exits with 4 instead of restarting it. Both are asked here in a modal, then retried.
 */
async function enableCodex(deps: CommandDeps): Promise<void> {
  const cli = cliFor(deps);
  let args = ['codex', 'launch'];
  const title = '正在为 Codex 启用 Woodfish（Codex 启动需要十几秒）…';
  let result = await progress(title, () => cli(args));
  if (result.code === CODEX_CLI_EXIT.consentRequired) {
    const agree = '同意并启用';
    const detail = [
      // The CLI wraps its risk text for a terminal; a dialog wraps by itself.
      result.stdout.trim().replace(/\n {3}/g, ''),
      '',
      `启用后还会注册一个登录 Windows 时运行的后台任务（无窗口、普通权限，用 ${hostName()} 自带的运行时），Codex 重启或商店更新后效果自动恢复。`,
      SHORTCUT_NOTE,
      '随时可以运行「为 Codex 停用 Woodfish」撤下。',
    ].join('\n');
    if ((await modal('为 Codex 启用 Woodfish', detail, agree)) !== agree) {
      return;
    }
    args = [...args, '--accept-risk'];
    result = await progress(title, () => cli(args));
  }
  if (result.code === CODEX_CLI_EXIT.confirmRequired) {
    const restart = '重启 Codex';
    const detail =
      'Codex 正在运行，要以调试端口重新启动它。关闭窗口只会缩到托盘，所以会结束 Codex 的全部进程，正在运行的任务可能被中断。';
    if ((await modal('需要重启 Codex', detail, restart)) !== restart) {
      return;
    }
    args = [...args, '--yes'];
    result = await progress(title, () => cli(args));
  }
  ensureOk(result);
  ensureOk(await progress('正在注册登录任务…', () => cli(['codex', 'autostart', 'on'])));
  const shortcut = '在开始菜单加“Woodfish Codex”';
  const choice = await vscode.window.showInformationMessage(
    '[Woodfish Theme] 已为 Codex 启用 Woodfish，登录 Windows 后也会自动恢复。在 Codex 的“设置 → 外观 → Woodfish 外观”里换主题、调效果。',
    shortcut
  );
  if (choice === shortcut) {
    const created = ensureOk(await cli(['codex', 'shortcut']));
    showInfoMessage(created.stdout.trim().split(/\r?\n/)[0] ?? '已创建开始菜单快捷方式');
  }
}

/** 「为 Codex 停用 Woodfish」: removes the effects and the logon task, optionally the port. */
async function disableCodex(deps: CommandDeps): Promise<void> {
  const cli = cliFor(deps);
  const stop = '停用';
  const stopAndRestart = '停用并重启 Codex';
  const choice = await modal(
    '为 Codex 停用 Woodfish',
    '撤下 Codex 里的 Woodfish 效果，并删除登录时自动恢复的后台任务。调试端口要等 Codex 重启后才会关闭：选“停用并重启 Codex”会马上不带端口重启它（正在运行的任务可能被中断）。主题、效果参数和效果文件夹都会保留。',
    stop,
    stopAndRestart
  );
  if (!choice) {
    return;
  }
  await progress('正在为 Codex 停用 Woodfish…', async () => {
    ensureOk(await cli(['codex', 'autostart', 'off']));
    ensureOk(await cli(['codex', 'stop-inject']));
    if (choice === stopAndRestart) {
      ensureOk(await cli(['codex', 'relaunch', '--normal', '--yes']));
    }
  });
  showInfoMessage(
    choice === stopAndRestart
      ? '已为 Codex 停用 Woodfish，Codex 已不带调试端口重启。'
      : '已为 Codex 停用 Woodfish。调试端口会在 Codex 下次重启后关闭。'
  );
}

/** 「从 Codex 卸载 Woodfish」: `woodfish codex uninstall`, keeping the shared effects folder. */
async function uninstallCodex(deps: CommandDeps): Promise<void> {
  const cli = cliFor(deps);
  const remove = '卸载';
  const detail = [
    '撤销 Woodfish 对 Codex 的全部修改：注入的效果、登录任务、开始菜单的“Woodfish Codex”、写入 Codex 的原生配色、Codex++ 用户脚本。',
    `效果文件夹 %APPDATA%\\Woodfish 会保留（${hostName()} 也在用它）。调试端口要等 Codex 重启后才会关闭。`,
  ].join('\n');
  if ((await modal('从 Codex 卸载 Woodfish', detail, remove)) !== remove) {
    return;
  }
  await progress('正在从 Codex 卸载 Woodfish…', async () => {
    ensureOk(await cli(['codex', 'uninstall', '--keep-settings']));
  });
  showInfoMessage('已撤销 Woodfish 对 Codex 的全部修改。重启 Codex 即可关闭调试端口。');
}

export function registerCodexCommands(deps: CommandDeps): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(COMMANDS.codexEnable, () =>
      runSafely('为 Codex 启用 Woodfish', () => enableCodex(deps))
    ),
    vscode.commands.registerCommand(COMMANDS.codexDisable, () =>
      runSafely('为 Codex 停用 Woodfish', () => disableCodex(deps))
    ),
    vscode.commands.registerCommand(COMMANDS.codexUninstall, () =>
      runSafely('从 Codex 卸载 Woodfish', () => uninstallCodex(deps))
    ),
  ];
}
