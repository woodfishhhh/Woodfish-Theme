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
          label: '$(play) 开启 Woodfish 主题',
          description: current.runtimeEnabled ? '当前：已启用' : '启用一体化 runtime 注入',
          command: COMMANDS.enable,
        },
        {
          label: '$(primitive-square) 关闭 Woodfish 主题',
          description: current.runtimeEnabled ? '移除当前 Woodfish 注入' : '当前：已停用',
          command: COMMANDS.disable,
        },
        {
          label: '$(symbol-color) 开启/关闭 Woodfish 彩色字体',
          description: current.syntaxGradient ? '当前：已开启' : '当前：已关闭',
          command: COMMANDS.toggleSyntaxGradient,
        },
        {
          label: '$(sparkle) 开启/关闭 Woodfish 发光字体',
          description: current.glow ? '当前：已开启' : '当前：已关闭',
          command: COMMANDS.toggleGlow,
        },
        {
          label: '$(paintcan) 开启 Woodfish 彩色光标',
          description: '自动配置或重新注入彩色光标样式',
          command: COMMANDS.autoConfigureRainbowCursor,
        },
        {
          label: '$(wand) 开启/关闭彩色光标',
          description: current.cursor ? '当前：已开启' : '当前：已关闭',
          command: COMMANDS.toggleRainbowCursor,
        },
        {
          label: '$(tools) 修复 Woodfish 注入',
          description: '重新修复 workbench 注入和运行时状态',
          command: COMMANDS.repairWorkbench,
        },
        {
          label: '$(trash) 彻底停用 Woodfish 主题',
          description: '清理运行时注入并尝试恢复 workbench',
          command: COMMANDS.completeUninstall,
        },
        {
          label: '$(sync) Reload Window',
          description: '重新加载 VS Code 窗口',
          command: COMMANDS.reloadWindow,
        },
      ];

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: '选择要执行的 Woodfish / VS Code 指令',
      });

      if (selection) {
        await vscode.commands.executeCommand(selection.command);
      }
    });
  });
}
