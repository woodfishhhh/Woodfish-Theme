import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  showErrorMessage,
  showInfoMessage,
  showReloadPrompt,
} from './vscodeUi';
import { ExtensionPaths, toFileUriString } from './paths';

/**
 * 支持的「CSS 注入」扩展类型。
 *
 * 本扩展不直接修改 VS Code 的工作台资源，而是通过第三方扩展注入 CSS。
 * 目前兼容两种常见扩展：
 * - Custom CSS and JS Loader
 * - Custom CSS Hot Reload
 */
export type SupportedCssExtension =
  | {
      kind: 'custom-css';
      id: 'be5invis.vscode-custom-css';
      name: 'Custom CSS and JS Loader';
      configKey: 'vscode_custom_css.imports';
    }
  | {
      kind: 'hot-reload';
      id: 'bartag.custom-css-hot-reload';
      name: 'Custom CSS Hot Reload';
      configKey: 'custom_css_hot_reload.imports';
    };

/**
 * 检测当前已安装且受支持的 CSS 注入扩展。
 *
 * 优先选择 Custom CSS and JS Loader；如果未安装则回退到 Hot Reload。
 * @returns 受支持的扩展信息；均未安装则返回 null。
 */
export function detectSupportedCssExtension(): SupportedCssExtension | null {
  const customCss = vscode.extensions.getExtension(
    'be5invis.vscode-custom-css',
  );
  if (customCss) {
    return {
      kind: 'custom-css',
      id: 'be5invis.vscode-custom-css',
      name: 'Custom CSS and JS Loader',
      configKey: 'vscode_custom_css.imports',
    };
  }

  const hotReload = vscode.extensions.getExtension(
    'bartag.custom-css-hot-reload',
  );
  if (hotReload) {
    return {
      kind: 'hot-reload',
      id: 'bartag.custom-css-hot-reload',
      name: 'Custom CSS Hot Reload',
      configKey: 'custom_css_hot_reload.imports',
    };
  }

  return null;
}

/**
 * 确保某个 `file:///` URI 存在于指定扩展的 imports 配置中。
 *
 * @param configKey 目标扩展的配置键（如 `vscode_custom_css.imports`）。
 * @param fileUri 需要写入的 `file:///` URI。
 * @param signatureParts 可选的“签名片段”，用于容错匹配历史路径/编码差异，避免重复写入。
 * @returns 是否发生了写入：true 表示新增；false 表示已存在。
 */
export async function ensureCssImport(
  configKey: SupportedCssExtension['configKey'],
  fileUri: string,
  signatureParts: string[] = [],
): Promise<boolean> {
  const config = vscode.workspace.getConfiguration();
  const current = config.get<string[]>(configKey, []);

  const normalizedSignature = signatureParts
    .map((p) => p.toLowerCase())
    .filter((p) => p.length > 0);

  const already = current.some((p) => {
    if (p === fileUri) return true;
    if (normalizedSignature.length === 0) return false;

    const lower = p.toLowerCase();
    return normalizedSignature.every((part) => lower.includes(part));
  });
  if (already) {
    return false;
  }

  await config.update(
    configKey,
    [...current, fileUri],
    vscode.ConfigurationTarget.Global,
  );
  return true;
}

/**
 * 从指定扩展的 imports 配置中移除满足条件的条目。
 *
 * @param configKey 目标扩展的配置键。
 * @param predicate 判定是否需要移除。
 * @returns 实际移除数量。
 */
export async function removeCssImport(
  configKey: SupportedCssExtension['configKey'],
  predicate: (importPath: string) => boolean,
): Promise<number> {
  const config = vscode.workspace.getConfiguration();
  const current = config.get<string[]>(configKey, []);

  const filtered = current.filter((p) => !predicate(p));
  const removed = current.length - filtered.length;

  if (removed > 0) {
    await config.update(configKey, filtered, vscode.ConfigurationTarget.Global);
  }

  return removed;
}

/**
 * 校验并清理 Custom CSS 扩展的 imports 配置。
 *
 * 目标：
 * - 去重、去空值
 * - 对 `file:///` 本地路径做存在性检查（不存在则清理）
 *
 * 注意：为避免误删，非 `file:///` 的条目不会做存在性检查。
 * 同时使用 `vscode.Uri.parse(...).fsPath` 解析，可正确处理 `%20` 等 URI 编码。
 */
export async function validateAndCleanupCssImports(): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  const keys: SupportedCssExtension['configKey'][] = [
    'vscode_custom_css.imports',
    'custom_css_hot_reload.imports',
  ];

  for (const configKey of keys) {
    const imports = config.get<unknown>(configKey, []);
    if (!Array.isArray(imports) || imports.length === 0) continue;

    const valid: string[] = [];
    const seen = new Set<string>();

    for (const item of imports) {
      if (typeof item !== 'string' || item.trim().length === 0) continue;
      if (seen.has(item)) continue;

      // 只验证 file:/// 的本地路径
      if (item.startsWith('file:///')) {
        try {
          // 使用 VS Code 的 URI 解析，避免手写解析导致 `%20` 等编码路径被误判为不存在。
          const fsPath = vscode.Uri.parse(item).fsPath;

          if (!fsPath || !path.isAbsolute(fsPath)) {
            // 解析结果不可信则保留（避免误删）
          } else if (!fs.existsSync(fsPath)) {
            // 文件不存在则丢弃
            continue;
          }
        } catch {
          // 验证失败则保留（避免误删）
        }
      }

      valid.push(item);
      seen.add(item);
    }

    if (valid.length !== imports.length) {
      await config.update(configKey, valid, vscode.ConfigurationTarget.Global);
    }
  }
}

