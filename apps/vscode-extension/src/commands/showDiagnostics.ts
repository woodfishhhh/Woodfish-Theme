import * as vscode from 'vscode';
import { readCurrentColorTheme, readRuntimeSettings } from '../config/featureFlags';
import { COMMANDS } from '../constants/commands';
import { buildDiagnosticsReport } from '../services/runtime/diagnostics';
import { showInfoMessage } from '../ui/notifications';
import { getRecentLogLines } from '../ui/output';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

export function registerShowDiagnosticsCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.showDiagnostics, async () => {
    await runSafely('生成诊断信息', async () => {
      const packageJson = deps.extensionContext.extension?.packageJSON as
        { version?: string } | undefined;
      const report = buildDiagnosticsReport({
        extensionVersion: packageJson?.version ?? 'unknown',
        vscodeVersion: vscode.version,
        appName: vscode.env.appName,
        appRoot: vscode.env.appRoot,
        remoteName: vscode.env.remoteName,
        uiKind: vscode.env.uiKind === vscode.UIKind.Web ? 'Web' : 'Desktop',
        platform: process.platform,
        arch: process.arch,
        activeTheme: readCurrentColorTheme(),
        location: deps.runtimeService.getLocation(),
        settings: readRuntimeSettings(),
        recentLog: getRecentLogLines(),
      });

      await vscode.env.clipboard.writeText(report);
      const document = await vscode.workspace.openTextDocument({
        language: 'markdown',
        content: report,
      });
      await vscode.window.showTextDocument(document, { preview: true });
      showInfoMessage('诊断信息已复制到剪贴板，提交 GitHub issue 时直接粘贴即可。');
    });
  });
}
