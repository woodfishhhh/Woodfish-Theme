# Woodfish (monorepo)

**Type**: npm workspaces monorepo, TypeScript
**Products**: VS Code extension (`apps/vscode-extension`, published as `zhongjun.woodfish-theme`); `woodfish` desktop CLI for the Codex app (`apps/desktop-cli`)
**Shared packages**: `@woodfish/theme-core` (pure color/effect core), `@woodfish/renderer-runtime` (in-page engines), `@woodfish/adapter-codex` (Codex selectors, CSS, overlay)

## Structure

```
Woodfish-Theme/
├── apps/
│   ├── vscode-extension/      # VS Code extension
│   │   ├── src/
│   │   │   ├── extension.ts   # Entry point
│   │   │   ├── commands/      # Command handlers
│   │   │   ├── config/        # Feature state & flags
│   │   │   ├── constants/     # Config keys, command IDs
│   │   │   ├── services/runtime/  # Core runtime service
│   │   │   ├── types/         # Settings model (built on theme-core params)
│   │   │   ├── ui/            # Status bar, notifications, output
│   │   │   └── __tests__/     # Jest regression tests
│   │   ├── browser/           # Workbench renderer script sources (DOM, TypeScript)
│   │   ├── themes/bearded/    # Woodfish Dark theme and syntax assets
│   │   ├── themes/dracula/    # Woodfish Dracula theme and syntax assets
│   │   ├── themes/shared/     # Injected CSS + built renderer scripts
│   │   ├── scripts/           # Theme generation, renderer build, package, publish
│   │   └── out/               # Compiled output
│   └── desktop-cli/           # `woodfish codex …`: native theme, CDP injection, Codex++ user script
├── packages/
│   ├── theme-core/            # Host-agnostic color math, gradients, palettes, effect params
│   ├── renderer-runtime/      # DOM engines shared by every host page (text gradient, styles)
│   └── adapter-codex/         # Codex app selectors, CSS builders, native theme mapping, overlay
├── docs/ARCHITECTURE.md       # Boundaries and how to add a host app
├── package.json               # Workspace root (shared dev tooling only)
└── tsconfig.base.json         # Shared strict TypeScript options
```

## Where to Look

| Task | Location |
|------|----------|
| Extension entry | `apps/vscode-extension/src/extension.ts` |
| Commands | `apps/vscode-extension/src/commands/register.ts` |
| Runtime service | `apps/vscode-extension/src/services/runtime/service.ts` |
| Workbench patcher | `apps/vscode-extension/src/services/runtime/workbenchPatcher.ts` |
| Feature state | `apps/vscode-extension/src/config/featureState.ts` |
| Theme registry | `apps/vscode-extension/src/services/runtime/themeRegistry.ts` |
| Renderer overlay script | `apps/vscode-extension/browser/overlay-bootstrap.ts` |
| OKLCH / gradient math | `packages/theme-core/src/color/`, `packages/theme-core/src/gradient/` |
| Hand-tuned gradients | `packages/theme-core/src/palettes/gradientPresets.ts` |
| Effect defaults & ranges | `packages/theme-core/src/effects/params.ts` |
| Original palettes | `packages/theme-core/src/palettes/originals.ts` |
| Text gradient engine | `packages/renderer-runtime/src/textGradientEngine.ts` |
| Codex selectors / CSS | `packages/adapter-codex/src/selectors.ts`, `packages/adapter-codex/src/css/` |
| Codex CLI commands | `apps/desktop-cli/src/commands/` |
| Codex config.toml edits | `apps/desktop-cli/src/codex/tomlEdit.ts` |
| Codex measurements | `docs/hosts/codex.md` |
| Woodfish Dark | `apps/vscode-extension/themes/bearded/Woodfish Dark.json` |
| Woodfish Dracula | `apps/vscode-extension/themes/dracula/Woodfish Dracula.json` |

## Conventions

