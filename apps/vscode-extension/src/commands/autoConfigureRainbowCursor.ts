import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerAutoConfigureRainbowCursorCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.autoConfigureRainbowCursor, async () => {
    await runSafely('配置彩色光标', async () => {
      await deps.featureState.set('cursor', true);
      await deps.runtimeService.enableTheme();
      deps.featureState.refreshFromConfig();
    });
  });
}
