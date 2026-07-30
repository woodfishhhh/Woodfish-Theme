# Woodfish Theme

> English | [中文](README.md)

Woodfish Theme is a VS Code theme extension with gradient syntax colors, glow style, and optional rainbow cursor effects.

[![Version](https://img.shields.io/badge/version-5.2.0-blue.svg)](https://github.com/woodfishhhh/Woodfish-Theme)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-%5E1.74.0-blue.svg)](https://code.visualstudio.com/)

## Features

- Gradient syntax highlighting
- Glow effects
- Optional rainbow cursor (via CSS injection)
- Validated atomic workbench updates with version-aware backups and rollback
- Reduced-motion fallbacks for continuous effects
- Modular CSS structure

## 🆕 New Features

- **Truthful status bar**: The status bar now shows `Woodfish on/off/paused` plus `A / G / C` effect badges.
- **Progress notifications**: Activation, disable, repair, and cleanup flows show progress feedback.
- **Quick menu**: Click the `Woodfish ...` status bar entry to open the full command menu.
- **Two built-in themes**: Woodfish now ships with both `Woodfish Dark` and `Woodfish Dracula`.


## Preview

![Woodfish Dracula preview](assets/readme/dracula-preview.png)

Woodfish Dracula automatically derives an OKLCH gradient from every code token's Dracula foreground. The original color stays at the midpoint, while the two ends combine `ΔL ±0.060` with a `±24°` hue shift instead of relying on hand-picked cross-semantic bands. Its shorter layered glow, calmer theme cursor, and slower active-tab sweep remain intact.

<details>
<summary><strong>View Woodfish Dark previews</strong></summary>

![Woodfish Dark preview 1](images/img1.png)
![Woodfish Dark preview 2](images/img2.png)

</details>

## Installation

### Install from VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X`
3. Search “Woodfish Theme”
4. Install

### Install from VSIX

```bash
code --install-extension woodfish-theme-5.2.0.vsix
```

## Runtime Model

Woodfish Theme now ships with an integrated runtime injector and no longer depends on third-party CSS loader extensions.

Runtime behaviors are now handled internally:

- enabling the theme restores the most recently selected built-in Woodfish theme and writes the latest payload
- startup checks whether the theme and payload still match
- known legacy Woodfish payloads are taken over before the new payload is injected
- unknown third-party payloads are not modified automatically
- workbench updates are validated before an atomic replacement, and repair or complete disable only restores a backup that matches the current VS Code installation

## Usage

### Enable / Disable

- `Woodfish Theme: 开启 Woodfish 主题` (enable)
- `Woodfish Theme: 关闭 Woodfish 主题` (disable)

Reload the VS Code window when prompted.

### Select Theme

1. Press `Ctrl+K Ctrl+T`
2. Select “Woodfish Dark” or “Woodfish Dracula”
3. The next time you run `Woodfish Theme: 开启 Woodfish 主题`, the extension restores that last built-in Woodfish theme

When cursor settings are untouched, Woodfish Dracula uses a 12-second pink-purple-cyan-green loop, a `1px` radius, and `0.45` trail opacity. Explicit `woodfishTheme.cursor.*` values always win.

### Rainbow Cursor

- `Woodfish Theme: 开启 Woodfish 彩色光标`
- `Woodfish Theme: 开启/关闭彩色光标`

### Status Bar Meanings

- `on`: a built-in Woodfish theme such as `Woodfish Dark` or `Woodfish Dracula` is active and the current payload is present
- `paused`: effect settings are enabled, but the active theme is not a built-in Woodfish theme
- `off`: no Woodfish payload is currently detected
- `A`: syntax gradient
- `G`: glow
- `C`: rainbow cursor

### Other Commands

- `Woodfish Theme: 开启/关闭 Woodfish 发光`
- `Woodfish Theme: 彻底停用 Woodfish 主题` (best-effort cleanup, will ask for confirmation)

## ❓ Troubleshooting

If you encounter issues, please try the following steps. For more details, see the [Full Troubleshooting Guide](docs/TROUBLESHOOTING.md).

- **Issue: Glow effects are not showing**
  - Reason: The updated workbench payload is installed, but the current window has not been reloaded yet.
  - Solution: After running the enable command, make sure to click **"Reload Window"** in the notification.
- **Issue: Effects persist after deactivation**
  - Reason: Cached CSS or leftovers from previous versions.
  - Solution: Run the `Woodfish Theme: 彻底停用 Woodfish 主题` command to clean up residues.
- **Issue: Status bar is not visible**
  - Reason: The extension is not yet activated.
  - Solution: Run any `Woodfish Theme:` command (e.g., "开启 Woodfish 主题") to activate the extension.
- **Issue: Rainbow cursor not working**
  - Reason: The active theme is not a built-in Woodfish theme, or the window has not been reloaded after injection.
  - Solution: Switch to `Woodfish Dark` or `Woodfish Dracula`, or run `Woodfish Theme: 开启 Woodfish 主题` to restore the last built-in theme, then reload the window.
- **Issue: The status bar says `paused`**
  - Reason: Effect layers are enabled, but the active theme is not a built-in Woodfish theme.
  - Solution: Run `Woodfish Theme: 开启 Woodfish 主题`, or switch back to `Woodfish Dark` / `Woodfish Dracula` and reload the window.

## 💬 FAQ

- **Q: Why is a reload required every time I toggle a feature?**
  - A: CSS injection modifies the VS Code UI layer, which requires a window reload to process the updated stylesheets.
- **Q: Can I use multiple themes at once?**
  - A: Not recommended. Woodfish Theme uses CSS injection, which may conflict with other injection-based themes.
- **Q: How do I completely remove all effects?**
  - A: Use `Woodfish Theme: 彻底停用 Woodfish 主题` to remove the current payload and restore previously taken-over legacy Woodfish fragments when possible.
- **Q: What do `on / paused / off / A / G / C` mean in the status bar?**
  - A: `on / paused / off` are the real runtime states. `A` = syntax gradient, `G` = glow, `C` = rainbow cursor.

## Configuration

```json
{
  "woodfishTheme.syntaxGradient.enabled": true,
  "woodfishTheme.glow.intensity": 0.8,
  "woodfishTheme.cursor.gradientStops": [
    "#ff2d95",
    "#ffd700",
    "#00ffff"
  ],
  "woodfishTheme.cursor.glowBlur": 0,
  "woodfishTheme.cursor.glowOpacity": 0.55,
  "woodfishTheme.cursor.customRules": [
    "div.cursor { width: 3px !important; }"
  ]
}
```

### Recommended Setting Map

- `woodfishTheme.syntaxGradient.enabled`
  - Turns the syntax color layer on or off.
- `woodfishTheme.syntaxGradient.customRules`
  - Appends custom token CSS after the default gradient layer.
- `woodfishTheme.glow.enabled`
  - Enables or disables the glow layer.
- `woodfishTheme.glow.intensity`
  - Multiplier in the `0.1 - 3` range. Internally scales the default glow blur radius.
- `woodfishTheme.cursor.animationDuration`
  - Measured in seconds. Smaller values make the cursor cycle faster.
- `woodfishTheme.cursor.gradientStops`
  - The core color band for the rainbow cursor. Each item is a CSS color value.
- `woodfishTheme.cursor.borderRadius`
  - Measured in `px`. Controls cursor roundness.
- `woodfishTheme.cursor.glow`
  - Toggles cursor trail glow.
- `woodfishTheme.cursor.glowBlur`
  - Measured in `px`. Defaults to `0` for a filter-free trail; values above `0` explicitly opt into blur.
- `woodfishTheme.cursor.glowOpacity`
  - Range `0 - 1`. Controls how visible the trail is.
- `woodfishTheme.cursor.customRules`
  - Final override layer for advanced cursor tweaks.

Custom rule arrays accept up to 32 entries, 4096 characters per entry, and 16384 characters in total. Rules containing `</style`, `<script`, `@import`, or `url(...)` are ignored. VS Code restricts custom CSS and cursor gradient settings in untrusted workspaces; the remaining safe settings continue to work.

## Development

```bash
npm install
npm run compile
npm test
npm run test:integration
npm run lint
npm run format
npm run format:check
npm run verify
npm run package
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT License. See [LICENSE](LICENSE).
