/**
 * Woodfish Theme - 命令处理模块
 * 处理各种主题相关的命令和功能切换
 */

const path = require('path')
const fs = require('fs')
const vscode = require('vscode')
const { EXTENSION_CONFIG } = require('./constants')
const { pathToFileURI, showInfoMessage, showErrorMessage, showReloadPrompt } = require('./utils')
const { isCustomCssExtensionInstalled, isCustomCssHotReloadExtensionInstalled, removeRainbowCursorConfig } = require('./themes')

let extensionContext = null

// 设置扩展上下文
function setExtensionContext(context) {
  extensionContext = context
}

/**
 * 切换发光效果
 */
function toggleGlowEffects() {
  try {
    const themeConfiguration = vscode.workspace.getConfiguration(EXTENSION_CONFIG.configSection)
    const currentGlowState = themeConfiguration.get('enableGlowEffects', true)
    const newGlowState = !currentGlowState

    console.log(`切换发光效果: ${currentGlowState} -> ${newGlowState}`)

    // 更新配置
    themeConfiguration.update('enableGlowEffects', newGlowState, vscode.ConfigurationTarget.Global)
      .then(() => {
        const statusMessage = newGlowState ? '发光效果已开启' : '发光效果已关闭'

        if (newGlowState) {
          // 开启发光效果：重新应用主题
          showInfoMessage(`${statusMessage}！请通过Custom CSS扩展重新加载以查看效果。`)
        } else {
          // 关闭发光效果：移除发光相关的CSS文件
          removeGlowEffectFiles()
          showInfoMessage(`${statusMessage}！发光效果相关文件已移除，请重新加载VSCode。`)
        }
      })
      .catch(error => {
        showErrorMessage(`更新发光效果配置失败: ${error.message}`)
        console.error('更新配置时出错:', error)
      })

  } catch (error) {
    showErrorMessage(`切换发光效果失败: ${error.message}`)
    console.error('切换发光效果时出错:', error)
  }
}

/**
 * 切换毛玻璃效果
 */
function toggleGlassEffect() {
  try {
    const themeConfiguration = vscode.workspace.getConfiguration(EXTENSION_CONFIG.configSection)
    const currentGlassState = themeConfiguration.get('enableGlassEffect', true)
    const newGlassState = !currentGlassState

    console.log(`切换毛玻璃效果: ${currentGlassState} -> ${newGlassState}`)

    // 更新配置
    themeConfiguration.update('enableGlassEffect', newGlassState, vscode.ConfigurationTarget.Global)
      .then(() => {
        const statusMessage = newGlassState ? '毛玻璃效果已开启' : '毛玻璃效果已关闭'
        showInfoMessage(`${statusMessage}！请通过Custom CSS扩展重新加载以查看效果。`)
      })
      .catch(error => {
        showErrorMessage(`更新毛玻璃效果配置失败: ${error.message}`)
        console.error('更新配置时出错:', error)
      })

  } catch (error) {
    showErrorMessage(`切换毛玻璃效果失败: ${error.message}`)
    console.error('切换毛玻璃效果时出错:', error)
  }
}

/**
 * 切换彩色光标效果
 */
function toggleRainbowCursor() {
  try {
    const themeConfiguration = vscode.workspace.getConfiguration(EXTENSION_CONFIG.configSection)
    const currentCursorState = themeConfiguration.get('enableRainbowCursor', false)
    const newCursorState = !currentCursorState

    console.log(`切换彩色光标效果: ${currentCursorState} -> ${newCursorState}`)

    // 更新配置
    themeConfiguration.update('enableRainbowCursor', newCursorState, vscode.ConfigurationTarget.Global)
      .then(() => {
        const statusMessage = newCursorState ? '彩色光标效果已开启' : '彩色光标效果已关闭'

        if (newCursorState) {
          // 开启彩色光标时，自动配置
          const { autoConfigureRainbowCursor } = require('./themes')
          autoConfigureRainbowCursor()
        } else {
          // 关闭彩色光标时，移除配置
          removeRainbowCursorConfig()
        }

        showInfoMessage(statusMessage)
      })
      .catch(error => {
        showErrorMessage(`更新彩色光标配置失败: ${error.message}`)
        console.error('更新配置时出错:', error)
      })

  } catch (error) {
    showErrorMessage(`切换彩色光标效果失败: ${error.message}`)
    console.error('切换彩色光标效果时出错:', error)
  }
}

/**
 * 彻底停用Woodfish主题 - 删除所有新旧版本注入文件
 */
function completeUninstall() {
  try {
    console.log('开始彻底停用Woodfish主题...')

    // 显示确认对话框
    const confirmAction = '确认停用'
    const cancelAction = '取消'

    vscode.window
      .showWarningMessage(
        '[Woodfish Theme] 此操作将彻底移除所有Woodfish主题相关文件和配置，包括新旧版本的所有注入文件。是否继续？',
        confirmAction,
        cancelAction
      )
      .then(selection => {
        if (selection === confirmAction) {
          performCompleteUninstall()
        } else {
          showInfoMessage('已取消彻底停用操作')
        }
      })

  } catch (error) {
    showErrorMessage(`彻底停用失败: ${error.message}`)
    console.error('彻底停用时出错:', error)
  }
}

