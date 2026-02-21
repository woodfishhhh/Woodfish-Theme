import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

type FeatureMenuItem = vscode.QuickPickItem & {
  command: string;
};

export function registerShowFeatureMenuCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.showFeatureMenu, async () => {
    await runSafely('切换功能菜单', async () => {
      const current = deps.featureState.current();
      const glowLabel = current.glow ? '$(check) Disable Glow' : '$(circle-large-outline) Enable Glow';
      const rainbowLabel = current.rainbow
        ? '$(check) Disable Rainbow Cursor'
        : '$(circle-large-outline) Enable Rainbow Cursor';

      const items: FeatureMenuItem[] = [
        { label: glowLabel, command: COMMANDS.toggleGlow },
        { label: rainbowLabel, command: COMMANDS.toggleRainbowCursor },
        { label: '$(x) Disable Woodfish Theme', command: COMMANDS.disable },
      ];

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select Woodfish Theme Feature to Toggle',
      });

      if (selection) {
        await vscode.commands.executeCommand(selection.command);
      }
    });
  });
}

