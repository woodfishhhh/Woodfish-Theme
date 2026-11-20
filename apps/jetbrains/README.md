# Woodfish Theme for JetBrains IDE — gradient & glow core

The JetBrains port of [Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme) for VS Code.
This module contains the universal **gradient + glow overlay** that runs on top of any editor
color scheme. This module does not include color schemes or a theme generator.

## What it does

| Effect | What it does |
|---|---|
| **Gradient syntax** | Every token gets a three-stop OKLCH gradient centred on its own color. Hue shift, lightness delta, chroma boost for neutrals and gradient angle are all adjustable. |
| **Glow** | Layered soft light beneath the glyphs, three blur radii, intensity scaled by a single multiplier. Weakened automatically on light backgrounds. |
| **CJK included** | Chinese, Japanese and Korean text gets the same gradient and glow without ghosting. |
| **Live settings page** | `Settings \| Tools \| Woodfish Theme`, with a syntax-highlighted preview that re-renders as you drag. |
| **Presets** | Five built-in looks (Woodfish default, soft, neon, focus, performance) plus up to 32 of your own. |
| **Status bar** | `Woodfish on · A/G` — click for the feature menu. |
| **Diagnostics** | One action copies the current state, scheme names and cache counters for bug reports. |

The overlay is independent of every color scheme: it works on whatever scheme is active.
No scheme is bundled in this module.

## Compatibility

- IntelliJ Platform 2024.2+ (`sinceBuild=242`), no upper bound.
- JBR 21 (the platform runtime since 2024.2).
- Pure Java 2D: no CSS injection, no patching of IDE files, nothing written outside the plugin's
  own config.

## Build

Requirements: JDK 21. The Gradle wrapper is included.

```bash
./gradlew buildPlugin    # build the distributable zip
./gradlew test           # unit tests
./gradlew runIde         # sandbox IDE with samples/
./gradlew verifyPlugin   # binary compatibility check
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

This module does not bundle theme files. The gradient and glow implement the color math of the
original MIT-licensed Woodfish Theme. See [third-party notices](THIRD_PARTY_NOTICES.md).

## Credits

- Original project: [Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme) for VS Code by
  woodfishhhh — the color math, layer design and naming are theirs.
- JetBrains port: yyyyolo7a79 — the Java 2D rendering pipeline, settings UI and tests.
