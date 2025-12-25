import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { showInfoMessage, showReloadPrompt } from './vscodeUi';

const TAG_ATTRIBUTE = 'data-woodfish-theme';

/**
 * 尝试定位 VS Code workbench.html（不同版本/渠道路径可能不同）。
 *
 * 说明：
 * - 本函数用于清理旧版本可能写入 workbench.html 的残留注入
 * - 现代 VS Code 多数情况下不需要直接改 workbench；此处为“兜底清理”
 * - 由于 VS Code 安装路径/架构差异，此处是 best-effort：找不到则返回 null
 */
function getWorkbenchHtmlPath(): string | null {
  try {
    const appDirectory = require.main
      ? path.dirname(require.main.filename)
      : (globalThis as any)._VSCODE_FILE_ROOT;
    const baseDirectory = path.join(appDirectory, 'vs', 'code');

    const possiblePaths = [
      path.join(
        baseDirectory,
        'electron-sandbox',
        'workbench',
        'workbench.html',
      ),
      path.join(
        baseDirectory,
        'electron-sandbox',
        'workbench',
        'workbench-apc-extension.html',
      ),
      path.join(
        baseDirectory,
        'electron-sandbox',
        'workbench',
        'workbench.esm.html',
      ),
      path.join(
        baseDirectory,
        'electron-browser',
        'workbench',
        'workbench.esm.html',
      ),
      path.join(
        baseDirectory,
        'electron-browser',
        'workbench',
        'workbench.html',
      ),
    ];

    for (const htmlPath of possiblePaths) {
      if (fs.existsSync(htmlPath)) return htmlPath;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 从 workbench.html 内容中移除 Woodfish 主题相关的旧注入片段。
 *
 * 策略：
 * 1) 优先按 `data-woodfish-theme` 标记精确删除
 * 2) 再按关键词做保守匹配（用于极旧版本残留）
 */
function cleanThemeStyles(htmlContent: string): string {
  // 保守清理：优先按标记属性清理，其次按关键词清理
  let cleaned = htmlContent;

  const rules: RegExp[] = [
    new RegExp(`<style[^>]*${TAG_ATTRIBUTE}[^>]*>[\\s\\S]*?</style>`, 'gi'),
    new RegExp(`<script[^>]*${TAG_ATTRIBUTE}[^>]*>[\\s\\S]*?</script>`, 'gi'),
    /<style[^>]*(?:woodfish|glow|gradient|rainbow|cursor|animation)[^>]*>[\s\S]*?<\/style>/gi,
    /<script[^>]*(?:woodfish|glow|gradient|rainbow|cursor|animation)[^>]*>[\s\S]*?<\/script>/gi,
  ];

  for (const rule of rules) {
    cleaned = cleaned.replace(rule, '');
  }

  return cleaned;
}

/**
 * 从 Custom CSS 注入列表中尽可能移除 Woodfish 相关条目。
 *
 * 注意：这里是“尽力而为”的关键词匹配，为兼容历史版本可能出现的多种文件名。
 */
async function removeAllWoodfishCssFromCustomCss(): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  const keys: Array<
    'vscode_custom_css.imports' | 'custom_css_hot_reload.imports'
  > = ['vscode_custom_css.imports', 'custom_css_hot_reload.imports'];

  const keywords = [
    'woodfish-theme',
    'glow-effects',
    'cursor-animation',
    'rainbow-cursor',
    'transparent-ui',
    'activity-bar',
    'tab-bar',
    'syntax-highlighting',
    'variables.css',
    'cursor-loader',
    // 光标动画相关关键词
    'bp-animation',
    'cursor-hue',
    'cursor-blink',
    'cursors-layer',
    'cursor-secondary',
    '.cursor',
    'monaco-editor .cursor',
    'div.cursor',
  ].map((k) => k.toLowerCase());

  for (const key of keys) {
    const current = config.get<string[]>(key, []);
    if (!Array.isArray(current) || current.length === 0) continue;

    const filtered = current.filter((p) => {
      const lower = p.toLowerCase();
      return !keywords.some((k) => lower.includes(k));
    });

    if (filtered.length !== current.length) {
      await config.update(key, filtered, vscode.ConfigurationTarget.Global);
    }
  }
}

/**
 * 清理旧版本可能写入 workbench.html 的注入内容，并写入备份文件。
 *
 * 备份策略：如果发生修改，会在同目录生成 `*.woodfish-backup`，便于用户回滚。
 */
async function cleanOldHtmlInjections(): Promise<void> {
  const htmlPath = getWorkbenchHtmlPath();
  if (!htmlPath || !fs.existsSync(htmlPath)) return;

  try {
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    const cleaned = cleanThemeStyles(htmlContent);

    if (cleaned !== htmlContent) {
      fs.writeFileSync(`${htmlPath}.woodfish-backup`, htmlContent);
      fs.writeFileSync(htmlPath, cleaned);
    }
  } catch {
    // ignore
  }
}

/**
 * 重置与光标/主题相关的用户设置，尽量回到 VS Code 默认值。
 *
 * 说明：这里会写用户全局配置（Global），属于破坏性操作，因此只在用户确认后执行。
 */
async function resetCursorRelatedSettings(): Promise<void> {
  const config = vscode.workspace.getConfiguration();

  const cursorSettings = [
    'editor.cursorStyle',
    'editor.cursorWidth',
    'editor.cursorBlinking',
    'editor.cursorSmoothCaretAnimation',
    'editor.cursorSurroundingLines',
  ];

  for (const setting of cursorSettings) {
    await config.update(setting, undefined, vscode.ConfigurationTarget.Global);
  }

  // 禁用本扩展相关开关
  await config.update(
    'woodfishTheme.enableRainbowCursor',
    false,
    vscode.ConfigurationTarget.Global,
  );
  await config.update(
    'woodfishTheme.enableGlowEffects',
    false,
    vscode.ConfigurationTarget.Global,
  );
  await config.update(
    'woodfishTheme.enableGlassEffect',
    false,
    vscode.ConfigurationTarget.Global,
  );
}

/**
 * “彻底停用”流程：清理历史残留注入与配置，并提示用户 reload。
 *
 * 该流程可能会：
 * - 修改用户的 Custom CSS imports
 * - 在极端情况下改写 workbench.html（并生成备份）
 * - 重置部分用户设置（cursor 相关与本扩展开关）
 */
export async function completeUninstallFlow(
  context: vscode.ExtensionContext,
): Promise<void> {
  const confirmAction = '确认停用';
  const cancelAction = '取消';

  const selection = await vscode.window.showWarningMessage(
    '[Woodfish Theme] 此操作将尽可能清理 Woodfish 主题相关的 CSS 注入与配置（包含旧版本残留）。是否继续？',
    confirmAction,
    cancelAction,
  );

  if (selection !== confirmAction) {
    showInfoMessage('已取消彻底停用操作');
    return;
  }

  await removeAllWoodfishCssFromCustomCss();
  await cleanOldHtmlInjections();
  await resetCursorRelatedSettings();

  // 清理扩展状态
  try {
    await context.globalState.update(
      'woodfish-theme-vscode-version',
      undefined,
    );
    await context.globalState.update(
      'declined-BrandonKirbyson.vscode-animations',
      undefined,
    );
  } catch {
    // ignore
  }

  await showReloadPrompt('Woodfish主题已彻底停用！请重新加载 VSCode。');
}
