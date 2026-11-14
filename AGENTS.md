# Woodfish (monorepo)

**Type**: npm workspaces monorepo, TypeScript
**Products**: VS Code extension (`apps/vscode-extension`, published as `zhongjun.woodfish-theme`); `woodfish` desktop CLI for the Codex app and the DeepSeek Harness (dsh) Web UI user script (`apps/desktop-cli`), shipped three ways from one `woodfish.js`: npm package `woodfish`, `woodfish.exe` on the GitHub Release, and inside the VSIX (「为 Codex 启用 Woodfish」)
**Shared packages**: `@woodfish/theme-core` (pure color/effect core), `@woodfish/renderer-runtime` (in-page engines, effect plugin host), `@woodfish/adapter-codex` (Codex selectors, CSS, overlay), `@woodfish/adapter-dsh` (dsh Web UI selectors, CSS, overlay), `@woodfish/effects` (shipped effect plugins and the Node side of the user's effects folder)

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
│   └── desktop-cli/           # `woodfish codex …`: native theme, CDP injection, Codex++ user script; `woodfish dsh …`: dsh user script
├── packages/
│   ├── theme-core/            # Host-agnostic color math, gradients, palettes, effect params
│   ├── renderer-runtime/      # DOM engines shared by every host page (text gradient, styles)
│   ├── adapter-codex/         # Codex app selectors, CSS builders, native theme mapping, overlay
│   ├── adapter-dsh/           # dsh Web UI selectors, CSS builders (variable overrides), overlay
│   └── effects/               # builtin/<id>/ effect plugins + AGENTS.md for AIs; src/ seeds and loads the user's effects folder
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
| dsh selectors / CSS | `packages/adapter-dsh/src/selectors.ts`, `packages/adapter-dsh/src/css/` |
| dsh CLI commands, user script header | `apps/desktop-cli/src/commands/dsh.ts`, `apps/desktop-cli/scripts/build.js` |
| dsh measurements | `docs/hosts/dsh.md` |
| CLI release artifacts (npm package, single-file exe, notices) | `apps/desktop-cli/scripts/dist.js` (`pnpm cli:dist`) |
| Self-spawn, private copy for the logon task / shortcut | `apps/desktop-cli/src/commands/context.ts` (`selfCommand`, `installPrivateCopy`) |
| Autostart daemon, fast start detection | `apps/desktop-cli/src/commands/autostart.ts` (`decideDaemonAction`, `codexStartNaps`) |
| VS Code commands for Codex | `apps/vscode-extension/src/commands/codex.ts`, `src/services/codexCli.ts` |
| Effect plugins (shipped) | `packages/effects/builtin/<id>/` (`effect.json`, `effect.js`, `README.md`), guide for AIs `packages/effects/builtin/AGENTS.md` |
| Effects folder sync / load / payload | `packages/effects/src/index.ts` |
| Effect manifest & value normalization | `packages/theme-core/src/effects/plugins.ts` |
| user.css, CSS variable list for users and AIs | `packages/effects/builtin/user.css`, `packages/effects/builtin/README.md` (tables from `packages/effects/scripts/css-variables.js`) |
| In-page effect host, insert/caret events | `packages/renderer-runtime/src/effectHost.ts`, `textEvents.ts` |
| Codex effect events, theme, selectors | `packages/adapter-codex/src/renderer/effects.ts`; settings page card `renderer/effectsPanel.ts` |
| VS Code effects | `apps/vscode-extension/src/services/effects.ts` (payload), `browser/effects.ts` (Monaco events, hot import) |
| Effect playgrounds | `docs/playground/streaming-text.html` (吐字 schemes), `docs/playground/tab-indicator.html` |
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
- **Bundled popular themes are unmodified upstream files** - `themes/<slug>/` holds the upstream JSON (VS Code reads JSONC; `scripts/lib/jsonc.js` parses it the same way), its `LICENSE.txt`, a `NOTICE.md` and Woodfish's own `theme.meta.json` (accents, tab gradient, cursor colors picked from the theme's palette). Only MIT-style licenses; list each in both THIRD_PARTY_NOTICES files. Add the slug to `port-palettes.js`, `package.json` and `themeRegistry.ts`, then `pnpm themes:generate`. They have no hand-tuned preset; gradients are derived
- **Codex effects are designed** - the owner wants Codex to look designed: rainbow reply text (pure CSS so streaming and long threads cost nothing), the selected sidebar thread copies the Bifrost console's 「创建 Key」 bridge button (owner's company, copying approved 2026-11-14: 1.5px seven-band conic ring turning every 3.2 s, navy face, blur(14px) halo; running threads a weaker halo; replaced the earlier playground #8 ring), Codex's caret is the owner's VS Code caret (6px, solid, smooth 80 ms, Woodfish rainbow, no glow), the caret trail copies the VS Code Animations extension (MIT; single-color band, length 12, default `#ffffff`); the owner wants only the text caret's trail in Codex, so `mouse-trail` ships off there (2026-11-14; VS Code keeps `woodfishTheme.mouseTrail.*`), streaming default is playground #1 (`docs/playground/streaming-text.html`: rainbow cursor at the end of the text + caret trail + 120 ms fade-in). Let the owner pick visual flourishes in a static playground like those. Judge on real Codex screenshots with the window in front (an occluded Codex is marked hidden and throttles frames, so `PrintWindow` captures go stale; CDP `Page.captureScreenshot` is reliable for page content)
- **Effects are plugins (the owner's core selling point)** - every visual effect is a folder (`effect.json` schema + `params.json` values + `effect.js` + `README.md`) shipped from `packages/effects/builtin/` into `%APPDATA%\Woodfish\effects` (shared by the CLI and the VS Code extension; `.woodfish-shipped.json` records what was shipped so upgrades only replace untouched files, `params.json` is never shipped, deleted folders stay deleted; bump `version` in `effect.json` when changing a shipped effect). A user tells Codex/Claude "改一下出字的粒子" and the AI follows the folder's `AGENTS.md`, which says: `user.css` first, then `params.json`, code last. `user.css` (effects folder root, shipped as a commented template, kept once edited) is mounted in `<body>` after every stylesheet in Codex and VS Code; every param is the CSS variable `--woodfish-<id>-<param>` and the effect host reads the computed `:root` values back into `ctx.params` and core values (`effectValuesFromCss` in theme-core), so canvas effects follow CSS too. Gradient colors that are not params are `var(--woodfish-<id>-<name>, default)` hooks in the effect CSS. The variable list is the effects folder's `README.md`; regenerate its param tables with `node packages/effects/scripts/css-variables.js` after changing an `effect.json` (a test checks it). Effects only talk to `ctx` (`renderer-runtime/effectHost.ts`): one shared canvas whose loop stops when idle and while the window is in the background, `ctx.onInsert` / `ctx.onCaret` / `ctx.onStreamEnd` fire for the user typing (Monaco in VS Code, the composer in Codex) and for Codex streaming a reply (`watchStream`, one flush per frame, no per-character DOM). A failing effect (syntax error with line, bad JSON, three runtime errors) is skipped and reported; the rest keep running. Values: Codex reads `params.json` (the settings page writes it through the watcher, `codex.json` keeps only palette, picture and custom CSS; an older `codex.json` is migrated once); VS Code reads `woodfishTheme.<camelId>.*` for its three effects (opt-in, default off) and `params.json` for any other. Reload: saving re-injects within ~250 ms; `woodfish reload` (touches `effects/.reload`, VS Code watches it too), Ctrl+Alt+R and 「刷新效果」 restart every effect. VS Code loads `effects.mjs` from global storage with `import()` (allowed under its CSP and Trusted Types) and polls `effects.json` every 1.5 s while focused
- **Effect plugins must stay cheap** - measured 2026-11-14 in a real streaming reply: frame interval avg 4.72 / p95 8.4 ms with the streaming effects on vs 4.68 / 8.4 off, no long tasks. Keep animations in transforms/CSS or the shared canvas, never animate per character, and never put a live `backdrop-filter` over large streaming areas
- **Window background is shared** - params in `theme-core/effects` (`DEFAULT_BACKGROUND`: picture 15 %, panels 35 % theme tint, blur 10px, saturate 150 %, luminosity 10 %, 30 ms; the owner picked 0.35 / 10px / 150 % in the Codex playground), the layer and frosted-panel CSS in `renderer-runtime/background.ts`, hosts only wire selectors. 《彩云》 (by the owner) is committed once as `packages/renderer-runtime/assets/caiyun.webp`; the VSIX stages it in (`scripts/paths.js`), the CLI and the Codex++ user script inline it, the CDP overlay never does. Codex pictures travel through their own binding (`__woodfishCodexBackground`) and live in `%APPDATA%\Woodfish\backgrounds\`; VS Code copies them into globalStorage and loads `vscode-file://` URLs. In Codex never use a live `backdrop-filter` over the background: during a streaming reply it roughly doubled frame time (the running indicator, the caret and text scrolling under the composer recompute it every frame); the sidebar and composer draw a canvas-blurred static copy (`--woodfish-background-image-soft`, `background-attachment: fixed`). Bindings added with `Runtime.addBinding` are gone after a page reload; the watcher re-adds them on every load. VS Code 1.146's floating panels paint parts, panes, the grid frame and the editor card with `!important` (up to four classes), so the VS Code background rules are prefixed with `:root body`. A patched workbench only shows up after a full restart of the test VS Code, a reload can serve the old HTML
- **Codex autostart** - `woodfish codex autostart on` is a per-user logon task (`conhost --headless`, normal rights) running a private copy of the CLI as `codex daemon`; it only restarts a Codex that started without a port less than 90 s ago. From an elevated shell, `launch` relays the package launch through `explorer.exe`
- **Woodfish Dark preset is the owner's own tuning** - the 5.x hand-written Bearded CSS, restored byte for byte. Never retune it or let the algorithm replace it; new presets follow its rules (start at the token color, turn forward on the hue circle to a more vivid end, 45°, pastel rainbow at 135° for the foreground)
- **Keep the VSIX small, no size limit** - the owner dropped the hard budget (2026-11-14): `pnpm package` prints the VSIX size and its biggest entries with their share, pre-publish only reports the source total. Compress what can be compressed without visible loss: 《彩云》 is a 2560px WebP at quality 70 (method 6; 232 → 177 KB, the same at 2x zoom), the icon a 256px JPEG at quality 90 with 4:2:0, the workbench bootstrap is whitespace/syntax-minified with names kept (tests look for constants by name), `out/extension.js` is fully minified. Bundled upstream theme JSON stays byte-for-byte upstream and the GPL text of the bearded theme must ship
- **README images are rendered and focused on the effect** - the owner wants every effect shown with its own picture in a list, never one long screenshot (2026-11-14; this replaced the old “code only” rule): the READMEs' 效果一览 / Effects at a glance table has one row per effect (picture + name + one sentence + how to turn it on or change it), the popular themes are a two-column grid. Code pictures come from `apps/vscode-extension/scripts/render-readme-images.js` (built bootstrap + `buildRuntimeCss`, code on the theme background plus the one widget a feature needs). The effect gallery and theme grid come from `scripts/promo/render-readme-effects.js` (`assets/readme/effects/`): the promo's stages and storyboard states with a still camera framed on the effect and no captions or badge; moving effects are 2.5–3 s animated WebP rendered at 60 Hz with every second frame kept, under ~1 MB each. Frame the effect itself: host UI that is its context is fine (the sidebar for the thread ring), unrelated window chrome, glow blobs, badges and slogans are not. The Codex settings page has no stand-in and is cropped from a real screenshot. Shots must render in time order (the pages' clocks only run forward). Rerun both scripts after changing gradients or effects
- **Promo video is rendered, not edited** - `apps/vscode-extension/scripts/promo/render-promo-video.js --bgm <music>` drives two headless Chromes frame by frame over CDP (`promo/cdp.js`, Node's built-in WebSocket) and pipes frames into ffmpeg: VS Code shots run the real bootstrap plus the effect plugins (`promo/stage.js`), Codex shots run the real `startCodexOverlay` and every shipped effect on a page with Codex's data-* hooks (`promo/codex-page.js`, `promo/codex-stage.js`). `promo/clock.js` replaces time, timers, rAF and `Math.random` in the pages, so renders are reproducible; 60 fps because the caret trail moves once per frame. The owner wants effect shots framed on the effect (push in, follow), not the whole window: each page keeps one window size at 3× pixel ratio and the camera is the screenshot clip (Chrome re-rasterizes at the clip scale, so text stays sharp), following anchors the stages report; captions, the corner badge and the end card live in `promo/overlay-page.js`, counter-scaled to the clip. `promo/storyboard.js` holds the scenes in BGM seconds on the measured beat grid; `--still <seconds>` writes single frames for review. Storyboard, BGM credit and license: `docs/promo.md`. Output goes to the ignored `output/promo/`; clear old stills with `obit bury`, not `rm`
- **One Codex CLI, three distributions, one version** - npm (`woodfish`, built into `apps/desktop-cli/out/npm`; not published yet: npmjs.com showed “访问受限” to the owner on 2026-11-14, publish the current version once it is reachable), the GitHub Release (`woodfish.exe`, a Node 22 single executable built with `postject`, plus `woodfish.js` and `THIRD_PARTY_NOTICES-woodfish.md` in `out/release`) and the VSIX (`out/woodfish.js`, copied in by `scripts/bundle.js`; `package.js` fails without it) carry the same file, and the CLI's version is the extension's (`dist.js` refuses otherwise) so one tag carries all three. The extension runs it on the editor's own Electron (`process.execPath` + `ELECTRON_RUN_AS_NODE=1`, Node 22+ required, forks with older Node are told to use exe/npm); first use shows the CLI's own risk text in a modal (exit code 3), a running Codex is confirmed in a modal before `--yes` (exit code 4), and 启用 = `launch` + `autostart on`. Rules learned the hard way (2026-11-14): never start PowerShell with `-EncodedCommand` (Defender holds it 30 s+ when the unsigned exe starts it; `runPowerShell` uses a temp UTF-8-BOM `.ps1` with `-File`); the CLI deletes `ELECTRON_RUN_AS_NODE` at startup and only gives it back to its own children; the logon task and the shortcut run a private copy in `%LOCALAPPDATA%\Woodfish` (`woodfish.cmd` for the editor runtime, since tasks and shortcuts cannot set env vars); VS Code's updater terminates the editor-runtime daemon, so the extension restarts the task on activation. The CLI shares one copy of 《彩云》 between the CDP side and the Codex++ user script (`build.js` token), which keeps ~180 KB out of every distribution
- **Never take over the user's Codex shortcuts** - Woodfish does not modify, replace or delete Start menu, desktop or taskbar shortcuts to Codex (the owner asked, 2026-11-14). `woodfish codex shortcut` adds a separate “Woodfish Codex” entry (removed by `uninstall`). With autostart on, a Codex opened from the original shortcut is restarted with a port before its window shows: the daemon watches Codex's data folder while Codex is closed and wakes on its `lockfile` (~1.4 s to notice, killed at ~2.3 s; Codex needs ~7 s for its first window), measured in `docs/hosts/codex.md`. Say this in every install description
- **README image links point at the release tag** - the extension is released from this branch, so `raw/HEAD` (main) lacks new images; use `raw/vX.Y.Z/…` and push the tag before publishing. `pre-publish-check.js` accepts HEAD or a version tag and checks the files exist.
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
- **DO NOT** hand-edit `apps/desktop-cli/assets/*.js`; run `pnpm codex:build` (same as `pnpm dsh:build`)
- **DO NOT** modify dsh's files or `$DSH_HOME` config; dsh is themed only through the user script
- **DO NOT** list palettes by hand in a new adapter; iterate `WOODFISH_PALETTES` so new themes appear automatically (adapter-dsh does)
- **DO NOT** change a shipped effect only in `%APPDATA%\Woodfish\effects`; edit `packages/effects/builtin/<id>/` and bump its `version` (that folder is the user's, upgrades leave edited files alone)
- **DO NOT** wrap characters in spans or restructure host DOM for an effect; read positions (Range rects, Monaco's cursor style) and draw on the shared layer, masks or CSS Highlights

## Commands (run from the repository root)

```bash
pnpm compile          # Build theme-core, type-check extension + browser scripts
pnpm test                 # Jest in every workspace
pnpm lint             # ESLint in every workspace
pnpm themes:check     # Generated theme JSON is current
pnpm runtime:check    # Built renderer scripts are current
pnpm codex:check      # Built renderer bundles in apps/desktop-cli/assets (Codex + dsh) are current
pnpm dsh:check        # Same check, named for the dsh user script
pnpm woodfish codex status   # Run the desktop CLI
pnpm woodfish dsh userscript # Write the dsh user script with the saved settings
pnpm woodfish codex effects  # Effect plugins and their state (running / off / failed with reason)
pnpm woodfish reload         # Reload every effect from disk in Codex and VS Code, no restart
pnpm test:integration # VS Code extension host tests
pnpm package          # Build the VSIX (bundles the Codex CLI as out/woodfish.js)
pnpm cli:dist         # CLI release artifacts: apps/desktop-cli/out/npm and out/release (woodfish.exe), then smoke-runs them
```

## Notes

- 8 feature commands + repair/uninstall commands
- Theme-specific syntax and metadata stay separate from shared runtime CSS
- `README.md` and `LICENSE` live at the repo root and are copied into the extension only while packaging

## Finishing a Task

- Do not push work in progress: every push mails the owner (CI result, automated PR review). Commit locally, run the full CI set locally (`pnpm compile`, `themes:check`, `runtime:check`, `codex:check`, `dsh:check`, `format:check`, `lint`, `test --runInBand`, `test:integration`, `pre-publish`, `package`), then push once to `feat/monorepo-theme-core` without a PR.

- **Releasing (extension + CLI together, ask the owner before each publish)**: bump `apps/vscode-extension/package.json` and `apps/desktop-cli/package.json` to the same version, write the CHANGELOG, `pnpm runtime:build`, run the full CI set, `pnpm cli:dist` and `pnpm package`, commit, tag `vX.Y.Z`, push the branch and the tag. Then (1) Marketplace and Open VSX (see the publish notes), (2) `npm publish apps/desktop-cli/out/npm` with the token only in the environment: a temporary `.npmrc` containing `//registry.npmjs.org/:_authToken=${NPM_TOKEN}` passed by `--userconfig` (npm/npx echo command-line arguments as `npm notice`; a token leaked that way on 2026-11-14), (3) `gh release create vX.Y.Z <vsix> apps/desktop-cli/out/release/* --latest` — every release must carry `woodfish.exe`, the READMEs link `releases/latest/download/woodfish.exe`, (4) fast-forward `main` to the release commit with `git push origin <commit>:main` (fast-forward only, never force), so the GitHub landing page shows the released README.
- Before you finish, delete what the task left behind: debug scripts, logs, screenshots, `.playwright-*`, and temporary worktrees. This checkout is the only one; develop the monorepo line on `feat/monorepo-theme-core` here instead of adding a sibling worktree.
- Record what you confirmed, the pitfalls you hit, and the user's stated preferences in the matching entry of this file or `docs/`. Rewrite existing entries and drop stale ones rather than appending a log.
