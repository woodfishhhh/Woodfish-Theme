/**
 * Woodfish Theme - 工具函数模块
 * 包含路径处理、消息显示等通用工具函数
 */

const path = require('path')
const vscode = require('vscode')

/**
 * 将系统路径转换为 file:// URI 格式
 * @param {string} filePath - 系统路径
 * @returns {string} file:// URI 格式路径
 */
function pathToFileURI(filePath) {
  // 使用 path.normalize 确保路径格式正确
  const normalizedPath = path.normalize(filePath)
  // 将反斜杠替换为正斜杠，并添加 file:// 前缀
  return `file:///${normalizedPath.replace(/\\/g, '/')}`
}

/**
 * 从 file:// URI 中提取系统路径
 * @param {string} uri - file:// URI
 * @returns {string} 系统路径
 */
function uriToFilePath(uri) {
  // 移除 file:// 前缀
  let filePath = uri.replace('file:///', '')

  // 在Windows系统上，file:// URI可能包含额外的斜杠，需要处理
  if (process.platform === 'win32' && filePath.startsWith('/')) {
    filePath = filePath.substring(1)
  }

  return filePath
}

/**
 * 显示信息消息
 * @param {string} message 消息内容
 */
function showInfoMessage(message) {
  vscode.window.showInformationMessage(`[Woodfish Theme] ${message}`)
}

/**
 * 显示错误消息
 * @param {string} message 错误消息
 */
function showErrorMessage(message) {
  vscode.window.showErrorMessage(`[Woodfish Theme] ${message}`)
}

/**
 * 显示重启提示消息
 * @param {string} message 提示消息
 */
function showReloadPrompt(message) {
  const reloadAction = '重新加载窗口'
  const dismissAction = '稍后'

  vscode.window
    .showInformationMessage(`[Woodfish Theme] ${message}`, reloadAction, dismissAction)
    .then(selection => {
      if (selection === reloadAction) {
        vscode.commands.executeCommand('workbench.action.reloadWindow')
      }
    })
}

module.exports = {
  pathToFileURI,
  uriToFilePath,
  showInfoMessage,
  showErrorMessage,
  showReloadPrompt
}