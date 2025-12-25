/**
 * Woodfish Theme - 主题配置模块
 * 处理CSS文件配置、安装提示等功能
 */

const path = require('path')
const fs = require('fs')
const vscode = require('vscode')
const { CUSTOM_CSS_CONFIG_KEYS, CUSTOM_CSS_EXTENSION_IDS, EXTENSION_CONFIG } = require('./constants')
const { pathToFileURI, showInfoMessage, showErrorMessage, showReloadPrompt } = require('./utils')

// 设置扩展上下文
function setExtensionContext(_context) {
  // 保留此函数以兼容其他模块的调用，但不执行任何操作
}

/**
 * 检查是否安装了 Custom CSS and JS Loader 扩展
 * @returns {boolean} 是否已安装
 */
function isCustomCssExtensionInstalled() {
  try {
    const extension = vscode.extensions.getExtension(CUSTOM_CSS_EXTENSION_IDS.CUSTOM_CSS_LOADER)
    return Boolean(extension)
  } catch (error) {
    console.error('检查 Custom CSS 扩展时出错:', error)
    return false
  }
}

/**
 * 检查是否安装了 Custom CSS Hot Reload 扩展
 * @returns {boolean} 是否已安装
 */
function isCustomCssHotReloadExtensionInstalled() {
  try {
    const extension = vscode.extensions.getExtension(CUSTOM_CSS_EXTENSION_IDS.CUSTOM_CSS_HOT_RELOAD)
    return Boolean(extension)
  } catch (error) {
    console.error('检查 Custom CSS Hot Reload 扩展时出错:', error)
    return false
  }
}

/**
 * 配置主题CSS文件到Custom CSS扩展
 */
function configureThemeCSS() {
  try {
    console.log('开始配置主题CSS')

    // 检查是否安装了 Custom CSS and JS Loader 扩展或 Custom CSS Hot Reload 扩展
    const isCustomCssInstalled = isCustomCssExtensionInstalled()
    const isHotReloadInstalled = isCustomCssHotReloadExtensionInstalled()

    // 如果两个扩展都没有安装，则显示安装提示
    if (!isCustomCssInstalled && !isHotReloadInstalled) {
      console.log('没有检测到 Custom CSS 扩展，显示安装提示')
      showBothExtensionsInstallPrompt()
      return
    }

    console.log('检测到至少一个 Custom CSS 扩展已安装')

    // 根据安装的扩展类型决定使用哪个配置键
    let configKey
    let extensionName
    if (isCustomCssInstalled) {
      configKey = CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER
      extensionName = 'Custom CSS and JS Loader'
    } else {
      configKey = CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_HOT_RELOAD
      extensionName = 'Custom CSS Hot Reload'
    }

    // 获取当前配置
    const config = vscode.workspace.getConfiguration()
    const customCssImports = config.get(configKey, [])

    // 构建主题CSS文件路径
    const themeStylePath = path.join(__dirname, '..', 'themes', EXTENSION_CONFIG.themeFileName)
    const themeFileUri = pathToFileURI(themeStylePath)

    console.log('目标主题配置路径:', themeFileUri)
    console.log('当前导入列表:', customCssImports)
    console.log('使用配置键:', configKey)

    // 更精确地检查是否已经配置了主题CSS
    const isThemeConfigured = customCssImports.some(importPath => {
      // 完全匹配文件URI
      if (importPath === themeFileUri) {
        console.log('找到完全匹配的主题配置:', importPath)
        return true
      }
      // 备用匹配：检查是否包含主题文件标识
      if (importPath.includes('woodfish-theme.css')) {
        console.log('找到包含主题文件标识的配置:', importPath)
        return true
      }
      return false
    })

    if (isThemeConfigured) {
      console.log('主题CSS已经配置')
      showCustomCssEnablePrompt(extensionName)
      return
    }

    // 检查文件是否存在
    if (!fs.existsSync(themeStylePath)) {
      console.error(`主题CSS文件不存在: ${themeStylePath}`)
      showErrorMessage('主题CSS文件不存在，请检查扩展安装是否完整')
      return
    }

    console.log(`添加主题配置: ${themeFileUri}`)

    // 自动添加主题CSS配置
    const newImports = [...customCssImports, themeFileUri]

    config.update(configKey, newImports, vscode.ConfigurationTarget.Global)
      .then(() => {
        console.log('主题CSS配置已添加')
        showCustomCssEnablePrompt(extensionName)
      })
      .catch(error => {
        console.error('配置主题CSS失败:', error)
        showErrorMessage(`配置主题CSS失败: ${error.message}`)
      })

  } catch (error) {
    console.error('配置主题CSS时出错:', error)
    showErrorMessage(`配置主题CSS失败: ${error.message}`)
  }
}

