import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerEnableThemeCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.enable, async () => {
    await runSafely('启用主题', async () => {
      await deps.runtimeService.enableTheme();
      deps.featureState.refreshFromConfig();
    });
  });
}
