# Woodfish 仓库结构

Woodfish 采用 npm workspaces 管理的 monorepo：共享的视觉核心与各宿主应用的适配代码分开，每个宿主应用单独构建、单独发布。目前有三个宿主：VS Code 扩展、Codex 桌面端和 DeepSeek Harness（dsh）Web 版。

```text
Woodfish-Theme/
├─ apps/
│  ├─ vscode-extension/      # VS Code 扩展（Marketplace / Open VSX 上的 zhongjun.woodfish-theme）
│  │  ├─ src/                # 扩展宿主代码：命令、配置、workbench 注入、卸载
│  │  ├─ browser/            # workbench 渲染进程脚本（基于 renderer-runtime 的一层配置）
│  │  ├─ themes/             # VS Code 主题 JSON、主题元数据、注入用 CSS 与构建产物
│  │  ├─ scripts/            # 主题生成、渲染端构建、打包、发布
│  │  └─ docs/               # 随 VSIX 发布的 walkthrough 与故障排查
│  └─ desktop-cli/           # `woodfish` 命令行：Codex 桌面端的原生配色、注入与 Codex++ 用户脚本；dsh 油猴脚本
│     ├─ src/                # 命令、CDP 客户端、监视进程、config.toml 按键修改、Windows 平台层、dsh/
│     ├─ assets/             # Codex 渲染端脚本与 dsh 油猴脚本（构建产物，提交入库）
│     └─ scripts/build.js    # 构建渲染端脚本与单文件 CLI
├─ packages/
│  ├─ theme-core/            # @woodfish/theme-core：与宿主无关的颜色与效果核心
│  ├─ renderer-runtime/      # @woodfish/renderer-runtime：任意 Chromium 页面里运行的效果引擎
│  ├─ adapter-codex/         # @woodfish/adapter-codex：Codex 选择器、CSS 生成、原生主题映射、页面内 overlay
│  ├─ adapter-dsh/           # @woodfish/adapter-dsh：dsh Web 版选择器、CSS 生成、页面内 overlay（油猴脚本）
│  └─ effects/               # @woodfish/effects：自带的效果插件（builtin/）与用户效果文件夹的 Node 端
├─ docs/
│  ├─ ARCHITECTURE.md
│  └─ hosts/                 # 各宿主实测结论：codex.md、dsh.md（含 dsh-screenshots/）
├─ package.json              # workspace 根，只放共享开发工具
└─ tsconfig.base.json        # 各 workspace 共用的 TypeScript 选项
```

## 依赖方向

