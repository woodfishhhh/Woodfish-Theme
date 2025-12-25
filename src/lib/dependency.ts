import * as vscode from 'vscode';
import { showInfoMessage } from './vscodeUi';

/**
 * 可选依赖扩展信息。
 *
 * 该扩展用于提供动画效果；缺失不会影响核心功能，但会影响体验。
 */
const DEPENDENCY_EXTENSION = {
  id: 'BrandonKirbyson.vscode-animations',
  name: 'VSCode Animations',
  description: '为VSCode提供动画效果的插件',
} as const;

/**
 * 检查推荐依赖扩展是否安装；若未安装则提示用户安装。
 *
 * 设计目标：
 * - 不强依赖：未安装时仅提示，不阻塞功能
 * - 不骚扰：支持“不再提示”的持久化开关（globalState）
 *
 * @param context 扩展上下文，用于读写 globalState。
 */
export async function checkDependencyExtension(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    const installed = Boolean(
      vscode.extensions.getExtension(DEPENDENCY_EXTENSION.id),
    );
    if (installed) return;

    const declinedKey = `declined-${DEPENDENCY_EXTENSION.id}`;
    const declined = context.globalState.get<boolean>(declinedKey, false);
    if (declined) return;

    const installAction = '安装依赖插件';
    const declineAction = '不再提示';
    const laterAction = '稍后';

    const selection = await vscode.window.showInformationMessage(
      `[Woodfish Theme] 检测到推荐依赖插件：${DEPENDENCY_EXTENSION.name}（${DEPENDENCY_EXTENSION.description}）。是否安装？`,
      installAction,
      declineAction,
      laterAction,
    );

    if (selection === declineAction) {
      await context.globalState.update(declinedKey, true);
      showInfoMessage('已记录：不再提示安装依赖插件');
      return;
    }

    if (selection === installAction) {
      // 更兼容的方式：打开扩展搜索页，让用户点击安装
      await vscode.commands.executeCommand(
        'workbench.extensions.search',
        DEPENDENCY_EXTENSION.id,
      );
      showInfoMessage('已打开扩展搜索，请点击安装依赖插件');
    }
  } catch {
    // ignore
  }
}