/**
 * 配置彩色光标的 CSS 设置
 * @param {string} configKey - 配置键，可选，默认为 CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER
 */
function configureRainbowCursor(configKey = CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER) {
  try {
    console.log('开始配置彩色光标 CSS')

    // 检查是否已经配置了彩色光标
    const config = vscode.workspace.getConfiguration()
    const customCssImports = config.get(configKey, [])

    // 构建彩色光标 CSS 文件的路径
    const rainbowCursorPath = path.join(__dirname, '..', 'custom-css', 'rainbow-cursor.css')
    const fileUri = pathToFileURI(rainbowCursorPath)

    console.log('目标配置路径:', fileUri)
    console.log('当前导入列表:', customCssImports)
    console.log('使用配置键:', configKey)

    // 更精确地检查是否已经配置了彩色光标
    const isAlreadyConfigured = customCssImports.some(importPath => {
      // 完全匹配文件URI
      if (importPath === fileUri) {
        console.log('找到完全匹配的彩色光标配置:', importPath)
        return true
      }
      // 检查是否包含彩虹光标文件标识（备用匹配）
      if (importPath.includes('rainbow-cursor.css')) {
        console.log('找到包含彩虹光标标识的配置:', importPath)
        return true
      }
      return false
    })

    if (isAlreadyConfigured) {
      console.log('彩色光标已经配置，显示启用提示')
      showCustomCssEnablePrompt(configKey.includes('hot_reload') ? 'Custom CSS Hot Reload' : 'Custom CSS and JS Loader')
      return
    }

    // 检查文件是否存在
    if (!fs.existsSync(rainbowCursorPath)) {
      console.error(`彩色光标CSS文件不存在: ${rainbowCursorPath}`)
      showErrorMessage('彩色光标CSS文件不存在，请检查扩展安装是否完整')
      return
    }

    console.log(`添加彩色光标配置: ${fileUri}`)

    // 自动添加彩色光标配置
    const newImports = [...customCssImports, fileUri]

    config.update(configKey, newImports, vscode.ConfigurationTarget.Global)
      .then(() => {
        console.log('彩色光标配置已添加')
        showCustomCssEnablePrompt(configKey.includes('hot_reload') ? 'Custom CSS Hot Reload' : 'Custom CSS and JS Loader')
      })
      .catch(error => {
        console.error('配置彩色光标失败:', error)
        showErrorMessage(`配置彩色光标失败: ${error.message}`)
      })

  } catch (error) {
    console.error('配置彩色光标 CSS 时出错:', error)
    showErrorMessage(`配置彩色光标失败: ${error.message}`)
  }
}

/**
 * 自动配置彩色光标
 * 检查 Custom CSS and JS Loader 扩展或 Custom CSS Hot Reload 扩展，如果都没有安装则提示用户安装
 */
