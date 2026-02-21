import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { FeatureFlags } from '../types/features';

export class ThemeStatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = COMMANDS.showFeatureMenu;
    this.item.tooltip = 'Woodfish Theme - Click to toggle features';
    this.item.show();
    context.subscriptions.push(this.item);
  }

  public update(features: FeatureFlags): void {
    let text = '✨ Woodfish';
    if (features.glow) {
      text += ' ✨';
    }
    if (features.rainbow) {
      text += ' 🌈';
    }
    this.item.text = text;
  }

  public dispose(): void {
    this.item.dispose();
  }
}

