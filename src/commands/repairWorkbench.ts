import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerRepairWorkbenchCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.repairWorkbench, async () => {
    await runSafely('修复注入', async () => {
      await deps.runtimeService.repairWorkbench();
    });
  });
}
