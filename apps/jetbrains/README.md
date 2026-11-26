# Woodfish Theme for JetBrains IDEs

Choose one of 15 coordinated editor and UI themes in **Settings → Appearance & Behavior → Appearance**. Enable or tune editor effects in **Settings → Tools → Woodfish Theme**. The editor preview updates as you adjust a setting. Apply saves the changes for other editors.

## Effects

| Effect | Controls and behavior |
|---|---|
| Syntax gradients | The five original themes use their hand-tuned stops and angles. Other colors use the same OKLCH algorithm as VS Code. The full foreground rainbow and CJK glyphs use the editor's character positions. |
| Text glow | Modern mode layers halos underneath glyphs. Light backgrounds use a bright tint. Classic (5.x) uses bold text and a wider halo. |
| Caret | Set the rainbow stops, animation period, radius, glow opacity and blur. The overlay follows the native caret. |
| Caret trail and typing particles | Enable either effect independently. The same built-in modules drive Java2D paths in the editor and canvas paths in VS Code. Both are off by default. |
| Background | Enable Clouds or choose a local JPEG, PNG or WebP. The image covers the editor viewport. Adjust opacity, blur and theme tint. |
| Rounded controls and popups | Apple-style corners are on by default. The switch restores the current look and feel's arc values when turned off. Popup tint and its opacity are separate controls. |
| Presets | Apply Woodfish default, Soft, Neon, Classic (5.x), Frosted glass, Focus or Performance, or save up to 32 custom looks. |

See the [host notes](../../docs/hosts/jetbrains.md) and the [color comparison](../../docs/hosts/jetbrains-colors.md).

## Compatibility

- IntelliJ Platform 2024.2+ (`sinceBuild=242`), no upper bound.
- JBR 21 (the platform runtime since 2024.2).
- Pure Java 2D: no CSS injection, no patching of IDE files, nothing written outside the plugin's
  own config.

## Install

**Marketplace.** Open Settings → Plugins → Marketplace and search for Woodfish Theme. [Plugin page](https://plugins.jetbrains.com/plugin/36347-woodfish-theme)

**Release zip.**

1. Download `woodfish-theme-jetbrains-8.3.0.zip` from the
   [GitHub Release](https://github.com/woodfishhhh/Woodfish-Theme/releases/tag/v8.3.0).
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

## Implementation

The generator packages the shared theme-core and built-in input effects with the plugin. Java2D paints glyphs, halo images and input paths through editor highlighters and the IDE glass pane. The plugin reads the active scheme and uses the editor's published coordinates for placement. Background pictures are decoded on a worker thread, and turning off a look-and-feel override restores the original UI value.

## License

Plugin code uses the [MIT license](LICENSE). The plugin includes a license for each bundled theme under `licenses/`. See [third-party notices](THIRD_PARTY_NOTICES.md).
