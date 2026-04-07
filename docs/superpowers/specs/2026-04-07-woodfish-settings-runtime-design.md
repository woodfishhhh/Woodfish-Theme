# Woodfish Theme Settings And Runtime Cleanup Design

- Date: 2026-04-07
- Project: `xiangmu`
- Status: Draft approved in conversation, pending file review

## Intent Summary

Rebuild the Woodfish settings surface so it only exposes options that produce real, user-visible changes. Remove misleading runtime toggles, move runtime state to real workbench inspection, upgrade setting descriptions with concrete guidance, and add a migration layer that can take over known legacy Woodfish payloads without touching unknown third-party injections.

## Scope

- Remove misleading settings from the extension manifest and runtime config layer
- Replace user-setting-based runtime truth with real runtime detection
- Rewrite remaining setting descriptions with units, effect, mechanism, examples, and rationale
- Update status bar and command menu descriptions to reflect real runtime state
- Add a migration path for known legacy Woodfish payloads
- Update README and tests to match the new settings model

## Out Of Scope

- No new visual effects or new user-facing styling capabilities
- No new settings for activity bar, tab bar, cursor width, or gradient direction
- No automatic takeover of unknown third-party payloads
- No change to the core visual design of the Woodfish theme itself

## Problem Statement

The current extension exposes several settings that either describe internal implementation details or imply a level of user control that is not trustworthy:

- `woodfishTheme.runtime.enabled`
- `woodfishTheme.runtime.autoSwitchTheme`
- `woodfishTheme.runtime.reapplyOnStartup`
- `woodfishTheme.syntaxGradient.preset`

These keys create three problems:

1. The settings UI suggests that runtime behavior is configurable when the extension should really manage that behavior internally.
2. Commands and status UI currently depend on `runtime.enabled`, which causes mismatches between visible state and actual workbench injection state.
3. Some commands still try to write configuration keys whose registration may be removed, creating user-facing errors.

## Goals

1. Settings UI only contains controls that directly change visible effects.
2. Runtime state is derived from actual conditions instead of a user setting.
3. Existing commands continue to work, but their descriptions and logic align with real injection state.
4. Legacy Woodfish payloads can be safely taken over during enable/repair flows.
5. Documentation and tests match the shipped behavior.

## Decision Summary

### Remove These Settings Entirely

- `woodfishTheme.runtime.enabled`
- `woodfishTheme.runtime.autoSwitchTheme`
- `woodfishTheme.runtime.reapplyOnStartup`
- `woodfishTheme.syntaxGradient.preset`

This removal includes:

- `package.json` configuration declarations
- Type definitions and default settings
- Configuration readers and change listeners
- Tests that assert their existence

### Keep Only User-Visible Effect Controls

#### Syntax Gradient

- `woodfishTheme.syntaxGradient.enabled`
- `woodfishTheme.syntaxGradient.customRules`

#### Glow

- `woodfishTheme.glow.enabled`
- `woodfishTheme.glow.intensity`
- `woodfishTheme.glow.customRules`

#### Cursor

- `woodfishTheme.cursor.enabled`
- `woodfishTheme.cursor.animationDuration`
- `woodfishTheme.cursor.gradientStops`
- `woodfishTheme.cursor.borderRadius`
- `woodfishTheme.cursor.glow`
- `woodfishTheme.cursor.glowBlur`
- `woodfishTheme.cursor.glowOpacity`
- `woodfishTheme.cursor.customRules`

## Runtime Truth Model

Runtime state must no longer come from configuration. It should be derived from actual conditions.

### Inputs

- Whether the active color theme is `Woodfish Dark`
- Whether the current `workbench.html` contains the current Woodfish payload markers
- Whether extension state contains installation and migration metadata

### Output States

- `on`
  - active theme is `Woodfish Dark`
  - current Woodfish payload exists in `workbench.html`
