# Woodfish Theme

> English | [中文](README.md)

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/zhongjun.woodfish-theme?label=Marketplace&color=69C3FF)](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme)
[![Open VSX](https://img.shields.io/open-vsx/v/zhongjun/woodfish-theme?label=Open%20VSX&color=C160EF)](https://open-vsx.org/extension/zhongjun/woodfish-theme)
[![License](https://img.shields.io/badge/license-MIT%20%2B%20GPL--3.0-green.svg)](apps/vscode-extension/THIRD_PARTY_NOTICES.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.74.0-blue.svg)](https://code.visualstudio.com/)

Woodfish Theme is a visual layer that sits on top of any color theme. It keeps the colors you already use, derives OKLCH gradients and glow for every code token at runtime, and adds a rainbow cursor and frosted glass. It works in VS Code, Cursor, Kiro, Windsurf, Trae and VSCodium.

> The extension UI is in Chinese. Command names below are given in Chinese with an English gloss.

## Preview

![Woodfish Dracula preview](https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/assets/readme/dracula-preview.png)

![Woodfish Dark gradient syntax and glow](images/img2.png)

![Woodfish Dark rainbow cursor](images/img1.png)

## What's new in 7.0

- **Cursor, Kiro, Windsurf, Trae and VSCodium support**: install the same extension from their extension panel (Open VSX).
- **Frosted glass is back**: menus, hovers, suggestions, the command palette, notifications and 7 more surfaces, in a plain blur or an acrylic finish, with a Reveal highlight and entry animations. Cooperates with VS Code 1.143's native frosted glass.
- **System window transparency (experimental)**: macOS vibrancy, Windows 11 acrylic / mica.
- **Three new themes**: `Woodfish Black` (pure black), `Woodfish Neon` (cyberpunk) and `Woodfish Light`.
- **Presets and cursor palettes**: 6 built-in presets plus your own; 8 cursor palettes plus custom colors.
- **Uninstalling restores everything**: no more effects left behind after removing the extension.
- **Actionable errors and diagnostics**: write failures explain what to do on each OS; one command copies a diagnostics report for issues.
- **Getting-started walkthrough** on the Welcome page.

## Installation

- **VS Code**: install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme).
- **Cursor, Kiro, Windsurf, Trae, VSCodium**: search for `Woodfish Theme` in the extension panel (served from [Open VSX](https://open-vsx.org/extension/zhongjun/woodfish-theme)).
- **VSIX**: download it from [GitHub Releases](https://github.com/woodfishhhh/Woodfish-Theme/releases), then run `code --install-extension woodfish-theme-7.0.0.vsix` (use `cursor`, `kiro`, … for other editors).

Pick any color theme, then click **重新加载窗口** (Reload Window) when prompted. The overlay is on by default and never switches your color theme. Click `Woodfish ...` in the status bar for the feature menu.

## Supported editors

| Editor | Based on VS Code | Install from | Tested |
|---|---|---|---|
| VS Code | 1.74+ | VS Code Marketplace | ✅ 1.143 |
| Cursor | 1.128 | Open VSX | ✅ 3.27 |
| VSCodium | 1.143 | Open VSX | ✅ 1.143 |
| Kiro | 1.131 | Open VSX | Package layout verified |
| Windsurf / Devin | 1.126 | Open VSX | Package layout verified |
| Trae / Trae CN | 1.107 | Open VSX | Package layout verified |

"Package layout verified" means the workbench path, CSP, checksums and main-process format in the editor's installer were checked and match the editors that were tested end to end. Remote SSH, WSL and dev containers work too, because Woodfish always runs on the local UI side.

## Bundled themes

| Theme | Style |
|---|---|
| `Woodfish Dark` | Unmodified Bearded Theme Arc |
| `Woodfish Dracula` | Official Dracula, with a pink/purple/cyan/green cursor |
| `Woodfish Black` | Pure black background for OLED screens |
| `Woodfish Neon` | Cyberpunk neon on deep purple |
| `Woodfish Light` | Warm white light theme with softened glow |

They are optional bases: the overlay works with every color theme.

## Effect layers and status bar

| Mark | Layer |
|---|---|
| `A` | Gradient syntax |
| `G` | Text glow |
| `C` | Rainbow cursor |
| `F` | Frosted glass |

`on` means the overlay is installed, `paused` means effects are enabled but the injected payload is missing (run **修复 Woodfish 注入** / Repair), and `off` means the overlay or every effect is disabled.

> [!IMPORTANT]
> Effects are applied by patching the editor's own `workbench.html`, so a window reload is needed after changes. Writes are validated and atomic, with hashed, version-aware backups. Editor updates overwrite the file; run **修复 Woodfish 注入** (Repair) if effects disappear.

## Commands

Search for `Woodfish` in the command palette:

| Command | Purpose |
|---|---|
| 打开 Woodfish 功能菜单 | Feature menu (also the status bar entry) |
| 开启 / 关闭 Woodfish 通用叠层 | Turn the whole overlay on / off |
| 开启/关闭 Woodfish 彩色字体 / 发光字体 | Toggle gradient syntax / glow |
| 开启/关闭彩色光标, 选择彩色光标配色 | Toggle the rainbow cursor, pick a palette |
| 开启/关闭 Woodfish 毛玻璃 | Toggle frosted glass |
| 开启/关闭系统级透明窗口（实验） | Toggle system window transparency |
| 选择效果预设, 将当前效果保存为预设 | Apply / save presets |
| 修复 Woodfish 注入 | Repair after an editor update |
| 生成 Woodfish 诊断信息 | Copy a diagnostics report |
| 彻底停用 Woodfish 叠层 | Remove every injection, backup and hook |

## Configuration

All settings live under `woodfishTheme.`:

```json
{
  "woodfishTheme.overlay.hueShift": 24,
  "woodfishTheme.overlay.lightnessDelta": 0.06,
  "woodfishTheme.glow.intensity": 0.8,
  "woodfishTheme.cursor.gradientStops": ["#ff2d95", "#ffd700", "#00ffff"],
  "woodfishTheme.glass.enabled": true,
  "woodfishTheme.glass.mode": "acrylic"
}
```

## Troubleshooting

- **"Permission denied" on macOS**: if you started the editor from a terminal (`code .`, `cursor .`), macOS attributes the write to the terminal. Quit the editor completely, open it from the Dock and run Repair. Otherwise allow the editor under System Settings → Privacy & Security → App Management.
- **Windows**: for installs under `Program Files`, run the editor once as administrator, or use the user installer.
- **Linux**: Snap and Flatpak installs are read-only and cannot be patched; use the official `.deb`, `.rpm` or `.tar.gz`.
- **"Your installation appears to be corrupt"**: shown until the editor is fully quit after Woodfish changes `workbench.html`; reloading the window is not enough.
- **Reporting a bug**: run **生成 Woodfish 诊断信息** and paste the report into an [issue](https://github.com/woodfishhhh/Woodfish-Theme/issues).

To restore everything, uninstall the extension and fully restart the editor, or run **彻底停用 Woodfish 叠层** first for an immediate cleanup.

## Known limitations

- The minimap is drawn on a canvas and cannot receive gradients.
- Web editors and the remote server side cannot be patched.
- JetBrains IDEs (such as CLion) and Visual Studio are not based on VS Code and are not supported.
- Screenshot extensions such as CodeSnap do not capture Woodfish effects.

## Development

```bash
npm install
npm run verify
npm run test:integration
npm run package
```

The repository is an npm workspaces monorepo; run the commands above from the root. The VS Code extension lives in `apps/vscode-extension/`, and the host-agnostic color math, gradient derivation, palettes and effect parameters live in `packages/theme-core/` (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). Themes are generated by `apps/vscode-extension/scripts/generate-themes.js`; the workbench renderer script is built from `apps/vscode-extension/browser/`, and injected CSS lives in `apps/vscode-extension/themes/shared/`. Publishing to Open VSX requires the `OVSX_PAT` environment variable.

## License

Woodfish code is MIT. Bundled theme bases keep their upstream licenses; see [THIRD_PARTY_NOTICES.md](apps/vscode-extension/THIRD_PARTY_NOTICES.md).
