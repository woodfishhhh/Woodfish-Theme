# Woodfish Theme - AI Instructions

This document provides context for AI agents working on the Woodfish Theme VS Code extension.

## 🏗 Project Architecture

This is a **VS Code Extension** that provides advanced theming capabilities (Glow, Transparent UI, Animations) by **injecting CSS** into the VS Code workbench.

### Core Mechanism

Unlike standard themes, this extension relies on a **Loader Extension** to inject CSS.

1.  **Dependency**: Requires `be5invis.vscode-custom-css` or `bartag.custom-css-hot-reload` installed.
2.  **Logic**: `src/lib/customCss.ts` detects the loader and modifies its configuration (`vscode_custom_css.imports`) to include this extension's CSS files.
3.  **Assets**: CSS files are located in `themes/Bearded Theme/`.
    - `index.css`: The main entry point that imports other modules.
    - modules: `glow-effects.css`, `transparent-ui.css`, `activity-bar.css`, etc.

### Key Directories

- `src/`: TypeScript extension source code.
  - `extension.ts`: Entry point, command registration.
  - `lib/`: Core logic (CSS injection, path handling, version checks).
- `themes/`: CSS assets and the base `color-theme.json`.
- `scripts/`: Build and release automation.

## 🛠 Development Workflows

### Build & Run

- **Compile**: `npm run compile` (uses `tsc`).
- **Debugging**: Press F5 to launch the Extension Development Host.
- **Verification**: Run `node scripts/debug-css-config.js` to verify file paths and configuration structure without launching VS Code.

### CSS Injection Workflow

When implementing features that require new CSS:

1.  Add CSS rule to appropriate file in `themes/Bearded Theme/`.
2.  If adding a new file, `@import` it in `themes/Bearded Theme/index.css`.
3.  **Important**: The extension logic in `src/lib/customCss.ts` typically points the loader to `index.css`. If specific features need independent toggling (like Rainbow Cursor), they may be added/removed from the import list dynamically.

## 🧩 Code Patterns & Conventions

### Path Handling

**NEVER** use `__dirname` or relative paths for resources injected into VS Code.

- Use `src/lib/paths.ts` helper `getExtensionPaths(context)`.
- Use `context.asAbsolutePath()` to ensure paths work in production (`out/` vs `src/` differences).
- CSS paths injected into the loader must be converted to `file://` URIs (see `toFileUriString` in `src/lib/paths.ts`).

### Configuration Management

- Extension configuration is under the section `woodfishTheme`.
- When settings change (e.g., toggling Glow), the code must:
  1. Update `woodfishTheme` config.
  2. Re-calculate the list of imports.
  3. Write the new list to `vscode_custom_css.imports`.
  4. Prompt the user to reload.

### UI Interaction

- Use wrappers in `src/lib/vscodeUi.ts` (`showInfoMessage`, `showErrorMessage`) for consistent user feedback.
- Use `showReloadPrompt` when a change requires a window reload to take effect.

## ⚠️ Critical Constraints

- **Security**: The CSS injection mechanism requires the user to have specific extensions installed and usually requires VS Code to be run with elevated permissions or acknowledged warning messages.
- **Compatibility**: Logic in `detectSupportedCssExtension` handles fallbacks between the two supported loaders. Maintain support for both.
