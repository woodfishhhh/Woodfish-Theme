import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerCompleteUninstallCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.completeUninstall, async () => {
    await runSafely('彻底停用', async () => {
      const confirm = await vscode.window.showWarningMessage(
        '[Woodfish Theme] 这会移除运行时注入并尝试恢复 workbench 备份，是否继续？',
        { modal: true },
        '继续移除'
      );

      if (confirm !== '继续移除') {
        return;
      }

      await deps.runtimeService.completeUninstall();
      deps.featureState.refreshFromConfig();
    });
  });
}
