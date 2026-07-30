# Woodfish Dracula Theme Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Woodfish into a registry-driven multi-theme runtime, preserve `Woodfish Dark`, and add a built-in `Woodfish Dracula` theme with Dracula-faithful shared accents and syntax gradients.

**Architecture:** Introduce a built-in Woodfish theme registry that resolves the active theme label to a shared-plus-theme-specific asset bundle. Move cursor/glow/shared UI structure into `themes/shared`, keep syntax gradients per theme, and persist the user's last selected built-in Woodfish theme so enable flows restore the correct theme instead of hard-coding `Woodfish Dark`.

**Tech Stack:** TypeScript, VS Code extension API, Jest, JSON theme manifests, CSS injection runtime

---

### Task 1: Lock multi-theme runtime behavior with failing tests

**Files:**
- Create: `src/__tests__/themeRegistry.test.ts`
- Modify: `src/__tests__/runtimeStatus.test.ts`
- Modify: `src/__tests__/themeCommands.test.ts`
- Modify: `src/__tests__/showFeatureMenu.test.ts`
- Test: `src/__tests__/themeRegistry.test.ts`
- Test: `src/__tests__/runtimeStatus.test.ts`
- Test: `src/__tests__/themeCommands.test.ts`
- Test: `src/__tests__/showFeatureMenu.test.ts`

- [ ] **Step 1: Add failing registry resolution tests**

```ts
expect(resolveWoodfishTheme('Woodfish Dark')?.slug).toBe('bearded');
expect(resolveWoodfishTheme('Woodfish Dracula')?.slug).toBe('dracula');
expect(resolveWoodfishTheme('One Dark Pro')).toBeUndefined();
```

- [ ] **Step 2: Add failing runtime status tests for multiple built-in themes**

```ts
expect(
  deriveRuntimeStatus({
    activeTheme: 'Woodfish Dracula',
    hasPayload: true,
    features: { syntaxGradient: true, glow: true, cursor: true },
  }).isWoodfishTheme
).toBe(true);
```

- [ ] **Step 3: Add failing command/menu tests for remembered-theme restore**

```ts
expect(setColorTheme).toHaveBeenCalledWith('Woodfish Dracula');
expect(items[0]?.description).toContain('Woodfish Dracula');
```

- [ ] **Step 4: Run the targeted suite**

Run: `npm test -- themeRegistry.test.ts runtimeStatus.test.ts themeCommands.test.ts showFeatureMenu.test.ts --runInBand`

Expected: FAIL because registry helpers and remembered-theme behavior do not exist yet.

### Task 2: Implement the built-in Woodfish theme registry and remembered-theme state

**Files:**
- Create: `src/services/runtime/themeRegistry.ts`
- Modify: `src/constants/config.ts`
- Modify: `src/services/runtime/state.ts`
- Modify: `src/services/runtime/status.ts`
- Modify: `src/services/runtime/service.ts`
- Modify: `src/config/featureFlags.ts`
- Test: `src/__tests__/themeRegistry.test.ts`
- Test: `src/__tests__/runtimeStatus.test.ts`
- Test: `src/__tests__/themeCommands.test.ts`

- [ ] **Step 1: Add the registry module with explicit built-in theme definitions**

```ts
export type WoodfishThemeDefinition = {
  slug: 'bearded' | 'dracula';
  label: string;
  directory: string;
  themeFile: string;
  syntaxFile: string;
  metaFile: string;
};
```

- [ ] **Step 2: Add helpers for registry lookups**

```ts
export function resolveWoodfishTheme(themeLabel: string): WoodfishThemeDefinition | undefined {
  return WOODFISH_THEMES.find((theme) => theme.label === themeLabel);
}
```

- [ ] **Step 3: Extend runtime state helpers to persist the last selected built-in theme**

```ts
const LAST_THEME_KEY = 'woodfish.runtime.last-selected-theme';
export async function writeLastSelectedTheme(context: vscode.ExtensionContext, label: string) { ... }
```

- [ ] **Step 4: Update runtime status logic to use the registry instead of `WOODFISH_THEME_NAME === activeTheme`**

Run: `npm test -- themeRegistry.test.ts runtimeStatus.test.ts themeCommands.test.ts --runInBand`

Expected: PASS for registry and status tests; command tests may still fail until command flow is updated later.

### Task 3: Extract shared runtime assets and teach the payload builder to consume theme variables

