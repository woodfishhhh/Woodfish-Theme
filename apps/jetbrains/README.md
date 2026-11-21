# Woodfish Theme for JetBrains IDE — 15 color themes, gradient & glow

The JetBrains port of [Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme) for VS Code.
It ships **15 color themes** (a UI theme and an editor color scheme each) that match the VS Code
themes color for color, and the universal **gradient + glow overlay** that runs on top of any
editor color scheme.

## What it does

| Feature | What it does |
|---|---|
| **15 color themes** | Woodfish Dark, Dracula, Light, Black, Neon, One Dark Pro, Tokyo Night, Catppuccin Mocha and Latte, Nord, GitHub Dark and Light, Night Owl, Ayu Mirage, Gruvbox Dark. Choose one in `Settings \| Appearance & Behavior \| Appearance`. Code, console and terminal (16 ANSI colors), diff, line-status bars, inlay hints and folded text follow the VS Code theme. |
| **Gradient syntax** | Every token gets a three-stop OKLCH gradient centred on its own color. Hue shift, lightness delta, chroma boost for neutrals and gradient angle are all adjustable. |
| **Glow** | Layered soft light beneath the glyphs, three blur radii, intensity scaled by a single multiplier. Weakened automatically on light backgrounds. |
| **CJK included** | Chinese, Japanese and Korean text gets the same gradient and glow without ghosting. |
| **Live settings page** | `Settings \| Tools \| Woodfish Theme`, with a syntax-highlighted preview that re-renders as you drag. |
| **Presets** | Five built-in looks (Woodfish default, soft, neon, focus, performance) plus up to 32 of your own. |
| **Status bar** | `Woodfish on · A/G` — click for the feature menu. |
| **Diagnostics** | One action copies the current state, scheme names and cache counters for bug reports. |

The overlay is independent of every color scheme: it works on whatever scheme is active.
The themes are generated from the same palettes and VS Code themes by `pnpm jetbrains:generate`;
`pnpm jetbrains:check` fails when a committed file is out of date. How the colors are mapped, and how
close they are to VS Code, is written down in
[docs/hosts/jetbrains.md](../../docs/hosts/jetbrains.md) and
[docs/hosts/jetbrains-colors.md](../../docs/hosts/jetbrains-colors.md).

## Compatibility

- IntelliJ Platform 2024.2+ (`sinceBuild=242`), no upper bound.
- JBR 21 (the platform runtime since 2024.2).
- Pure Java 2D: no CSS injection, no patching of IDE files, nothing written outside the plugin's
  own config.

## Install

**From JetBrains Marketplace** (only once the listing has passed JetBrains' review; until then the
[plugin page](https://plugins.jetbrains.com/plugin/36347-woodfish-theme) is not public): in the IDE open
`Settings | Plugins | Marketplace`, search for `Woodfish Theme` and click Install.

**From the zip** (works now, and is the way to install before the Marketplace listing is approved):

1. Download `woodfish-theme-jetbrains-8.2.1.zip` from the
   [GitHub Release](https://github.com/woodfishhhh/Woodfish-Theme/releases/tag/v8.2.1).
2. In the IDE open `Settings | Plugins | ⚙ | Install Plugin from Disk…` and pick the zip.

Either way, restart if the IDE asks, then choose a Woodfish theme in `Settings | Appearance & Behavior | Appearance`.

## Build

Requirements: JDK 21. The Gradle wrapper is included.

```bash
./gradlew buildPlugin    # build the distributable zip (build/distributions/)
./gradlew test           # unit tests
./gradlew runIde         # sandbox IDE with samples/
./gradlew verifyPlugin   # binary compatibility check
```

To install the zip in your own IDE: `Settings | Plugins | ⚙ | Install Plugin from Disk…`.

The color themes are regenerated from the repository root:

```bash
pnpm jetbrains:generate  # themes/*.xml, themes/*.theme.json, licenses/, docs/hosts/jetbrains-keys.md
pnpm jetbrains:check     # the committed files match the palettes and the VS Code themes
```

To build against a locally installed IDE instead of downloading the platform, create a
git-ignored `gradle.local.properties`:

```properties
platformLocalPath=D:/path/to/IntelliJIDEA2024.3
```

## Layout

```
core/color/   OKLCH, gradient endpoints, blur kernel — pure Java, unit-tested
editor/       highlighter mount, frame scan, gradient and glow renderers, caches
settings/     persistent state, ranges, presets
ui/           settings page, status bar, actions, diagnostics
samples/      visual check files: English code, Chinese comments, ligatures, emoji, tables
```

## Implementation notes

- **The mount point is a range highlighter, not a component.** The overlay attaches custom
  renderers to the editor's markup model without replacing its syntax highlighter.
- **Colors are resolved the way the editor resolves them**, not read from a theme file.
- **Gradient vs. glow.** The gradient repaints the glyphs; the glow is rasterized into a cached
  image off the EDT and drawn beneath them.
- **The caret is deliberately untouched**, so the plugin coexists with cursor-animation plugins.
- **CJK text is redrawn per character**, which avoids the ghosting that native glyph rasterization
  produces when a gradient is layered on top.

## License

Plugin code: [MIT](LICENSE). Copyright (c) 2024 Woodfish (original theme) and Copyright (c) 2026
yyyyolo7a79 (JetBrains port).

The gradient and glow implement the color math of the original MIT-licensed Woodfish Theme.
Several of the 15 themes are derived from third-party themes; each theme's license ships inside the
plugin (`licenses/`). See [third-party notices](THIRD_PARTY_NOTICES.md).

## Credits

- Original project: [Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme) for VS Code by
  woodfishhhh — the color math, layer design and naming are theirs.
- JetBrains port: yyyyolo7a79 — the Java 2D rendering pipeline, settings UI and tests.
