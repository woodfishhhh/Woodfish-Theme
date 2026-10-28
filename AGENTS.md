# Woodfish (monorepo)

**Type**: npm workspaces monorepo, TypeScript
**Products**: VS Code extension (`apps/vscode-extension`, published as `zhongjun.woodfish-theme`)
**Shared core**: `@woodfish/theme-core` (`packages/theme-core`)

## Structure

```
Woodfish-Theme/
├── apps/
│   └── vscode-extension/      # VS Code extension
│       ├── src/
│       │   ├── extension.ts   # Entry point
│       │   ├── commands/      # Command handlers
│       │   ├── config/        # Feature state & flags
│       │   ├── constants/     # Config keys, command IDs
│       │   ├── services/runtime/  # Core runtime service
│       │   ├── types/         # Settings model (built on theme-core params)
│       │   ├── ui/            # Status bar, notifications, output
│       │   └── __tests__/     # Jest regression tests
│       ├── browser/           # Workbench renderer script sources (DOM, TypeScript)
│       ├── themes/bearded/    # Woodfish Dark theme and syntax assets
│       ├── themes/dracula/    # Woodfish Dracula theme and syntax assets
│       ├── themes/shared/     # Injected CSS + built renderer scripts
│       ├── scripts/           # Theme generation, renderer build, package, publish
│       └── out/               # Compiled output
├── packages/
│   └── theme-core/            # Host-agnostic color math, gradients, palettes, effect params
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
| Effect defaults & ranges | `packages/theme-core/src/effects/params.ts` |
| Original palettes | `packages/theme-core/src/palettes/originals.ts` |
| Woodfish Dark | `apps/vscode-extension/themes/bearded/Woodfish Dark.json` |
| Woodfish Dracula | `apps/vscode-extension/themes/dracula/Woodfish Dracula.json` |

## Conventions

- **TypeScript strict mode** - no `any`, no `@ts-ignore`
- **Chinese UI** - all user-facing strings in Chinese
- **Output to `out/`** - not `dist/` or `build/` (applies to every workspace)
- **Runtime injection** - patches `workbench.html` through `workbenchPatcher.ts`
- **Core stays host-agnostic** - `packages/theme-core` must not import `vscode`, Electron, DOM or Node APIs
- **Generated files are committed** - regenerate with `npm run themes:generate` / `npm run runtime:build`

## Anti-Patterns (THIS PROJECT)

- **DO NOT** use `as any` or `@ts-ignore`
- **DO NOT** commit with unfixed TypeScript errors
- **DO NOT** modify workbench.html directly (use workbenchPatcher.ts)
- **DO NOT** use `any` type - use proper TypeScript types
- **DO NOT** hand-edit `themes/shared/overlay-bootstrap.js` or generated theme JSON
- **DO NOT** put host selectors, settings I/O or file patching into `packages/theme-core`

## Commands (run from the repository root)

```bash
npm run compile          # Build theme-core, type-check extension + browser scripts
npm test                 # Jest in every workspace
npm run lint             # ESLint in every workspace
npm run themes:check     # Generated theme JSON is current
npm run runtime:check    # Built renderer scripts are current
npm run test:integration # VS Code extension host tests
npm run package          # Build the VSIX
```

## Notes

- 8 feature commands + repair/uninstall commands
- Theme-specific syntax and metadata stay separate from shared runtime CSS
- `README.md` and `LICENSE` live at the repo root and are copied into the extension only while packaging
