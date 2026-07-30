# Woodfish Dracula Theme Integration Design

- Date: 2026-04-15
- Project: `xiangmu`
- Status: Draft approved in conversation, pending file review

## Intent Summary

Refactor the current single-theme Woodfish runtime into a theme-registry-driven structure that can support multiple built-in Woodfish themes. Extract reusable injected CSS into a shared layer, keep theme-specific syntax gradient styling isolated per theme, and add a new built-in `Woodfish Dracula` theme whose UI accents and syntax gradients stay faithful to the official Dracula palette.

## Scope

- Introduce a registry-driven multi-theme structure for built-in Woodfish themes
- Extract reusable runtime CSS into a shared theme asset layer
- Convert activity bar and tab bar styling to shared structure plus theme-specific variables
- Migrate the current Bearded-based `Woodfish Dark` assets into the new structure without visual regression
- Add a new built-in `Woodfish Dracula` theme and its syntax gradient stylesheet
- Update runtime theme resolution so payload generation depends on the active built-in Woodfish theme
- Persist the user's last selected built-in Woodfish theme and restore it from the enable command
- Update tests and user-facing command descriptions to match multi-theme behavior

## Out Of Scope

- No redesign of the existing command set or status bar concept
- No new categories of visual effects beyond the current syntax gradient, glow, cursor, activity bar, and tab bar layers
- No support for layering Woodfish effects on top of third-party extensions such as the external Dracula extension
- No attempt to auto-generate syntax gradients from arbitrary theme JSON files
- No bulk addition of more third-party themes in this change

## Problem Statement

The current runtime is hard-wired to a single theme directory and a single built-in theme label:

- runtime assets are always read from `themes/Bearded Theme`
- runtime status assumes the only valid built-in theme is `Woodfish Dark`
- enable flows always force the color theme back to `Woodfish Dark`
- reusable CSS sits beside Bearded-specific CSS, which makes every new theme look like a one-off special case

This creates three concrete problems:

1. Adding a new built-in theme requires changing code in multiple places instead of adding structured assets.
2. Some injected layers that should be shared are wrongly coupled to one theme directory.
3. The current command behavior blocks future theme expansion because enable always restores `Woodfish Dark`.

## Goals

1. Built-in Woodfish themes are described by a small registry instead of hard-coded one-off paths.
2. Shared injected CSS is stored once and reused across built-in themes.
3. Theme-specific syntax gradients remain isolated per theme.
4. `Woodfish Dracula` ships as a built-in theme, not as compatibility with the external Dracula extension.
5. The enable command restores the last selected built-in Woodfish theme rather than always forcing `Woodfish Dark`.
6. `Woodfish Dark` keeps its current look after the refactor.

## Decision Summary

### Adopt A Theme Registry

Introduce a registry layer that maps each built-in Woodfish theme to:

- display label
- runtime slug
- theme JSON path
- syntax gradient CSS path
- theme accent variables for shared UI layers
- optional default cursor gradient stops

The registry must be simple data, not an inference engine.

### Split Assets Into Shared And Theme-Specific Layers

#### Shared Layer

Move these files into a shared directory:

- `cursor-core.css`
- `cursor-glow.css`
- `glow-effects.css`
- shared `activity-bar.css`
- shared `tab-bar.css`

`activity-bar.css` and `tab-bar.css` remain shared only in structure. Their colors come from theme variables so each theme keeps its own accent identity.

#### Theme-Specific Layer

Each built-in theme keeps:

- its color theme JSON
- its `syntax-highlighting.css`
- lightweight metadata describing theme-specific variables

### Keep Syntax Gradients Theme-Specific

Do not attempt to build one universal syntax gradient stylesheet. Token classes and visual balance vary by theme, so `syntax-highlighting.css` stays in each theme directory.

### Ship Dracula As A Built-In Theme

Add a new built-in theme named `Woodfish Dracula`.

