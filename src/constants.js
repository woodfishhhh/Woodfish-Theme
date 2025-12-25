/**
 * Woodfish Theme - 常量定义模块
 * 定义扩展中使用的常量和配置键
 */

// 扩展配置常量
const EXTENSION_CONFIG = {
  name: 'woodfish-theme',
  displayName: 'Woodfish Theme',
  versionKey: 'woodfish-theme-vscode-version',
  configSection: 'woodfishTheme',
  themeFileName: 'woodfish-theme.css',
  tagAttribute: 'woodfish-theme' // 用于HTML注入的标签属性（如果需要兼容旧版本）
}

// 两个Custom CSS扩展的配置键常量
const CUSTOM_CSS_CONFIG_KEYS = {
  CUSTOM_CSS_LOADER: 'vscode_custom_css.imports',      // Custom CSS and JS Loader
  CUSTOM_CSS_HOT_RELOAD: 'custom_css_hot_reload.imports' // Custom CSS Hot Reload
}

// 两个Custom CSS扩展的ID常量
const CUSTOM_CSS_EXTENSION_IDS = {
  CUSTOM_CSS_LOADER: 'be5invis.vscode-custom-css',
  CUSTOM_CSS_HOT_RELOAD: 'bartag.custom-css-hot-reload'
}

// 依赖插件配置
const DEPENDENCY_EXTENSION = {
  id: 'BrandonKirbyson.vscode-animations',
  name: 'VSCode Animations',
  description: '为VSCode提供动画效果的插件'
}

module.exports = {
  EXTENSION_CONFIG,
  CUSTOM_CSS_CONFIG_KEYS,
  CUSTOM_CSS_EXTENSION_IDS,
  DEPENDENCY_EXTENSION
}