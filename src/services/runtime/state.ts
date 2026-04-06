import * as vscode from 'vscode';

export type RuntimeInstallState = {
  workbenchPath?: string;
  backupPath?: string;
  payloadHash?: string;
  vscodeVersion?: string;
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
