# Woodfish Theme - AI Instructions

This document provides current context for AI agents working on the Woodfish Theme VS Code extension.

## Project Architecture

Woodfish Theme is a VS Code extension centered on an integrated runtime injector.

- The extension entry is `src/extension.ts`, compiled to `out/extension.js`.
- Runtime orchestration lives under `src/services/runtime/`.
- Theme assets live in `themes/Bearded Theme/`.
- Commands live in `src/commands/`.
- User-facing state and settings live in `src/config/`, `src/types/`, and `src/ui/`.

## Runtime Model

This project no longer depends on third-party CSS loader extensions.

The current flow is:

1. Read Woodfish settings from the `woodfishTheme` section.
2. Build runtime CSS from the maintained asset files in `themes/Bearded Theme/`.
3. Patch the local VS Code `workbench.html` with a Woodfish payload block.
4. Detect runtime truth from the active theme plus the current payload state.

Important runtime modules:

- `src/services/runtime/service.ts`: enable, disable, repair, uninstall, startup sync
- `src/services/runtime/payloadBuilder.ts`: assembles the final runtime CSS
- `src/services/runtime/workbenchPatcher.ts`: injects/removes payload blocks and known legacy fragments
- `src/services/runtime/status.ts`: derives `on / paused / off`
- `src/services/runtime/assets.ts`: loads maintained CSS assets

## Maintained Theme Assets

The current runtime reads these files directly:

- `activity-bar.css`
- `tab-bar.css`
- `syntax-highlighting.css`
- `glow-effects.css`
- `cursor-animation.css`
- `cursor-loader.css`

Do not reintroduce old aggregate files such as `index.css`, `index-all.css`, or loader-era import chains.

## Development Workflow

- Compile: `npm run compile`
- Lint: `npm run lint`
- Test: `npm test -- --runInBand`
- Package: `npm run package`
- Pre-publish verification: `node scripts/pre-publish-check.js`

For manual debugging:

- Press `F5` to launch the Extension Development Host.
- Focus verification on `Woodfish Dark`, payload injection/removal, and status bar truth rendering.

## Editing Guidance

- Keep user-facing wording aligned with the integrated runtime model.
- Preserve historical facts only in changelog-style files.
- Prefer editing the maintained runtime modules instead of adding compatibility shims.
- When changing theme assets, confirm the runtime builder and related tests still match the asset set.

## Critical Constraints

- Workbench patching is a real installation-level side effect, so enable/disable/repair flows must stay conservative.
- Unknown third-party payloads should not be auto-rewritten.
- Status bar and quick menu text must reflect actual runtime state, not assumed state.