It should be backed by a local theme JSON derived from the official Dracula theme rather than an approximation. This keeps the base UI palette stable and makes future upstream synchronization easier.

### Restore The Last Selected Woodfish Theme

The enable command must restore the most recently selected built-in Woodfish theme if it still exists. If no prior selection is recorded, it falls back to `Woodfish Dark`.

## Proposed File Structure

```text
themes/
├── shared/
│   ├── activity-bar.css
│   ├── cursor-core.css
│   ├── cursor-glow.css
│   ├── glow-effects.css
│   └── tab-bar.css
├── bearded/
│   ├── Woodfish Dark.json
│   ├── syntax-highlighting.css
│   └── theme.meta.json
└── dracula/
    ├── Woodfish Dracula.json
    ├── syntax-highlighting.css
    ├── theme.meta.json
    └── NOTICE.md
```

The existing `themes/Bearded Theme/` folder should not survive as the runtime source of truth after migration.

## Theme Registry Model

Add a runtime-accessible registry module that exposes a collection of built-in Woodfish theme definitions.

Each entry should contain:

- `slug`
- `label`
- `themeFile`
- `syntaxFile`
- `uiAccents`
- `cursorGradientStops`

### `uiAccents`

This object provides the CSS variable values consumed by shared `activity-bar.css` and `tab-bar.css`.

Representative keys:

- `activityBadgeGradient`
- `tabBorderGradient`
- `activityForeground`
- `tabActiveForeground`

The registry should be the single source of truth for built-in Woodfish theme names. Runtime status logic must use it instead of comparing only against `Woodfish Dark`.

## Runtime Asset Loading

Current runtime loading is hard-coded to `themes/Bearded Theme`. Replace it with this flow:

1. Read the active VS Code color theme name
2. Resolve that theme name through the built-in Woodfish theme registry
3. Load shared CSS assets from `themes/shared`
4. Load theme-specific assets from the matched theme directory
5. Build final runtime CSS from:
   - shared UI layers
   - shared glow and cursor layers
   - shared UI variable block derived from theme metadata
   - theme-specific syntax gradient CSS

If the current color theme is not a built-in Woodfish theme, runtime status should not treat it as active even if feature toggles remain enabled.

## Runtime Status Model

`isWoodfishTheme` must become:

- `true` if the active theme name exists in the built-in Woodfish theme registry
- `false` otherwise

This allows both `Woodfish Dark` and `Woodfish Dracula` to participate in the same `on / paused / off` status logic.

### Output States

- `on`
  - active theme is a built-in Woodfish theme
  - Woodfish payload exists in `workbench.html`

- `paused`
  - one or more visible effect layers are enabled
  - active theme is not a built-in Woodfish theme

- `off`
  - payload absent and no visible runtime effect is currently active

## Persisted State

Keep the existing runtime install-state storage and add a sibling persisted value for the user's last selected built-in Woodfish theme.

This state belongs in extension `globalState`, not in user settings.

Suggested persisted fields:

- `lastSelectedThemeLabel`
- optional `lastSelectedThemeSlug`

The label is sufficient for restoration if it is registry-backed, but storing the slug can make migrations less fragile.

## Command Behavior

### Enable Woodfish Theme

When the user runs `Woodfish Theme: 开启 Woodfish 主题`:

1. Read the stored last selected built-in Woodfish theme
2. If it exists and still resolves through the theme registry, switch to that theme
3. Otherwise switch to default `Woodfish Dark`
4. Rebuild payload using the matched theme's shared and theme-specific assets
5. Inject payload and refresh runtime status

### Manual Theme Switching

When the user manually switches VS Code to a built-in Woodfish theme:

1. detect the theme change through the existing configuration listener
2. resolve the theme through the registry
3. persist that theme as the latest selected built-in Woodfish theme

This ensures the enable command stays aligned with the user's actual preference even if they do not use the enable command to switch themes.

### Disable Theme

No change in core behavior:

