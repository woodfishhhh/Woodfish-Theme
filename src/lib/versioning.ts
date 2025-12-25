import * as vscode from 'vscode';

const VERSION_KEY = 'woodfish-theme-vscode-version';

/**
 * 初始化 VS Code 版本记录。
 *
 * 用途：在 VS Code 更新后，某些注入/配置行为可能需要重新验证。
 * 这里选择“只记录不弹窗”，避免启动时打扰用户；真正的提示应由具体功能流程触发。
 */
export function initializeVersionCheck(context: vscode.ExtensionContext): void {
  try {
    const current = vscode.version;
    const last = context.globalState.get<string | undefined>(VERSION_KEY);

    if (last && last !== current) {
      // 仅记录，避免弹窗骚扰；真正的提示由命令/功能流程触发
      console.log(
        `[Woodfish Theme] VSCode version changed: ${last} -> ${current}`,
      );
    }

    void context.globalState.update(VERSION_KEY, current);
  } catch {
    // ignore
  }
}
