import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerToggleRainbowCursorCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.toggleRainbowCursor, async () => {
    await runSafely('切换彩色光标', async () => {
      const features = await deps.featureState.toggle('rainbow');
      await deps.customCssService.applyFeatures(deps.themePaths, features);
    });
  });
}