1. remove the current payload
2. keep the selected color theme untouched
3. do not erase the remembered last selected built-in Woodfish theme

### Repair Workbench

Repair must rebuild the payload for whichever built-in Woodfish theme is currently active, not assume `Woodfish Dark`.

### Complete Uninstall

Complete uninstall should remove the payload and clear installation takeover metadata. It does not need to erase the remembered theme unless product behavior later decides that uninstall should also forget user preference.

## Status Bar And Menu Text

Update all strings that currently hard-code `Woodfish Dark`.

### Status Bar Tooltip

Keep the existing shape, but report the actual active theme label from runtime state.

### Feature Menu

For the first menu item:

- if runtime is already on:
  - `重新写入当前主题注入并保持 <theme>`
- if runtime is not on:
  - `切换到 <restored-theme> 并写入一体化注入`

This keeps the menu text aligned with actual command behavior.

## Bearded Migration Strategy

Migrate the existing `Woodfish Dark` theme first to prove the new structure does not change current behavior.

### Expected Migration Outcome

- `Woodfish Dark` continues to look the same as today
- its syntax gradient remains theme-specific
- shared cursor and glow CSS no longer live in a Bearded-only directory
- activity bar and tab bar visuals remain equivalent after being rewritten as variable-driven shared CSS

## Dracula Theme Strategy

### Source Of Truth

Use the official Dracula VS Code theme as the base reference.

Relevant official sources:

- repository: `https://github.com/dracula/visual-studio-code`
- package manifest: `https://raw.githubusercontent.com/dracula/visual-studio-code/main/package.json`
- palette source: `https://raw.githubusercontent.com/dracula/visual-studio-code/main/src/dracula.yml`

The official package currently declares MIT licensing and exposes `Dracula Theme` and `Dracula Theme Soft`. This integration should target the standard Dracula theme, not the soft variant.

### Core Palette Anchors

Use these official Dracula anchors as the stable base:

- background: `#282A36`
- foreground: `#F8F8F2`
- comment: `#6272A4`
- cyan: `#8BE9FD`
- green: `#50FA7B`
- orange: `#FFB86C`
- pink: `#FF79C6`
- purple: `#BD93F9`
- red: `#FF5555`
- yellow: `#F1FA8C`

### UI Accent Policy

Shared activity bar and tab bar structure should be colored with Dracula-oriented accents, primarily:

- `#FF79C6`
- `#BD93F9`
- `#8BE9FD`
- `#50FA7B`

Avoid using the current Woodfish rainbow accent set for Dracula.

Keep `#FFB86C` and `#F1FA8C` primarily for syntax and content emphasis, not as the main tab-bar or activity-bar accent ramps.

### Syntax Gradient Policy

The approved direction is `A · classic faithful Dracula`.

That means:

- preserve official Dracula mood first
- add gradients only to high-identity token groups
- avoid turning large blocks of default foreground text into rainbow output

#### Token Group Mapping

##### Keywords / storage / control

- gradient: `#BD93F9 -> #FF79C6`

##### Functions / method calls

- gradient: `#8BE9FD -> #50FA7B`

##### Strings / textual constants

- gradient: `#FFB86C -> #F1FA8C`

##### Types / built-ins / class-like groups

- gradient: `#8BE9FD -> #BD93F9`

##### Comments

- keep flat Dracula comment color
- do not force syntax gradients on comments

##### Default body text

- keep the official foreground instead of full-spectrum gradients

This is intentionally more restrained than the current Bearded implementation, especially for generic `mtk1`-style broad coverage.

## Compatibility Notes

Do not attempt to make `Woodfish Dracula` a wrapper around the external Dracula extension. The built-in Woodfish theme should work independently from any marketplace installation.

Do not attempt to infer token gradients dynamically from scope metadata. Runtime CSS should remain deterministic and maintainable.

## Migration Steps