**Files:**
- Create: `themes/shared/activity-bar.css`
- Create: `themes/shared/tab-bar.css`
- Create: `themes/shared/cursor-core.css`
- Create: `themes/shared/cursor-glow.css`
- Create: `themes/shared/glow-effects.css`
- Modify: `src/services/runtime/assets.ts`
- Modify: `src/services/runtime/payloadBuilder.ts`
- Modify: `src/__tests__/payloadBuilder.test.ts`
- Test: `src/__tests__/payloadBuilder.test.ts`

- [ ] **Step 1: Write failing payload-builder assertions for shared CSS plus theme variables**

```ts
expect(css).toContain('--woodfish-activity-badge-gradient');
expect(css).toContain('--woodfish-tab-border-gradient');
expect(css).toContain('.tab.tab-actions-right');
```

- [ ] **Step 2: Move the current reusable CSS into `themes/shared/`**

Use these source-to-target moves:
- `themes/Bearded Theme/cursor-core.css` -> `themes/shared/cursor-core.css`
- `themes/Bearded Theme/cursor-glow.css` -> `themes/shared/cursor-glow.css`
- `themes/Bearded Theme/glow-effects.css` -> `themes/shared/glow-effects.css`

- [ ] **Step 3: Rewrite shared activity/tab CSS to consume variables instead of fixed Bearded colors**

```css
:root {
  --woodfish-activity-badge-gradient: linear-gradient(45deg, #eacd61, #ea618e);
  --woodfish-tab-border-gradient: linear-gradient(to right, #eacd61, #ea618e, #3cec85, #61afea);
}
```

- [ ] **Step 4: Update `readRuntimeAssets` and `buildRuntimeCss` to load shared assets plus a theme-specific variable block**

Run: `npm test -- payloadBuilder.test.ts --runInBand`

Expected: PASS with shared CSS still producing one combined runtime payload.

### Task 4: Migrate the current Woodfish Dark assets into the new Bearded directory

**Files:**
- Create: `themes/bearded/Woodfish Dark.json`
- Create: `themes/bearded/theme.meta.json`
- Create: `themes/bearded/syntax-highlighting.css`
- Modify: `package.json`
- Modify: `src/services/runtime/themeRegistry.ts`
- Modify: `src/services/runtime/assets.ts`
- Test: `src/__tests__/themeRegistry.test.ts`
- Test: `src/__tests__/payloadBuilder.test.ts`

- [ ] **Step 1: Copy the existing Bearded theme JSON into the new built-in theme location**

Exact source:
- `themes/Bearded Theme/Bearded Theme.json`

Exact target:
- `themes/bearded/Woodfish Dark.json`

- [ ] **Step 2: Copy the current Bearded syntax gradient into the new theme directory**

Exact source:
- `themes/Bearded Theme/syntax-highlighting.css`

Exact target:
- `themes/bearded/syntax-highlighting.css`

- [ ] **Step 3: Add `themes/bearded/theme.meta.json` with Bearded accent variables**

```json
{
  "label": "Woodfish Dark",
  "slug": "bearded",
  "activityBadgeGradient": "linear-gradient(45deg, #eacd61, #ea618e)",
  "tabBorderGradient": "linear-gradient(to right, #eacd61, #ea618e, #3cec85, #61afea)"
}
```

- [ ] **Step 4: Update `package.json` to point `Woodfish Dark` to `./themes/bearded/Woodfish Dark.json`**

Run: `npm test -- themeRegistry.test.ts payloadBuilder.test.ts --runInBand`

Expected: PASS and no runtime asset lookup should still depend on `themes/Bearded Theme`.

### Task 5: Add built-in Woodfish Dracula theme assets and package contribution

**Files:**
- Create: `themes/dracula/Woodfish Dracula.json`
- Create: `themes/dracula/theme.meta.json`
- Create: `themes/dracula/syntax-highlighting.css`
- Create: `themes/dracula/NOTICE.md`
- Modify: `package.json`
- Modify: `src/services/runtime/themeRegistry.ts`
- Modify: `src/__tests__/themeRegistry.test.ts`
- Modify: `src/__tests__/legacyCleanup.test.ts`
- Test: `src/__tests__/themeRegistry.test.ts`
- Test: `src/__tests__/legacyCleanup.test.ts`

- [ ] **Step 1: Bring in the Dracula base theme JSON and rename it for local built-in use**

