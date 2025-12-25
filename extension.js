/**
 * Woodfish Theme - 原创 VSCode 主题扩展
 * 作者：Woodfish
 * 许可证：MIT
 * 版本：3.0.0
 *
 * 更新内容：修复更新了彩色光标
 *
 * 特别感谢：
 * - 感谢 shaobeichen 为本项目提供灵感
 * - 感谢 Bearded Theme 提供开源主题代码
 */

const vscode = require('vscode')
const { setExtensionContext: setThemeExtensionContext } = require('./src/themes')
const { setExtensionContext: setConfigExtensionContext } = require('./src/config')
const { setExtensionContext: setCommandExtensionContext } = require('./src/commands')
const { setExtensionContext: setValidatorExtensionContext, registerConfigurationListener, validateAndCleanupCssImports, checkAndReapplyThemeConfig } = require('./src/config-validator')
const { showInfoMessage, showErrorMessage } = require('./src/utils')

let extensionContext = null

// ==================== 扩展命令注册 ====================

/**
 * 注册扩展命令
 */
function registerCommands() {
  if (!extensionContext) return

  // 从命令模块导入函数
  const {
    toggleGlowEffects,
    toggleGlassEffect,
    toggleRainbowCursor,
    completeUninstall,
  } = require('./src/commands')

  // 从主题模块导入函数
  const { autoConfigureRainbowCursor } = require('./src/themes')

  const { applyTheme, removeTheme } = require('./src/themes')

  try {
    // 启用主题命令
    const enableCommand = vscode.commands.registerCommand(
      'woodfish-theme.enable',
      () => {
        console.log('执行启用主题命令')

        // 应用主题（通过Custom CSS扩展）
        applyTheme()

        // 配置彩色光标
        setTimeout(() => {
          autoConfigureRainbowCursor()
        }, 1000)
      }
    )

    // 禁用主题命令
    const disableCommand = vscode.commands.registerCommand(
      'woodfish-theme.disable',
      () => {
        console.log('执行禁用主题命令')
        removeTheme()
      }
    )

    // 切换发光效果命令
    const toggleGlowCommand = vscode.commands.registerCommand(
      'woodfish-theme.toggleGlow',
      () => {
        console.log('执行切换发光效果命令')
        toggleGlowEffects()
      }
    )

    // 彩色光标自动配置命令
    const autoConfigureRainbowCursorCommand = vscode.commands.registerCommand(
      'woodfish-theme.autoConfigureRainbowCursor',
      () => {
        console.log('执行彩色光标自动配置命令')
        autoConfigureRainbowCursor()
      }
    )

    // 切换毛玻璃效果命令
    const toggleGlassEffectCommand = vscode.commands.registerCommand(
      'woodfish-theme.toggleGlassEffect',
      () => {
        console.log('执行切换毛玻璃效果命令')
        toggleGlassEffect()
      }
    )

    // 切换彩色光标命令
    const toggleRainbowCursorCommand = vscode.commands.registerCommand(
      'woodfish-theme.toggleRainbowCursor',
      () => {
        console.log('执行切换彩色光标命令')
        toggleRainbowCursor()
      }
    )

    // 彻底停用主题命令
    const completeUninstallCommand = vscode.commands.registerCommand(
      'woodfish-theme.completeUninstall',
      () => {
        console.log('执行彻底停用Woodfish主题命令')
        completeUninstall()
      }
    )

    // 注册到扩展上下文
    extensionContext.subscriptions.push(
      enableCommand,
      disableCommand,
      toggleGlowCommand,
      autoConfigureRainbowCursorCommand,
      toggleGlassEffectCommand,
      toggleRainbowCursorCommand,
      completeUninstallCommand
    )

    console.log('主题命令注册成功')
  } catch (error) {
    console.error('注册命令时出错:', error)
  }
}

// ==================== 版本管理函数 ====================

/**
 * 初始化版本检查
 */
function initializeVersionCheck() {
  try {
    const { getStoredVscodeVersion, wasThemeInstalled, checkDependencyExtension } = require('./src/config')

    const currentVersion = vscode.version.split('-')[0]
    const storedVersion = getStoredVscodeVersion()

    // 如果版本不匹配且之前安装过主题，则提示用户重新配置
    if (currentVersion !== storedVersion && wasThemeInstalled()) {
      console.log('检测到 VSCode 版本更新，提示用户重新配置主题')
      showInfoMessage('检测到VSCode版本更新，建议重新启用Woodfish主题以确保兼容性')
    }

    // 检查依赖插件
    checkDependencyExtension()
  } catch (error) {
    console.error('版本检查时出错:', error)
  }
}

// ==================== 扩展生命周期函数 ====================

/**
 * 扩展激活函数
 * @param {vscode.ExtensionContext} context 扩展上下文
 */
function activate(context) {
  try {
    // 设置全局上下文
    extensionContext = context

    // 为各模块设置扩展上下文
    setThemeExtensionContext(context)
    setConfigExtensionContext(context)
    setCommandExtensionContext(context)
    setValidatorExtensionContext(context)

    // 注册命令
    registerCommands()

    // 注册配置变化监听器
    registerConfigurationListener()

    // 初始化版本检查
    initializeVersionCheck()

    // 延迟验证CSS配置（避免与其他扩展冲突）
    setTimeout(() => {
      validateAndCleanupCssImports()
    }, 5000)

    // 在激活时检查并重新应用主题配置（如果用户之前启用了相关功能）
    setTimeout(() => {
      checkAndReapplyThemeConfig()
    }, 3000)

    console.log('Woodfish Theme 扩展已成功激活')

    // 显示激活消息（仅在开发模式下）
    if (context.extensionMode === vscode.ExtensionMode.Development) {
      showInfoMessage('扩展已在开发模式下激活')
    }

  } catch (error) {
    console.error('激活扩展时出错:', error)
    showErrorMessage(`扩展激活失败: ${error.message}`)
  }
}

/**
 * 扩展停用函数
 */
function deactivate() {
  try {
    console.log('Woodfish Theme 扩展已停用')

    // 清理全局变量
    extensionContext = null

  } catch (error) {
    console.error('停用扩展时出错:', error)
  }
}

// ==================== 模块导出 ====================

module.exports = {
  activate,
  deactivate
}
