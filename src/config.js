/**
 * Woodfish Theme - 配置管理模块
 * 处理版本检查、依赖插件管理等功能
 */

const vscode = require('vscode')
const { DEPENDENCY_EXTENSION, EXTENSION_CONFIG } = require('./constants')
const { showInfoMessage, showErrorMessage } = require('./utils')

let extensionContext = null

// 设置扩展上下文
function setExtensionContext(context) {
  extensionContext = context
}

/**
 * 获取存储的 VSCode 版本
 * @returns {string|undefined} 存储的版本号
 */
function getStoredVscodeVersion() {
  return extensionContext?.globalState.get(EXTENSION_CONFIG.versionKey)
}

/**
 * 更新存储的 VSCode 版本
 */
function updateVscodeVersion() {
  if (!extensionContext) return

  try {
    const currentVersion = vscode.version.split('-')[0]
    extensionContext.globalState.update(EXTENSION_CONFIG.versionKey, currentVersion)
  } catch (error) {
    console.error('更新版本信息时出错:', error)
  }
}

/**
 * 检查是否曾经安装过主题（通过Custom CSS配置检查）
 * @returns {boolean} 是否安装过
 */
function wasThemeInstalled() {
  try {
    const config = vscode.workspace.getConfiguration()

    // 检查 Custom CSS and JS Loader 配置
    const customCssImports = config.get('vscode_custom_css.imports', [])
    const isCustomCssConfigured = customCssImports.some(importPath =>
      importPath.includes('woodfish-theme.css')
    )

    // 检查 Custom CSS Hot Reload 配置
    const hotReloadImports = config.get('custom_css_hot_reload.imports', [])
    const isHotReloadConfigured = hotReloadImports.some(importPath =>
      importPath.includes('woodfish-theme.css')
    )

    // 如果任一扩展配置了主题CSS文件，则返回true
    return isCustomCssConfigured || isHotReloadConfigured
  } catch (error) {
    console.error('检查主题安装状态时出错:', error)
    return false
  }
}

/**
 * 初始化版本检查
 * 当 VSCode 更新时提示用户重新配置主题
 */
function initializeVersionCheck() {
  try {
    const currentVersion = vscode.version.split('-')[0]
    const storedVersion = getStoredVscodeVersion()

    // 如果版本不匹配且之前安装过主题，则提示用户重新配置
    if (currentVersion !== storedVersion && wasThemeInstalled()) {
      console.log('检测到 VSCode 版本更新，提示用户重新配置主题')
      showInfoMessage('检测到VSCode版本更新，建议重新启用Woodfish主题以确保兼容性')
    }
  } catch (error) {
    console.error('版本检查时出错:', error)
  }
}

/**
 * 检查依赖插件是否已安装
 * @returns {boolean} 是否已安装
 */
function isDependencyExtensionInstalled() {
  try {
    const extension = vscode.extensions.getExtension(DEPENDENCY_EXTENSION.id)
    return Boolean(extension)
  } catch (error) {
    console.error('检查依赖插件时出错:', error)
    return false
  }
}

/**
 * 检查用户是否已经选择过不安装依赖插件
 * @returns {boolean} 是否已选择不安装
 */
function hasUserDeclinedInstallation() {
  if (!extensionContext) return false

  try {
    return extensionContext.globalState.get(`declined-${DEPENDENCY_EXTENSION.id}`, false)
  } catch (error) {
    console.error('检查用户选择状态时出错:', error)
    return false
  }
}

/**
 * 记录用户选择不安装依赖插件
 */
function recordUserDeclinedInstallation() {
  if (!extensionContext) return

  try {
    extensionContext.globalState.update(`declined-${DEPENDENCY_EXTENSION.id}`, true)
    console.log('已记录用户选择不安装依赖插件')
  } catch (error) {
    console.error('记录用户选择时出错:', error)
  }
}

/**
 * 显示依赖插件安装提示
 */
function showInstallPrompt() {
  const installAction = '安装插件'
  const laterAction = '稍后'
  const neverAction = '不再提示'

  const message = `为了获得更好的视觉体验，建议安装 ${DEPENDENCY_EXTENSION.name} 插件。该插件提供丰富的动画效果，与 Woodfish Theme 完美配合。`

  vscode.window
    .showInformationMessage(
      `[Woodfish Theme] ${message}`,
      installAction,
      laterAction,
      neverAction
    )
    .then(selection => {
      switch (selection) {
      case installAction:
        installDependencyExtension()
        break
      case neverAction:
        recordUserDeclinedInstallation()
        showInfoMessage('已记录您的选择，不会再次提示安装此插件')
        break
      case laterAction:
      default:
        // 用户选择稍后或关闭对话框，不做任何操作
        break
      }
    })
}

/**
 * 安装依赖插件
 */
function installDependencyExtension() {
  try {
    // 使用VSCode命令打开插件市场页面
    const extensionUri = vscode.Uri.parse(`vscode:extension/${DEPENDENCY_EXTENSION.id}`)

    vscode.commands.executeCommand('vscode.open', extensionUri)
      .then(() => {
        showInfoMessage(`已打开 ${DEPENDENCY_EXTENSION.name} 插件页面，请点击安装按钮完成安装`)
      })
      .catch(error => {
        console.error('打开插件页面失败:', error)

        // 备用方案：使用浏览器打开插件市场页面
        const marketplaceUrl = `https://marketplace.visualstudio.com/items?itemName=${DEPENDENCY_EXTENSION.id}`
        vscode.env.openExternal(vscode.Uri.parse(marketplaceUrl))
          .then(() => {
            showInfoMessage('已在浏览器中打开插件市场页面，请下载并安装插件')
          })
          .catch(browserError => {
            console.error('打开浏览器失败:', browserError)
            showErrorMessage(`无法自动打开插件页面，请手动搜索安装：${DEPENDENCY_EXTENSION.id}`)
          })
      })
  } catch (error) {
    console.error('安装依赖插件时出错:', error)
    showErrorMessage(`安装插件失败: ${error.message}`)
  }
}

/**
 * 检查并提示安装依赖插件
 */
function checkDependencyExtension() {
  try {
    // 检查插件是否已安装
    if (isDependencyExtensionInstalled()) {
      console.log('依赖插件已安装，无需提示')
      return
    }

    // 检查用户是否已选择不安装
    if (hasUserDeclinedInstallation()) {
      console.log('用户已选择不安装依赖插件，跳过提示')
      return
    }

    // 延迟显示提示，避免与其他启动消息冲突
    setTimeout(() => {
      showInstallPrompt()
    }, 2000)

  } catch (error) {
    console.error('检查依赖插件时出错:', error)
  }
}

module.exports = {
  setExtensionContext,
  getStoredVscodeVersion,
  updateVscodeVersion,
  wasThemeInstalled,
  initializeVersionCheck,
  isDependencyExtensionInstalled,
  hasUserDeclinedInstallation,
  recordUserDeclinedInstallation,
  showInstallPrompt,
  installDependencyExtension,
  checkDependencyExtension
}