- `paused`
  - one or more visual features are enabled in settings
  - active theme is not `Woodfish Dark`
  - runtime payload is absent or intentionally removed
- `off`
  - no Woodfish payload is active
  - no active runtime application is currently in effect

## Command Behavior

### Enable Woodfish Theme

When the user runs `Woodfish Theme: 开启 Woodfish 主题`:

1. Force the color theme to `Woodfish Dark`
2. Scan for known legacy Woodfish payloads
3. Backup and remove known legacy Woodfish payloads
4. Leave unknown third-party payloads untouched
5. Inject the new integrated Woodfish payload
6. Persist installation metadata and any legacy takeover metadata
7. Prompt for reload if the workbench file changed

### Disable Woodfish Theme

When the user runs `Woodfish Theme: 关闭 Woodfish 主题`:

1. Remove the current Woodfish payload
2. Do not write any runtime setting
3. Keep the selected color theme unchanged
4. Prompt for reload if the workbench file changed

### Repair Woodfish Injection

When the user runs `Woodfish Theme: 修复 Woodfish 注入`:

1. Re-scan the current workbench file
2. Re-run legacy Woodfish takeover if necessary
3. Rebuild and re-inject the current payload
4. Refresh stored installation metadata

### Complete Uninstall

When the user runs `Woodfish Theme: 彻底停用 Woodfish 主题`:

1. Remove the current Woodfish payload
2. Clear current install-state metadata
3. If the extension had previously taken over a known legacy Woodfish payload, use backup metadata to decide whether restore is possible
4. Never restore unknown third-party payloads

## Startup Behavior

Startup handling becomes an internal self-healing mechanism instead of a user setting.

### On Activation

1. Inspect active theme and current workbench payload state
2. If active theme is `Woodfish Dark` and the payload is missing or stale, reapply
3. If active theme is not `Woodfish Dark` but a Woodfish payload remains, remove it
4. If unknown third-party payloads are detected, log or notify conflict risk without modifying them

This preserves auto-repair behavior while removing confusing runtime knobs from Settings UI.

## Legacy Payload Takeover

The extension may take over only known legacy Woodfish payloads.

### Rules

1. Only recognize known Woodfish signatures
2. Backup matched legacy fragments into extension internal state
3. Remove those known fragments from `workbench.html`
4. Inject the new integrated payload
5. On uninstall or recovery, use backup metadata to decide whether restoration is allowed
6. Unknown third-party payloads are never automatically edited

### Reasoning

- Safe migration away from older Woodfish injection styles
- Avoids breaking the user's unrelated injection setup
- Keeps rollback boundaries explicit

## Settings Description Standard

Every retained setting description should include the following information in compact form:

1. Visible effect
2. Unit or value range
3. Underlying mechanism
4. Example
5. Why this setting exists

### Representative Description Targets

#### `woodfishTheme.glow.intensity`

- Unit: multiplier, range `0.1 - 3`
- Effect: stronger or softer text glow
- Mechanism: scales the blur radius used in the default `text-shadow`
- Example: `0.6` is restrained, `1` is default, `1.5` is more neon
- Why: different displays and font rendering make one fixed glow level unreliable

#### `woodfishTheme.cursor.animationDuration`

- Unit: seconds
- Effect: faster or slower cursor color cycling
- Mechanism: replaces the animation duration used in cursor CSS
- Example: `4` is lively, `8` is default, `12` is calmer
- Why: motion sensitivity and personal preference vary

#### `woodfishTheme.cursor.customRules`

- Unit: array of CSS strings
- Effect: advanced override layer for cursor visuals
- Mechanism: appended after the default cursor CSS so it can override it
- Example: `["div.cursor { width: 3px !important; }"]`
- Why: preserve flexibility without turning every tiny CSS detail into a first-class setting

## Status Bar Design

Status bar text should reflect runtime truth instead of a hidden config flag.

### Proposed Display

- `Woodfish on A G C`
- `Woodfish paused A G`
- `Woodfish off`

