import * as vscode from 'vscode';
import { showInfoMessage } from '../ui/notifications';

const DEPENDENCY_EXTENSION = {
  id: 'BrandonKirbyson.vscode-animations',
  name: 'VSCode Animations',
  description: '为VSCode提供动画效果的插件',
} as const;

export async function checkDependencyExtension(context: vscode.ExtensionContext): Promise<void> {
  try {
    const installed = Boolean(vscode.extensions.getExtension(DEPENDENCY_EXTENSION.id));
    if (installed) {
      return;
    }

    const declinedKey = `declined-${DEPENDENCY_EXTENSION.id}`;
    const declined = context.globalState.get<boolean>(declinedKey, false);
    if (declined) {
      return;
    }

    const installAction = '安装依赖插件';
    const declineAction = '不再提示';
    const laterAction = '稍后';

    const selection = await vscode.window.showInformationMessage(
      `[Woodfish Theme] 检测到推荐依赖插件：${DEPENDENCY_EXTENSION.name}（${DEPENDENCY_EXTENSION.description}）。是否安装？`,
      installAction,
      declineAction,
      laterAction
    );

    if (selection === declineAction) {
      await context.globalState.update(declinedKey, true);
      showInfoMessage('已记录：不再提示安装依赖插件');
      return;
    }

    if (selection === installAction) {
      await vscode.commands.executeCommand('workbench.extensions.search', DEPENDENCY_EXTENSION.id);
      showInfoMessage('已打开扩展搜索，请点击安装依赖插件');
    }
  } catch {
    // ignore
  }
}

