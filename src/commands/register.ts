import * as vscode from 'vscode';
import { registerAutoConfigureRainbowCursorCommand } from './autoConfigureRainbowCursor';
import { registerCompleteUninstallCommand } from './completeUninstall';
import { registerDisableThemeCommand } from './disableTheme';
import { registerEnableThemeCommand } from './enableTheme';
import { registerRepairWorkbenchCommand } from './repairWorkbench';
import { registerShowFeatureMenuCommand } from './showFeatureMenu';
import { registerToggleGlowCommand } from './toggleGlow';
import { registerToggleRainbowCursorCommand } from './toggleRainbowCursor';
import { registerToggleSyntaxGradientCommand } from './toggleSyntaxGradient';
import { CommandDeps } from './types';

export function registerCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const disposables: vscode.Disposable[] = [
    registerEnableThemeCommand(deps),
    registerDisableThemeCommand(deps),
    registerToggleSyntaxGradientCommand(deps),
    registerToggleGlowCommand(deps),
    registerAutoConfigureRainbowCursorCommand(deps),
    registerToggleRainbowCursorCommand(deps),
    registerShowFeatureMenuCommand(deps),
    registerRepairWorkbenchCommand(deps),
    registerCompleteUninstallCommand(deps),
  ];

  context.subscriptions.push(...disposables);
}