```text
theme-core  ←  renderer-runtime  ←  adapter-codex  ←  desktop-cli
                                 ←  adapter-dsh    ←
     ↑      ←  effects（Node 端）  ←─────────────────  desktop-cli、vscode-extension
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
| `gradient/` | 文字渐变：先查当前主题的特调表（`presets.ts`），查不到再按特调的规律推导（`tokenGradient.ts`），并保证每个色标在背景上不比原色难读；发光色（浅色背景上用同色相的亮色）；按调色板或强调色选取锚定色相 |
| `effects/` | 渐变、发光、光标、毛玻璃、系统窗口材质、窗口背景的可调参数：默认值、取值范围、归一化；用户 CSS 与色标的安全过滤；背景图片按文件头校验（JPG / PNG / WebP 与尺寸，`backgroundImage.ts`）；效果插件的 `effect.json` 校验与参数值归一化（`plugins.ts`：数字夹到范围、颜色和选项校验、不认识的键丢弃、参数转成 `--woodfish-<效果>-<参数>` CSS 变量） |
| `palettes/gradientPresets.ts` | 5 套内置主题的特调渐变表，按 token 颜色查。Woodfish Dark 是 5.x 手写的 Bearded 特调原样保留，其余四套按同一手法调出 |
| `palettes/` | Woodfish 原创调色板（Light / Black / Neon）及可读性校验；从 VS Code 主题移植的调色板（`ported.ts`，由 `apps/vscode-extension/scripts/port-palettes.js` 生成）：Woodfish Dark、Dracula，以及原样收录的 10 套热门 MIT 主题 |

### `@woodfish/renderer-runtime`

在宿主页面中运行，可以使用 DOM，但不依赖 Node、Electron 或任何宿主的 API。

| 模块 | 内容 |
| --- | --- |
| `textGradientEngine` | 文字渐变引擎：用 MutationObserver 找到 token，按动画帧分批上色，跟随主题变化重新计算。选择器、过滤条件、主题签名，以及背景色 / 前景色 / 特调表（`gradientContext`）由宿主传入 |
| `gradientRuns` | 把同一行里相邻、同色的 span 连成一段，共用一条渐变。Monaco 会把超过 50 个字符的 token 拆成多个 span，不连起来渐变会每 50 个字重新开始 |
| `tokenCss` | 读取 token 变量的渐变、发光 CSS 声明，以及毛玻璃颗粒的 data URI（纯字符串，宿主端也能用） |
| `styleManager` / `controller` / `disposers` / `steps` | 管理 `<style>`、页面控制器、释放顺序和各效果的独立启动 |
| `acrylic` / `reveal` / `themeMode` | 亚克力滤镜、鼠标跟随光效、深浅色监听 |
| `background` | 窗口背景：铺在页面最底下的一层（主题底色 + 图片按透明度透出）、面板毛玻璃声明、canvas 缩放转 WebP、base64 与 Blob 互转。宿主只提供选择器和底色变量。默认图片《彩云》在 `assets/caiyun.webp`，两个宿主都从这里打包 |

VS Code 的渲染端脚本改为调用这个包后，与冻结的 7.0.0 构建在 500 个随机场景中逐步比对（`overlayEquivalence.test.ts`）。7.2 起渐变颜色是有意改变的，比对时去掉渐变色变量，其余（哪些 token 上色、发光、观察器与计时器、释放）仍须完全一致。

### `@woodfish/adapter-codex`

入口 `.` 只有纯逻辑，不访问 DOM；入口 `./renderer` 是在页面内运行的 overlay。

| 模块 | 内容 |
| --- | --- |
| `selectors` | 所有 Codex 界面定位点，只用稳定的 `data-*` 属性、ARIA role 和自定义元素名，不用带哈希的 CSS module 类名 |
| `settings` | Codex 效果设置的类型与归一化 |
| `css/` | 配色变量覆盖、代码渐变与发光、浮层毛玻璃、强调色、彩色光标、正文渐变 |
| `nativeTheme` | 把 Woodfish 调色板映射成 Codex 官方 chrome theme 的字段 |
| `renderer/` | `startCodexOverlay`，以及 CDP 和 Codex++ 用户脚本两个入口。用户脚本优先；构建标识不同时先释放旧实例再启动。`background.ts` 经单独的 binding 向监视进程取图、上传、删除，`backgroundPanel.ts` 是设置页的背景区 |

### `@woodfish/adapter-dsh`

结构与 adapter-codex 相同：入口 `.` 只有纯逻辑，`./renderer` 是页面内的 overlay。dsh 的界面几乎完全由 CSS 变量驱动，所以配色和毛玻璃都是变量覆盖，元素选择器只用于代码 token、输入框和当前会话。

| 模块 | 内容 |
| --- | --- |
| `selectors` | dsh 界面定位点，只用 `data-*`、ARIA role 和库的类名（`pre.shiki`），不用带哈希的 CSS module 类名；深浅色作用域 `modeScope` |
| `settings` | 设置的类型与归一化。主题按 `WOODFISH_PALETTES` 通用遍历，theme-core 新增主题无需改动 |
| `css/` | `--dsw-alias-*` / `--dsw-specific-*` 配色覆盖、`--shiki-token-*` 语法色、代码渐变与发光、浮层毛玻璃（变量）、强调色、彩色光标、正文渐变 |
| `renderer/` | `startDshOverlay`，以及油猴脚本入口：只在 dsh 页面启动，菜单切换主题与开关（`GM_*`，没有时退回 localStorage） |

### `@woodfish/effects` 与效果插件

所有可见效果都是插件：一个效果一个文件夹（`effect.json` 参数定义、`params.json` 当前值、`effect.js` 实现、`README.md` 说明，可选 `effect.css`）。自带的放在 `packages/effects/builtin/`，根目录的 `AGENTS.md` 写给 AI：用户一句“改一下出字的粒子”，AI 读完就知道改哪个文件夹、怎么验证。

| 位置 | 内容 |
| --- | --- |
| `packages/effects/src/`（Node） | 把自带效果同步进用户的效果文件夹（`%APPDATA%\Woodfish\effects`，CLI 和 VS Code 扩展共用）：`.woodfish-shipped.json` 记下放进去的每个文件和版本，只升级没被改过的文件，`params.json` 从不覆盖；读取文件夹（语法错误用 `vm.Script` 只编译不运行地查出并带行号）；写参数；生成页面用的效果列表（经典脚本给 Codex，ES module 给 VS Code） |
| `renderer-runtime/effectHost.ts` | 页面里的效果宿主：给每个效果一个 `ctx`（参数、主题、选择器、事件、共用画布和覆盖层、样式、计时器），一个效果启动失败或连续出错只停它自己；画布只在有效果要画时跑帧，窗口在后台时暂停并在 `<html>` 上标 `data-woodfish-paused`；参数变了有 `update` 就原地更新，否则重启；代码变了（hash）重启 |
| `renderer-runtime/textEvents.ts` | 统一事件的来源：`watchStream` 把流式回复里追加的文字变成插入事件（每帧最多一次，不改 DOM）；`watchEditableTyping` 处理 contenteditable 输入框的打字（含输入法提交） |
| `adapter-codex/renderer/effects.ts` | Codex 这一侧：`ctx.theme()`（当前外观的调色板、光标色、特调正文渐变）、`ctx.selectors`、`ctx.lib`，输入框打字和流式回复（运行中的当前会话、最后一个用户消息之后的回复）接到事件上 |
| `apps/vscode-extension/src/services/effects.ts`、`browser/effects.ts` | VS Code 这一侧：扩展把效果文件夹写成全局存储里的 `effects.mjs` 和 `effects.json`，自带的三个效果用 `woodfishTheme.<驼峰名>.*` 设置当参数；工作台脚本每 1.5 秒（窗口在前台时）看一眼版本，变了就 `import()` 新模块；Monaco 光标的 `top/left` 变化和按键合成光标事件与插入事件 |

背景和代码渐变是“核心效果”（`effect.json` 里有 `core`）：引擎留在适配器里，文件夹只管开关、参数和追加的 CSS。

### 宿主应用

每个应用负责三件事，三者分开实现：

1. **效果与界面**：核心计算颜色和参数，适配器负责找到宿主中的侧栏、输入框、代码块、弹窗等元素并套用效果。
2. **渲染与安装**：渲染端脚本只负责应用、更新和清理效果；宿主识别、文件写入、恢复与版本检查由安装入口负责。
3. **页面毛玻璃与系统窗口透明**：系统窗口透明需要宿主主进程能力，各应用单独声明是否支持。

| 职责 | VS Code 扩展 | Codex 桌面端 | dsh Web 版 |
| --- | --- | --- | --- |
| 注入方式 | 修改 `workbench.html`（`workbenchPatcher.ts`） | 不修改安装文件；以本机调试端口启动，由后台监视进程通过 CDP 注入（`desktop-cli/src/inject/`） | 油猴用户脚本（Tampermonkey / Violentmonkey），不碰 dsh 的文件和配置 |
| 渲染端脚本 | `browser/overlay-bootstrap.ts` → `themes/shared/overlay-bootstrap.js` | `adapter-codex/src/renderer/` → `desktop-cli/assets/*.js` | `adapter-dsh/src/renderer/` → `desktop-cli/assets/woodfish-dsh.user.js` |
| 原生配色 | 内置的 VS Code 颜色主题 | 按键修改 `~/.codex/config.toml` 的 chrome theme（`desktop-cli/src/codex/`） | 无；配色由脚本覆盖 dsh 的设计令牌 |
| 系统窗口透明 | `nativeWindow.ts`（自行注入主进程） | Codex 自带 Mica（`opaqueWindows = false`），Woodfish 不改主进程 | 不适用（浏览器页面） |
| 恢复与卸载 | `cleanup.ts`、`uninstall.ts` | `stop-inject`、`theme restore`、`autostart off`、`uninstall` | 在油猴中删除脚本；`woodfish dsh uninstall` 删除本机生成的文件 |

## 构建方式

- `pnpm compile`：通过 TypeScript project references 依次构建共享包（输出到各自的 `out/`），检查各应用的类型，并生成 `apps/desktop-cli/out/woodfish.js`。
- 打包工具通过 `source` 导出条件直接引用共享包的 TypeScript 源码，把它们打进产物。VSIX 和 `woodfish.js` 都不需要 `node_modules`，也不依赖本仓库。
- 同一个 `woodfish.js` 有三种发法，版本号和扩展一致：npm 包 `woodfish`（`pnpm cli:dist` 生成 `apps/desktop-cli/out/npm`）、GitHub Release 上的单文件 `woodfish.exe`（Node 单文件程序，`out/release`）、VSIX 里的 `out/woodfish.js`（`scripts/bundle.js` 放进去，扩展用编辑器自带的 Electron 以 `ELECTRON_RUN_AS_NODE=1` 运行它）。
- 渲染端脚本（VS Code 的 `overlay-bootstrap.js`、Codex 和 dsh 的 `assets/*.js`）提交入库，因为运行时直接读取，测试也要检查它们。`runtime:check`、`codex:check`（与 `dsh:check` 是同一个检查，覆盖 `desktop-cli/assets/` 下全部脚本）和对应的测试会在共享包变化、产物没有重新生成时报错。每个脚本的构建标识只取自它用到的共享包，改 adapter-dsh 不会让 Codex 脚本过期。`compile` 不会改写这些已提交的文件。
- 原创主题 JSON 由 `apps/vscode-extension/scripts/generate-themes.js` 根据核心里的调色板生成，`themes:check` 检查是否过期。
- Jest 通过 `moduleNameMapper` 直接加载共享包源码，跑测试前不需要先构建。

## 修改共享包时

共享包的改动可能影响所有产品。提交前在仓库根目录运行：

```bash
pnpm compile
pnpm themes:check
pnpm runtime:check
pnpm codex:check
pnpm test
```

检查失败时，运行 `pnpm themes:generate`、`pnpm runtime:build` 或 `pnpm codex:build`（`pnpm dsh:build` 相同），并把生成的文件一起提交。

## 新增宿主应用

1. 先确认宿主的版本、渲染技术、可用的扩展入口、安装包限制（例如 Electron 的 ASAR 完整性校验）和恢复方式。入口不可行时记录阻塞原因；网页预览不能代替桌面适配。实测结论写进 `docs/hosts/<宿主>.md`。
2. 新建 `packages/adapter-<宿主>`：选择器登记表、设置、CSS 生成和 `./renderer` 入口，颜色与参数取自 `theme-core`，页面引擎取自 `renderer-runtime`。
3. 安装入口放进现有的 `apps/desktop-cli`（新增一组命令）或单独的 app，按宿主的分发方式决定。
4. 每个应用使用自己的版本号和发布流程。
