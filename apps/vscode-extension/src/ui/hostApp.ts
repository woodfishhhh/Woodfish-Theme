import * as vscode from 'vscode';

/**
 * Short display name of the editor Woodfish runs in. VS Code forks (Cursor,
 * Kiro, Windsurf, Trae, VSCodium, …) report their own `appName`, so prompts
 * such as “请重新加载 Cursor” name the app the user actually has open.
 */
export function formatHostName(appName: string | undefined): string {
  const name = appName?.trim() ?? '';
  if (name.length === 0) {
    return 'VS Code';
  }
  if (name.startsWith('Visual Studio Code')) {
    return name.includes('Insiders') ? 'VS Code Insiders' : 'VS Code';
  }
  return name;
}

export function hostName(): string {
  return formatHostName(vscode.env?.appName);
}
