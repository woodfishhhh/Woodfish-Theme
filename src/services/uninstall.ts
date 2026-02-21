import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { showInfoMessage, showReloadPrompt } from '../ui/notifications';

const TAG_ATTRIBUTE = 'data-woodfish-theme';

declare global {
  var _VSCODE_FILE_ROOT: string | undefined;
}

function getWorkbenchHtmlPath(): string | null {
  try {
    const appDirectory =
      globalThis._VSCODE_FILE_ROOT ?? (process.argv[1] ? path.dirname(process.argv[1]) : undefined);
    if (!appDirectory) {
      return null;
    }

    const baseDirectory = path.join(appDirectory, 'vs', 'code');
    const possiblePaths = [
      path.join(baseDirectory, 'electron-sandbox', 'workbench', 'workbench.html'),
      path.join(baseDirectory, 'electron-sandbox', 'workbench', 'workbench-apc-extension.html'),
      path.join(baseDirectory, 'electron-sandbox', 'workbench', 'workbench.esm.html'),
      path.join(baseDirectory, 'electron-browser', 'workbench', 'workbench.esm.html'),
      path.join(baseDirectory, 'electron-browser', 'workbench', 'workbench.html'),
    ];

    for (const htmlPath of possiblePaths) {
      if (fs.existsSync(htmlPath)) {
        return htmlPath;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function cleanThemeStyles(htmlContent: string): string {
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

async function removeAllWoodfishCssFromCustomCss(): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  const keys: Array<'vscode_custom_css.imports' | 'custom_css_hot_reload.imports'> = [
    'vscode_custom_css.imports',
    'custom_css_hot_reload.imports',
  ];

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
    'bp-animation',
    'cursor-hue',
    'cursor-blink',
    'cursors-layer',
    'cursor-secondary',
    '.cursor',
    'monaco-editor .cursor',
    'div.cursor',
  ].map((keyword) => keyword.toLowerCase());

  for (const key of keys) {
    const current = config.get<string[]>(key, []);
    if (!Array.isArray(current) || current.length === 0) {
      continue;
    }

    const filtered = current.filter((entry) => {
      const lower = entry.toLowerCase();
      return !keywords.some((keyword) => lower.includes(keyword));
    });

    if (filtered.length !== current.length) {
      await config.update(key, filtered, vscode.ConfigurationTarget.Global);
    }
  }
}

function cleanOldHtmlInjections(): void {
  const htmlPath = getWorkbenchHtmlPath();
  if (!htmlPath || !fs.existsSync(htmlPath)) {
    return;
  }

  try {
    const original = fs.readFileSync(htmlPath, 'utf-8');
    const cleaned = cleanThemeStyles(original);
    if (cleaned !== original) {
      fs.writeFileSync(`${htmlPath}.woodfish-backup`, original);
      fs.writeFileSync(htmlPath, cleaned);
    }
  } catch {
    // ignore
  }
}

async function resetCursorAndThemeSettings(): Promise<void> {
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

  await config.update(
    'woodfishTheme.enableRainbowCursor',
    false,
    vscode.ConfigurationTarget.Global
  );
  await config.update('woodfishTheme.enableGlowEffects', false, vscode.ConfigurationTarget.Global);
}

export async function completeUninstallFlow(context: vscode.ExtensionContext): Promise<void> {
  const confirmAction = '确认停用';
  const cancelAction = '取消';

  const selection = await vscode.window.showWarningMessage(
    '[Woodfish Theme] 此操作将尽可能清理 Woodfish 主题相关的 CSS 注入与配置（包含旧版本残留）。是否继续？',
    confirmAction,
    cancelAction
  );

  if (selection !== confirmAction) {
    showInfoMessage('已取消彻底停用操作');
    return;
  }

  await removeAllWoodfishCssFromCustomCss();
  cleanOldHtmlInjections();
  await resetCursorAndThemeSettings();

  try {
    await context.globalState.update('woodfish-theme-vscode-version', undefined);
    await context.globalState.update('declined-BrandonKirbyson.vscode-animations', undefined);
  } catch {
    // ignore
  }

  await showReloadPrompt('Woodfish主题已彻底停用！请重新加载 VSCode。');
}

