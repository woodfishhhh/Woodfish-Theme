# Woodfish Theme (xiangmu)

**Type**: TypeScript VS Code Extension
**Entry**: `src/extension.ts`

## Structure

```
xiangmu/
├── src/
│   ├── extension.ts         # Entry point
│   ├── commands/            # 9 command handlers
│   ├── config/             # Feature state & flags
│   ├── constants/         # Config keys, command IDs
│   ├── services/runtime/  # Core runtime service
│   ├── types/              # TypeScript types
│   ├── ui/                # Status bar, notifications, output
│   └── __tests__/         # Jest regression tests
├── themes/bearded/        # Woodfish Dark theme and syntax assets
├── themes/dracula/        # Woodfish Dracula theme and syntax assets
├── themes/shared/         # Shared runtime CSS
├── out/                    # Compiled output
├── package.json
├── tsconfig.json           # Strict TypeScript
└── jest.config.js
```

## Where to Look

| Task | Location |
|------|----------|
| Extension entry | `src/extension.ts` |
| Commands | `src/commands/register.ts` |
| Runtime service | `src/services/runtime/service.ts` |
| Workbench patcher | `src/services/runtime/workbenchPatcher.ts` |
| Feature state | `src/config/featureState.ts` |
| Theme registry | `src/services/runtime/themeRegistry.ts` |
| Woodfish Dark | `themes/bearded/Woodfish Dark.json` |
| Woodfish Dracula | `themes/dracula/Woodfish Dracula.json` |
| Shared runtime CSS | `themes/shared/` |

## Conventions

- **TypeScript strict mode** - no `any`, no `@ts-ignore`
- **Chinese UI** - all user-facing strings in Chinese
- **Output to `out/`** - not `dist/` or `build/`
- **Runtime injection** - patches `workbench.html` through `workbenchPatcher.ts`

## Anti-Patterns (THIS PROJECT)

- **DO NOT** use `as any` or `@ts-ignore`
- **DO NOT** commit with unfixed TypeScript errors
- **DO NOT** modify workbench.html directly (use workbenchPatcher.ts)
- **DO NOT** use `any` type - use proper TypeScript types

## Test Commands

```bash
npm run test           # Run Jest tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

## Notes

- 8 feature commands + repair/uninstall commands
- Theme-specific syntax and metadata stay separate from shared runtime CSS
