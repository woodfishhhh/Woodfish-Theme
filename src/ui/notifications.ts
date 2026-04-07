import * as vscode from 'vscode';

const PREFIX = '[Woodfish Theme]';

export function showInfoMessage(message: string): void {
  void vscode.window.showInformationMessage(`${PREFIX} ${message}`);
}

export function showErrorMessage(message: string): void {
  void vscode.window.showErrorMessage(`${PREFIX} ${message}`);
}

export function showReloadPrompt(message: string): Promise<void> {
  const reloadAction = '重新加载窗口';
  const dismissAction = '稍后';

  void vscode.window
    .showInformationMessage(`${PREFIX} ${message}`, reloadAction, dismissAction)
    .then((selection) => {
      if (selection === reloadAction) {
        void vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    });

  return Promise.resolve();
}