/**
 * 执行彻底卸载操作
 */
function performCompleteUninstall() {
  try {
    console.log('执行彻底卸载操作...')

    // 1. 移除新版本的Custom CSS配置
    removeAllWoodfishCssFromCustomCss()

    // 2. 清理旧版本的HTML注入文件
    cleanOldHtmlInjections()

    // 3. 专门清理光标相关配置
    cleanCursorSpecificConfiguration()

    // 4. 清理扩展配置
    cleanExtensionConfiguration()

    // 4. 检查并清理其他可能的CSS注入
    checkAndCleanOtherCssExtensions()

    // 5. 强制重置光标样式
    forceResetCursorStyle()

    // 6. 提供额外的清理选项
    offerAdditionalCleanupOptions()

    // 5. 显示成功消息和重启提示
    showReloadPrompt('Woodfish主题已彻底停用！所有相关文件和配置已清理，请重新加载VSCode。')

    console.log('彻底卸载操作完成')

  } catch (error) {
    showErrorMessage(`执行彻底卸载失败: ${error.message}`)
    console.error('执行彻底卸载时出错:', error)
  }
}

/**
 * 从Custom CSS配置中移除所有Woodfish相关文件
 */
function removeAllWoodfishCssFromCustomCss() {
  try {
    const config = vscode.workspace.getConfiguration()

    // 获取两个扩展的配置
    const customCssImports = config.get('vscode_custom_css.imports', [])
    const hotReloadImports = config.get('custom_css_hot_reload.imports', [])

    // 处理 Custom CSS and JS Loader 配置
    if (customCssImports && customCssImports.length > 0) {
      console.log('清理Custom CSS and JS Loader配置中的Woodfish相关文件...')
      console.log('当前导入列表:', customCssImports)

      // 定义所有Woodfish相关的文件路径（更全面的列表）
      const woodfishRelatedFiles = [
        // 主要主题文件
        path.join(__dirname, '..', 'themes', 'woodfish-theme.css'),
        path.join(__dirname, '..', 'themes', 'woodfish-theme-modular.css'),
        // 模块文件 - 这些是产生渐变和发光效果的核心文件
        path.join(__dirname, '..', 'themes', 'modules', 'glow-effects.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'cursor-animation.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'transparent-ui.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'activity-bar.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'tab-bar.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'syntax-highlighting.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'variables.css'),
        // 自定义CSS文件
        path.join(__dirname, '..', 'custom-css', 'rainbow-cursor.css'),
        path.join(__dirname, '..', 'custom-css', 'cursor-loader.css'),
        // 旧版本可能的文件位置
        path.join(__dirname, '..', 'themes', 'woodfish-theme.html'),
        // 添加更多可能的文件路径
        path.join(__dirname, '..', 'index.css'),
        path.join(__dirname, '..', 'woodfish theme.json')
      ]

      // 构建文件URI列表
      const woodfishFileUris = woodfishRelatedFiles.map(filePath => {
        return pathToFileURI(filePath)
      })

      // 扩展关键词匹配模式 - 更全面的匹配，特别针对光标效果
      const woodfishKeywords = [
        'woodfish-theme',
        'glow-effects',
        'cursor-animation',
        'rainbow-cursor',
        'woodfish',
        'syntax-highlighting',
        'transparent-ui',
        'activity-bar',
        'tab-bar',
        'variables.css',
        'cursor-loader',
        // 光标动画相关关键词
        'bp-animation',
        'cursor-hue',
        'rainbow-cursor',
        'cursor-blink',
        'cursors-layer',
        'cursor-secondary',
        '.cursor',
        'monaco-editor .cursor',
        'div.cursor'
      ]

      console.log('要移除的Woodfish相关文件:', woodfishFileUris)

      // 更激进的过滤策略 - 移除任何Woodfish相关的配置，保留其他配置
      const filteredImports = customCssImports.filter(importPath => {
        // 检查是否是Woodfish相关文件（完全匹配）
        if (woodfishFileUris.some(woodfishUri => importPath === woodfishUri)) {
          console.log('找到完全匹配的Woodfish路径，将移除:', importPath)
          return false
        }

        // 检查路径中是否包含Woodfish相关关键词（更宽松的匹配）
        if (woodfishKeywords.some(keyword => importPath.toLowerCase().includes(keyword.toLowerCase()))) {
          console.log('找到包含Woodfish关键词的路径，将移除:', importPath)
          return false
        }

        // 检查是否包含在当前扩展目录中的任何CSS文件
        if (importPath.includes(__dirname.replace(/\\/g, '/').replace('/src', '')) && importPath.includes('.css')) {
          console.log('找到扩展目录中的CSS文件，将移除:', importPath)
          return false
        }

        // 保留其他非Woodfish相关的配置
        console.log('保留非Woodfish相关配置:', importPath)
        return true
      })

      const removedCount = customCssImports.length - filteredImports.length
      console.log(`从Custom CSS and JS Loader中移除了 ${removedCount} 个Woodfish相关配置`)

      if (removedCount > 0) {
        config.update('vscode_custom_css.imports', filteredImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('Woodfish相关CSS配置已从Custom CSS and JS Loader移除，保留其他配置')
          })
          .catch(error => {
            console.error('从Custom CSS and JS Loader移除Woodfish CSS配置失败:', error)
          })
      } else {
        console.log('Custom CSS and JS Loader中未找到Woodfish相关配置')
      }
    }

    // 处理 Custom CSS Hot Reload 配置
    if (hotReloadImports && hotReloadImports.length > 0) {
      console.log('清理Custom CSS Hot Reload配置中的Woodfish相关文件...')
      console.log('当前导入列表:', hotReloadImports)

      // 定义所有Woodfish相关的文件路径（更全面的列表）
      const woodfishRelatedFiles = [
        // 主要主题文件
        path.join(__dirname, '..', 'themes', 'woodfish-theme.css'),
        path.join(__dirname, '..', 'themes', 'woodfish-theme-modular.css'),
        // 模块文件 - 这些是产生渐变和发光效果的核心文件
        path.join(__dirname, '..', 'themes', 'modules', 'glow-effects.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'cursor-animation.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'transparent-ui.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'activity-bar.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'tab-bar.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'syntax-highlighting.css'),
        path.join(__dirname, '..', 'themes', 'modules', 'variables.css'),
        // 自定义CSS文件
        path.join(__dirname, '..', 'custom-css', 'rainbow-cursor.css'),
        path.join(__dirname, '..', 'custom-css', 'cursor-loader.css'),
        // 旧版本可能的文件位置
        path.join(__dirname, '..', 'themes', 'woodfish-theme.html'),
        // 添加更多可能的文件路径
        path.join(__dirname, '..', 'index.css'),
        path.join(__dirname, '..', 'woodfish theme.json')
      ]

      // 构建文件URI列表
      const woodfishFileUris = woodfishRelatedFiles.map(filePath => {
        return pathToFileURI(filePath)
      })

      // 扩展关键词匹配模式 - 更全面的匹配，特别针对光标效果
      const woodfishKeywords = [
        'woodfish-theme',
        'glow-effects',
        'cursor-animation',
        'rainbow-cursor',
        'woodfish',
        'syntax-highlighting',
        'transparent-ui',
        'activity-bar',
        'tab-bar',
        'variables.css',
        'cursor-loader',
        // 光标动画相关关键词
        'bp-animation',
        'cursor-hue',
        'rainbow-cursor',
        'cursor-blink',
        'cursors-layer',
        'cursor-secondary',
        '.cursor',
        'monaco-editor .cursor',
        'div.cursor'
      ]

      console.log('要移除的Woodfish相关文件:', woodfishFileUris)

      // 更激进的过滤策略 - 移除任何Woodfish相关的配置，保留其他配置
      const filteredImports = hotReloadImports.filter(importPath => {
        // 检查是否是Woodfish相关文件（完全匹配）
        if (woodfishFileUris.some(woodfishUri => importPath === woodfishUri)) {
          console.log('找到完全匹配的Woodfish路径，将移除:', importPath)
          return false
        }

        // 检查路径中是否包含Woodfish相关关键词（更宽松的匹配）
        if (woodfishKeywords.some(keyword => importPath.toLowerCase().includes(keyword.toLowerCase()))) {
          console.log('找到包含Woodfish关键词的路径，将移除:', importPath)
          return false
        }

        // 检查是否包含在当前扩展目录中的任何CSS文件
        if (importPath.includes(__dirname.replace(/\\/g, '/').replace('/src', '')) && importPath.includes('.css')) {
          console.log('找到扩展目录中的CSS文件，将移除:', importPath)
          return false
        }

        // 保留其他非Woodfish相关的配置
        console.log('保留非Woodfish相关配置:', importPath)
        return true
      })

      const removedCount = hotReloadImports.length - filteredImports.length
      console.log(`从Custom CSS Hot Reload中移除了 ${removedCount} 个Woodfish相关配置`)

      if (removedCount > 0) {
        config.update('custom_css_hot_reload.imports', filteredImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('Woodfish相关CSS配置已从Custom CSS Hot Reload移除，保留其他配置')
          })
          .catch(error => {
            console.error('从Custom CSS Hot Reload移除Woodfish CSS配置失败:', error)
          })
      } else {
        console.log('Custom CSS Hot Reload中未找到Woodfish相关配置')
      }
    }

    // 额外步骤：询问用户是否需要清空配置（可选）
    if ((customCssImports && customCssImports.length > 0) || (hotReloadImports && hotReloadImports.length > 0)) {
      vscode.window
        .showWarningMessage(
          '[Woodfish Theme] Woodfish相关配置已移除，其他配置已保留。是否需要清空所有Custom CSS配置？',
          '保留所有配置',
          '清空所有配置'
        )
        .then(selection => {
          if (selection === '清空所有配置') {
            // 清空两个扩展的配置
            if (customCssImports && customCssImports.length > 0) {
              config.update('vscode_custom_css.imports', [], vscode.ConfigurationTarget.Global)
                .then(() => {
                  console.log('已清空 Custom CSS and JS Loader 配置')
                })
                .catch(error => {
                  showErrorMessage(`清空Custom CSS and JS Loader配置失败: ${error.message}`)
                })
            }

            if (hotReloadImports && hotReloadImports.length > 0) {
              config.update('custom_css_hot_reload.imports', [], vscode.ConfigurationTarget.Global)
                .then(() => {
                  console.log('已清空 Custom CSS Hot Reload 配置')
                })
                .catch(error => {
                  showErrorMessage(`清空Custom CSS Hot Reload配置失败: ${error.message}`)
                })
            }

            showInfoMessage('已清空所有Custom CSS配置')
          } else {
            showInfoMessage('已保留其他Custom CSS配置')
          }
        })
    }

  } catch (error) {
    console.error('清理Custom CSS配置时出错:', error)
  }
}

