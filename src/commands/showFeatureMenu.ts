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
      const items: FeatureMenuItem[] = [
        {
          label: current.syntaxGradient
            ? '$(check) 关闭彩色字体'
            : '$(circle-large-outline) 开启彩色字体',
          command: COMMANDS.toggleSyntaxGradient,
        },
        {
          label: current.glow ? '$(check) 关闭发光字体' : '$(circle-large-outline) 开启发光字体',
          command: COMMANDS.toggleGlow,
        },
        {
          label: current.cursor ? '$(check) 关闭彩色光标' : '$(circle-large-outline) 开启彩色光标',
          command: COMMANDS.toggleRainbowCursor,
        },
        { label: '$(tools) 修复注入', command: COMMANDS.repairWorkbench },
        { label: '$(x) 关闭 Woodfish 主题', command: COMMANDS.disable },
      ];

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: '选择要切换的 Woodfish 一体化功能',
      });

      if (selection) {
        await vscode.commands.executeCommand(selection.command);
      }
    });
  });
}
