import * as vscode from 'vscode';
import { showErrorMessage } from './notifications';
import { getOutputChannel } from './output';

export async function withProgressNotification<T>(
  title: string,
  task: (
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ) => Promise<T>
): Promise<T> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
    },
    async (progress, token) => {
      try {
        return await task(progress, token);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        getOutputChannel().appendLine(`[Error] ${title}: ${message}`);
        showErrorMessage(`操作失败: ${message}`);
        throw error;
      }
    }
  );
}

