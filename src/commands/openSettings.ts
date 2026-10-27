import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';

export function registerOpenSettingsCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.openSettings, async () => {
    await vscode.commands.executeCommand(
      COMMANDS.vscodeOpenSettings,
      '@ext:zhongjun.woodfish-theme'
    );
  });
}
