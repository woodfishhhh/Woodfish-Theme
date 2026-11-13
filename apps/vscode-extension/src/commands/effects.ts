import * as vscode from 'vscode';
import { COMMANDS } from '../constants/commands';
import { showInfoMessage } from '../ui/notifications';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

/**
 * 「Woodfish: 刷新效果」 re-reads the effects folder and restarts every effect in the
 * workbench without reloading the window; 「Woodfish: 打开效果文件夹」 opens the folder.
 */
export function registerEffectsCommands(deps: CommandDeps): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(COMMANDS.reloadEffects, async () => {
      await runSafely('刷新效果', () => {
        const report = deps.effects.reload();
        const failed =
          report.failed.length > 0
            ? `；${report.failed.length} 个加载失败：${report.failed.map((item) => item.id).join('、')}（原因见输出面板 Woodfish）`
            : '';
        showInfoMessage(`已刷新效果（${report.loaded} 个）${failed}`);
        return Promise.resolve();
      });
    }),
    vscode.commands.registerCommand(COMMANDS.openEffectsFolder, async () => {
      await runSafely('打开效果文件夹', async () => {
        await vscode.env.openExternal(vscode.Uri.file(deps.effects.effectsDir));
      });
    }),
  ];
}
