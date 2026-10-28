import * as vscode from 'vscode';
import { hostName } from './hostApp';

const PREFIX = '[Woodfish Theme]';

export function showInfoMessage(message: string): void {
  void vscode.window.showInformationMessage(`${PREFIX} ${message}`);
}

export function showErrorMessage(message: string): void {
  void vscode.window.showErrorMessage(`${PREFIX} ${message}`);
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
