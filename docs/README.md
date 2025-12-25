\# 🌈 Woodfish Theme

> 中文 | [English](README.en.md)

一个具有发光效果、渐变色彩与动画风格的 VS Code 主题扩展。

[![Version](https://img.shields.io/badge/version-3.5.0-blue.svg)](https://github.com/woodfishhhh/Woodfish-Theme)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](../LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-%5E1.74.0-blue.svg)](https://code.visualstudio.com/)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/zhongjun.woodfish-theme)](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme)

## ✨ 特色功能

- 🌈 彩色光标：注入彩虹光标样式（可开关）
- ✨ 发光效果：关键字/行号发光视觉
- 🎨 渐变语法高亮：提升辨识度与舒适度
- 🔍 透明/毛玻璃 UI：现代化半透明与模糊效果（可开关）
- 🧩 模块化 CSS：主题样式按模块组织，便于维护

## 🖼️ 预览

![主题预览1](../images/img1.png)
![主题预览2](../images/img2.png)

## 📦 安装

### 从 VS Code 扩展市场安装

1. 打开 VS Code
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 “Woodfish Theme”
4. 点击安装

### 手动安装（VSIX）

```bash
code --install-extension woodfish-theme-3.5.0.vsix
```

## 🔌 前置依赖（重要）

本扩展通过第三方扩展注入 CSS 来实现更多效果，你需要安装以下其一：

- Custom CSS and JS Loader（推荐）
- Custom CSS Hot Reload

当你首次执行相关命令时，本扩展会自动检测并引导你安装。

## 🚀 使用方法

### 启用主题（写入 CSS 注入配置）

1. `Ctrl+Shift+P` 打开命令面板
2. 运行 `Woodfish Theme: 开启 Woodfish 主题`
3. 按提示重新加载窗口（Reload Window）

### 关闭主题（移除主题注入）

1. `Ctrl+Shift+P`
2. 运行 `Woodfish Theme: 关闭 Woodfish 主题`
3. 按提示重新加载窗口

### 选择颜色主题

1. `Ctrl+K Ctrl+T` 打开主题选择器
2. 选择 “Woodfish Dark”

### 🌈 彩色光标

- 一键配置：运行 `Woodfish Theme: 启动彩色光标自动配置`
- 一键开关：运行 `Woodfish Theme: 开启/关闭彩色光标`

### 🎛️ 主题命令

- `Woodfish Theme: 开启 Woodfish 主题`
- `Woodfish Theme: 关闭 Woodfish 主题`
- `Woodfish Theme: 开启/关闭 Woodfish 发光`
- `Woodfish Theme: 开启/关闭毛玻璃效果`
- `Woodfish Theme: 启动彩色光标自动配置`
- `Woodfish Theme: 开启/关闭彩色光标`
- `Woodfish Theme: 彻底停用 Woodfish 主题`（清理旧残留，属于破坏性操作，执行前会二次确认）

## ⚙️ 自定义配置

在 VS Code 设置中可配置：

```json
{
  "woodfishTheme.customStyles": [
    {
      "enabled": true,
      "css": "/* 你的自定义 CSS */"
    }
  ],
  "woodfishTheme.enableGlowEffects": true,
  "woodfishTheme.enableGlassEffect": true,
  "woodfishTheme.enableRainbowCursor": false
}
```

### 配置项说明

- `woodfishTheme.enableGlowEffects`：发光效果开关
- `woodfishTheme.enableGlassEffect`：毛玻璃/透明 UI 开关
- `woodfishTheme.enableRainbowCursor`：彩色光标开关
- `woodfishTheme.customStyles`：附加自定义 CSS（对象数组）

## 🛠️ 开发

```bash
npm install
npm run compile
npm run format
npm run format:check
npm run package
```

## 📄 许可证

MIT License，见 [LICENSE](../LICENSE)。

## 🙏 致谢

- 感谢 Bearded Theme 的开源参考
- 感谢所有贡献者与使用者

## 📝 更新日志

版本变更请查看 [CHANGELOG.md](../CHANGELOG.md)。

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
