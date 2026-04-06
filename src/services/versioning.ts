import * as vscode from 'vscode';

const VERSION_KEY = 'woodfish-theme-vscode-version';

export function initializeVersionCheck(context: vscode.ExtensionContext): void {
  try {
    const current = vscode.version;
    const last = context.globalState.get<string | undefined>(VERSION_KEY);

    if (last && last !== current) {
      console.log(`[Woodfish Theme] VSCode version changed: ${last} -> ${current}`);
    }

    void context.globalState.update(VERSION_KEY, current);
  } catch {
    // ignore
  }
}
