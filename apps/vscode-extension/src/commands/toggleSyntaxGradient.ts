import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerToggleSyntaxGradientCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.toggleSyntaxGradient, async () => {
    await runSafely('切换彩色字体', async () => {
      await deps.featureState.toggle('syntaxGradient');
      await deps.runtimeService.syncWithCurrentSettings({ showPrompt: true });
      deps.featureState.refreshFromConfig();
    });
  });
}
