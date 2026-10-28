# Woodfish 仓库结构

Woodfish 采用 npm workspaces 管理的 monorepo：共享的视觉核心与各宿主应用的适配代码分开，每个宿主应用单独构建、单独发布。目前有两个宿主：VS Code 扩展和 Codex 桌面端。

```text
Woodfish-Theme/
├─ apps/
│  ├─ vscode-extension/      # VS Code 扩展（Marketplace / Open VSX 上的 zhongjun.woodfish-theme）
│  │  ├─ src/                # 扩展宿主代码：命令、配置、workbench 注入、卸载
│  │  ├─ browser/            # workbench 渲染进程脚本（基于 renderer-runtime 的一层配置）
│  │  ├─ themes/             # VS Code 主题 JSON、主题元数据、注入用 CSS 与构建产物
│  │  ├─ scripts/            # 主题生成、渲染端构建、打包、发布
│  │  └─ docs/               # 随 VSIX 发布的 walkthrough 与故障排查
│  └─ desktop-cli/           # `woodfish` 命令行：Codex 桌面端的原生配色、注入与 Codex++ 用户脚本
│     ├─ src/                # 命令、CDP 客户端、监视进程、config.toml 按键修改、Windows 平台层
│     ├─ assets/             # Codex 渲染端脚本（构建产物，提交入库）
│     └─ scripts/build.js    # 构建渲染端脚本与单文件 CLI
├─ packages/
│  ├─ theme-core/            # @woodfish/theme-core：与宿主无关的颜色与效果核心
│  ├─ renderer-runtime/      # @woodfish/renderer-runtime：任意 Chromium 页面里运行的效果引擎
│  └─ adapter-codex/         # @woodfish/adapter-codex：Codex 选择器、CSS 生成、原生主题映射、页面内 overlay
├─ docs/
│  ├─ ARCHITECTURE.md
│  └─ hosts/codex.md         # Codex 实测结论
├─ package.json              # workspace 根，只放共享开发工具
└─ tsconfig.base.json        # 各 workspace 共用的 TypeScript 选项
```

## 依赖方向

```text
theme-core  ←  renderer-runtime  ←  adapter-codex  ←  desktop-cli
     ↑                ↑
     └──── vscode-extension（宿主代码与 browser/ 渲染端脚本）
```

依赖只能指向左边：共享包从不依赖宿主应用，适配器之间也互不依赖。

## 边界

### `@woodfish/theme-core`

只放纯计算和数据，不依赖 `vscode`、Electron、DOM 或 Node 内置模块。`tsconfig` 不加载任何环境类型，ESLint 限制导入，`boundaries.test.ts` 会扫描源码，三层检查都会拦截越界。

| 模块 | 内容 |
| --- | --- |
| `color/` | CSS 颜色解析与校验、sRGB ↔ OKLCH、色域映射、WCAG 对比度 |
| `gradient/` | 从一个文字颜色推导三段渐变和发光色；按调色板或强调色选取锚定色相 |
| `effects/` | 渐变、发光、光标、毛玻璃、系统窗口材质的可调参数：默认值、取值范围、归一化；用户 CSS 与色标的安全过滤 |
| `palettes/` | Woodfish 原创调色板（Light / Black / Neon）及可读性校验；从 VS Code 主题移植的 Dark / Dracula 调色板（`ported.ts`，由 `apps/vscode-extension/scripts/port-palettes.js` 生成） |

### `@woodfish/renderer-runtime`

在宿主页面中运行，可以使用 DOM，但不依赖 Node、Electron 或任何宿主的 API。

| 模块 | 内容 |
| --- | --- |
| `textGradientEngine` | 文字渐变引擎：用 MutationObserver 找到 token，按动画帧分批上色，跟随主题变化重新计算。选择器、过滤条件和主题签名由宿主传入 |
| `tokenCss` | 读取 token 变量的渐变、发光 CSS 声明，以及毛玻璃颗粒的 data URI（纯字符串，宿主端也能用） |
| `styleManager` / `controller` / `disposers` / `steps` | 管理 `<style>`、页面控制器、释放顺序和各效果的独立启动 |
| `acrylic` / `reveal` / `themeMode` | 亚克力滤镜、鼠标跟随光效、深浅色监听 |

VS Code 的渲染端脚本改为调用这个包后，与冻结的 7.0.0 构建在 500 个随机场景中逐步比对结果完全一致（`overlayEquivalence.test.ts`）。

