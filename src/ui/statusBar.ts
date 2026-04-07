import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { FeatureFlags, RuntimeStatusSnapshot } from '../types/features';

export class ThemeStatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = COMMANDS.showFeatureMenu;
    this.item.tooltip = 'Woodfish Theme - Click to configure integrated effects';
    this.item.show();
    context.subscriptions.push(this.item);
  }

  public update(features: FeatureFlags, runtime: RuntimeStatusSnapshot): void {
    const segments = ['Woodfish', runtime.state];
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
    this.item.tooltip = [
      'Woodfish Theme - 点击打开功能菜单',
      `状态: ${runtime.state}`,
      `当前主题: ${runtime.activeTheme || '未检测到'}`,
      `payload: ${runtime.hasPayload ? 'present' : 'absent'}`,
      `特效: ${segments.slice(2).join(' ') || 'none'}`,
    ].join('\n');
  }

  public dispose(): void {
    this.item.dispose();
  }
}
