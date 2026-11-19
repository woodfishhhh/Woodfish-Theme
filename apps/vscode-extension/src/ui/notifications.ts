import { execFile } from 'child_process';
import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { OwnershipError, ownershipTargets } from '../services/runtime/errors';
import { hostName } from './hostApp';

const PREFIX = '[Woodfish Theme]';

export function showInfoMessage(message: string): void {
  void vscode.window.showInformationMessage(`${PREFIX} ${message}`);
}

const GRANT_ACTION = '授权并修复';

export function showErrorMessage(message: string, cause?: unknown): void {
  if (!(cause instanceof OwnershipError)) {
    void vscode.window.showErrorMessage(`${PREFIX} ${message}`);
    return;
  }
  void vscode.window.showErrorMessage(`${PREFIX} ${message}`, GRANT_ACTION).then(async (choice) => {
    if (choice !== GRANT_ACTION) {
      return;
    }
    try {
      await takeOwnership(cause.appRoot);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`${PREFIX} 授权没有完成（${reason}）。${message}`);
      return;
    }
    await vscode.commands.executeCommand(COMMANDS.repairWorkbench);
  });
}

/** Polkit shows the system password dialog; the files then belong to the editor's user. */
export function takeOwnership(appRoot: string): Promise<void> {
  const owner = `${process.getuid?.() ?? ''}:${process.getgid?.() ?? ''}`;
  return new Promise((resolve, reject) => {
    execFile('pkexec', ['chown', '-R', owner, ...ownershipTargets(appRoot)], (error) => {
      if (!error) {
        resolve();
      } else if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('系统里没有 pkexec'));
      } else {
        // pkexec exits 126 when the dialog is dismissed and 127 when not authorized.
        reject(new Error(error.code === 126 ? '已取消' : error.message));
      }
    });
  });
}

function reloadHint(): string {
  return `若重新加载后仍未生效，请完全退出 ${hostName()} 后再打开。`;
}

/**
 * VS Code reads `product.json` once in the main process and hands that copy to
 * every window, so after Woodfish rewrites a checksum the integrity check keeps
 * flagging the patched file until VS Code is fully restarted — a window reload
 * is not enough.
 */
function checksumHint(): string {
  const host = hostName();
  return `本次运行期间 ${host} 可能提示“安装似乎损坏”，这是校验和刚被更新导致的，完全退出 ${host} 再打开后就不会再出现。`;
}

export type ReloadPromptOptions = {
  checksumUpdated?: boolean;
};

export function showReloadPrompt(
  message: string,
  options: ReloadPromptOptions = {}
): Promise<void> {
  const reloadAction = '重新加载窗口';
  const dismissAction = '稍后';
  const hint = options.checksumUpdated === true ? checksumHint() : reloadHint();

  void vscode.window
    .showInformationMessage(`${PREFIX} ${message}${hint}`, reloadAction, dismissAction)
    .then((selection) => {
      if (selection === reloadAction) {
        void vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    });

  return Promise.resolve();
}

/** Main-process changes (native window material) need a full restart, not a reload. */
export function showRestartPrompt(message: string): Promise<void> {
  const quitAction = `退出 ${hostName()}`;
  const dismissAction = '稍后';

  void vscode.window
    .showInformationMessage(`${PREFIX} ${message}`, quitAction, dismissAction)
    .then((selection) => {
      if (selection === quitAction) {
        void vscode.commands.executeCommand('workbench.action.quit');
      }
    });

  return Promise.resolve();
}
