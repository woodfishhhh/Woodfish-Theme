import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerDisableThemeCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.disable, async () => {
    await runSafely('禁用主题', async () => {
      await deps.customCssService.removeAllImports();
    });
  });
}

