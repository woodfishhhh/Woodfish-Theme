# DeepSeek Harness（dsh）原生插件适配说明

使用方法见 [apps/cli/README.md](../../apps/cli/README.md#deepseek-harnessdsh-原生插件)。本文记录实测结论，供维护 `apps/dsh-web` 时参考。

实测环境：Windows 11，`@deepseek-ai/dsh` **0.2.2-rc.5**（npm 的 `latest`，需要 Node.js ≥ 24.9），Chromium 内核浏览器，实测日期 2026-11-25。

## dsh 是什么

- DeepSeek 开源的 agent harness（[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)，MIT），基于 Cordis 插件框架。当前为开发者预览版，官方说明仍可能有不兼容的改动。
- **Web 版是本机服务**：`dsh web` 默认监听 `http://127.0.0.1:3080`（`--port` 可改，`--tls-cert` 可开 HTTPS，`--public-url` 可放到反向代理后面），配置与已安装插件放在 `$DSH_HOME`（如 `profiles/web/package.json`、`profiles/web/cordis.patch.yml`）。
- **Desktop 版（Electron 桌面端）**：同样加载符合 `dsh.bundle` + `dsh.client` 规范的客户端插件包。`dsh 0.2.2-rc.5` 的命令行禁止通过 `dsh plugin --profile desktop add` 操作桌面端配置，桌面端需在应用内的插件管理器中安装同一个 `woodfish-dsh-plugin` 包。
- 实测与验收必须使用隔离的临时 `DSH_HOME`（例如通过 `obit mktemp 1d` 创建），绝不修改用户本机真实 `$DSH_HOME` 配置或会话。

## 架构：官方双端原生插件 + 侵入式运行时接管

Woodfish 以标准 `dsh 0.2.2-rc.5` 官方插件包 `woodfish-dsh-plugin`（构建产物提交在 `apps/dsh-web/plugin/`）交付，不再使用浏览器扩展或油猴用户脚本：

| 部分 | 文件与机制 | 说明 |
| --- | --- | --- |
| 插件清单与 Cordis patch | `apps/dsh-web/plugin/package.json`、`cordis.patch.yml` | 声明 `dsh.manifestVersion: 1`、`dsh.bundle.patch`、`dsh.client.platform: "web"`、`engines.dsh: ">=0.2.0-0 <1.0.0"`、`exports`（`.`、`./client`、`./assets/*`），零外部运行时依赖（`@deepseek-ai/cordis` 与 `@deepseek-ai/schemastery` 走宿主提供的 `peerDependencies`） |
| 宿主端（Node / Cordis） | `apps/dsh-web/src/host/index.ts` → `plugin/lib/index.js` | 导出 `name = 'woodfish-theme'` 与 6 个扁平 `.volatile()` 字符串配置字段（`paletteDark`、`paletteLight`、`backgroundImage`、`customCss`、`userCss`、`effectsJson`），关闭自动表单（`settings.configure({ auto: false })`），通过 `webserver/index-inject` 向页面注入 `window.__WOODFISH_DSH_BOOT__` 防止首帧闪烁，并经 `ctx.connection.fetch.register` 注册背景接口（`GET /api/woodfish-backgrounds` 列表/读图、`POST /api/woodfish-backgrounds-write?action=upload|delete`；dsh 的 `ConnectionFetchMethod` 只开放 `GET`/`HEAD`/`POST`） |
| 自定义背景图存储 | `apps/dsh-web/src/host/backgrounds.ts` | 按文件头校验 JPG/PNG/WebP 与尺寸（上限 6 MB、2560px、最多 30 张），按内容哈希去重，持久化落在 `$DSH_HOME/woodfish/backgrounds/`，整页刷新和重启 `dsh web` 后保持不丢 |
| 客户端插件入口 | `apps/dsh-web/src/client/index.ts` → `plugin/lib/client.js` | 注入 `slots`、`locale`、`remote`、`configForms`、`theme`；把全量「Woodfish」设置面板挂入原生设置窗口 `settings.section`（`id: 'woodfish'`, `order: 12`）、`settings.section.icon` 与插件管理器配置入口 `plugins.bundle.config`；通过 `ctx.theme.overrideTokens('woodfish-theme', { '--woodfish-theme-sync': ... })` 触发 `theme/change` 让 xterm 终端与 `<meta name="theme-color">` 同步，同时不向 `body` 写入行内 `--dsw-*` 样式 |
| 侵入式渲染运行时 | `apps/dsh-web/src/renderer/` + `src/css/` | 直接运行在页面 / Electron 渲染进程内，管理 15 套深浅色主题、全屏背景与静态模糊副本、12 个内置效果插件、原生 CSS Modules 苹果圆角镜像（`startNativeCorners`）与自定义 `user.css` |

## 12 项效果与全参数可调原生设置面板

原生设置窗口 **设置 → Woodfish** 提供即时预览、实时生效、原生持久化的完整参数控制（共 12 项效果、73 项可调参数）：

| 效果 | dsh 里的表现与可调项 |
| --- | --- |
| 主题配色（15 套） | 深色主题 / 浅色主题独立选择（可视化预览卡，含“dsh 默认”），并内置 `浅色 / 深色 / 跟随系统` 外观切换；自动遍历 `WOODFISH_PALETTES` |
| `background` 窗口背景（核心） | 预设《彩云》（`./assets/caiyun-*.webp`）、彩云渐变、或上传自定义背景图（自动缩放转 WebP 存入 `$DSH_HOME/woodfish/backgrounds/`，支持删除）；7 项滑块/下拉参数实时调节 |
| `squircle-corners` 苹果圆角 | 独立开关、圆角倍率 `scale`（1–2.4，默认 1.78）、曲率形状 `shape`（`squircle` / `soft` / `strong` / `extreme`）、硬编码圆角扫描 `scanHardcoded`（默认开）；自动镜像 dsh 宿主及所有内置插件带哈希类名的 `<style>` 规则，同时保留正圆、胶囊、开关和 1–4px 细边 |
| `caret` 输入框光标 | 6px 彩虹平滑光标，宽度、圆角、平滑时长、风格、配色、发光等全部参数可调 |
| `caret-trail` 光标拖尾 | 输入与吐字时的光标拖尾，来源、长度、粗细、淡出速度、配色等全部参数可调 |
| `typing-particles` 打字粒子 | 打字与吐字时的光点粒子，来源、数量、大小、速度、重力、寿命、配色、发光等全部参数可调 |
| `stream-cursor` 吐字光标 | 流式回复末尾的彩虹光标，宽度、高度倍率、圆角、平滑、脉冲、配色、发光等全部参数可调 |
| `text-reveal` 新字淡入 | 流式新字出场效果，模式（`fade` / `blur` / `glow`）与时长可调 |
| `rainbow-text` 回复正文彩虹 | 纯 CSS 渐变正文（列表项 `list-style-position: inside` 保留序号上色），浓度、角度、色相偏移、色标数等全部参数可调 |
| `thread-ring` 流光边框 | 侧栏选中与运行中会话的七色旋转光谱环，边框宽度、转速、光晕、跟随主题等全部参数可调 |
| `accent` 强调色点缀 | 输入框聚焦光晕、发送按钮渐变、当前标签流光下划线，各项开关与强度可调 |
| `glass` 浮层毛玻璃 | 菜单、弹出框、对话框磨砂玻璃，`mode`（`blur` / `acrylic`）、`opacity`、`blur`、`saturate`、`noise`、`borderRadius`、`animations`、`reveal` 全部 8 项参数均在 dsh 生效 |
| `code-gradient` 代码与 Diff 渐变（核心） | 代码块（Shiki）与 `[data-diff]` / `[data-diff-code]` 渐变与可选发光，角度、色相偏移、亮度差、中性彩度、发光开关与强度全部可调 |
| 自定义 `user.css` | 设置页底部内置实时编辑器，支持 `--woodfish-<效果>-<参数>` 变量覆盖与自定义 CSS，立即生效并持久化 |

每次在设置面板拖动滑块或切换开关时，客户端立即调用 `overlay.previewEffect` / `overlay.setUserCss` / `overlay.update` 实时刷新画面，并将变更防抖保存至 `@deepseek-ai/dsh-settings`（落盘到 `profiles/<profile>/cordis.patch.yml`）。

## 页面技术与侵入式样式细节

| 项目 | 结论 |
| --- | --- |
| 框架 | React（`ui-renderer` 插件挂载），每个界面功能都是一个客户端插件 |
| 样式 | CSS Modules，类名带哈希（`uV2eYG_card`、`_block_7gxqk_4`），每个插件一个 `<style data-plugin>`；**适配器源码不得硬编码哈希类名** |
| 布局 | `[data-slot="…"]` 包装元素多为 `display: contents`，真正上色的是其子元素（或用 `:has()` 找到的父元素） |
| 配色 | 设计令牌三层：`--dsw-static-*` → `--dsw-alias-*` / `--dsw-specific-*` → 组件；语义层挂在 `body`（浅色）与 `body[data-ds-dark-theme]`（深色），都不在 `@layer` 里 |
| 深浅色 | `body[data-ds-dark-theme]` 切换深浅色，`<html data-ds-theme-source>` 记录外观偏好 |
| 代码高亮与 Diff | Shiki `css-variables` 主题（9 个 `--shiki-token-*` 槽位）；Diff 卡片位于 `[data-diff]` / `[data-diff-code]`，改动文件卡片为 `[data-changed-files]` |
| 输入框与流式输出 | Lexical `[data-composer-card]` > `[data-composer-input][contenteditable]`；流式回复带 `[data-streaming="true"]`，运行中会话行含 `[data-state="ongoing"]` |

### 选择器与变量覆盖

选择器集中登记在 `apps/dsh-web/src/selectors.ts`，仅使用 `data-*`、ARIA role、`:has()` 与稳定库类名（`pre.shiki`、`.line`），单元测试会拦截任何哈希类名：

| 分组 | 选择器 | 必须存在 |
| --- | --- | --- |
| dsh 页面 | `html[data-ds-theme-source]` | 是 |
| 主界面 / 窗口框架 | `[data-slot="root"]` / `[data-slot="root"] > *` | 是 |
| 侧栏 / 侧栏所在的列 | `[data-slot="sidebar"] > *` / `:has(> [data-slot="sidebar"])` | 否 |
| 会话行 | `[role="tree"] [role="treeitem"][data-row-key^="session:"]` | 否 |
| 当前会话 / 运行中的会话 | 会话行 + `[aria-selected="true"]` / 会话行 + `:has([data-state="ongoing"])` | 否 |
| 当前标签 | `[data-conversation-tabs] [role="tab"][aria-selected="true"]`、`[data-dockkit-strip] [role="tab"][aria-selected="true"]` | 否 |
| 输入框底栏 / 输入框 / 编辑区 | `[data-composer-seat]` / `[data-composer-card]` / `[data-composer-input]` | 否 |
| 发送按钮 | `[data-composer-card] button[aria-busy]:not([aria-haspopup])` | 否 |
| 助手回复 / 正在输出的回复 | `[data-chat-flow-kind="assistant-step"]` / 其中的 `[data-streaming="true"]` | 否 |
| 用户消息 | `[data-chat-flow-kind="user"] [data-message-bubble]` | 否 |
| 代码块与 Diff / token | `[data-code-block-content], [data-diff], [data-diff-code]` / 对应 span | 否 |
| 浮层 / 设置弹窗 / 菜单项 | `[data-menu-material]`、`[role="menu"]`、`[role="listbox"]`、`[role="dialog"]`、`[data-shortcut-modal="settings"]` | 否 |

- **全量语义令牌与侵入式表面接管（`css/palette.ts`）**：覆写 150+ 个 `--dsw-alias-*`、`--dsw-specific-*`、`--dsw-linear-gradient-*` 与 9 个 `--shiki-token-*` 变量，并补齐设置弹窗（`[data-shortcut-modal="settings"]`）、改动文件卡片、悬浮卡片、引导页、Diff 行、表单控件、`color-scheme` 与 `::selection`；选择器采用 `:root:root body[data-ds-dark-theme]` / `:root:root body:not([data-ds-dark-theme])` 以特异性取胜。
- **窗口背景（`css/background.ts`）**：图层绘制在 `body::before`，保留 `--dsw-alias-bg-base` 供卡片与遮罩使用，主动将窗口框架、中间对话流、`[data-slot^="main."] > *`、右侧面板与代码预览底色打通透明；侧栏和输入框使用 Canvas 预模糊静态副本（`background-attachment: fixed`），不在大面积流式区域叠加实时 `backdrop-filter`。
- **全局侵入式苹果圆角（`css/corners.ts` + `renderer/overlay.ts`）**：在 `@supports (corner-shape: squircle)` 下设置 `--squircle-shape` / `--squircle-k` 并放缩 `--dsw-radius-*`；同时当 `scanHardcoded` 开启时，`startNativeCorners()` 扫描全部 dsh 宿主与内置插件样式表（实测动态镜像 121 张样式表中的写死像素圆角规则），关闭时立即彻底释放（0 张残留镜像样式表）。

## 实测结论与坑

- `dsh plugin --profile desktop add` 在 `dsh 0.2.2-rc.5` 上会被 CLI 明确拒绝（`profile "desktop" is managed exclusively by the Electron application`），桌面端由应用内插件管理器直接添加同一个 `woodfish-dsh-plugin` 包；`woodfish dsh install --profile desktop` 会先完成暂存并输出明确的桌面端操作指引。
- `ctx.connection.fetch.register` 仅允许 `GET`、`HEAD`、`POST`，背景图上传与删除走 `POST /api/woodfish-backgrounds-write?action=upload|delete`。rc.5 按路径选择请求体模式，GET 保留在 `/api/woodfish-backgrounds`，POST 单独注册为 `streaming`。宿主的 `connection/request` 钩子和 owner 校验保留；上传超过 40 MiB 时，声明长度和分块两种方式都会在请求结束前返回 413。旧版客户端升级后需刷新设置页才能写入。
- `ctx.theme.overrideTokens` 会把传入的每个键写成 `body` 的行内样式；若直接传入 `--dsw-*` 会压过我们的样式表导致浅色/深色切换错乱。通过只传入无害标记键 `--woodfish-theme-sync` 既可安全触发 `theme/change` 让 xterm 终端与浏览器主题色重新采样，又不会污染任何 `--dsw-*` 变量。
- `dsh-settings` 表单会对嵌套对象展开额外 schema 校验，宿主端采用 6 个扁平顶层 `.volatile()` 字符串字段（含 `effectsJson`），在保持配置实时下发与落盘的同时兼容任意新增效果参数。

## 端到端验证记录（2026-11-25）

在隔离临时 `DSH_HOME` 中对真实 `@deepseek-ai/dsh@0.2.2-rc.5` 完成端到端验证（未改动本机真实 `$DSH_HOME` 或 `%APPDATA%\Woodfish`）：

1. **打包与原生安装**：`npm pack apps/dsh-web/plugin` 生成 `woodfish-dsh-plugin-8.2.3.tgz`（10 个文件，268.7 KB），执行 `dsh plugin --profile web add <tgz>` 无报错安装并自动启用到 `profiles/web/package.json`。
2. **原生加载与零错误检查**：启动真实 `dsh web`，通过浏览器核对 `window.__DSH_BOOT__` 与 `window.__WOODFISH_DSH_BOOT__` 均正常注入，`./assets/caiyun-21a673751884.webp` 与 `/api/woodfish-backgrounds` 返回 HTTP 200，全程 0 个控制台报错、0 个页面异常、0 个 404 请求。
3. **12 项效果 / 73 项参数全量核验**：打开原生 **设置 → Woodfish** 页签，逐项核对 12 个效果与全部 73 个参数控件 100% 渲染且可交互，无缺失项。
4. **实时调节与侵入式效果验证**：
   - 切换主题至深色 / Woodfish Dracula，页面 `--dsw-alias-bg-base` 实时变为 `#282A36`；
   - 关闭苹果圆角时 `--squircle-k` 清除且动态镜像样式表归零（`0`），开启并调整 `scale=2.2`、`shape=strong`（`superellipse(2.4)`）后动态镜像 121 张样式表实时生效；
   - 实时修改 `background`、`caret`、`thread-ring`、`code-gradient`、`glass` 与 `user.css`（`--woodfish-caret-trail-color: #ff4d4f`）均无需刷新即刻生效；
   - 通过原生设置面板上传真实 PNG 背景图，经服务端校验压缩为 WebP 存入隔离 `$DSH_HOME/woodfish/backgrounds/` 并铺上 `body::before`，随后验证删除按钮可完整移除。
5. **跨刷新与跨进程重启持久化**：整页刷新（`page.reload()`）并彻底关闭原 `dsh web` 进程后在另一端口重启新进程，核对 `profiles/web/cordis.patch.yml` 与页面实测状态确认主题、全部效果参数、自定义 `user.css` 与上传背景图全部保持不丢。
6. **CLI 命令闭环**：在隔离环境下实测 `woodfish dsh uninstall --profile web` → `woodfish dsh status`（`installed: false`）→ `woodfish dsh install --profile web`（使用 `apps/cli/out/woodfish.js` 内嵌插件自动暂存安装）→ `woodfish dsh status`（`installed: true, enabled: true, version: "8.2.3"`）。

## 实测截图

### 原生设置窗口与主题切换

| 浅色模式（Woodfish Light + 《彩云》） | 深色模式（Woodfish Dracula + 自定义背景） |
| --- | --- |
| ![原生 Woodfish 设置页签（浅色）](dsh-screenshots/settings-themes-light.png) | ![原生 Woodfish 设置页签（深色，开启苹果圆角）](dsh-screenshots/settings-themes-dark-squircle-on.png) |

### 侵入式苹果圆角开关对比（Woodfish Dracula）

| 开启苹果圆角（scale 2.2 / strong，动态镜像 121 张样式表） | 关闭苹果圆角（恢复 dsh 原生圆角，0 张镜像） |
| --- | --- |
| ![开启苹果圆角](dsh-screenshots/settings-themes-dark-squircle-on.png) | ![关闭苹果圆角](dsh-screenshots/settings-themes-dark-squircle-off.png) |

### 自定义背景上传与全效果参数调节

| 背景图库与全部背景参数滑块 | 效果展开态（苹果圆角与彩虹正文全参数控件） |
| --- | --- |
| ![自定义背景图与参数滑块](dsh-screenshots/settings-background-custom.png) | ![效果参数全量控件](dsh-screenshots/settings-effects-params.png) |

### 历史逐项与 15 套主题参考（0.2.2-rc.5）

| 项目 | 改前 | 改后 |
| --- | --- | --- |
| 输入框光标 | ![](dsh-screenshots/gaps/caret-before.jpg) | ![](dsh-screenshots/gaps/caret-after.jpg) |
| 流式输出（吐字光标、拖尾、粒子、新字淡入） | ![](dsh-screenshots/gaps/streaming-before.jpg) | ![](dsh-screenshots/gaps/streaming-after.jpg) |
| 侧栏当前会话 | ![](dsh-screenshots/gaps/session-before.jpg) | ![](dsh-screenshots/gaps/session-after.jpg) |
| 标签下划线 | ![](dsh-screenshots/gaps/tabs-before.jpg) | ![](dsh-screenshots/gaps/tabs-after.jpg) |
| 菜单毛玻璃与指针柔光 | ![](dsh-screenshots/gaps/menu-before.jpg) | ![](dsh-screenshots/gaps/menu-after.jpg) |
| 改动文件卡片 | ![](dsh-screenshots/gaps/card-before.jpg) | ![](dsh-screenshots/gaps/card-after.jpg) |

dsh 原样：[深色](dsh-screenshots/themes/dsh-dark.jpg)、[浅色](dsh-screenshots/themes/dsh-light.jpg)。

| 主题 | 改前 | 改后 |
| --- | --- | --- |
| Woodfish Dark | ![](dsh-screenshots/themes/dark-before.jpg) | ![](dsh-screenshots/themes/dark-after.jpg) |
| Woodfish Dracula | ![](dsh-screenshots/themes/dracula-before.jpg) | ![](dsh-screenshots/themes/dracula-after.jpg) |
| Woodfish Light | ![](dsh-screenshots/themes/light-before.jpg) | ![](dsh-screenshots/themes/light-after.jpg) |
| Woodfish Black | ![](dsh-screenshots/themes/black-before.jpg) | ![](dsh-screenshots/themes/black-after.jpg) |
| Woodfish Neon | ![](dsh-screenshots/themes/neon-before.jpg) | ![](dsh-screenshots/themes/neon-after.jpg) |
| Woodfish One Dark Pro | ![](dsh-screenshots/themes/onedark-before.jpg) | ![](dsh-screenshots/themes/onedark-after.jpg) |
| Woodfish Tokyo Night | ![](dsh-screenshots/themes/tokyonight-before.jpg) | ![](dsh-screenshots/themes/tokyonight-after.jpg) |
| Woodfish Catppuccin Mocha | ![](dsh-screenshots/themes/catppuccin-mocha-before.jpg) | ![](dsh-screenshots/themes/catppuccin-mocha-after.jpg) |
| Woodfish Catppuccin Latte | ![](dsh-screenshots/themes/catppuccin-latte-before.jpg) | ![](dsh-screenshots/themes/catppuccin-latte-after.jpg) |
| Woodfish Nord | ![](dsh-screenshots/themes/nord-before.jpg) | ![](dsh-screenshots/themes/nord-after.jpg) |
| Woodfish GitHub Dark | ![](dsh-screenshots/themes/github-dark-before.jpg) | ![](dsh-screenshots/themes/github-dark-after.jpg) |
| Woodfish GitHub Light | ![](dsh-screenshots/themes/github-light-before.jpg) | ![](dsh-screenshots/themes/github-light-after.jpg) |
| Woodfish Night Owl | ![](dsh-screenshots/themes/nightowl-before.jpg) | ![](dsh-screenshots/themes/nightowl-after.jpg) |
| Woodfish Ayu Mirage | ![](dsh-screenshots/themes/ayu-mirage-before.jpg) | ![](dsh-screenshots/themes/ayu-mirage-after.jpg) |
| Woodfish Gruvbox Dark | ![](dsh-screenshots/themes/gruvbox-dark-before.jpg) | ![](dsh-screenshots/themes/gruvbox-dark-after.jpg) |