/**
 * 清理旧版本的HTML注入
 */
function cleanOldHtmlInjections() {
  try {
    console.log('清理旧版本的HTML注入...')

    // 获取VSCode工作区HTML文件路径
    const htmlPath = getWorkbenchHtmlPath()

    if (!htmlPath || !fs.existsSync(htmlPath)) {
      console.log('未找到workbench HTML文件，跳过HTML清理')
      return
    }

    try {
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8')

      // 清理Woodfish主题相关的style和script标签
      const cleanedContent = cleanThemeStyles(htmlContent)

      if (htmlContent !== cleanedContent) {
        // 备份原始文件
        const backupPath = htmlPath + '.woodfish-backup'
        fs.writeFileSync(backupPath, htmlContent)
        console.log(`已备份原始HTML文件到: ${backupPath}`)

        // 写入清理后的内容
        fs.writeFileSync(htmlPath, cleanedContent)
        console.log('已清理HTML文件中的Woodfish注入内容')
      } else {
        console.log('HTML文件中未找到Woodfish注入内容')
      }

    } catch (error) {
      console.error('清理HTML文件时出错:', error)
    }

  } catch (error) {
    console.error('清理旧版本HTML注入时出错:', error)
  }
}

/**
 * 检查并清理其他可能的CSS注入扩展
 */
