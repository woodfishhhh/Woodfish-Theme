import * as fs from 'fs';
import { FeatureFlags } from '../../types/features';
import { showInfoMessage, showReloadPrompt } from '../../ui/notifications';
import { getOutputChannel } from '../../ui/output';
import { withProgressNotification } from '../../ui/progress';
import { ThemePaths, toFileUriString } from '../themePaths';
import { detectPreferredCssExtension, getAllSupportedCssExtensions } from './extensions';
import { cleanupCssImports, ensureCssImport, removeCssImports } from './importStore';
import { selectThemeCssPath } from './selectThemeCss';

function normalizeImportPath(importPath: string): string {
  return importPath.toLowerCase().replace(/\\/g, '/').replace(/%20/g, ' ');
}

function isWoodfishImport(importPath: string): boolean {
  const normalized = normalizeImportPath(importPath);
  return (
    normalized.includes('woodfish-theme.css') ||
    normalized.includes('themes/bearded theme/') ||
    normalized.includes('glow-effects.css') ||
    normalized.includes('rainbow-cursor.css') ||
    normalized.includes('cursor-animation.css') ||
    normalized.includes('cursor-loader.css') ||
    normalized.includes('transparent-ui.css')
  );
}

export class CustomCssService {
  public async applyFeatures(paths: ThemePaths, features: FeatureFlags): Promise<void> {
    await withProgressNotification('正在配置 Woodfish 主题样式...', async () => {
      const supported = detectPreferredCssExtension();
      if (!supported) {
        throw new Error(
          '未检测到 Custom CSS 扩展：请安装 Custom CSS and JS Loader 或 Custom CSS Hot Reload'
        );
      }

      const cssPath = selectThemeCssPath(paths, features);
      if (!fs.existsSync(cssPath)) {
        throw new Error(`主题 CSS 文件不存在: ${cssPath}`);
      }

      await removeCssImports(supported.configKey, isWoodfishImport);
      const fileUri = toFileUriString(cssPath);
      await ensureCssImport(supported.configKey, fileUri, ['themes', 'bearded theme']);

      getOutputChannel().appendLine(`Applied CSS: ${cssPath}`);
      showReloadPrompt('Woodfish 主题配置已更新，请重新加载 VSCode。').catch(() => {});
    });
  }

  public async removeAllImports(): Promise<void> {
    await withProgressNotification('正在移除 Woodfish 主题样式...', async () => {
      let removedTotal = 0;
      for (const extension of getAllSupportedCssExtensions()) {
        removedTotal += await removeCssImports(extension.configKey, isWoodfishImport);
      }

      getOutputChannel().appendLine(`Removed ${removedTotal} imports.`);
      if (removedTotal > 0) {
        showReloadPrompt('Woodfish 主题已彻底移除，请重新加载 VSCode。').catch(() => {});
      } else {
        showInfoMessage('主题配置未找到或已移除');
      }
    });
  }

  public async cleanupStaleImports(): Promise<void> {
    const keys = getAllSupportedCssExtensions().map((extension) => extension.configKey);
    await cleanupCssImports(keys);
  }
}