### `@woodfish/adapter-codex`

入口 `.` 只有纯逻辑，不访问 DOM；入口 `./renderer` 是在页面内运行的 overlay。

| 模块 | 内容 |
| --- | --- |
| `selectors` | 所有 Codex 界面定位点，只用稳定的 `data-*` 属性、ARIA role 和自定义元素名，不用带哈希的 CSS module 类名 |
| `settings` | Codex 效果设置的类型与归一化 |
| `css/` | 配色变量覆盖、代码渐变与发光、浮层毛玻璃、强调色、彩色光标、正文渐变 |
| `nativeTheme` | 把 Woodfish 调色板映射成 Codex 官方 chrome theme 的字段 |
| `renderer/` | `startCodexOverlay`，以及 CDP 和 Codex++ 用户脚本两个入口。用户脚本优先；构建标识不同时先释放旧实例再启动 |

### 宿主应用

每个应用负责三件事，三者分开实现：

1. **效果与界面**：核心计算颜色和参数，适配器负责找到宿主中的侧栏、输入框、代码块、弹窗等元素并套用效果。
2. **渲染与安装**：渲染端脚本只负责应用、更新和清理效果；宿主识别、文件写入、恢复与版本检查由安装入口负责。
3. **页面毛玻璃与系统窗口透明**：系统窗口透明需要宿主主进程能力，各应用单独声明是否支持。

| 职责 | VS Code 扩展 | Codex 桌面端 |
| --- | --- | --- |
| 注入方式 | 修改 `workbench.html`（`workbenchPatcher.ts`） | 不修改安装文件；以本机调试端口启动，由后台监视进程通过 CDP 注入（`desktop-cli/src/inject/`） |
| 渲染端脚本 | `browser/overlay-bootstrap.ts` → `themes/shared/overlay-bootstrap.js` | `adapter-codex/src/renderer/` → `desktop-cli/assets/*.js` |
| 原生配色 | 内置的 VS Code 颜色主题 | 按键修改 `~/.codex/config.toml` 的 chrome theme（`desktop-cli/src/codex/`） |
| 系统窗口透明 | `nativeWindow.ts`（自行注入主进程） | Codex 自带 Mica（`opaqueWindows = false`），Woodfish 不改主进程 |
| 恢复与卸载 | `cleanup.ts`、`uninstall.ts` | `stop-inject`、`theme restore`、`uninstall` |

## 构建方式

- `npm run compile`：通过 TypeScript project references 依次构建共享包（输出到各自的 `out/`），检查各应用的类型，并生成 `apps/desktop-cli/out/woodfish.js`。
- 打包工具通过 `source` 导出条件直接引用共享包的 TypeScript 源码，把它们打进产物。VSIX 和 `woodfish.js` 都不需要 `node_modules`，也不依赖本仓库。
- 渲染端脚本（VS Code 的 `overlay-bootstrap.js`、Codex 的 `assets/*.js`）提交入库，因为运行时直接读取，测试也要检查它们。`runtime:check`、`codex:check` 和对应的测试会在共享包变化、产物没有重新生成时报错。`compile` 不会改写这些已提交的文件。
- 原创主题 JSON 由 `apps/vscode-extension/scripts/generate-themes.js` 根据核心里的调色板生成，`themes:check` 检查是否过期。
- Jest 通过 `moduleNameMapper` 直接加载共享包源码，跑测试前不需要先构建。

## 修改共享包时

共享包的改动可能影响所有产品。提交前在仓库根目录运行：

```bash
npm run compile
npm run themes:check
npm run runtime:check
npm run codex:check
npm test
```

检查失败时，运行 `npm run themes:generate`、`npm run runtime:build` 或 `npm run codex:build`，并把生成的文件一起提交。

## 新增宿主应用

1. 先确认宿主的版本、渲染技术、可用的扩展入口、安装包限制（例如 Electron 的 ASAR 完整性校验）和恢复方式。入口不可行时记录阻塞原因；网页预览不能代替桌面适配。实测结论写进 `docs/hosts/<宿主>.md`。
2. 新建 `packages/adapter-<宿主>`：选择器登记表、设置、CSS 生成和 `./renderer` 入口，颜色与参数取自 `theme-core`，页面引擎取自 `renderer-runtime`。
3. 安装入口放进现有的 `apps/desktop-cli`（新增一组命令）或单独的 app，按宿主的分发方式决定。
4. 每个应用使用自己的版本号和发布流程。
