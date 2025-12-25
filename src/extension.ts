import * as vscode from 'vscode';
import { getExtensionPaths } from './lib/paths';
import { showErrorMessage, showInfoMessage } from './lib/vscodeUi';
import {
  configureRainbowCursor,
  configureThemeCss,
  removeRainbowCursor,
  removeThemeCss,
  validateAndCleanupCssImports,
} from './lib/customCss';
import { checkDependencyExtension } from './lib/dependency';
import { initializeVersionCheck } from './lib/versioning';
import { completeUninstallFlow } from './lib/uninstall';

/**
 * 扩展配置命名空间（对应 package.json contributes.configuration）。
 */
const CONFIG_SECTION = 'woodfishTheme';

let extensionContext: vscode.ExtensionContext | null = null;

/**
 * 切换一个布尔配置项。
 *
 * @param key 配置键（相对 CONFIG_SECTION，例如 `enableGlowEffects`）
 * @param defaultValue 没有配置时使用的默认值
 * @param onLabel 切换到 true 时的提示文案
 * @param offLabel 切换到 false 时的提示文案
 * @returns 切换后的新值
 */
async function toggleBooleanSetting(
  key: string,
  defaultValue: boolean,
  onLabel: string,
  offLabel: string,
): Promise<boolean> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const current = config.get<boolean>(key, defaultValue);
  const next = !current;

  await config.update(key, next, vscode.ConfigurationTarget.Global);
  showInfoMessage(next ? onLabel : offLabel);
  return next;
}

/**
 * 注册配置变更监听。
 *
 * 说明：发光/毛玻璃等效果依赖第三方 Custom CSS 注入，变更后通常需要用户在该扩展里 reload。
 */
function registerConfigurationListener(context: vscode.ExtensionContext): void {
  const listener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(`${CONFIG_SECTION}.enableGlowEffects`)) {
      showInfoMessage(
        '发光效果配置已更新，请通过 Custom CSS 扩展重新加载以查看效果',
      );
    }

    if (event.affectsConfiguration(`${CONFIG_SECTION}.enableGlassEffect`)) {
      showInfoMessage(
        '毛玻璃效果配置已更新，请通过 Custom CSS 扩展重新加载以查看效果',
      );
    }
  });

  context.subscriptions.push(listener);
}

/**
 * 注册扩展命令（package.json contributes.commands）。
 */
function registerCommands(context: vscode.ExtensionContext): void {
  const paths = getExtensionPaths(context);

  const enable = vscode.commands.registerCommand(
    'woodfish-theme.enable',
    async () => {
      try {
        await configureThemeCss(paths);

        const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
        const rainbowEnabled = config.get<boolean>(
          'enableRainbowCursor',
          false,
        );
        if (rainbowEnabled) {
          await configureRainbowCursor(paths);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showErrorMessage(`启用主题失败: ${message}`);
      }
    },
  );

  const disable = vscode.commands.registerCommand(
    'woodfish-theme.disable',
    async () => {
      try {
        await removeThemeCss(paths);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showErrorMessage(`禁用主题失败: ${message}`);
      }
    },
  );

  const toggleGlow = vscode.commands.registerCommand(
    'woodfish-theme.toggleGlow',
    async () => {
      try {
        await toggleBooleanSetting(
          'enableGlowEffects',
          true,
          '发光效果已开启，请重新加载 VSCode 生效',
          '发光效果已关闭，请重新加载 VSCode 生效',
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showErrorMessage(`切换发光效果失败: ${message}`);
      }
    },
  );

  const toggleGlass = vscode.commands.registerCommand(
    'woodfish-theme.toggleGlassEffect',
    async () => {
      try {
        await toggleBooleanSetting(
          'enableGlassEffect',
          true,
          '毛玻璃效果已开启，请重新加载 VSCode 生效',
          '毛玻璃效果已关闭，请重新加载 VSCode 生效',
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showErrorMessage(`切换毛玻璃效果失败: ${message}`);
      }
    },
  );

  const autoConfigureRainbow = vscode.commands.registerCommand(
    'woodfish-theme.autoConfigureRainbowCursor',
    async () => {
      try {
        await configureRainbowCursor(paths);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showErrorMessage(`配置彩色光标失败: ${message}`);
      }
    },
  );

  const toggleRainbow = vscode.commands.registerCommand(
    'woodfish-theme.toggleRainbowCursor',
    async () => {
      try {
        const next = await toggleBooleanSetting(
          'enableRainbowCursor',
          false,
          '彩色光标效果已开启',
          '彩色光标效果已关闭',
        );
        if (next) {
          await configureRainbowCursor(paths);
        } else {
          await removeRainbowCursor(paths);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showErrorMessage(`切换彩色光标失败: ${message}`);
      }
    },
  );

  const completeUninstall = vscode.commands.registerCommand(
    'woodfish-theme.completeUninstall',
    async () => {
      try {
        await completeUninstallFlow(context);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showErrorMessage(`彻底停用失败: ${message}`);
      }
    },
  );

  context.subscriptions.push(
    enable,
    disable,
    toggleGlow,
    toggleGlass,
    autoConfigureRainbow,
    toggleRainbow,
    completeUninstall,
  );
}

/**
 * VS Code 扩展入口：激活。
 *
 * 激活时做的事情：
 * - 注册命令/监听
 * - 初始化版本记录
 * - 异步检查推荐依赖扩展
 * - 延迟清理一次 Custom CSS imports，避免历史残留
 */
export function activate(context: vscode.ExtensionContext): void {
  extensionContext = context;

  try {
    registerCommands(context);
    registerConfigurationListener(context);

    initializeVersionCheck(context);
    void checkDependencyExtension(context);

    // 延迟做一次清理，避免与其他扩展初始化冲突
    setTimeout(() => {
      void validateAndCleanupCssImports();
    }, 5000);

    if (context.extensionMode === vscode.ExtensionMode.Development) {
      showInfoMessage('扩展已在开发模式下激活');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showErrorMessage(`扩展激活失败: ${message}`);
  }
}

/**
 * VS Code 扩展入口：停用。
 *
 * 注意：停用不会自动撤销注入；撤销需由用户显式执行“禁用/彻底停用”命令。
 */
export function deactivate(): void {
  extensionContext = null;
}