### Meaning

- `A`: syntax gradient enabled
- `G`: glow enabled
- `C`: cursor enabled

### Tooltip

Tooltip should include:

- current color theme
- whether Woodfish payload is detected
- runtime state (`on`, `paused`, `off`)
- enabled feature layers
- hint that clicking opens the command menu

## Command Menu Design

The right-bottom Woodfish menu should continue showing all commands, but descriptions must explain real behavior.

### Required Commands

- Enable Woodfish Theme
- Disable Woodfish Theme
- Toggle Syntax Gradient
- Toggle Glow
- Auto Configure Rainbow Cursor
- Toggle Rainbow Cursor
- Repair Workbench
- Complete Uninstall
- Reload Window

### Description Principles

- describe actual side effects
- do not mention removed runtime settings
- reflect current feature toggles and runtime truth

## Documentation Changes

### README

- remove obsolete fake configuration examples
- replace them with real settings examples
- explain that runtime repair and theme switching are internal behaviors, not settings

### CHANGELOG

Document:

- settings cleanup
- richer setting descriptions
- runtime truth rework
- known legacy Woodfish payload takeover support

### Optional Follow-Up

Add `docs/SETTINGS.md` later if manifest descriptions become too dense and a longer reference page is needed.

## Testing Plan

### Update Existing Tests

- `src/__tests__/featureFlags.test.ts`
  - remove assertions for deleted runtime settings
  - assert reads and writes only for retained settings

- `src/__tests__/payloadBuilder.test.ts`
  - remove assertions around deleted runtime defaults and deleted syntax preset
  - keep CSS behavior assertions

- `src/__tests__/showFeatureMenu.test.ts`
  - replace `runtimeEnabled` assumptions with explicit runtime status data
  - assert descriptions match real runtime state

### Add New Tests

- runtime state detection tests
  - `Woodfish Dark + payload => on`
  - `non-Woodfish theme + enabled features => paused`
  - `no payload => off`

- legacy takeover tests
  - known old Woodfish payload is recognized
  - legacy fragment is backed up
  - legacy fragment is removed before new payload insertion
  - unknown third-party payload remains untouched

## Files Expected To Change

- `package.json`
- `src/types/features.ts`
- `src/constants/config.ts`
- `src/config/featureFlags.ts`
- `src/config/featureState.ts`
- `src/services/runtime/service.ts`
- `src/services/runtime/state.ts`
- `src/services/runtime/workbenchPatcher.ts`
- `src/ui/statusBar.ts`
- `src/commands/showFeatureMenu.ts`
- `src/commands/enableTheme.ts`
- `src/commands/disableTheme.ts`
- `src/__tests__/featureFlags.test.ts`
- `src/__tests__/payloadBuilder.test.ts`
- `src/__tests__/showFeatureMenu.test.ts`
- `README.md`
- `docs/CHANGELOG.md`

## Acceptance Criteria

1. Removed settings no longer appear in VS Code Settings UI.
2. Commands no longer attempt to write deleted configuration keys.
3. Runtime state shown in UI matches real workbench payload and active theme state.
4. Retained settings descriptions explain effect, unit, mechanism, example, and reason.
5. Enable and repair flows can take over known legacy Woodfish payloads.
6. Unknown third-party payloads are not automatically modified.
7. Tests and README reflect the new settings model.

## Risks And Mitigations

### Risk: Legacy payload signature detection is too broad

Mitigation:

- keep signature matching narrow and Woodfish-specific
- add tests for false-positive protection

### Risk: Runtime state becomes stale in UI

Mitigation:

- refresh feature and runtime status after config changes and command completion
- derive status from current workbench inspection instead of cached assumptions

### Risk: Manifest descriptions become too long

Mitigation:

- keep the manifest version concise but specific
- move expanded examples into README or a dedicated settings doc if needed

## Recommended Next Step

Create the implementation plan for this design, then execute it as a single coordinated refactor.