function checkAndCleanOtherCssExtensions() {
  try {
    console.log('检查其他可能的CSS注入扩展...')

    // 检查常见的CSS注入扩展
    const cssExtensions = [
      'be5invis.vscode-custom-css',  // Custom CSS and JS Loader
      'apc-extension.vscode-apc',    // APC Extension
      'robbowen.vscode-sync-rsync',  // 其他可能修改UI的扩展
      'ms-vscode.vscode-custom-css'  // Microsoft的Custom CSS
    ]

    let foundExtensions = []

    cssExtensions.forEach(extensionId => {
      try {
        const extension = vscode.extensions.getExtension(extensionId)
        if (extension) {
          foundExtensions.push(extensionId)
          console.log(`发现CSS注入扩展: ${extensionId}`)
        }
      } catch (error) {
        console.log(`检查扩展 ${extensionId} 时出错:`, error.message)
      }
    })

    if (foundExtensions.length > 0) {
      vscode.window
        .showWarningMessage(
          `[Woodfish Theme] 发现安装了其他CSS注入扩展：${foundExtensions.join(', ')}。这些扩展可能包含导致残留效果的CSS。是否禁用它们？`,
          '禁用这些扩展',
          '保持启用'
        )
        .then(selection => {
          if (selection === '禁用这些扩展') {
            disableCssExtensions(foundExtensions)
          }
        })
    }

  } catch (error) {
    console.error('检查其他CSS注入扩展时出错:', error)
  }
}

/**
 * 禁用CSS注入扩展
 */
function disableCssExtensions(extensionIds) {
  try {
    console.log('禁用CSS注入扩展:', extensionIds)

    extensionIds.forEach(extensionId => {
      try {
        vscode.commands.executeCommand('workbench.extensions.disableExtension', extensionId)
          .then(() => {
            console.log(`已禁用扩展: ${extensionId}`)
          })
          .catch(error => {
            console.error(`禁用扩展 ${extensionId} 失败:`, error)
          })
      } catch (error) {
        console.error(`禁用扩展 ${extensionId} 时出错:`, error)
      }
    })

    showInfoMessage('已请求禁用相关CSS注入扩展，请重新加载VSCode以生效')

  } catch (error) {
    console.error('禁用CSS注入扩展时出错:', error)
  }
}

/**
 * 强制重置光标样式
 */
