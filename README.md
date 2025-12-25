# 🌈 Woodfish Theme

> 中文 | [English](README.en.md)

> 一个具有发光效果、渐变色彩和动画的VSCode彩虹主题扩展

[![Version](https://img.shields.io/badge/version-3.5.1-blue.svg)](https://github.com/woodfishhhh/Woodfish-Theme)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-%5E1.74.0-blue.svg)](https://code.visualstudio.com/)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/zhongjun.woodfish-theme)](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme)
[![GitHub Release](https://img.shields.io/github/v/release/woodfishhhh/Woodfish-Theme)](https://github.com/woodfishhhh/Woodfish-Theme/releases)

## ✨ 特色功能

- 🌈 **彩虹光标**: 动态变化的彩虹光标动画，让编码更有趣
- ✨ **发光效果**: 代码关键字和行号发光效果，增强视觉体验
- 🎨 **渐变色彩**: 精心设计的渐变语法高亮，提升代码可读性
- 🔍 **透明UI**: 现代化的半透明菜单和悬停效果
- 📊 **活动栏动画**: 选中标签的渐变边框动画
- 🎯 **模块化设计**: 可按需自定义的模块化CSS架构
- 🚀 **性能优化**: 轻量级设计，不影响编辑器性能
- 🎛️ **独立控制**: 发光效果、毛玻璃效果、彩色光标可独立开关 🆕
- 🏗️ **模块化架构**: 完全重构的src模块化设计，提升可维护性 🆕
- ⚙️ **智能配置**: 自动配置和验证机制，确保主题功能正常运行 🆕

## 🖼️ 预览

![主题预览1](images/img1.png)
![主题预览2](images/img2.png)

*展示彩虹光标、发光效果和渐变色彩的完整效果*

## 📦 安装

### 从VSCode扩展市场安装

1. 打开VSCode
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "Woodfish Theme"
4. 点击安装

### 手动安装

```bash
# 下载并安装VSIX文件
code --install-extension woodfish-theme-3.0.0.vsix
```

## 🚀 使用方法

### 启用主题

1. 安装扩展后，按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `Woodfish Theme: 启用 Woodfish Theme`
3. 选择并执行命令
4. 重启VSCode以应用更改

### 🌈 启用彩色光标 (v3.0.0新功能)

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `Woodfish Theme: 启动彩色光标自动配置`
3. 选择并执行命令
4. 如果提示安装 Custom CSS and JS Loader 扩展，选择安装方式：
   - **推荐**: 选择"使用脚本自动安装"
   - **手动**: 选择"手动安装"并按提示操作
5. 安装完成后，按提示启用 Custom CSS 功能
6. 重启VSCode享受彩色光标效果

### 选择颜色主题

1. 按 `Ctrl+K Ctrl+T` 打开主题选择器
2. 选择 "Woodfish Dark"

### 🎛️ 主题命令

- `Woodfish Theme: 启用 Woodfish Theme` - 启用主题
- `Woodfish Theme: 关闭 Woodfish Theme` - 关闭主题
- `Woodfish Theme: 彻底停用 Woodfish 主题` - 强制去除新版和旧版的发光特效以及彩色光标等 🆕
- `Woodfish Theme: 开启/关闭 Woodfish 发光` - 切换发光效果
- `Woodfish Theme: 启动彩色光标自动配置` - 配置彩色光标 ✨新功能
- `Woodfish Theme: 开启/关闭毛玻璃效果` - 切换毛玻璃效果 🆕
- `Woodfish Theme: 开启/关闭彩色光标` - 切换彩色光标效果 🆕

## ⚙️ 自定义配置

在VSCode设置中可以自定义主题行为：

```json
{
  "woodfishTheme.customStyles": [
    {
      "enabled": true,
      "css": "/* 自定义CSS样式 */"
    }
  ],
  "woodfishTheme.enableGlowEffects": true,
  "woodfishTheme.enableGlassEffect": true,
  "woodfishTheme.enableRainbowCursor": false
}
```

### 配置项说明

- `woodfishTheme.enableGlowEffects`: 启用/禁用发光效果
- `woodfishTheme.enableGlassEffect`: 启用/禁用毛玻璃效果
- `woodfishTheme.enableRainbowCursor`: 启用/禁用彩色光标效果
- `woodfishTheme.customStyles`: 自定义CSS样式数组

### 自定义样式示例

```json
{
  "woodfishTheme.customStyles": [
    {
      "enabled": true,
      "css": "div.cursor { animation-duration: 20s !important; }"
    },
    {
      "enabled": true,
      "css": "span.mtk1 { text-shadow: 0 0 40px currentColor !important; }"
    }
  ]
}
```

## 🎨 主题特色

### 彩虹光标动画

- 6秒循环的彩虹渐变动画
- 发光效果增强视觉冲击
- 流畅的颜色过渡

### 语法高亮渐变

- HTML标签: 蓝色渐变
- 字符串: 绿色渐变  
- 关键字: 紫色渐变
- 变量: 橙色渐变
- 注释: 半透明效果

### 发光效果分级

- 高强度: 关键字、函数 (30px)
- 中等强度: 变量、字符串 (25px)
- 低强度: 注释、符号 (20px)
- 最小强度: 其他元素 (15px)

### 透明UI设计

- 悬停提示半透明背景
- 快速输入小部件透明效果
- 毛玻璃模糊效果

## 🛠️ 开发

### 环境要求

- Node.js >= 16.0.0
- VSCode >= 1.74.0
- Git

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/woodfishhhh/Woodfish-Theme.git
cd Woodfish-Theme

# 安装依赖
npm install

# 打包扩展
npm run package
```

### 模块化架构

主题采用完全模块化设计，包含以下模块：

**CSS样式模块：**

- `variables.css` - 主题变量定义
- `activity-bar.css` - 活动栏样式
- `tab-bar.css` - 标签栏样式
- `syntax-highlighting.css` - 语法高亮
- `glow-effects.css` - 发光效果
- `cursor-animation.css` - 光标动画
- `transparent-ui.css` - 透明UI

**JavaScript功能模块：**

- `src/constants.js` - 常量定义
- `src/utils.js` - 工具函数
- `src/themes.js` - 主题配置和CSS管理
- `src/config.js` - 配置管理
- `src/commands.js` - 命令处理
- `src/config-validator.js` - 配置验证和监听

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md)。

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 更新日志

### [3.5.1] - 2025-12-25 🛠️ 最新版本

#### 🆕 主要修复

- **模块化架构优化** - 完善src模块化设计，将功能拆分为独立模块
- **配置管理优化** - 重构配置管理逻辑，提升代码可维护性
- **打包配置修复** - 修复打包时src文件夹被忽略的问题，确保所有模块正确打包
- **命令注册修复** - 修复命令导入路径问题，确保所有命令正确注册

#### 🏗️ 架构改进

- `src/constants.js` - 常量定义模块
- `src/utils.js` - 工具函数模块  
- `src/themes.js` - 主题配置模块
- `src/config.js` - 配置管理模块
- `src/commands.js` - 命令处理模块
- `src/config-validator.js` - 配置验证和监听模块

#### 🐛 优化改进

- 完善模块化架构，提升代码可维护性
- 修复打包配置问题，确保所有文件正确包含
- 优化错误处理和模块加载机制
- 改进代码结构，提升性能和稳定性

### [3.4.0] - 2025-09-18

#### 🆕 主要新增功能

- **彻底停用功能** - 新增"彻底停用 Woodfish 主题"命令，可强制去除新版和旧版的发光特效以及彩色光标等
- **完全清理机制** - 彻底清理所有主题相关的CSS配置和Custom CSS设置
- **兼容性增强** - 确保与各种版本的主题配置完全兼容

#### 🎛️ 新增命令

- `Woodfish Theme: 彻底停用 Woodfish 主题` - 强制去除所有主题效果，包括新版和旧版配置

#### 🐛 优化改进

- 完善主题卸载机制，确保彻底清理
- 优化用户体验，提供完整的停用选项
- 改进错误处理和状态反馈

### [3.1.0] - 2025-08-27

#### 🆕 主要新增功能

- **独立效果控制** - 新增"开启/关闭毛玻璃效果"命令，可独立控制透明UI效果
- **彩色光标开关** - 新增"开启/关闭彩色光标"命令，一键切换彩色光标效果
- **智能配置管理** - 彩色光标开关自动管理Custom CSS配置，无需手动操作
- **模块化架构优化** - 完善模块化设计，各效果完全独立可控

#### 🎛️ 新增命令

- `Woodfish Theme: 开启/关闭毛玻璃效果` - 切换透明UI和毛玻璃效果
- `Woodfish Theme: 开启/关闭彩色光标` - 切换彩色光标效果

#### ⚙️ 新增配置项

- `woodfishTheme.enableGlassEffect`: 控制毛玻璃效果开关
- `woodfishTheme.enableRainbowCursor`: 控制彩色光标效果开关

#### 🐛 优化改进

- 完善配置监听机制，实时响应效果开关
- 优化用户体验，提供清晰的状态反馈
- 改进错误处理和降级方案
- 增强文档说明和使用指南

### [3.0.0] - 2025-01-22

#### 🌈 主要新增功能

- **彩色光标自动配置** - 新增"启动彩色光标自动配置"命令，一键启用炫酷的彩色光标效果
- **智能依赖管理** - 自动检测并安装 Custom CSS and JS Loader 扩展
- **多种安装方式** - 支持脚本自动安装和手动安装两种方式
- **完整配置流程** - 自动配置彩色光标 CSS 设置并引导用户启用
- **跨平台支持** - 完美兼容 Windows、macOS 和 Linux 系统

#### 🐛 修复和优化

- 修复了彩色光标配置中的依赖扩展安装问题
- 完善了错误处理和用户提示机制
- 优化了扩展安装流程的用户体验
- 改进了文档结构和说明

#### 📦 发布信息

- ✅ **VSCode 扩展市场**: [立即安装](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme)
- ✅ **GitHub Release**: [v3.0.0](https://github.com/woodfishhhh/Woodfish-Theme/releases/tag/v3.0.0)
- ✅ **VSIX 下载**: [woodfish-theme-3.0.0.vsix](https://github.com/woodfishhhh/Woodfish-Theme/releases/download/v3.0.0/woodfish-theme-3.0.0.vsix)

### [2.3.0] - 2024-12-19

#### 新增

- 🚀 版本更新到2.3.0
- 📝 更新项目文档
- 🎯 分散功能，可以各自打开


### [2.2.0] - 2024-12-XX

#### 新增

- 🌈 彩虹光标动画效果
- ✨ 代码发光效果系统
- 🎨 渐变语法高亮优化
- 🔍 透明UI设计
- 📊 活动栏动画效果
- 🎯 模块化CSS架构

#### 优化

- 性能优化，减少资源占用
- 动画流畅度提升
- 颜色对比度调整

### [2.1.1] - 2024-12-19

- 💫 为悬浮提示添加了毛玻璃背景效果
- 🐛 修复了悬浮菜单位置偏移问题
- 🎯 优化了悬浮提示的视觉效果

## 🐛 问题反馈

遇到问题？请：

1. 查看 [常见问题](https://github.com/woodfishhhh/Woodfish-Theme/wiki/FAQ)
2. 搜索现有 [Issues](https://github.com/woodfishhhh/Woodfish-Theme/issues)
3. [创建新Issue](https://github.com/woodfishhhh/Woodfish-Theme/issues/new)

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢VSCode团队提供优秀的编辑器平台
- 感谢所有贡献者和用户的支持
- 灵感来源于现代设计趋势和用户体验最佳实践

## 📞 联系方式

- 作者: Woodfish
- QQ: [woodfish](3053932588)
- Email: [woodfish](woodfishhhh@163.com)
- GitHub: [@woodfishhhh](https://github.com/woodfishhhh)
- Issues: [问题反馈](https://github.com/woodfishhhh/Woodfish-Theme/issues)

---

⭐ 如果这个主题对您有帮助，请给我们一个星标！

![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red.svg)
