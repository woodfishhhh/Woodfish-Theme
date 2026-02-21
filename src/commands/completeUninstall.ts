import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { completeUninstallFlow } from '../services/uninstall';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerCompleteUninstallCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.completeUninstall, async () => {
    await runSafely('彻底停用', async () => {
      await completeUninstallFlow(deps.extensionContext);
      deps.featureState.refreshFromConfig();
    });
  });
}

