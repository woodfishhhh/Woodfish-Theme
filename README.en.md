# Woodfish Theme

> English | [中文](README.md)

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/zhongjun.woodfish-theme?label=Marketplace&color=69C3FF)](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme)
[![Open VSX](https://img.shields.io/open-vsx/v/zhongjun/woodfish-theme?label=Open%20VSX&color=C160EF)](https://open-vsx.org/extension/zhongjun/woodfish-theme)
[![License](https://img.shields.io/badge/license-MIT%20%2B%20GPL--3.0-green.svg)](apps/vscode-extension/THIRD_PARTY_NOTICES.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.74.0-blue.svg)](https://code.visualstudio.com/)

![Woodfish Dark: gradient syntax and glow](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/hero.png)

Woodfish Theme adds gradients and glow to code, plus a rainbow cursor and frosted glass. Its five bundled themes each come with hand-tuned gradients; on any other color theme the gradients are derived by the same rules. It works in VS Code, Cursor, Kiro, Windsurf, Trae and VSCodium.

Every picture on this page is rendered by the extension's own workbench script and injected CSS ([generator](apps/vscode-extension/scripts/render-readme-images.js)).

> The extension UI is in Chinese. Command names below are given in Chinese with an English gloss.

## Preview

**Woodfish Dark**: Bearded Theme Arc colors with the hand-written 5.x gradients.

![Woodfish Dark](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/theme-dark.png)

**Woodfish Dracula**: the official Dracula colors, keywords running pink into purple.

![Woodfish Dracula](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/theme-dracula.png)

**Woodfish Black**: pure black for OLED screens.

![Woodfish Black](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/theme-black.png)

**Woodfish Neon**: neon on deep purple.

![Woodfish Neon](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/theme-neon.png)

**Woodfish Light**: warm white; gradients go deeper and the glow is a light tint of each hue.

![Woodfish Light](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/theme-light.png)

**Any other theme**: VS Code's own Dark Modern as it ships (left) and with Woodfish (right).

| Dark Modern | With Woodfish |
|---|---|
| ![Dark Modern](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/any-theme-before.png) | ![Dark Modern with Woodfish](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/any-theme-after.png) |

**Glow**, off and on:

| Gradient only | Gradient + glow |
|---|---|
| ![Glow off](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/glow-off.png) | ![Glow on](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/glow-on.png) |

**Rainbow cursor**: its colors cycle; these are six moments of one cycle.

<img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/cursor.png" width="40%" alt="Six moments of the rainbow cursor's color cycle">

**Frosted glass** on the suggest list (opacity 0.5, 14px blur):

![Frosted glass](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/glass.png)

## What's new in 7.2

- **Hand-tuned gradients are back**: `Woodfish Dark` restores the hand-written 5.x colors; `Dracula`, `Black`, `Neon` and `Light` are tuned the same way.
- **Better gradients on every other theme**: the derivation follows the same rules, with more vivid ends and a soft rainbow on plain text.
- **Long names and paragraphs no longer break**: VS Code shows a word longer than 50 characters as several pieces, and each piece used to get its own gradient, so colors restarted every 50 characters (most visible in Markdown). It is one gradient now:

  Before 7.2 the rainbow starts over at `and`:

  ![Before 7.2: the rainbow restarts at the 50th character](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/long-before.png)

  7.2, one rainbow across the line:

  ![7.2: one rainbow across the line](https://github.com/woodfishhhh/Woodfish-Theme/raw/v7.2.0/assets/readme/long-after.png)

- **Light themes glow in a light color**: the glow used to be the dark text color, which looked like a shadow.

<details>
<summary><strong>What's new in 7.0</strong></summary>

- **Cursor, Kiro, Windsurf, Trae and VSCodium support**: install the same extension from their extension panel (Open VSX).
- **Frosted glass is back**: menus, hovers, suggestions, the command palette, notifications and 7 more surfaces, in a plain blur or an acrylic finish, with a Reveal highlight and entry animations. Cooperates with VS Code 1.143's native frosted glass.
- **System window transparency (experimental)**: macOS vibrancy, Windows 11 acrylic / mica.
- **Three new themes**: `Woodfish Black` (pure black), `Woodfish Neon` (neon) and `Woodfish Light`.
- **Presets and cursor palettes**: 6 built-in presets plus your own; 8 cursor palettes plus custom colors.
- **Uninstalling restores everything**: no more effects left behind after removing the extension.
- **Actionable errors and diagnostics**: write failures explain what to do on each OS; one command copies a diagnostics report for issues.
- **Getting-started walkthrough** on the Welcome page.

</details>

## Installation

- **VS Code**: install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme).
- **Cursor, Kiro, Windsurf, Trae, VSCodium**: search for `Woodfish Theme` in the extension panel (served from [Open VSX](https://open-vsx.org/extension/zhongjun/woodfish-theme)).
- **VSIX**: download it from [GitHub Releases](https://github.com/woodfishhhh/Woodfish-Theme/releases), then run `code --install-extension woodfish-theme-7.2.0.vsix` (use `cursor`, `kiro`, … for other editors).

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

All settings live under `woodfishTheme.`. In the Settings UI they are grouped into switches, colored text, glow, colored cursor, frosted glass, transparent window (experimental) and advanced, with every effect switch at the top:

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

## Codex desktop app

Woodfish can also restyle the OpenAI Codex desktop app (Windows Store build) without modifying its installation:

- **Native palette**: `woodfish codex theme apply --dark neon --light light` writes Codex's official theme settings (one palette per appearance mode) and opens no ports; `--appearance dark` pins Codex to dark mode.
- **Injected effects**: `woodfish codex launch` adds OKLCH code gradients and glow, frosted floating layers, accent glow and a rainbow caret. Codex is started with a loopback-only debugging port, and the risks are explained before first use. Once it runs, Codex's own **Settings → Appearance → Woodfish** section switches between all 15 themes and toggles each effect; assistant replies get the rainbow text and the sidebar a gradient thread indicator that flows while a thread runs.
- **Always on**: `woodfish codex autostart on` registers a hidden logon task (normal rights) that brings the effects back within seconds after Codex restarts or a Store update; `woodfish codex autostart off` or `uninstall` removes it cleanly.

Codex++ users can run `woodfish codex install-userscript` instead. See [apps/desktop-cli/README.md](apps/desktop-cli/README.md) (Chinese).

The DeepSeek Harness (dsh) Web UI is themed through a Tampermonkey / Violentmonkey user script: `woodfish dsh userscript`. See [docs/hosts/dsh.md](docs/hosts/dsh.md) (Chinese).

## Bundled popular themes

Besides the five Woodfish themes, the extension ships ten popular MIT-licensed themes unmodified, labelled `Woodfish …`: One Dark Pro, Tokyo Night, Catppuccin Mocha and Latte, Nord, GitHub Dark and Light, Night Owl, Ayu Mirage and Gruvbox Dark. Their gradients and glow are derived from each theme's own colors. Sources and licenses are listed in [THIRD_PARTY_NOTICES](apps/vscode-extension/THIRD_PARTY_NOTICES.md).

## Development

```bash
pnpm install
pnpm verify
pnpm test:integration
pnpm package
```

The repository is a pnpm workspace monorepo; run the commands above from the root. The VS Code extension lives in `apps/vscode-extension/`, and the host-agnostic color math, gradient derivation, hand-tuned presets, palettes and effect parameters live in `packages/theme-core/` (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). Themes are generated by `apps/vscode-extension/scripts/generate-themes.js`; the workbench renderer script is built from `apps/vscode-extension/browser/`, and injected CSS lives in `apps/vscode-extension/themes/shared/`. Publishing to Open VSX requires the `OVSX_PAT` environment variable.

## License

Woodfish code is MIT. Bundled theme bases keep their upstream licenses; see [THIRD_PARTY_NOTICES.md](apps/vscode-extension/THIRD_PARTY_NOTICES.md).
