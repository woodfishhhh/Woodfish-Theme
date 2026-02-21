import * as vscode from 'vscode';
import { registerAutoConfigureRainbowCursorCommand } from './autoConfigureRainbowCursor';
import { registerCompleteUninstallCommand } from './completeUninstall';
import { registerDisableThemeCommand } from './disableTheme';
import { registerEnableThemeCommand } from './enableTheme';
import { registerShowFeatureMenuCommand } from './showFeatureMenu';
import { registerToggleGlowCommand } from './toggleGlow';
import { registerToggleRainbowCursorCommand } from './toggleRainbowCursor';
import { CommandDeps } from './types';

export function registerCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const disposables: vscode.Disposable[] = [
    registerEnableThemeCommand(deps),
    registerDisableThemeCommand(deps),
    registerToggleGlowCommand(deps),
    registerAutoConfigureRainbowCursorCommand(deps),
    registerToggleRainbowCursorCommand(deps),
    registerShowFeatureMenuCommand(deps),
    registerCompleteUninstallCommand(deps),
  ];

  context.subscriptions.push(...disposables);
}

