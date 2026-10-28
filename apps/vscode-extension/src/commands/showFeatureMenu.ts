import * as vscode from 'vscode';
import { readRuntimeSettings } from '../config/featureFlags';
import { COMMANDS } from '../constants/commands';
import { hostName } from '../ui/hostApp';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

type FeatureMenuItem = vscode.QuickPickItem & {
  command?: string;
};

function state(enabled: boolean): string {
  return enabled ? '当前：已开启' : '当前：已关闭';
}

function separator(label: string): FeatureMenuItem {
  return { label, kind: vscode.QuickPickItemKind.Separator };
}

export function registerShowFeatureMenuCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.showFeatureMenu, async () => {
    await runSafely('切换功能菜单', async () => {
      const current = deps.featureState.current();
      const runtime = deps.runtimeService.getRuntimeStatus(current);
      const settings = readRuntimeSettings();
      const nativeSupported = process.platform === 'darwin' || process.platform === 'win32';
      const host = hostName();
      const items: FeatureMenuItem[] = [
        separator('叠层'),
        {
          label: '$(layers-active) 开启 Woodfish 通用叠层',
          description:
            runtime.state === 'on'
              ? `重新写入叠层并保持当前主题 ${runtime.activeTheme || '未检测到'}`
              : `在当前主题 ${runtime.activeTheme || '未检测到'} 上启用叠层`,
          command: COMMANDS.enable,
        },
        {
          label: '$(circle-slash) 关闭 Woodfish 通用叠层',
          description: runtime.state === 'off' ? '当前：叠层已关闭' : '移除叠层但保留各项参数',
          command: COMMANDS.disable,
        },
        separator('效果'),
        {
          label: '$(symbol-color) 开启/关闭 Woodfish 彩色字体',
          description: state(current.syntaxGradient),
          command: COMMANDS.toggleSyntaxGradient,
        },
        {
          label: '$(sparkle) 开启/关闭 Woodfish 发光字体',
          description: state(current.glow),
          command: COMMANDS.toggleGlow,
        },
        {
          label: '$(wand) 开启/关闭彩色光标',
          description: state(current.cursor),
          command: COMMANDS.toggleRainbowCursor,
        },
        {
          label: '$(paintcan) 选择光标配色…',
          description: '彩虹、Dracula、赛博朋克、自定义颜色',
          command: COMMANDS.pickCursorPalette,
        },
        separator('毛玻璃'),
        {
          label: '$(window) 开启/关闭毛玻璃',
          description: `${state(current.glass)}（菜单、悬浮提示、命令面板、通知等）`,
          command: COMMANDS.toggleGlass,
        },
        ...(nativeSupported
          ? [
              {
                label: '$(beaker) 开启/关闭系统级透明窗口（实验）',
                description: `${state(settings.glass.enabled && settings.glass.nativeWindow.enabled)}，需要完全重启 ${host}`,
                command: COMMANDS.toggleNativeWindow,
              },
            ]
          : []),
        separator('预设'),
        {
          label: '$(symbol-misc) 选择效果预设…',
          description: '默认、柔和护眼、霓虹全开、毛玻璃、专注、性能优先、我的预设',
          command: COMMANDS.applyPreset,
        },
        {
          label: '$(settings-gear) 打开 Woodfish 设置',
          command: COMMANDS.openSettings,
        },
        separator('维护'),
        {
          label: '$(tools) 修复 Woodfish 注入',
          description: `${host} 更新后效果消失时使用`,
          command: COMMANDS.repairWorkbench,
        },
        {
          label: '$(bug) 生成诊断信息',
          description: '复制到剪贴板，提交 issue 时粘贴',
          command: COMMANDS.showDiagnostics,
        },
        {
          label: '$(trash) 彻底停用 Woodfish 叠层',
          description: '移除全部注入、备份与系统级窗口钩子',
          command: COMMANDS.completeUninstall,
        },
        {
          label: '$(sync) Reload Window',
          description: `重新加载 ${host} 窗口`,
          command: COMMANDS.reloadWindow,
        },
      ];

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: `选择 Woodfish 叠层或 ${host} 指令`,
      });

      if (selection?.command) {
        await vscode.commands.executeCommand(selection.command);
      }
    });
  });
}
