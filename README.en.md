# Woodfish Theme

> English | [中文](README.md)

Woodfish Theme is a VS Code theme extension with gradient syntax colors, glow style, and optional rainbow cursor effects.

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/woodfishhhh/Woodfish-Theme)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-%5E1.74.0-blue.svg)](https://code.visualstudio.com/)

## Features

- Gradient syntax highlighting
- Glow effects
- Optional rainbow cursor (via CSS injection)
- Modular CSS structure

## 🆕 New Features

- **Status Bar Indicator**: Real-time display of enabled features (✨ Glow, 🌈 Rainbow Cursor).
- **Progress Notifications**: Visual feedback during activation/deactivation processes.
- **Quick Menu**: Click on “✨ Woodfish” in the status bar to access a quick menu for toggling features.


## Preview

![Preview 1](images/img1.png)
![Preview 2](images/img2.png)

## Installation

### Install from VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X`
3. Search “Woodfish Theme”
4. Install

### Install from VSIX

```bash
code --install-extension woodfish-theme-4.0.0.vsix
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

Reload the VS Code window when prompted.

### Select Theme

1. Press `Ctrl+K Ctrl+T`
2. Select “Woodfish Dark”

### Rainbow Cursor

- `Woodfish Theme: 启动彩色光标自动配置`
- `Woodfish Theme: 开启/关闭彩色光标`

### Other Commands

- `Woodfish Theme: 开启/关闭 Woodfish 发光`
- `Woodfish Theme: 彻底停用 Woodfish 主题` (best-effort cleanup, will ask for confirmation)

## ❓ Troubleshooting

If you encounter issues, please try the following steps. For more details, see the [Full Troubleshooting Guide](docs/TROUBLESHOOTING.md).

- **Issue: Glow effects are not showing**
  - Reason: Custom CSS extension requires a window reload to apply changes.
  - Solution: After running the enable command, make sure to click **"Reload Window"** in the notification.
- **Issue: Effects persist after deactivation**
  - Reason: Cached CSS or leftovers from previous versions.
  - Solution: Run the `Woodfish Theme: 彻底停用 Woodfish 主题` command to clean up residues.
- **Issue: Status bar is not visible**
  - Reason: The extension is not yet activated.
  - Solution: Run any `Woodfish Theme:` command (e.g., "开启 Woodfish 主题") to activate the extension.
- **Issue: Rainbow cursor not working**
  - Reason: It requires CSS injection and must be configured while the theme is active.
  - Solution: Enable the theme first, then run `Woodfish Theme: 启动彩色光标自动配置`.

## 💬 FAQ

- **Q: Why is a reload required every time I toggle a feature?**
  - A: CSS injection modifies the VS Code UI layer, which requires a window reload to process the updated stylesheets.
- **Q: Can I use multiple themes at once?**
  - A: Not recommended. Woodfish Theme uses CSS injection, which may conflict with other injection-based themes.
- **Q: How do I completely remove all effects?**
  - A: Use the `Woodfish Theme: 彻底停用 Woodfish 主题` command to clean up all injected configurations.
- **Q: What do the status bar icons mean?**
  - A: ✨ = Glow effect; 🌈 = Rainbow cursor.

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

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT License. See [LICENSE](LICENSE).
