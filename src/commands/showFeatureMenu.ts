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
      const runtime = deps.runtimeService.getRuntimeStatus(current);
      const items: FeatureMenuItem[] = [
        {
          label: '$(play) 开启 Woodfish 主题',
          description:
            runtime.state === 'on'
              ? '重新写入当前注入并保持 Woodfish Dark'
              : '切换到 Woodfish Dark 并写入一体化注入',
          command: COMMANDS.enable,
        },
        {
          label: '$(primitive-square) 关闭 Woodfish 主题',
          description:
            runtime.state === 'off' ? '当前：未检测到 Woodfish 注入' : '移除当前 Woodfish 注入',
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
          description: '重新扫描 workbench 并修复缺失或过期的注入',
          command: COMMANDS.repairWorkbench,
        },
        {
          label: '$(trash) 彻底停用 Woodfish 主题',
          description: '移除当前注入，并清理接管记录',
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