1. Create the shared asset directory and variable-driven shared CSS
2. Introduce the built-in Woodfish theme registry
3. Migrate `Woodfish Dark` into the new structure and verify no visual regression
4. Add `Woodfish Dracula` assets and registry entry
5. Update runtime asset loading, theme resolution, and runtime status logic
6. Persist and restore the user's last selected built-in Woodfish theme
7. Update menu descriptions, tests, and documentation

## Testing Plan

### Update Existing Tests

- `src/__tests__/payloadBuilder.test.ts`
  - assert shared plus theme-specific assets still compose correctly

- `src/__tests__/runtimeStatus.test.ts`
  - replace single-theme assumptions with built-in theme registry behavior

- `src/__tests__/themeCommands.test.ts`
  - verify enable restores the remembered theme instead of always using `Woodfish Dark`

- `src/__tests__/showFeatureMenu.test.ts`
  - verify menu descriptions use dynamic built-in theme labels

- `src/__tests__/runtimeService.test.ts`
  - verify runtime rebuild uses the resolved built-in theme assets

### Add New Tests

- theme registry resolution
  - built-in label resolves to slug and asset paths
  - unknown theme label does not resolve

- persisted theme preference
  - manual switch to `Woodfish Dracula` updates remembered theme
  - enable falls back to `Woodfish Dark` if the remembered entry no longer exists

- shared CSS variables
  - activity bar and tab bar CSS receive Dracula-specific variables
  - Bearded and Dracula produce different accent outputs from the same shared structure

## Files Expected To Change

- `package.json`
- `src/constants/config.ts`
- `src/config/featureFlags.ts`
- `src/config/featureState.ts`
- `src/services/runtime/assets.ts`
- `src/services/runtime/payloadBuilder.ts`
- `src/services/runtime/service.ts`
- `src/services/runtime/state.ts`
- `src/services/runtime/status.ts`
- `src/ui/statusBar.ts`
- `src/commands/showFeatureMenu.ts`
- `src/__tests__/payloadBuilder.test.ts`
- `src/__tests__/runtimeStatus.test.ts`
- `src/__tests__/runtimeService.test.ts`
- `src/__tests__/showFeatureMenu.test.ts`
- `src/__tests__/themeCommands.test.ts`
- `themes/shared/*`
- `themes/bearded/*`
- `themes/dracula/*`
- `README.md`

## Acceptance Criteria

1. `Woodfish Dark` still works after the refactor with no intentional visual regression.
2. `Woodfish Dracula` appears as a built-in selectable theme in the extension.
3. Runtime payload generation uses the active built-in Woodfish theme rather than a fixed Bearded path.
4. Activity bar and tab bar styling share structure but render theme-specific accents.
5. `Woodfish Dracula` syntax gradients follow the approved restrained Dracula direction.
6. Running `Woodfish Theme: 开启 Woodfish 主题` restores the last selected built-in Woodfish theme rather than always switching to `Woodfish Dark`.
7. Existing disable, repair, and uninstall flows still work without theme-name regressions.
8. Test coverage is updated to reflect multi-theme behavior.

## Risks And Mitigations

### Risk: Theme registry grows into a second configuration system

Mitigation:

- keep registry fields minimal
- keep registry purely declarative
- avoid storing computed CSS or complex branching logic in metadata

### Risk: Shared CSS extraction changes current Bearded visuals

Mitigation:

- migrate Bearded first
- compare generated payload output before and after refactor where practical
- keep variable names narrow and purpose-specific

### Risk: Dracula token class mapping does not look right across languages

Mitigation:

- keep Dracula syntax gradient CSS theme-specific
- start with restrained coverage on high-identity token groups
- avoid broad default-text gradients

### Risk: Command descriptions drift from actual restored theme behavior

Mitigation:

- derive menu descriptions from the same resolved theme value used by enable
- add focused tests for menu strings

## Recommended Next Step

Write the implementation plan for this design and execute it as a registry-driven multi-theme refactor, starting with shared asset extraction and Bearded migration before adding `Woodfish Dracula`.