- **TypeScript strict mode** - no `any`, no `@ts-ignore`
- **Chinese UI** - all user-facing strings in Chinese
- **Output to `out/`** - not `dist/` or `build/` (applies to every workspace)
- **Runtime injection** - patches `workbench.html` through `workbenchPatcher.ts`
- **Core stays host-agnostic** - `packages/theme-core` must not import `vscode`, Electron, DOM or Node APIs
- **Generated files are committed** - regenerate with `pnpm themes:generate` / `pnpm runtime:build`
- **Two kinds of text gradients** - the 5 built-in themes use hand-tuned presets (`packages/theme-core/src/palettes/gradientPresets.ts`, keyed by token color); any other theme, and colors a preset does not list, use the derivation in `gradient/tokenGradient.ts`, which is modeled on the presets. Hosts pass background / foreground / preset through the engine's `gradientContext`
- **Woodfish Dark preset is the owner's own tuning** - the 5.x hand-written Bearded CSS, restored byte for byte. Never retune it or let the algorithm replace it; new presets follow its rules (start at the token color, turn forward on the hue circle to a more vivid end, 45°, pastel rainbow at 135° for the foreground)
- **README images are generated, code only** - `apps/vscode-extension/scripts/render-readme-images.js` renders every picture in `assets/readme/` from the built bootstrap and `buildRuntimeCss`. Show only code on the theme background (plus the one widget a feature needs); no window chrome, line numbers, glow blobs, badges or slogans. Rerun it after changing gradients or effects
- **README image links point at the release tag** - the extension is released from this branch, so `raw/HEAD` (main) lacks new images; use `raw/vX.Y.Z/…` and push the tag before publishing. `pre-publish-check.js` accepts HEAD or a version tag and checks the files exist
- **Judge gradients on real renders** - unit tests only check rules. Render the built `overlay-bootstrap.js` with its real CSS in a Monaco-like page (long tokens split every 50 chars) and look at it zoomed in, in dark and light (`.monaco-workbench.vs`)

## Anti-Patterns (THIS PROJECT)

- **DO NOT** use `as any` or `@ts-ignore`
- **DO NOT** size a gradient to a single Monaco span - Monaco splits tokens over 50 chars into several spans; `gradientRuns.ts` joins adjacent same-colored spans so the gradient does not restart
- **DO NOT** glow in the text color on light backgrounds - it reads as a dark smudge; theme-core gives light backgrounds a bright tint of the hue
- **DO NOT** commit with unfixed TypeScript errors
- **DO NOT** modify workbench.html directly (use workbenchPatcher.ts)
- **DO NOT** use `any` type - use proper TypeScript types
- **DO NOT** hand-edit `themes/shared/overlay-bootstrap.js` or generated theme JSON
- **DO NOT** put host selectors, settings I/O or file patching into `packages/theme-core`
- **DO NOT** modify Codex installation files (Store MSIX, asar integrity); use `woodfish codex` commands
- **DO NOT** copy code from Codex++ (AGPL-3.0); reimplement from public CDP / Microsoft docs
- **DO NOT** hand-edit `apps/desktop-cli/assets/*.js`; run `pnpm codex:build`

## Commands (run from the repository root)

```bash
pnpm compile          # Build theme-core, type-check extension + browser scripts
pnpm test                 # Jest in every workspace
pnpm lint             # ESLint in every workspace
pnpm themes:check     # Generated theme JSON is current
pnpm runtime:check    # Built renderer scripts are current
pnpm codex:check      # Built Codex renderer bundles are current
pnpm woodfish codex status   # Run the desktop CLI
pnpm test:integration # VS Code extension host tests
pnpm package          # Build the VSIX
```

## Notes

- 8 feature commands + repair/uninstall commands
- Theme-specific syntax and metadata stay separate from shared runtime CSS
- `README.md` and `LICENSE` live at the repo root and are copied into the extension only while packaging

## Finishing a Task

- Before you finish, delete what the task left behind: debug scripts, logs, screenshots, `.playwright-*`, and temporary worktrees. This checkout is the only one; develop the monorepo line on `feat/monorepo-theme-core` here instead of adding a sibling worktree.
- Record what you confirmed, the pitfalls you hit, and the user's stated preferences in the matching entry of this file or `docs/`. Rewrite existing entries and drop stale ones rather than appending a log.
