import * as vscode from 'vscode';

const PREFIX = '[Woodfish Theme]';

/**
 * 显示信息提示。
 *
 * 约定：统一加上扩展前缀，便于用户识别来源。
 */
export function showInfoMessage(message: string): void {
  void vscode.window.showInformationMessage(`${PREFIX} ${message}`);
}

/**
 * 显示错误提示。
 *
 * 约定：统一加上扩展前缀，便于用户识别来源。
 */
export function showErrorMessage(message: string): void {
  void vscode.window.showErrorMessage(`${PREFIX} ${message}`);
}

/**
 * 显示“需要重载窗口”的提示，并在用户确认后触发 VS Code reload。
 *
 * 适用于 Custom CSS 类配置：写入后通常需要 reload 才能生效。
 */
export async function showReloadPrompt(message: string): Promise<void> {
  const reloadAction = '重新加载窗口';
  const dismissAction = '稍后';

  const selection = await vscode.window.showInformationMessage(
    `${PREFIX} ${message}`,
    reloadAction,
    dismissAction,
  );

  if (selection === reloadAction) {
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  }
}