function autoConfigureRainbowCursor() {
  try {
    console.log('开始自动配置彩色光标')

    // 检查是否安装了 Custom CSS and JS 扩展或 Custom CSS Hot Reload 扩展
    const isCustomCssInstalled = isCustomCssExtensionInstalled()
    const isHotReloadInstalled = isCustomCssHotReloadExtensionInstalled()

    // 如果两个扩展都没有安装，则显示安装提示
    if (!isCustomCssInstalled && !isHotReloadInstalled) {
      console.log('没有检测到 Custom CSS 扩展，显示安装提示')
      showBothExtensionsInstallPrompt()
      return
    }

    console.log('检测到至少一个 Custom CSS 扩展已安装')

    // 根据安装的扩展类型决定使用哪个配置键
    let configKey
    if (isCustomCssInstalled) {
      configKey = CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER
    } else {
      configKey = CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_HOT_RELOAD
    }

    // 继续配置彩色光标
    configureRainbowCursor(configKey)

  } catch (error) {
    console.error('自动配置彩色光标时出错:', error)
    showErrorMessage(`配置彩色光标失败: ${error.message}`)
  }
}

/**
 * 显示两个 Custom CSS 扩展的安装提示，让用户选择安装其中一个
 */
function showBothExtensionsInstallPrompt() {
  const installCustomCssAction = '安装 Custom CSS and JS Loader'
  const installHotReloadAction = '安装 Custom CSS Hot Reload'
  const laterAction = '稍后'

  const message = '要启用 Woodfish 主题，需要安装 Custom CSS 扩展。请选择要安装的扩展：'

  vscode.window
    .showInformationMessage(
      `[Woodfish Theme] ${message}`,
      installCustomCssAction,
      installHotReloadAction,
      laterAction
    )
    .then(selection => {
      switch (selection) {
      case installCustomCssAction:
        installCustomCssExtension()
        break
      case installHotReloadAction:
        installCustomCssHotReloadExtension()
        break
      case laterAction:
      default:
        showInfoMessage('您可以稍后通过命令面板执行"开启 Woodfish 主题"来重新配置')
        break
      }
    })
}

/**
 * 安装 Custom CSS Hot Reload 扩展
 */
function installCustomCssHotReloadExtension() {
  try {
    // 确保使用正确的扩展ID
    const extensionId = CUSTOM_CSS_EXTENSION_IDS.CUSTOM_CSS_HOT_RELOAD

    // 提示用户安装方式
    const installAction = '在扩展市场安装'
    const laterAction = '稍后'

    vscode.window.showInformationMessage(
      '[Woodfish Theme] 正在为您打开 Custom CSS Hot Reload 扩展安装页面...',
      installAction,
      laterAction
    ).then(selection => {
      if (selection === installAction) {
        // 使用VSCode命令打开插件市场页面
        const extensionUri = vscode.Uri.parse(`vscode:extension/${extensionId}`)

        vscode.commands.executeCommand('vscode.open', extensionUri)
          .then(() => {
            showInfoMessage(`已打开 ${extensionId} 扩展页面，请点击安装按钮完成安装`)
          })
          .catch(error => {
            console.error('打开扩展页面失败:', error)
            showErrorMessage(`无法打开扩展页面，请手动在扩展市场搜索"${extensionId}"安装`)
          })
      }
    })
  } catch (error) {
    console.error('安装 Custom CSS Hot Reload 扩展时出错:', error)
    showErrorMessage(`安装扩展失败: ${error.message}，请手动在扩展市场搜索"Custom CSS Hot Reload"安装`)
  }
}

/**
 * 安装 Custom CSS and JS Loader 扩展
 */
function installCustomCssExtension() {
  try {
    // 提示用户选择安装方式
    const scriptAction = '使用脚本安装 (推荐)'
    const manualAction = '手动安装'
    const cancelAction = '取消'

    vscode.window.showInformationMessage(
      '[Woodfish Theme] 要启用彩色光标，需要安装 Custom CSS and JS Loader 扩展。请选择安装方式：',
      scriptAction,
      manualAction,
      cancelAction
    ).then(selection => {
      if (selection === scriptAction) {
        // 使用脚本安装
        installUsingScript()
      } else if (selection === manualAction) {
        // 手动安装
        installManually()
      }
    })
  } catch (error) {
    console.error('安装 Custom CSS 扩展时出错:', error)
    showErrorMessage(`安装扩展失败: ${error.message}，请手动在扩展市场搜索"Custom CSS and JS Loader"安装`)
  }
}

/**
 * 使用脚本安装 Custom CSS and JS Loader 扩展
 */
