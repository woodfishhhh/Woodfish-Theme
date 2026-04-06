import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { FeatureFlags } from '../types/features';

export class ThemeStatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = COMMANDS.showFeatureMenu;
    this.item.tooltip = 'Woodfish Theme - Click to configure integrated effects';
    this.item.show();
    context.subscriptions.push(this.item);
  }

  public update(features: FeatureFlags): void {
    const segments = ['Woodfish'];

    if (!features.runtimeEnabled) {
      segments.push('off');
    }
    if (features.syntaxGradient) {
      segments.push('A');
    }
    if (features.glow) {
      segments.push('G');
    }
    if (features.cursor) {
      segments.push('C');
    }

    this.item.text = segments.join(' ');
  }

  public dispose(): void {
    this.item.dispose();
  }
}