function forceResetCursorStyle() {
  try {
    console.log('强制重置光标样式...')

    // 创建并注入重置光标样式的CSS
    const resetCursorCss = `
      /* Woodfish主题光标重置样式 */
      .monaco-editor .cursor,
      .monaco-editor .cursors-layer .cursor,
      div.cursor,
      .cursor {
        background: none !important;
        background-color: #ffffff !important;
        background-image: none !important;
        animation: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        filter: none !important;
        transform: none !important;
        transition: none !important;
        background-size: auto !important;
        background-position: auto !important;
      }

      /* 重置光标动画 */
      @keyframes bp-animation {
        0% { background-position: 0% 0%; }
        100% { background-position: 0% 0%; }
      }

      @keyframes rainbow-cursor {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(0deg); }
      }

      @keyframes cursor-hue {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(0deg); }
      }

      @keyframes cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 1; }
      }

      /* 重置多光标样式 */
      .monaco-editor .cursor-secondary {
        background: #ffffff !important;
        animation: none !important;
        box-shadow: none !important;
      }

      /* 重置光标悬停效果 */
      .monaco-editor:hover .cursor {
        transform: none !important;
        transition: none !important;
      }

      /* 重置输入时的光标效果 */
      .monaco-editor.focused .cursor {
        animation-duration: normal !important;
        box-shadow: none !important;
      }
    `

    // 将重置样式注入到Custom CSS配置中
    const config = vscode.workspace.getConfiguration()
    const customCssImports = config.get('vscode_custom_css.imports', [])

    // 创建临时重置文件
    const resetFilePath = path.join(__dirname, '..', 'cursor-reset.css')
    fs.writeFileSync(resetFilePath, resetCursorCss)
    const resetFileUri = pathToFileURI(resetFilePath)

    // 添加到Custom CSS导入列表
    const newImports = [...customCssImports, resetFileUri]

    config.update('vscode_custom_css.imports', newImports, vscode.ConfigurationTarget.Global)
      .then(() => {
        console.log('已注入光标重置样式')
        showInfoMessage('已强制重置光标样式为默认白色')

        // 延迟清理重置文件，确保应用后再清理
        setTimeout(() => {
          if (fs.existsSync(resetFilePath)) {
            fs.unlinkSync(resetFilePath)
            console.log('已清理临时重置文件')
          }
        }, 5000)
      })
      .catch(error => {
        console.error('注入光标重置样式失败:', error)
      })

  } catch (error) {
    console.error('强制重置光标样式时出错:', error)
  }
}

/**
 * 提供额外的清理选项
 */
function offerAdditionalCleanupOptions() {
  try {
    console.log('提供额外的清理选项...')

    // 询问用户是否需要重置VSCode主题设置
    const resetThemeAction = '重置VSCode主题设置'
    const skipAction = '跳过'

    vscode.window
      .showInformationMessage(
        '[Woodfish Theme] 为确保完全移除效果，建议重置VSCode的主题相关设置。是否继续？',
        resetThemeAction,
        skipAction
      )
      .then(selection => {
        if (selection === resetThemeAction) {
          resetVSCodeThemeSettings()
        }
      })

  } catch (error) {
    console.error('提供额外清理选项时出错:', error)
  }
}

/**
 * 重置VSCode主题设置
 */
function resetVSCodeThemeSettings() {
  try {
    console.log('重置VSCode主题设置...')

    const config = vscode.workspace.getConfiguration()

    // 重置颜色主题
    config.update('workbench.colorTheme', 'Default Dark+', vscode.ConfigurationTarget.Global)
      .then(() => {
        console.log('颜色主题已重置为Default Dark+')
      })
      .catch(error => {
        console.error('重置颜色主题失败:', error)
      })

    // 重置文件图标主题
    config.update('workbench.iconTheme', 'vs-seti', vscode.ConfigurationTarget.Global)
      .then(() => {
        console.log('文件图标主题已重置为vs-seti')
      })
      .catch(error => {
        console.error('重置文件图标主题失败:', error)
      })

    // 重置产品图标主题
    config.update('workbench.productIconTheme', 'Default', vscode.ConfigurationTarget.Global)
      .then(() => {
        console.log('产品图标主题已重置为Default')
      })
      .catch(error => {
        console.error('重置产品图标主题失败:', error)
      })

    showInfoMessage('VSCode主题设置已重置为默认值')

  } catch (error) {
    console.error('重置VSCode主题设置时出错:', error)
  }
}

/**
 * 专门清理光标相关配置
 */
