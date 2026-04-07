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
│   └── __tests__/         # 8 Jest test files
├── themes/Bearded Theme/   # Theme JSON (spaces in path!)
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
| Theme config | `themes/Bearded Theme/Bearded Theme.json` |

## Conventions

- **TypeScript strict mode** - no `any`, no `@ts-ignore`
- **Chinese UI** - all user-facing strings in Chinese
- **Output to `out/`** - not `dist/` or `build/`
- **Runtime injection** - modifies workbench.html via Custom CSS extension

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

- Requires `be5invis.vscode-custom-css` or `bartag.custom-css-hot-reload`
- 8 feature commands + repair/uninstall commands
- Theme path contains spaces: `themes/Bearded Theme/`
