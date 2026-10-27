import * as vscode from 'vscode';
import { CONFIG_SECTION, GLASS_SETTING_KEYS } from '../constants/config';
import { COMMANDS } from '../constants/commands';
import { hostName } from '../ui/hostApp';
import { showInfoMessage } from '../ui/notifications';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerToggleGlassCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.toggleGlass, async () => {
    await runSafely('切换毛玻璃', async () => {
      await deps.featureState.toggle('glass');
      await deps.runtimeService.syncWithCurrentSettings({ showPrompt: true });
      deps.featureState.refreshFromConfig();
    });
  });
}

export function registerToggleNativeWindowCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.toggleNativeWindow, async () => {
    await runSafely('切换系统级透明窗口', async () => {
      if (process.platform !== 'darwin' && process.platform !== 'win32') {
        showInfoMessage('系统级透明窗口目前只支持 macOS 与 Windows 11。');
        return;
      }

      const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
      const enabled = config.get<boolean>(GLASS_SETTING_KEYS.nativeWindowEnabled, false);
      if (!enabled) {
        const confirm = '我了解，开启';
        const host = hostName();
        const choice = await vscode.window.showWarningMessage(
          `系统级透明窗口（实验）会在 ${host} 的 out/main.js 开头加入一行受保护的加载语句，每次 ${host} 更新后需要重新开启，生效需要完全退出 ${host}。关闭、彻底停用或卸载 Woodfish 时会自动还原。`,
          { modal: true },
          confirm
        );
        if (choice !== confirm) {
          return;
        }
        await deps.featureState.set('glass', true);
      }

      await config.update(
        GLASS_SETTING_KEYS.nativeWindowEnabled,
        !enabled,
        vscode.ConfigurationTarget.Global
      );
      await deps.runtimeService.syncWithCurrentSettings({ showPrompt: true });
      deps.featureState.refreshFromConfig();
    });
  });
}
