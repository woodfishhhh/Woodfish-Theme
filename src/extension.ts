import * as vscode from 'vscode';
import { FeatureStateController } from './config/featureState';
import { registerCommands } from './commands/register';
import type { CommandDeps } from './commands/types';
import { IntegratedThemeService } from './services/runtime/service';
import { showErrorMessage, showInfoMessage } from './ui/notifications';
import { getOutputChannel } from './ui/output';
import { ThemeStatusBar } from './ui/statusBar';

let statusBar: ThemeStatusBar | undefined;

export function activate(context: vscode.ExtensionContext): void {
  try {
    getOutputChannel().appendLine('Woodfish Theme activated');

    statusBar = new ThemeStatusBar(context);

    const featureState = new FeatureStateController(statusBar);
    featureState.registerConfigListener(context);

    const runtimeService = new IntegratedThemeService(context);
    runtimeService.registerLifecycle(context);

    const commandDeps: CommandDeps = {
      featureState,
      runtimeService,
      extensionContext: context,
    };

    registerCommands(context, commandDeps);
    void runtimeService.initializeOnStartup();

    if (context.extensionMode === vscode.ExtensionMode.Development) {
      showInfoMessage('扩展已在开发模式下激活');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showErrorMessage(`扩展激活失败: ${message}`);
  }
}

export function deactivate(): void {
  if (statusBar) {
    statusBar.dispose();
    statusBar = undefined;
  }
}
