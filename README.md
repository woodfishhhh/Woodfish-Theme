# 🌈 Woodfish Theme

> 中文 | [English](README.en.md)

一个具有发光效果、渐变色彩与彩虹光标效果的 VS Code 主题扩展。

[![Version](https://img.shields.io/badge/version-5.0.1-blue.svg)](https://github.com/woodfishhhh/Woodfish-Theme)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-%5E1.74.0-blue.svg)](https://code.visualstudio.com/)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/zhongjun.woodfish-theme)](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme)

## ✨ 特色功能

- 🌈 彩色光标：注入彩虹光标样式（可开关）
- ✨ 发光效果：关键字/行号发光视觉
- 🎨 渐变语法高亮：提升辨识度与舒适度
- 🧩 模块化 CSS：主题样式按模块组织，便于维护

## 🆕 新增功能说明

- **状态栏指示器**：状态栏会实时显示当前启用的功能（✨发光 🌈彩虹光标）。
- **进度提示**：在执行开启/关闭操作时，会通过通知显示实时进度，让你了解后台处理状态。
- **快速功能菜单**：点击状态栏中的 “✨ Woodfish” 即可打开功能菜单，快速切换各项特效。


## 🖼️ 预览

![主题预览1](images/img1.png)
![主题预览2](images/img2.png)

## 📦 安装

### 从 VS Code 扩展市场安装

1. 打开 VS Code
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 “Woodfish Theme”
4. 点击安装

### 手动安装（VSIX）

```bash
code --install-extension woodfish-theme-5.0.1.vsix
```

## 🔌 运行方式

Woodfish Theme 现在使用内置 runtime 直接注入 VS Code workbench，不再依赖第三方 CSS Loader 扩展。

首次启用时只需要：

- 选择 `Woodfish Dark`
- 运行 `Woodfish Theme: 开启 Woodfish 主题`
- 按提示重新加载窗口

## 🚀 使用方法

### 启用主题（一体化 runtime 注入）

1. `Ctrl+Shift+P` 打开命令面板
2. 运行 `Woodfish Theme: 开启 Woodfish 主题`
3. 按提示重新加载窗口（Reload Window）

### 关闭主题（移除 runtime 注入）

1. `Ctrl+Shift+P`
2. 运行 `Woodfish Theme: 关闭 Woodfish 主题`
3. 按提示重新加载窗口

### 选择颜色主题

1. `Ctrl+K Ctrl+T` 打开主题选择器
2. 选择 “Woodfish Dark”

### 🌈 彩色光标

- 一键开启：运行 `Woodfish Theme: 开启 Woodfish 彩色光标`
- 一键开关：运行 `Woodfish Theme: 开启/关闭彩色光标`

### 🎛️ 主题命令

- `Woodfish Theme: 开启 Woodfish 主题`
- `Woodfish Theme: 关闭 Woodfish 主题`
- `Woodfish Theme: 开启/关闭 Woodfish 发光`
- `Woodfish Theme: 开启 Woodfish 彩色光标`
- `Woodfish Theme: 开启/关闭彩色光标`
- `Woodfish Theme: 彻底停用 Woodfish 主题`（清理旧残留，属于破坏性操作，执行前会二次确认）

## ❓ 故障排查 (Troubleshooting)

如果遇到问题，请先尝试以下步骤。更多详细内容请查看 [完整故障排查指南](docs/TROUBLESHOOTING.md)。

- **问题：发光效果没有生效**
  - 原因：workbench 注入已经写入，但窗口还没有重新加载。
  - 解决：运行开启命令后，务必点击弹窗右下角的 **“重新加载窗口”**。
- **问题：关闭功能后效果仍然存在**
  - 原因：可能是旧版本注入残留或其他注入类扩展仍在修改同一份 workbench 文件。
  - 解决：运行 `Woodfish Theme: 彻底停用 Woodfish 主题` 命令清理残留。
- **问题：状态栏没有显示**
  - 原因：扩展尚未激活。
  - 解决：运行任意 `Woodfish Theme:` 命令（如“开启 Woodfish 主题”）即可激活扩展。
- **问题：彩色光标不工作**
  - 原因：当前窗口还没重新加载，或者当前不是 `Woodfish Dark`。
  - 解决：先切到 `Woodfish Dark`，再运行 `Woodfish Theme: 开启 Woodfish 主题` 或 `Woodfish Theme: 开启 Woodfish 彩色光标`，然后重新加载窗口。

## 💬 常见问题 (FAQ)

- **Q: 为什么每次切换功能都需要重新加载？**
  - A: 因为 CSS 注入涉及到 VS Code 的底层渲染，需要通过重新加载窗口来使新的样式表生效。
- **Q: 可以同时使用多个主题吗？**
  - A: 不建议。Woodfish Theme 涉及到 CSS 注入，与其他同样具有注入功能的主题同时使用可能会导致样式冲突或显示异常。
- **Q: 如何完全移除所有效果？**
  - A: 使用 `Woodfish Theme: 彻底停用 Woodfish 主题` 命令，它会尝试清理所有注入的配置和临时文件。
- **Q: 状态栏的图标代表什么？**
  - A: ✨ = 发光效果；🌈 = 彩虹光标。

## ⚙️ 配置说明


```json
{
  "woodfishTheme.customStyles": [
    {
      "enabled": true,
      "css": "/* 你的自定义 CSS */"
    }
  ],
  "woodfishTheme.enableGlowEffects": true,
  "woodfishTheme.enableRainbowCursor": false
}
```

## 🛠️ 开发

```bash
npm install
npm run compile
npm run format
npm run format:check
npm run package
```

## 📝 更新日志

版本变更请查看 [CHANGELOG.md](CHANGELOG.md)。

## 📄 许可证

MIT License，见 [LICENSE](LICENSE)。
