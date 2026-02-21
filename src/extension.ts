import * as vscode from 'vscode';
import { FeatureStateController } from './config/featureState';
import { registerCommands } from './commands/register';
import type { CommandDeps } from './commands/types';
import { CustomCssService } from './services/customCss/service';
import { checkDependencyExtension } from './services/dependency';
import { getThemePaths } from './services/themePaths';
import { initializeVersionCheck } from './services/versioning';
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

    const commandDeps: CommandDeps = {
      featureState,
      customCssService: new CustomCssService(),
      themePaths: getThemePaths(context),
      extensionContext: context,
    };

    registerCommands(context, commandDeps);

    initializeVersionCheck(context);
    void checkDependencyExtension(context);

    setTimeout(() => {
      void commandDeps.customCssService.cleanupStaleImports();
    }, 5000);

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
