import * as vscode from 'vscode';

export type RuntimeInstallState = {
  stateVersion?: number;
  workbenchPath?: string;
  backupPath?: string;
  backupHash?: string;
  backupWorkbenchPath?: string;
  backupVscodeVersion?: string;
  backupCreatedAt?: string;
  payloadHash?: string;
  vscodeVersion?: string;
  legacyPayloads?: string[];
  lastSelectedThemeLabel?: string;
};

const STATE_KEY = 'woodfish.runtime.install-state';

export function readRuntimeInstallState(context: vscode.ExtensionContext): RuntimeInstallState {
  return context.globalState.get<RuntimeInstallState>(STATE_KEY, {});
}

export async function writeRuntimeInstallState(
  context: vscode.ExtensionContext,
  state: RuntimeInstallState
): Promise<void> {
  await context.globalState.update(STATE_KEY, state);
}

export async function clearRuntimeInstallState(context: vscode.ExtensionContext): Promise<void> {
  await context.globalState.update(STATE_KEY, undefined);
}

export function readLastSelectedThemeLabel(context: vscode.ExtensionContext): string | undefined {
  return readRuntimeInstallState(context).lastSelectedThemeLabel;
}

export async function writeLastSelectedThemeLabel(
  context: vscode.ExtensionContext,
  themeLabel: string
): Promise<void> {
  const state = readRuntimeInstallState(context);
  await writeRuntimeInstallState(context, {
    ...state,
    lastSelectedThemeLabel: themeLabel,
  });
}