function cleanCursorSpecificConfiguration() {
  try {
    console.log('开始专门清理光标相关配置...')

    const config = vscode.workspace.getConfiguration()

    // 1. 重置VSCode光标设置
    const cursorSettings = [
      'editor.cursorStyle',
      'editor.cursorWidth',
      'editor.cursorBlinking',
      'editor.cursorSmoothCaretAnimation',
      'editor.cursorSurroundingLines'
    ]

    cursorSettings.forEach(setting => {
      config.update(setting, undefined, vscode.ConfigurationTarget.Global)
        .then(() => {
          console.log(`已重置光标设置: ${setting}`)
        })
        .catch(error => {
          console.error(`重置光标设置 ${setting} 失败:`, error)
        })
    })

    // 2. 清理工作区级别的光标配置
    const workspaceCursorSettings = [
      'workbench.colorCustomizations'
    ]

    workspaceCursorSettings.forEach(setting => {
      config.update(setting, undefined, vscode.ConfigurationTarget.Workspace)
        .then(() => {
          console.log(`已清理工作区设置: ${setting}`)
        })
        .catch(error => {
          console.error(`清理工作区设置 ${setting} 失败:`, error)
        })
    })

    // 3. 重置颜色自定义中的光标颜色
    const colorCustomizations = config.get('workbench.colorCustomizations', {})
    const cleanedColorCustomizations = {}

    // 只保留非光标相关的颜色设置
    Object.keys(colorCustomizations).forEach(key => {
      if (!key.toLowerCase().includes('cursor')) {
        cleanedColorCustomizations[key] = colorCustomizations[key]
      } else {
        console.log(`移除了光标颜色设置: ${key}`)
      }
    })

    config.update('workbench.colorCustomizations', cleanedColorCustomizations, vscode.ConfigurationTarget.Global)
      .then(() => {
        console.log('已清理光标颜色自定义')
      })
      .catch(error => {
        console.error('清理光标颜色自定义失败:', error)
      })

    // 4. 清理特定于Woodfish主题的配置
    const woodfishSpecificSettings = [
      'woodfishTheme.enableRainbowCursor',
      'woodfishTheme.enableGlowEffects',
      'woodfishTheme.enableGlassEffect'
    ]

    woodfishSpecificSettings.forEach(setting => {
      config.update(setting, false, vscode.ConfigurationTarget.Global)
        .then(() => {
          console.log(`已禁用Woodfish设置: ${setting}`)
        })
        .catch(error => {
          console.error(`禁用Woodfish设置 ${setting} 失败:`, error)
        })
    })

    console.log('光标相关配置清理完成')

  } catch (error) {
    console.error('清理光标相关配置时出错:', error)
  }
}

/**
 * 清理扩展配置
 */
function cleanExtensionConfiguration() {
  try {
    console.log('清理扩展配置...')

    if (!extensionContext) return

    // 清理版本信息
    extensionContext.globalState.update(EXTENSION_CONFIG.versionKey, undefined)

    // 清理用户拒绝安装依赖插件的记录
    extensionContext.globalState.update(`declined-${require('./constants').DEPENDENCY_EXTENSION.id}`, undefined)

    console.log('扩展配置已清理')

  } catch (error) {
    console.error('清理扩展配置时出错:', error)
  }
}

/**
 * 获取VSCode工作区HTML文件路径（兼容旧版本）
 */
function getWorkbenchHtmlPath() {
  try {
    const appDirectory = require.main ? path.dirname(require.main.filename) : globalThis._VSCODE_FILE_ROOT
    const baseDirectory = path.join(appDirectory, 'vs', 'code')

    const possiblePaths = [
      path.join(baseDirectory, 'electron-sandbox', 'workbench', 'workbench.html'),
      path.join(baseDirectory, 'electron-sandbox', 'workbench', 'workbench-apc-extension.html'),
      path.join(baseDirectory, 'electron-sandbox', 'workbench', 'workbench.esm.html'),
      path.join(baseDirectory, 'electron-browser', 'workbench', 'workbench.esm.html'),
      path.join(baseDirectory, 'electron-browser', 'workbench', 'workbench.html')
    ]

    for (const htmlPath of possiblePaths) {
      if (fs.existsSync(htmlPath)) {
        return htmlPath
      }
    }

    return null
  } catch (error) {
    console.error('获取workbench HTML路径时出错:', error)
    return null
  }
}

/**
 * 清理HTML文件中的主题样式（兼容旧版本）
 */