function installUsingScript() {
  try {
    // 获取脚本路径
    const scriptPath = path.join(__dirname, '..', 'scripts', 'install-custom-css.sh')

    // 确保脚本存在
    if (!fs.existsSync(scriptPath)) {
      showErrorMessage('安装脚本不存在，请使用手动安装方式')
      installManually()
      return
    }

    // 确保脚本可执行
    fs.chmodSync(scriptPath, '755')

    // 创建终端并执行脚本
    const terminal = vscode.window.createTerminal('Woodfish Theme - 安装 Custom CSS')

    // 根据操作系统执行不同的命令
    if (process.platform === 'win32') {
      // Windows
      terminal.sendText('powershell -ExecutionPolicy Bypass -Command "code --install-extension be5invis.vscode-custom-css"')
    } else {
      // macOS 或 Linux
      terminal.sendText(`bash "${scriptPath}"`)
    }

    terminal.show()

    // 提示用户安装完成后的操作
    setTimeout(() => {
      vscode.window.showInformationMessage(
        '[Woodfish Theme] 安装完成后，请重启 VSCode 并执行以下步骤：\n1. 按 Ctrl+Shift+P 打开命令面板\n2. 执行"Enable Custom CSS and JS"命令\n3. 重启 VSCode',
        '我已完成'
      ).then(selection => {
        if (selection === '我已完成') {
          configureRainbowCursor()
        }
      })
    }, 5000)

  } catch (error) {
    console.error('使用脚本安装时出错:', error)
    showErrorMessage(`脚本安装失败: ${error.message}，请尝试手动安装`)
    installManually()
  }
}

/**
 * 手动安装 Custom CSS and JS Loader 扩展
 */
function installManually() {
  try {
    const extensionId = CUSTOM_CSS_EXTENSION_IDS.CUSTOM_CSS_LOADER

    // 打开扩展搜索
    vscode.commands.executeCommand('workbench.extensions.search', extensionId)
      .then(() => {
        showInfoMessage('已打开扩展搜索，请在扩展市场中找到并安装 Custom CSS and JS Loader')

        // 提示用户安装完成后的操作
        setTimeout(() => {
          vscode.window.showInformationMessage(
            '[Woodfish Theme] 安装完成后，请重启 VSCode 并执行以下步骤：\n1. 按 Ctrl+Shift+P 打开命令面板\n2. 执行"Enable Custom CSS and JS"命令\n3. 重启 VSCode',
            '我已完成'
          ).then(selection => {
            if (selection === '我已完成') {
              configureRainbowCursor()
            }
          })
        }, 3000)
      })
      .catch(error => {
        console.error('打开扩展搜索失败:', error)

        // 备用方案：打开扩展页面
        const extensionUri = vscode.Uri.parse(`vscode:extension/${extensionId}`)
        vscode.commands.executeCommand('vscode.open', extensionUri)
          .then(() => {
            showInfoMessage('已打开 Custom CSS and JS Loader 扩展页面，请点击安装按钮完成安装')
          })
          .catch(openError => {
            console.error('打开扩展页面失败:', openError)
            showErrorMessage('无法打开扩展页面，请手动在扩展市场搜索"Custom CSS and JS Loader"安装')
          })
      })
  } catch (error) {
    console.error('手动安装时出错:', error)
    showErrorMessage(`无法启动手动安装: ${error.message}，请在扩展市场中搜索"Custom CSS and JS Loader"安装`)
  }
}

/**
 * 显示 Custom CSS 启用提示
 * @param {string} extensionName - 扩展名称，可选
 */
