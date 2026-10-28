import * as vscode from 'vscode';

const MAX_RECENT_LINES = 40;

let outputChannel: vscode.OutputChannel | undefined;
const recentLines: string[] = [];

export type WoodfishOutput = {
  appendLine(value: string): void;
  show(preserveFocus?: boolean): void;
};

/** Keeps the last lines in memory so “诊断信息” can attach them to bug reports. */
export function getOutputChannel(): WoodfishOutput {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Woodfish Theme');
  }
  const channel = outputChannel;
  return {
    appendLine(value: string): void {
      recentLines.push(`${new Date().toISOString()} ${value}`);
      if (recentLines.length > MAX_RECENT_LINES) {
        recentLines.splice(0, recentLines.length - MAX_RECENT_LINES);
      }
      channel.appendLine(value);
    },
    show(preserveFocus?: boolean): void {
      channel.show(preserveFocus);
    },
  };
}

export function getRecentLogLines(): string[] {
  return [...recentLines];
}