function cleanThemeStyles(htmlContent) {
  try {
    console.log('开始清理HTML文件中的主题样式...')

    let cleanedContent = htmlContent
    let removedCount = 0

    // 1. 清理Woodfish主题相关的style标签（标准方式）
    const styleRegex = new RegExp(
      `<style[^>]*${EXTENSION_CONFIG.tagAttribute}[^>]*>[\\s\\S]*?</style>`,
      'gi'
    )

    // 2. 清理Woodfish主题相关的script标签
    const scriptRegex = new RegExp(
      `<script[^>]*${EXTENSION_CONFIG.tagAttribute}[^>]*>[\\s\\S]*?</script>`,
      'gi'
    )

    // 3. 清理所有包含woodfish关键词的style标签（更激进的清理）
    const woodfishStyleRegex = /<style[^>]*(?:woodfish|glow|gradient|rainbow|cursor|animation)[^>]*>[\s\S]*?<\/style>/gi

    // 4. 清理所有包含woodfish关键词的script标签
    const woodfishScriptRegex = /<script[^>]*(?:woodfish|glow|gradient|rainbow|cursor|animation)[^>]*>[\s\S]*?<\/script>/gi

    // 5. 清理内联样式中包含woodfish相关内容的标签
    const inlineStyleRegex = /<[^>]+style="[^"]*(?:woodfish|glow|gradient|rainbow|cursor|animation)[^"]*"[^>]*>/gi

    // 6. 专门清理光标相关的CSS（最激进的清理）
    const cursorCssRegex = /[^{}]*\.cursor[^{}]*\{[^{}]*\}/gi
    const cursorAnimationRegex = /@keyframes\s+(?:rainbow-cursor|bp-animation|cursor-hue|cursor-blink)[^{]*\{[^{}]*\}/gi
    const cursorDivRegex = /div\.cursor[^{]*\{[^{}]*\}/gi
    const monacoCursorRegex = /\.monaco-editor[^{]*\.cursor[^{]*\{[^{}]*\}/gi

    // 应用所有清理规则
    const rules = [
      { name: '标准style标签', regex: styleRegex },
      { name: '标准script标签', regex: scriptRegex },
      { name: 'woodfish相关style标签', regex: woodfishStyleRegex },
      { name: 'woodfish相关script标签', regex: woodfishScriptRegex },
      { name: '内联样式', regex: inlineStyleRegex },
      { name: '光标CSS规则', regex: cursorCssRegex },
      { name: '光标动画关键帧', regex: cursorAnimationRegex },
      { name: 'div.cursor规则', regex: cursorDivRegex },
      { name: 'monaco光标规则', regex: monacoCursorRegex }
    ]

    rules.forEach(rule => {
      const beforeLength = cleanedContent.length
      cleanedContent = cleanedContent.replace(rule.regex, (match) => {
        removedCount++
        console.log(`移除了${rule.name}: ${match.substring(0, 150)}...`)
        return ''
      })
      const afterLength = cleanedContent.length
      if (beforeLength !== afterLength) {
        console.log(`${rule.name}清理完成，移除了 ${beforeLength - afterLength} 字符`)
      }
    })

    // 7. 清理任何包含CSS变量的内容（针对渐变和发光效果）
    const cssVarsRegex = /(?:--gradient-|--glow-|text-shadow:\s*0\s+0\s+\d+px\s+currentColor)[^;]*;?/gi
    cleanedContent = cleanedContent.replace(cssVarsRegex, (match) => {
      console.log(`移除了CSS变量: ${match}`)
      return ''
    })

    // 8. 清理linear-gradient相关内容
    const gradientRegex = /linear-gradient\([^)]*\)/gi
    cleanedContent = cleanedContent.replace(gradientRegex, (match) => {
      if (match.includes('cursor') || match.includes('rainbow') || match.includes('#ff')) {
        console.log(`移除了渐变效果: ${match}`)
        return 'transparent'
      }
      return match
    })

    // 9. 清理background-size中光标相关的内容
    const bgSizeRegex = /background-size:\s*\d+%\s*\d+%/gi
    cleanedContent = cleanedContent.replace(bgSizeRegex, (match) => {
      if (cleanedContent.includes('cursor') && (match.includes('800%') || match.includes('1200%'))) {
        console.log(`移除了光标背景尺寸: ${match}`)
        return 'background-size: auto'
      }
      return match
    })

    console.log(`HTML样式清理完成，共移除 ${removedCount} 处处内容`)

    return cleanedContent
  } catch (error) {
    console.error('清理主题样式时出错:', error)
    return htmlContent
  }
}

/**
 * 移除发光效果相关的CSS文件
 */
function removeGlowEffectFiles() {
  try {
    // 检查哪个扩展已安装，然后移除对应的发光效果配置
    const isCustomCssInstalled = isCustomCssExtensionInstalled()
    const isHotReloadInstalled = isCustomCssHotReloadExtensionInstalled()

    // 如果两个扩展都没有安装，则提示用户
    if (!isCustomCssInstalled && !isHotReloadInstalled) {
      showInfoMessage('未检测到 Custom CSS 扩展，请先安装扩展后再尝试移除发光效果')
      return
    }

    let totalRemovedCount = 0

    // 处理 Custom CSS and JS Loader 扩展
    if (isCustomCssInstalled) {
      const config = vscode.workspace.getConfiguration()
      const customCssImports = config.get('vscode_custom_css.imports', [])

      console.log('开始从 Custom CSS and JS Loader 移除发光效果相关文件...')
      console.log('当前导入列表:', customCssImports)

      // 定义发光效果相关的文件路径
      const glowRelatedFiles = [
        // 主要发光效果文件
        path.join(__dirname, '..', 'themes', 'modules', 'glow-effects.css'),
        // 主主题文件（包含发光效果）
        path.join(__dirname, '..', 'themes', 'woodfish-theme.css'),
        // 模块化主题文件（导入发光效果）
        path.join(__dirname, '..', 'themes', 'woodfish-theme-modular.css')
      ]

      // 构建文件URI列表
      const glowFileUris = glowRelatedFiles.map(filePath => {
        return pathToFileURI(filePath)
      })

      console.log('要移除的发光效果文件:', glowFileUris)

      // 过滤掉发光效果相关的配置，保留其他配置
      const filteredImports = customCssImports.filter(importPath => {
        // 检查是否是发光效果相关文件
        const isGlowRelated = glowFileUris.some(glowUri => importPath === glowUri) ||
          // 检查路径中是否包含发光效果相关关键词
          importPath.includes('glow-effects.css') ||
          importPath.includes('woodfish-theme.css') ||
          importPath.includes('woodfish-theme-modular.css')

        if (isGlowRelated) {
          console.log('找到发光效果相关路径，将移除:', importPath)
          return false
        }

        // 保留其他非发光效果相关的配置
        console.log('保留非发光效果相关配置:', importPath)
        return true
      })

      const removedCount = customCssImports.length - filteredImports.length
      console.log(`从 Custom CSS and JS Loader 移除了 ${removedCount} 个发光效果相关配置`)

      if (removedCount > 0) {
        config.update('vscode_custom_css.imports', filteredImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('发光效果相关CSS配置已从 Custom CSS and JS Loader 移除，保留其他配置')
          })
          .catch(error => {
            console.error('从 Custom CSS and JS Loader 移除发光效果配置失败:', error)
            showErrorMessage(`从 Custom CSS and JS Loader 移除发光效果配置失败: ${error.message}`)
          })

        totalRemovedCount += removedCount
      } else {
        console.log('Custom CSS and JS Loader 中未找到发光效果相关配置')
      }
    }

    // 处理 Custom CSS Hot Reload 扩展
    if (isHotReloadInstalled) {
      const config = vscode.workspace.getConfiguration()
      const hotReloadImports = config.get('custom_css_hot_reload.imports', [])

      console.log('开始从 Custom CSS Hot Reload 移除发光效果相关文件...')
      console.log('当前导入列表:', hotReloadImports)

      // 定义发光效果相关的文件路径
      const glowRelatedFiles = [
        // 主要发光效果文件
        path.join(__dirname, '..', 'themes', 'modules', 'glow-effects.css'),
        // 主主题文件（包含发光效果）
        path.join(__dirname, '..', 'themes', 'woodfish-theme.css'),
        // 模块化主题文件（导入发光效果）
        path.join(__dirname, '..', 'themes', 'woodfish-theme-modular.css')
      ]

      // 构建文件URI列表
      const glowFileUris = glowRelatedFiles.map(filePath => {
        return pathToFileURI(filePath)
      })

      console.log('要移除的发光效果文件:', glowFileUris)

      // 过滤掉发光效果相关的配置，保留其他配置
      const filteredImports = hotReloadImports.filter(importPath => {
        // 检查是否是发光效果相关文件
        const isGlowRelated = glowFileUris.some(glowUri => importPath === glowUri) ||
          // 检查路径中是否包含发光效果相关关键词
          importPath.includes('glow-effects.css') ||
          importPath.includes('woodfish-theme.css') ||
          importPath.includes('woodfish-theme-modular.css')

        if (isGlowRelated) {
          console.log('找到发光效果相关路径，将移除:', importPath)
          return false
        }

        // 保留其他非发光效果相关的配置
        console.log('保留非发光效果相关配置:', importPath)
        return true
      })

      const removedCount = hotReloadImports.length - filteredImports.length
      console.log(`从 Custom CSS Hot Reload 移除了 ${removedCount} 个发光效果相关配置`)

      if (removedCount > 0) {
        config.update('custom_css_hot_reload.imports', filteredImports, vscode.ConfigurationTarget.Global)
          .then(() => {
            console.log('发光效果相关CSS配置已从 Custom CSS Hot Reload 移除，保留其他配置')
          })
          .catch(error => {
            console.error('从 Custom CSS Hot Reload 移除发光效果配置失败:', error)
            showErrorMessage(`从 Custom CSS Hot Reload 移除发光效果配置失败: ${error.message}`)
          })

        totalRemovedCount += removedCount
      } else {
        console.log('Custom CSS Hot Reload 中未找到发光效果相关配置')
      }
    }

    if (totalRemovedCount > 0) {
      console.log(`总共移除了 ${totalRemovedCount} 个发光效果相关配置，保留了其他配置`)
    } else {
      console.log('未找到发光效果相关配置')
    }

  } catch (error) {
    console.error('移除发光效果文件时出错:', error)
    showErrorMessage(`移除发光效果文件失败: ${error.message}`)
  }
}

module.exports = {
  setExtensionContext,
  toggleGlowEffects,
  toggleGlassEffect,
  toggleRainbowCursor,
  completeUninstall,
  performCompleteUninstall,
  removeGlowEffectFiles,
  removeAllWoodfishCssFromCustomCss,
}