function showCustomCssEnablePrompt(extensionName = 'Custom CSS and JS Loader') {
  const enableAction = '启用 Custom CSS'
  const laterAction = '稍后'
  const guideAction = '查看指南'

  let message
  if (extensionName.includes('Hot Reload')) {
    message = `主题配置已添加！现在需要启用 ${extensionName} 扩展才能看到效果。`
  } else {
    message = `主题配置已添加！现在需要启用 ${extensionName} 扩展才能看到效果。`
  }

  vscode.window
    .showInformationMessage(
      `[Woodfish Theme] ${message}`,
      enableAction,
      guideAction,
      laterAction
    )
    .then(selection => {
      switch (selection) {
      case enableAction:
        if (extensionName.includes('Hot Reload')) {
          // Custom CSS Hot Reload 扩展可能有不同的启用命令
          enableCustomCssHotReload()
        } else {
          enableCustomCss()
        }
        break
      case guideAction:
        showCustomCssSetupGuide()
        break
      case laterAction:
      default:
        showInfoMessage(`您可以稍后通过命令面板执行相应命令来启用 ${extensionName} 效果`)
        break
      }
    })
}

/**
 * 启用 Custom CSS Hot Reload
 */
function enableCustomCssHotReload() {
  try {
    // Custom CSS Hot Reload 扩展通常会自动应用CSS更改，不需要特定命令
    // 需要重新加载窗口以应用CSS
    showReloadPrompt('Custom CSS 配置已更新！VSCode 需要重新加载以应用主题效果。')
  } catch (error) {
    console.error('启用 Custom CSS Hot Reload 时出错:', error)
    showErrorMessage(`启用 Custom CSS Hot Reload 失败: ${error.message}`)
  }
}

/**
 * 启用 Custom CSS
 */
function enableCustomCss() {
  try {
    vscode.commands.executeCommand('extension.updateCustomCSS')
      .then(() => {
        showReloadPrompt('Custom CSS 已启用！VSCode 需要重新加载以应用彩色光标效果。')
      })
      .catch(error => {
        console.error('启用 Custom CSS 失败:', error)

        // 备用方案：提示用户手动启用
        vscode.window.showInformationMessage(
          '[Woodfish Theme] 请手动执行以下步骤启用彩色光标：\n1. 按 Ctrl+Shift+P 打开命令面板\n2. 执行"Enable Custom CSS and JS"命令\n3. 重启 VSCode',
          '打开命令面板'
        ).then(selection => {
          if (selection === '打开命令面板') {
            vscode.commands.executeCommand('workbench.action.showCommands')
          }
        })
      })
  } catch (error) {
    console.error('启用 Custom CSS 时出错:', error)
    showErrorMessage(`启用 Custom CSS 失败: ${error.message}`)
  }
}

/**
 * 显示 Custom CSS 设置指南
 */
function showCustomCssSetupGuide() {
  try {
    const guidePath = path.join(__dirname, '..', 'vscode-custom-css-setup.md')

    if (fs.existsSync(guidePath)) {
      vscode.workspace.openTextDocument(guidePath)
        .then(doc => {
          vscode.window.showTextDocument(doc)
          showInfoMessage('已打开彩色光标设置指南，请按照说明进行配置')
        })
        .catch(error => {
          console.error('打开设置指南失败:', error)
          showErrorMessage(`无法打开设置指南: ${error.message}`)
        })
    } else {
      showErrorMessage('设置指南文件不存在')
    }
  } catch (error) {
    console.error('显示设置指南时出错:', error)
    showErrorMessage(`显示设置指南失败: ${error.message}`)
  }
}

/**
 * 应用主题样式（通过Custom CSS扩展）
 */
function applyTheme() {
  try {
    console.log('开始应用主题样式（通过Custom CSS扩展）')

    // 配置主题CSS文件
    configureThemeCSS()

    console.log('主题应用完成')

  } catch (error) {
    showErrorMessage(`应用主题失败: ${error.message}`)
    console.error('应用主题时出错:', error)
  }
}

/**
 * 移除主题样式（从Custom CSS扩展配置中移除）
 */
