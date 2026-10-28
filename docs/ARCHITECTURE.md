# Woodfish 仓库结构

Woodfish 采用 npm workspaces 管理的 monorepo：共享的视觉核心与各宿主应用的适配代码分开，每个宿主应用单独构建、单独发布。当前只有 VS Code 扩展这一个产品，后续接入 ChatGPT 桌面版等以 Electron 为核心的 AI 应用时，沿用同一套结构。

```text
Woodfish-Theme/
├─ apps/
│  └─ vscode-extension/      # VS Code 扩展（Marketplace / Open VSX 上的 zhongjun.woodfish-theme）
│     ├─ src/                # 扩展宿主代码：命令、配置、workbench 注入、卸载
│     ├─ browser/            # workbench 渲染进程脚本源码（TypeScript）
│     ├─ themes/             # VS Code 主题 JSON、主题元数据、注入用 CSS 与构建产物
│     ├─ scripts/            # 主题生成、渲染端构建、打包、发布
│     └─ docs/               # 随 VSIX 发布的 walkthrough 与故障排查
├─ packages/
│  └─ theme-core/            # @woodfish/theme-core：与宿主无关的颜色与效果核心
├─ docs/                     # 仓库级文档
├─ package.json              # workspace 根，只放共享开发工具
└─ tsconfig.base.json        # 各 workspace 共用的 TypeScript 选项
```

## 边界

### `@woodfish/theme-core`

只放纯计算和数据，不依赖 `vscode`、Electron、DOM 或 Node 内置模块。`tsconfig` 不加载任何环境类型，ESLint 限制导入，`boundaries.test.ts` 会扫描源码，三层检查都会拦截越界。

| 模块 | 内容 |
| --- | --- |
| `color/` | CSS 颜色解析与校验、sRGB ↔ OKLCH、色域映射、WCAG 对比度 |
| `gradient/` | 从一个文字颜色推导三段渐变和发光色；按调色板或强调色选取锚定色相 |
| `effects/` | 渐变、发光、光标、毛玻璃、系统窗口材质的可调参数：默认值、取值范围、归一化；用户 CSS 与色标的安全过滤 |
| `palettes/` | Woodfish 原创调色板（Light / Black / Neon）及可读性校验 |

不属于核心的内容：

- 宿主界面元素的选择器，例如 Monaco 的 `.mtk*`、`.monaco-editor .view-lines`，或 VS Code 浮层列表；
- 开关、预设、配置读写等宿主状态；
- 补丁、校验和、安装记录、卸载等宿主文件操作；
- 宿主专属的主题格式，例如 VS Code 主题 JSON 模板；
- 基于上游主题的派生主题（Woodfish Dark 基于 Bearded，Woodfish Dracula 基于 Dracula）。它们沿用上游许可，留在对应应用里。

### 宿主应用

每个应用负责三件事，三者分开实现：

1. **效果与界面**：核心负责计算颜色和参数，应用负责找到宿主中的侧栏、输入框、代码块、弹窗等元素并套用效果。
2. **渲染与安装**：渲染端脚本只负责应用、更新和清理效果；宿主识别、文件写入、恢复与版本检查由安装入口负责。
3. **页面毛玻璃与系统窗口透明**：系统窗口透明需要宿主主进程能力，各应用单独声明是否支持。

VS Code 扩展中的对应位置：

| 职责 | 位置 |
| --- | --- |
| 渲染端脚本 | `browser/overlay-bootstrap.ts` → `themes/shared/overlay-bootstrap.js` |
| 注入与恢复 | `src/services/runtime/workbenchPatcher.ts`、`service.ts`、`cleanup.ts` |
| 系统窗口透明 | `src/services/runtime/nativeWindow.ts`、`themes/shared/native-window-main.mjs` |

## 构建方式

- `npm run compile`：通过 TypeScript project references 先构建 `theme-core`（输出到 `packages/theme-core/out/`），再检查扩展和渲染端脚本的类型。
- 扩展的 `out/extension.js` 和 `out/uninstall.js` 由 esbuild 打包。esbuild 使用 `source` 导出条件，把 `theme-core` 的 TypeScript 源码直接打进产物，所以 VSIX 不含 `node_modules`，也不依赖本仓库。
- 渲染端脚本由 `scripts/build-browser-runtime.js` 打包为 IIFE。产物提交到仓库，因为扩展运行时直接读取，测试也要检查它。`npm run runtime:check` 和 `browserRuntime.test.ts` 会在源码或核心变化、产物没有重新生成时报错。
- 原创主题 JSON 由 `scripts/generate-themes.js` 根据核心里的调色板生成，`npm run themes:check` 检查是否过期。
- Jest 通过 `moduleNameMapper` 直接加载核心源码，跑测试前不需要先构建。

## 修改核心时

核心的改动可能影响所有产品。提交前在仓库根目录运行：

```bash
npm run compile
npm run themes:check
npm run runtime:check
npm test
```

如果 `themes:check` 或 `runtime:check` 失败，运行 `npm run themes:generate` 或 `npm run runtime:build`，并把生成的文件一起提交。设置项的取值范围和默认值由 `effectSchema.test.ts` 与扩展 `package.json` 对照检查。

## 新增宿主应用

1. 先确认宿主的版本、渲染技术、可用的扩展入口、安装包限制（例如 Electron 的 ASAR 完整性校验）和恢复方式。入口不可行时记录阻塞原因；网页预览不能代替桌面适配。
2. 在 `apps/<name>/` 或 `packages/adapter-<name>/` 建立适配代码。需要的颜色与参数从 `@woodfish/theme-core` 引入，宿主专属的选择器和安装逻辑留在适配代码里。
3. 第二个宿主落地后，如果渲染端逻辑确实可以共用，再提取 `packages/renderer-runtime`。不提前抽象。
4. 每个应用使用自己的版本号和发布流程。
