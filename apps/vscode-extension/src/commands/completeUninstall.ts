import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerCompleteUninstallCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(
    COMMANDS.completeUninstall,
    async (options?: { skipConfirmation?: boolean }) => {
      await runSafely('彻底停用', async () => {
        if (options?.skipConfirmation !== true) {
          const confirm = await vscode.window.showWarningMessage(
            '[Woodfish Theme] 这会移除全部注入、备份与系统级窗口钩子，并关闭通用叠层，是否继续？',
            { modal: true },
            '继续移除'
          );

          if (confirm !== '继续移除') {
            return;
          }
        }

        await deps.runtimeService.completeUninstall();
        deps.featureState.refreshFromConfig();
      });
    }
  );
}