function removeTheme() {
  try {
    console.log('开始移除主题样式')

    // 检查哪个扩展已安装，然后移除对应的配置
    const isCustomCssInstalled = isCustomCssExtensionInstalled()
    const isHotReloadInstalled = isCustomCssHotReloadExtensionInstalled()

    // 如果两个扩展都没有安装，则提示用户
    if (!isCustomCssInstalled && !isHotReloadInstalled) {
      showInfoMessage('未检测到 Custom CSS 扩展，请先安装扩展后再尝试移除主题')
      return
    }

    // 分别处理两个扩展的配置，只移除与Woodfish相关的配置，保留其他配置
    let totalRemovedCount = 0

    // 处理 Custom CSS and JS Loader 配置
    if (isCustomCssInstalled) {
      const config = vscode.workspace.getConfiguration()
      const customCssImports = config.get(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER, [])

      // 构建主题CSS文件的路径（用于精确匹配）
      const themeStylePath = path.join(__dirname, '..', 'themes', EXTENSION_CONFIG.themeFileName)
      const themeFileUri = pathToFileURI(themeStylePath)

      console.log('尝试从 Custom CSS and JS Loader 移除主题配置，当前导入列表:', customCssImports)
      console.log('目标移除路径:', themeFileUri)

      // 过滤掉Woodfish主题相关的配置，保留其他配置
      const filteredImports = customCssImports.filter(importPath => {
        // 完全匹配文件URI - 不保留Woodfish相关文件
        if (importPath === themeFileUri) {
          console.log('找到完全匹配的主题路径，将移除:', importPath)
          return false
        }
        // 备用匹配：检查是否包含主题文件标识 - 不保留Woodfish相关文件
        if (importPath.includes('woodfish-theme.css')) {
          console.log('找到包含Woodfish主题标识的路径，将移除:', importPath)
          return false
        }
        // 检查是否是彩虹光标文件
        const rainbowCursorPath = path.join(__dirname, '..', 'custom-css', 'rainbow-cursor.css')
        const rainbowCursorUri = pathToFileURI(rainbowCursorPath)
        if (importPath === rainbowCursorUri || importPath.includes('rainbow-cursor.css')) {
          console.log('找到彩虹光标配置，将移除:', importPath)
          return false
        }
        // 检查是否是Woodfish相关的其他CSS文件
        if (importPath.includes('woodfish') || importPath.includes('rainbow-cursor') || importPath.includes('cursor-loader')) {
          console.log('找到Woodfish相关配置，将移除:', importPath)
          return false
        }
        // 保留其他非Woodfish相关的配置
        console.log('保留非Woodfish相关配置:', importPath)
        return true
      })

      const removedCount = customCssImports.length - filteredImports.length
      console.log(`从 Custom CSS and JS Loader 中移除了 ${removedCount} 个Woodfish相关配置`)

      if (removedCount > 0) {
        config.update(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER, filteredImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('Woodfish相关CSS配置已从 Custom CSS and JS Loader 移除，保留其他配置')
          })
          .catch(error => {
            console.error('从 Custom CSS and JS Loader 移除主题配置失败:', error)
            showErrorMessage(`从 Custom CSS and JS Loader 移除主题失败: ${error.message}`)
          })

        totalRemovedCount += removedCount
      } else {
        console.log('Custom CSS and JS Loader 中未找到Woodfish相关配置')
      }
    }

    // 处理 Custom CSS Hot Reload 配置
    if (isHotReloadInstalled) {
      const config = vscode.workspace.getConfiguration()
      const hotReloadImports = config.get(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_HOT_RELOAD, [])

      // 构建主题CSS文件的路径（用于精确匹配）
      const themeStylePath = path.join(__dirname, '..', 'themes', EXTENSION_CONFIG.themeFileName)
      const themeFileUri = pathToFileURI(themeStylePath)

      console.log('尝试从 Custom CSS Hot Reload 移除主题配置，当前导入列表:', hotReloadImports)
      console.log('目标移除路径:', themeFileUri)

      // 过滤掉Woodfish主题相关的配置，保留其他配置
      const filteredImports = hotReloadImports.filter(importPath => {
        // 完全匹配文件URI - 不保留Woodfish相关文件
        if (importPath === themeFileUri) {
          console.log('找到完全匹配的主题路径，将移除:', importPath)
          return false
        }
        // 备用匹配：检查是否包含主题文件标识 - 不保留Woodfish相关文件
        if (importPath.includes('woodfish-theme.css')) {
          console.log('找到包含Woodfish主题标识的路径，将移除:', importPath)
          return false
        }
        // 检查是否是彩虹光标文件
        const rainbowCursorPath = path.join(__dirname, '..', 'custom-css', 'rainbow-cursor.css')
        const rainbowCursorUri = pathToFileURI(rainbowCursorPath)
        if (importPath === rainbowCursorUri || importPath.includes('rainbow-cursor.css')) {
          console.log('找到彩虹光标配置，将移除:', importPath)
          return false
        }
        // 检查是否是Woodfish相关的其他CSS文件
        if (importPath.includes('woodfish') || importPath.includes('rainbow-cursor') || importPath.includes('cursor-loader')) {
          console.log('找到Woodfish相关配置，将移除:', importPath)
          return false
        }
        // 保留其他非Woodfish相关的配置
        console.log('保留非Woodfish相关配置:', importPath)
        return true
      })

      const removedCount = hotReloadImports.length - filteredImports.length
      console.log(`从 Custom CSS Hot Reload 中移除了 ${removedCount} 个Woodfish相关配置`)

      if (removedCount > 0) {
        config.update(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_HOT_RELOAD, filteredImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('Woodfish相关CSS配置已从 Custom CSS Hot Reload 移除，保留其他配置')
          })
          .catch(error => {
            console.error('从 Custom CSS Hot Reload 移除主题配置失败:', error)
            showErrorMessage(`从 Custom CSS Hot Reload 移除主题失败: ${error.message}`)
          })

        totalRemovedCount += removedCount
      } else {
        console.log('Custom CSS Hot Reload 中未找到Woodfish相关配置')
      }
    }

    if (totalRemovedCount > 0) {
      console.log(`总共移除了 ${totalRemovedCount} 个Woodfish相关配置，保留了其他配置`)
      showReloadPrompt('Woodfish Theme 已成功禁用！VSCode 需要重新加载以应用更改。')
    } else {
      console.log('未找到Woodfish相关配置，可能已经被移除')
      showInfoMessage('Woodfish主题配置未找到或已移除')
    }

  } catch (error) {
    showErrorMessage(`移除主题失败: ${error.message}`)
    console.error('移除主题时出错:', error)
  }
}