Reference sources:
- `https://raw.githubusercontent.com/dracula/visual-studio-code/main/package.json`
- `https://raw.githubusercontent.com/dracula/visual-studio-code/main/src/dracula.yml`

- [ ] **Step 2: Add Dracula metadata with accent gradients driven by official palette anchors**

```json
{
  "label": "Woodfish Dracula",
  "slug": "dracula",
  "activityBadgeGradient": "linear-gradient(45deg, #ff79c6, #bd93f9)",
  "tabBorderGradient": "linear-gradient(to right, #ff79c6, #bd93f9, #8be9fd, #50fa7b)"
}
```

- [ ] **Step 3: Write the restrained Dracula syntax gradient stylesheet**

```css
:not(.cursor).mtk15 {
  background-image: linear-gradient(45deg, #bd93f9, #ff79c6) !important;
}
```

Include only high-identity token groups for:
- keywords and storage
- functions and method calls
- strings
- types and built-ins

- [ ] **Step 4: Register the new built-in theme in `package.json`**

Run: `npm test -- themeRegistry.test.ts legacyCleanup.test.ts --runInBand`

Expected: PASS and `package.json` contributes both `Woodfish Dark` and `Woodfish Dracula`.

### Task 6: Wire command behavior, manual theme remembering, and dynamic UI text

**Files:**
- Modify: `src/services/runtime/service.ts`
- Modify: `src/config/featureState.ts`
- Modify: `src/extension.ts`
- Modify: `src/commands/showFeatureMenu.ts`
- Modify: `src/commands/autoConfigureRainbowCursor.ts`
- Modify: `src/__tests__/themeCommands.test.ts`
- Modify: `src/__tests__/showFeatureMenu.test.ts`
- Modify: `src/__tests__/runtimeService.test.ts`
- Modify: `src/__tests__/statusBar.test.ts`
- Test: `src/__tests__/themeCommands.test.ts`
- Test: `src/__tests__/showFeatureMenu.test.ts`
- Test: `src/__tests__/runtimeService.test.ts`
- Test: `src/__tests__/statusBar.test.ts`

- [ ] **Step 1: Finish the failing tests for remembered-theme restore and dynamic menu copy**

```ts
expect(mockWriteLastSelectedTheme).toHaveBeenCalledWith(context, 'Woodfish Dracula');
expect(items[0]?.description).toContain('Woodfish Dracula');
```

- [ ] **Step 2: Update the configuration-change lifecycle to remember built-in Woodfish theme switches**

Implementation target:
- when `workbench.colorTheme` changes and resolves via `resolveWoodfishTheme`, persist that label

- [ ] **Step 3: Update `enableTheme()` so it restores the remembered theme before writing payload**

```ts
const nextTheme = readLastSelectedTheme(context) ?? DEFAULT_WOODFISH_THEME_LABEL;
await setColorTheme(nextTheme);
```

- [ ] **Step 4: Update menu/status text to use the resolved active or restored theme name**

Run: `npm test -- themeCommands.test.ts showFeatureMenu.test.ts runtimeService.test.ts statusBar.test.ts --runInBand`

Expected: PASS with no remaining assertions tied to a permanently hard-coded `Woodfish Dark` enable flow.

### Task 7: Update documentation and run full verification

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `docs/TROUBLESHOOTING.md`
- Modify: `docs/CHANGELOG.md`
- Test: `src/__tests__/legacyCleanup.test.ts`

- [ ] **Step 1: Update docs to describe both built-in themes and the restored-theme enable behavior**

Add or revise examples for:
- selecting `Woodfish Dark`
- selecting `Woodfish Dracula`
- enable command restoring the last chosen built-in theme

- [ ] **Step 2: Update doc assertions in `legacyCleanup.test.ts`**

```ts
expect(readmeZh).toContain('Woodfish Dracula');
expect(readmeEn).toContain('Woodfish Dracula');
```

- [ ] **Step 3: Run the full Jest suite**

Run: `npm test -- --runInBand`

Expected: PASS

- [ ] **Step 4: Run compile and lint verification**

Run:
- `npm run compile`
- `npm run lint`

Expected:
- TypeScript compile succeeds with no new strict-mode errors
- ESLint passes without introducing `any` or `@ts-ignore`

- [ ] **Step 5: Commit the implementation work**

```bash
git add package.json README.md README.en.md docs/CHANGELOG.md docs/TROUBLESHOOTING.md src themes
git commit -m "feat: add built-in woodfish dracula theme"
```
