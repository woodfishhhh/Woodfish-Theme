/**
 * Woodfish Theme - 配置监听和验证模块
 * 处理配置变化监听器和CSS配置验证
 */

const path = require('path')
const fs = require('fs')
const vscode = require('vscode')
const { EXTENSION_CONFIG, CUSTOM_CSS_CONFIG_KEYS } = require('./constants')
const { showInfoMessage, uriToFilePath } = require('./utils')
const { configureThemeCSS, autoConfigureRainbowCursor, isCustomCssExtensionInstalled, isCustomCssHotReloadExtensionInstalled } = require('./themes')

let extensionContext = null

// 设置扩展上下文
function setExtensionContext(context) {
  extensionContext = context
}

/**
 * 注册配置变化监听器
 */
function registerConfigurationListener() {
  if (!extensionContext) return

  try {
    // 监听配置变化
    const configListener = vscode.workspace.onDidChangeConfiguration(event => {
      // 检查是否是发光效果配置的变化
      if (event.affectsConfiguration(`${EXTENSION_CONFIG.configSection}.enableGlowEffects`)) {
        console.log('配置监听器检测到发光效果配置变化')
        showInfoMessage('发光效果配置已更新，请通过Custom CSS扩展重新加载以查看效果')
      }

      // 检查是否是毛玻璃效果配置的变化
      if (event.affectsConfiguration(`${EXTENSION_CONFIG.configSection}.enableGlassEffect`)) {
        console.log('配置监听器检测到毛玻璃效果配置变化')
        showInfoMessage('毛玻璃效果配置已更新，请通过Custom CSS扩展重新加载以查看效果')
      }

      // 检查是否是彩色光标配置的变化
      if (event.affectsConfiguration(`${EXTENSION_CONFIG.configSection}.enableRainbowCursor`)) {
        console.log('配置监听器检测到彩色光标配置变化')
        // 彩色光标的处理由 toggleRainbowCursor() 函数直接处理
      }
    })

    // 注册到扩展上下文
    extensionContext.subscriptions.push(configListener)

    console.log('配置变化监听器注册成功')
  } catch (error) {
    console.error('注册配置监听器时出错:', error)
  }
}

/**
 * 验证和清理CSS导入配置
 * 移除重复项和不存在的文件路径
 */
function validateAndCleanupCssImports() {
  try {
    const config = vscode.workspace.getConfiguration()

    // 检查 Custom CSS and JS Loader 配置
    const customCssImports = config.get(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER, [])
    // 检查 Custom CSS Hot Reload 配置
    const hotReloadImports = config.get(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_HOT_RELOAD, [])

    // 验证和清理 Custom CSS and JS Loader 配置
    if (customCssImports && customCssImports.length > 0) {
      console.log('开始验证和清理 Custom CSS and JS Loader 配置...')
      console.log(`当前配置数量: ${customCssImports.length}`)

      // 去重和验证
      const validImports = []
      const seenPaths = new Set()

      for (const importPath of customCssImports) {
        if (!importPath || typeof importPath !== 'string') {
          console.log('跳过无效路径:', importPath)
          continue
        }

        // 跳过重复路径
        if (seenPaths.has(importPath)) {
          console.log('跳过重复路径:', importPath)
          continue
        }

        // 验证文件是否存在（仅对本地文件路径）
        if (importPath.startsWith('file:///')) {
          try {
            // 使用新的辅助函数从URI中提取系统路径
            const filePath = uriToFilePath(importPath)

            // 使用path模块解析路径，确保跨平台兼容性
            const fullPath = path.resolve(filePath)

            if (!fs.existsSync(fullPath)) {
              console.log('文件不存在，将移除:', importPath)
              console.log('尝试访问的路径:', fullPath)
              continue
            }
          } catch (error) {
            console.log('验证文件存在性时出错，保留路径:', importPath, error.message)
          }
        }

        validImports.push(importPath)
        seenPaths.add(importPath)
      }

      const removedCount = customCssImports.length - validImports.length

      if (removedCount > 0) {
        console.log(`Custom CSS and JS Loader 清理完成: 移除了 ${removedCount} 个无效配置，保留了 ${validImports.length} 个有效配置`)

        config.update(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER, validImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('Custom CSS and JS Loader CSS导入配置已更新')
          })
          .catch(error => {
            console.error('更新 Custom CSS and JS Loader CSS配置失败:', error)
          })
      } else {
        console.log('Custom CSS and JS Loader 所有配置都有效，无需清理')
      }
    }

    // 验证和清理 Custom CSS Hot Reload 配置
    if (hotReloadImports && hotReloadImports.length > 0) {
      console.log('开始验证和清理 Custom CSS Hot Reload 配置...')
      console.log(`当前配置数量: ${hotReloadImports.length}`)

      // 去重和验证
      const validImports = []
      const seenPaths = new Set()

      for (const importPath of hotReloadImports) {
        if (!importPath || typeof importPath !== 'string') {
          console.log('跳过无效路径:', importPath)
          continue
        }

        // 跳过重复路径
        if (seenPaths.has(importPath)) {
          console.log('跳过重复路径:', importPath)
          continue
        }

        // 验证文件是否存在（仅对本地文件路径）
        if (importPath.startsWith('file:///')) {
          try {
            // 使用新的辅助函数从URI中提取系统路径
            const filePath = uriToFilePath(importPath)

            // 使用path模块解析路径，确保跨平台兼容性
            const fullPath = path.resolve(filePath)

            if (!fs.existsSync(fullPath)) {
              console.log('文件不存在，将移除:', importPath)
              console.log('尝试访问的路径:', fullPath)
              continue
            }
          } catch (error) {
            console.log('验证文件存在性时出错，保留路径:', importPath, error.message)
          }
        }

        validImports.push(importPath)
        seenPaths.add(importPath)
      }

      const removedCount = hotReloadImports.length - validImports.length

      if (removedCount > 0) {
        console.log(`Custom CSS Hot Reload 清理完成: 移除了 ${removedCount} 个无效配置，保留了 ${validImports.length} 个有效配置`)

        config.update(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_HOT_RELOAD, validImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('Custom CSS Hot Reload CSS导入配置已更新')
          })
          .catch(error => {
            console.error('更新 Custom CSS Hot Reload CSS配置失败:', error)
          })
      } else {
        console.log('Custom CSS Hot Reload 所有配置都有效，无需清理')
      }
    }

  } catch (error) {
    console.error('验证CSS配置时出错:', error)
  }
}