/**
 * 移除彩色光标配置
 */
function removeRainbowCursorConfig() {
  try {
    // 检查哪个扩展已安装，然后移除对应的配置
    const isCustomCssInstalled = isCustomCssExtensionInstalled()
    const isHotReloadInstalled = isCustomCssHotReloadExtensionInstalled()

    // 如果两个扩展都没有安装，则提示用户
    if (!isCustomCssInstalled && !isHotReloadInstalled) {
      showInfoMessage('未检测到 Custom CSS 扩展，请先安装扩展后再尝试移除彩色光标配置')
      return
    }

    let totalRemovedCount = 0

    // 处理 Custom CSS and JS Loader 扩展，只移除彩虹光标相关配置，保留其他配置
    if (isCustomCssInstalled) {
      const config = vscode.workspace.getConfiguration()
      const customCssImports = config.get(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER, [])

      // 构建彩色光标 CSS 文件的路径（用于精确匹配）
      const rainbowCursorPath = path.join(__dirname, '..', 'custom-css', 'rainbow-cursor.css')
      const fileUri = pathToFileURI(rainbowCursorPath)

      console.log('尝试从 Custom CSS and JS Loader 移除彩色光标配置，当前导入列表:', customCssImports)
      console.log('目标移除路径:', fileUri)

      // 过滤掉彩虹光标相关的配置，保留其他配置
      const filteredImports = customCssImports.filter(importPath => {
        // 完全匹配文件URI
        if (importPath === fileUri) {
          console.log('找到完全匹配的路径，将移除:', importPath)
          return false
        }
        // 备用匹配：检查是否包含彩虹光标文件标识
        if (importPath.includes('rainbow-cursor.css')) {
          console.log('找到包含彩虹光标标识的路径，将移除:', importPath)
          return false
        }
        // 保留其他非彩虹光标相关的配置
        return true
      })

      const removedCount = customCssImports.length - filteredImports.length
      console.log(`从 Custom CSS and JS Loader 移除了 ${removedCount} 个彩色光标配置`)

      if (removedCount > 0) {
        config.update(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER, filteredImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('彩色光标配置已从 Custom CSS and JS Loader 移除，保留其他配置')
          })
          .catch(error => {
            console.error('从 Custom CSS and JS Loader 移除彩色光标配置失败:', error)
            showErrorMessage(`从 Custom CSS and JS Loader 移除彩色光标配置失败: ${error.message}`)
          })

        totalRemovedCount += removedCount
      } else {
        console.log('Custom CSS and JS Loader 中未找到彩色光标配置')
      }
    }

    // 处理 Custom CSS Hot Reload 扩展，只移除彩虹光标相关配置，保留其他配置
    if (isHotReloadInstalled) {
      const config = vscode.workspace.getConfiguration()
      const hotReloadImports = config.get(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_HOT_RELOAD, [])

      // 构建彩色光标 CSS 文件的路径（用于精确匹配）
      const rainbowCursorPath = path.join(__dirname, '..', 'custom-css', 'rainbow-cursor.css')
      const fileUri = pathToFileURI(rainbowCursorPath)

      console.log('尝试从 Custom CSS Hot Reload 移除彩色光标配置，当前导入列表:', hotReloadImports)
      console.log('目标移除路径:', fileUri)

      // 过滤掉彩虹光标相关的配置，保留其他配置
      const filteredImports = hotReloadImports.filter(importPath => {
        // 完全匹配文件URI
        if (importPath === fileUri) {
          console.log('找到完全匹配的路径，将移除:', importPath)
          return false
        }
        // 备用匹配：检查是否包含彩虹光标文件标识
        if (importPath.includes('rainbow-cursor.css')) {
          console.log('找到包含彩虹光标标识的路径，将移除:', importPath)
          return false
        }
        // 保留其他非彩虹光标相关的配置
        return true
      })

      const removedCount = hotReloadImports.length - filteredImports.length
      console.log(`从 Custom CSS Hot Reload 移除了 ${removedCount} 个彩色光标配置`)

      if (removedCount > 0) {
        config.update(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_HOT_RELOAD, filteredImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('彩色光标配置已从 Custom CSS Hot Reload 移除，保留其他配置')
          })
          .catch(error => {
            console.error('从 Custom CSS Hot Reload 移除彩色光标配置失败:', error)
            showErrorMessage(`从 Custom CSS Hot Reload 移除彩色光标配置失败: ${error.message}`)
          })

        totalRemovedCount += removedCount
      } else {
        console.log('Custom CSS Hot Reload 中未找到彩色光标配置')
      }
    }

    const extensionName = isCustomCssInstalled && isHotReloadInstalled ? 
      'Custom CSS and JS Loader 和 Custom CSS Hot Reload' : 
      (isCustomCssInstalled ? 'Custom CSS and JS Loader' : 'Custom CSS Hot Reload')

    if (totalRemovedCount > 0) {
      console.log(`总共移除了 ${totalRemovedCount} 个彩色光标配置，保留了其他配置`)
      showReloadPrompt(`彩色光标配置已从 ${extensionName} 移除！VSCode 需要重新加载以应用更改。`)
    } else {
      console.log('未找到彩色光标配置，可能已经被移除')
      showInfoMessage('彩色光标配置未找到或已移除')
    }
  } catch (error) {
    console.error('移除彩色光标配置时出错:', error)
    showErrorMessage(`移除彩色光标配置失败: ${error.message}`)
  }
}

module.exports = {
  setExtensionContext,
  configureThemeCSS,
  applyTheme,
  removeTheme,
  isCustomCssExtensionInstalled,
  isCustomCssHotReloadExtensionInstalled,
  showBothExtensionsInstallPrompt,
  installCustomCssExtension,
  installCustomCssHotReloadExtension,
  showCustomCssEnablePrompt,
  showCustomCssSetupGuide,
  configureRainbowCursor,
  autoConfigureRainbowCursor,
  removeRainbowCursorConfig,
}