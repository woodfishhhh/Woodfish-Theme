# Woodfish Theme

> English | [中文](README.md)

Woodfish Theme is a VS Code theme extension with gradient syntax colors, glow style, and optional rainbow cursor / glass UI effects.

[![Version](https://img.shields.io/badge/version-3.5.0-blue.svg)](https://github.com/woodfishhhh/Woodfish-Theme)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](../LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-%5E1.74.0-blue.svg)](https://code.visualstudio.com/)

## Features

- Gradient syntax highlighting
- Glow effects
- Optional glass/transparent UI
- Optional rainbow cursor (via CSS injection)
- Modular CSS structure (easy to maintain)

## Preview

![Preview 1](../images/img1.png)
![Preview 2](../images/img2.png)

## Installation

### Install from VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X`
3. Search “Woodfish Theme”
4. Install

### Install from VSIX

```bash
code --install-extension woodfish-theme-3.5.0.vsix
```

## Prerequisite (Important)

This extension relies on a third-party CSS injection extension. Install one of the following:

- Custom CSS and JS Loader
- Custom CSS Hot Reload

Woodfish Theme will detect and guide you when you run related commands.

## Usage

### Enable / Disable

- `Woodfish Theme: 开启 Woodfish 主题` (enable)
- `Woodfish Theme: 关闭 Woodfish 主题` (disable)

After changing injection settings, reload the VS Code window when prompted.

### Select Theme

1. Press `Ctrl+K Ctrl+T`
2. Select “Woodfish Dark”

### Rainbow Cursor

- `Woodfish Theme: 启动彩色光标自动配置`
- `Woodfish Theme: 开启/关闭彩色光标`

### Other Commands

- `Woodfish Theme: 开启/关闭 Woodfish 发光`
- `Woodfish Theme: 开启/关闭毛玻璃效果`
- `Woodfish Theme: 彻底停用 Woodfish 主题` (best-effort cleanup, will ask for confirmation)

## Configuration

```json
{
  "woodfishTheme.customStyles": [
    {
      "enabled": true,
      "css": "/* Your custom CSS */"
    }
  ],
  "woodfishTheme.enableGlowEffects": true,
  "woodfishTheme.enableGlassEffect": true,
  "woodfishTheme.enableRainbowCursor": false
}
```

## Development

```bash
npm install
npm run compile
npm run format
npm run format:check
npm run package
```

## Changelog

See [CHANGELOG.md](../CHANGELOG.md).

## License

MIT License. See [LICENSE](../LICENSE).