/**
 * 将主题主 CSS（themes/Bearded Theme/index.css）写入 Custom CSS 扩展配置。
 *
 * 行为：
 * - 自动检测受支持的 CSS 注入扩展
 * - 写入 imports（若已存在则仅提示）
 * - 成功写入后提示用户 reload
 */
export async function configureThemeCss(paths: ExtensionPaths): Promise<void> {
  const supported = detectSupportedCssExtension();
  if (!supported) {
    showInfoMessage(
      '未检测到 Custom CSS 扩展：请安装 Custom CSS and JS Loader 或 Custom CSS Hot Reload',
    );
    return;
  }

  if (!fs.existsSync(paths.themeIndexCss)) {
    showErrorMessage('主题 CSS 文件不存在，请检查扩展安装是否完整');
    return;
  }

  const fileUri = toFileUriString(paths.themeIndexCss);

  try {
    const added = await ensureCssImport(supported.configKey, fileUri, [
      'themes',
      'bearded theme',
      'index.css',
    ]);
    if (!added) {
      showInfoMessage(
        `主题样式已配置，请在 ${supported.name} 中重新加载以生效`,
      );
      return;
    }

    showReloadPrompt(
      `已写入主题样式到 ${supported.name} 配置，请重新加载 VSCode 应用效果。`,
    ).catch(() => {
      // ignore
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showErrorMessage(`配置主题 CSS 失败: ${message}`);
  }
}

/**
 * 将彩色光标 CSS（themes/Bearded Theme/rainbow-cursor.css）写入 Custom CSS 扩展配置。
 *
 * 若写入成功会提示 reload；若已存在则仅提示“已配置”。
 */
export async function configureRainbowCursor(
  paths: ExtensionPaths,
): Promise<void> {
  const supported = detectSupportedCssExtension();
  if (!supported) {
    showInfoMessage(
      '未检测到 Custom CSS 扩展：请安装 Custom CSS and JS Loader 或 Custom CSS Hot Reload',
    );
    return;
  }

  if (!fs.existsSync(paths.rainbowCursorCss)) {
    showErrorMessage('彩色光标 CSS 文件不存在，请检查扩展安装是否完整');
    return;
  }

  const fileUri = toFileUriString(paths.rainbowCursorCss);

  try {
    const added = await ensureCssImport(supported.configKey, fileUri, [
      'themes',
      'bearded theme',
      'rainbow-cursor.css',
    ]);
    if (added) {
      await showReloadPrompt(
        `已配置彩色光标到 ${supported.name}，请重新加载 VSCode 生效。`,
      );
    } else {
      showInfoMessage('彩色光标已配置');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showErrorMessage(`配置彩色光标失败: ${message}`);
  }
}

/**
 * 从两种 Custom CSS 扩展（若安装）中移除主题相关 CSS 注入。
 *
 * 为避免误删用户其它注入，移除逻辑是：
 * - 优先精确匹配本扩展生成的 file URI
 * - 兼容旧版本遗留的 `woodfish-theme.css`
 * - 通过签名片段匹配本主题 index.css
 */
export async function removeThemeCss(paths: ExtensionPaths): Promise<void> {
  const supportedCustom: SupportedCssExtension[] = [
    {
      kind: 'custom-css',
      id: 'be5invis.vscode-custom-css',
      name: 'Custom CSS and JS Loader',
      configKey: 'vscode_custom_css.imports',
    },
    {
      kind: 'hot-reload',
      id: 'bartag.custom-css-hot-reload',
      name: 'Custom CSS Hot Reload',
      configKey: 'custom_css_hot_reload.imports',
    },
  ];

  const themeUri = toFileUriString(paths.themeIndexCss);
  const themeSignature = ['themes', 'bearded theme', 'index.css'].map((s) =>
    s.toLowerCase(),
  );

  let removedTotal = 0;
  for (const ext of supportedCustom) {
    removedTotal += await removeCssImport(ext.configKey, (p) => {
      if (p === themeUri) return true;
      const lower = p.toLowerCase();

      // 兼容旧路径
      if (lower.includes('woodfish-theme.css')) return true;

      // 仅移除我们主题相关的 index.css（避免误删用户其他 index.css 注入）
      return themeSignature.every((part) => lower.includes(part));
    });
  }

  if (removedTotal > 0) {
    await showReloadPrompt(
      'Woodfish Theme 已禁用！请重新加载 VSCode 应用更改。',
    );
  } else {
    showInfoMessage('主题配置未找到或已移除');
  }
}

/**
 * 从两种 Custom CSS 扩展中移除彩色光标 CSS 注入。
 * @param paths 扩展内置资源路径集合。
 */
export async function removeRainbowCursor(
  paths: ExtensionPaths,
): Promise<void> {
  const keys: SupportedCssExtension['configKey'][] = [
    'vscode_custom_css.imports',
    'custom_css_hot_reload.imports',
  ];
  const cursorUri = toFileUriString(paths.rainbowCursorCss);
  const cursorSignature = ['themes', 'bearded theme', 'rainbow-cursor.css'].map(
    (s) => s.toLowerCase(),
  );

  let removedTotal = 0;
  for (const key of keys) {
    removedTotal += await removeCssImport(key, (p) => {
      if (p === cursorUri) return true;
      const lower = p.toLowerCase();
      return cursorSignature.every((part) => lower.includes(part));
    });
  }

  if (removedTotal > 0) {
    await showReloadPrompt('彩色光标配置已移除！请重新加载 VSCode 应用更改。');
  } else {
    showInfoMessage('彩色光标配置未找到或已移除');
  }
}