/**
 * 检查并重新应用主题配置（在VSCode启动时）
 * 这个函数会检查用户之前的配置偏好，并重新应用相应的主题功能
 */
function checkAndReapplyThemeConfig() {
  try {
    console.log('开始检查并重新应用主题配置...')

    const config = vscode.workspace.getConfiguration(EXTENSION_CONFIG.configSection)

    // 检查用户是否启用了发光效果
    const enableGlow = config.get('enableGlowEffects', true)
    if (enableGlow) {
      console.log('用户启用了发光效果，重新配置主题CSS...')
      configureThemeCSS()
    }

    // 检查用户是否启用了毛玻璃效果
    const enableGlass = config.get('enableGlassEffect', true)
    if (enableGlass) {
      console.log('用户启用了毛玻璃效果，重新配置主题CSS...')
      // 毛玻璃效果通常包含在主主题CSS中，所以重新配置主题即可
      configureThemeCSS()
    }

    // 检查用户是否启用了彩色光标
    const enableRainbowCursor = config.get('enableRainbowCursor', false)
    if (enableRainbowCursor) {
      console.log('用户启用了彩色光标，重新配置彩色光标...')
      autoConfigureRainbowCursor()
    }

    // 如果用户之前启用了任何主题相关功能，则重新应用主主题
    if (enableGlow || enableGlass || enableRainbowCursor) {
      setTimeout(() => {
        // 检查Custom CSS配置是否成功
        checkCustomCssConfigStatus()
      }, 2000)
    }

    console.log('主题配置检查和重新应用完成')

  } catch (error) {
    console.error('检查并重新应用主题配置时出错:', error)
  }
}

/**
 * 检查Custom CSS配置状态
 */
function checkCustomCssConfigStatus() {
  try {
    const config = vscode.workspace.getConfiguration()

    // 检查 Custom CSS and JS Loader 配置
    const customCssImports = config.get(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_LOADER, [])
    const isCustomCssInstalled = isCustomCssExtensionInstalled()

    // 检查 Custom CSS Hot Reload 配置
    const hotReloadImports = config.get(CUSTOM_CSS_CONFIG_KEYS.CUSTOM_CSS_HOT_RELOAD, [])
    const isHotReloadInstalled = isCustomCssHotReloadExtensionInstalled()

    const isThemeConfigured = customCssImports.some(importPath => importPath.includes('woodfish-theme.css')) ||
      hotReloadImports.some(importPath => importPath.includes('woodfish-theme.css'))

    const isCursorConfigured = customCssImports.some(importPath => importPath.includes('rainbow-cursor.css')) ||
      hotReloadImports.some(importPath => importPath.includes('rainbow-cursor.css'))

    console.log('Custom CSS配置状态检查:')
    console.log('- Custom CSS and JS Loader 安装状态:', isCustomCssInstalled)
    console.log('- Custom CSS Hot Reload 安装状态:', isHotReloadInstalled)
    console.log('- 主题文件配置状态:', isThemeConfigured)
    console.log('- 彩虹光标配置状态:', isCursorConfigured)

    // 如果用户开启了相关功能但没有配置CSS文件，则重新配置
    const themeConfig = vscode.workspace.getConfiguration(EXTENSION_CONFIG.configSection)
    const enableGlow = themeConfig.get('enableGlowEffects', true)
    const enableGlass = themeConfig.get('enableGlassEffect', true)
    const enableRainbowCursor = themeConfig.get('enableRainbowCursor', false)

    if ((enableGlow || enableGlass) && !isThemeConfigured && (isCustomCssInstalled || isHotReloadInstalled)) {
      console.log('检测到用户启用了主题效果但未配置CSS文件，重新配置主题...')
      configureThemeCSS()
    }

    if (enableRainbowCursor && !isCursorConfigured && (isCustomCssInstalled || isHotReloadInstalled)) {
      console.log('检测到用户启用了彩虹光标但未配置CSS文件，重新配置彩虹光标...')
      autoConfigureRainbowCursor()
    }

  } catch (error) {
    console.error('检查Custom CSS配置状态时出错:', error)
  }
}

module.exports = {
  setExtensionContext,
  registerConfigurationListener,
  validateAndCleanupCssImports,
  checkAndReapplyThemeConfig,
  checkCustomCssConfigStatus
}
