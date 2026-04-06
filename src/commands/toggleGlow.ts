import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerToggleGlowCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.toggleGlow, async () => {
    await runSafely('切换发光效果', async () => {
      await deps.featureState.toggle('glow');
      await deps.runtimeService.syncWithCurrentSettings({ showPrompt: true });
    });
  });
}
