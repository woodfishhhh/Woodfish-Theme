import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 扩展内置资源的绝对路径集合。
 *
 * 这些路径必须通过 `context.asAbsolutePath(...)` 解析，避免编译后运行时目录变化（out/）。
 */
export type ExtensionPaths = {
  themeIndexCss: string;
  themeJson: string;
  rainbowCursorCss: string;
  cursorLoaderCss: string;
};

/**
 * 计算扩展内置文件的绝对路径。
 *
 * @param context VS Code 扩展上下文
 */
export function getExtensionPaths(
  context: vscode.ExtensionContext,
): ExtensionPaths {
  // 统一用 asAbsolutePath，避免编译后 __dirname 指向 out/
  const base = (segments: string[]) =>
    context.asAbsolutePath(path.join(...segments));

  return {
    themeIndexCss: base(['themes', 'Bearded Theme', 'index.css']),
    themeJson: base(['themes', 'Bearded Theme', 'Bearded Theme.json']),
    rainbowCursorCss: base(['themes', 'Bearded Theme', 'rainbow-cursor.css']),
    cursorLoaderCss: base(['themes', 'Bearded Theme', 'cursor-loader.css']),
  };
}

/**
 * 将本地绝对路径转换为 `file:///` URI 字符串。
 *
 * 注意：此函数不会对空格等字符做 URI 编码；这是为了与部分 Custom CSS 扩展的历史用法保持兼容。
 * 若未来需要更严格的 URI（编码空格等），建议改为 `vscode.Uri.file(path).toString(true)` 并配套
 * 调整去重/签名匹配逻辑，避免同一路径以不同编码形式重复写入。
 */
export function toFileUriString(absolutePath: string): string {
  // Custom CSS 扩展习惯使用 file:/// URI
  const normalized = absolutePath.replace(/\\/g, '/');
  return `file:///${normalized}`;
}
