# Codex 桌面端适配说明

使用方法见 [apps/desktop-cli/README.md](../../apps/desktop-cli/README.md)。本文记录实测结论，供维护适配器时参考。

实测环境：Windows 11，商店版 `OpenAI.Codex` 26.1013.3656.0（应用版本 26.1013.31256），实测日期 2026-10-28，2026-11-13 复测。

## 2026-11-13 复测

版本没变（仍是 26.1013.3656.0），选择器和注入全部有效（`doctor` 无问题）。这次“效果没了”的根源不在 Woodfish：

| 现象 | 根源与处理 |
| --- | --- |
| Codex 启动即弹“无法加载 ChatGPT 配置 / No such file or directory (os error 2)”，没有任何渲染进程，CDP 目标列表为空 | `[desktop] runCodexInWindowsSubsystemForLinux = true` 时 agent 在 WSL 里读 `~/.codex/config.toml`，而 CC Switch 4.0.27 把 `model_catalog_json` 写成 Windows 绝对路径，WSL 里找不到。改成裸文件名 `'cc-switch-model-catalog.json'`（Codex 按配置目录解析相对路径，Windows 原生的 Codex CLI 和 WSL 里的都能读）。CC Switch 4.0.29 起在 WSL 模式下自己就写裸文件名（上游 2026-11-10 的修复），旧版切换供应商会写回绝对路径 |
| 从管理员终端（Orca 的终端就是）运行 `launch` 直接报错 | 旧代码一律拒绝。实测管理员身份下 `Invoke-CommandInDesktopPackage` 时好时坏（Chromium 会经 explorer 降权重启自己，加上 `--do-not-de-elevate`，有时根本起不来）。现在管理员身份下改为写一个转发批处理，交给 `explorer.exe` 以桌面的普通权限运行，Codex 始终以普通权限、带端口启动 |
| 截图里效果“没生效”、渐变迟迟不出现 | Codex 窗口被挡住时 Chromium 会把 `requestAnimationFrame` 拖到几秒一次，`PrintWindow` 拿到的是旧帧，渐变引擎按帧上色也会停。截图前先把 Codex 切到前台（`SetForegroundWindow` 受前台锁限制，常常无效，用 UI 自动化切换），这不是用户可见的问题 |

另外新增的界面定位点：

- 运行中的会话：侧栏行内出现 `motion-safe:animate-spin` 的转圈（Tailwind 工具类，不是哈希类名），用 `:has(.motion-safe\:animate-spin)` 识别；出错是 `text-danger` 图标，未读是强调色圆点（Codex 自己用 `--app-color-accent-blue` 画，换主题自动跟随）。
- 侧栏行：高 30px、宽约 212px、圆角 12.5px，文字距行左缘 8px，行左边到滚动容器左缘有 8px 空隙。选中效果先由负责人在 `docs/playground/tab-indicator.html` 里挑了 #8 旋转流光边框，2026-11-14 改为照抄 Bifrost「创建 Key」按钮（见下面“效果插件”一节，效果 `thread-ring`）。以后其他效果也用同样的 playground 让负责人挑（吐字效果见 `docs/playground/streaming-text.html`）。
- 右侧面板的标签页：`[data-app-shell-tab-controller] [role="tab"][aria-selected="true"]`（`role=tablist` 本身是 `sr-only` 的辅助节点）。
- “思考中”的扫光是 CSS module 类（`_cadencedShimmer*`），按规则不碰；运行状态由侧栏流光边框转得更快来表达。
- 菜单（Radix）没有入场动画，`data-state="open"` 可用来做淡入。

## 效果插件（2026-11-14 实测）

Codex 里的效果全部改成插件（`%APPDATA%\Woodfish\effects\<名字>\`，见 `apps/desktop-cli/README.md` 和效果文件夹里的 `AGENTS.md`）。在负责人本机的 Codex（26.1013.3656.0）上实测：

| 项目 | 结论 |
| --- | --- |
| 侧栏选中会话 | 照抄 Bifrost「创建 Key」按钮（`.ui-button--bridge` 小号：外圈 10px、面 8.5px）。行本身 `isolation: isolate`，`::after` 面和 `::before` 光晕都是 `z-index: -1`，压在行的背景（光谱环）上、行内文字下。行和直接祖先都没有 `overflow: hidden`，5px + 14px 模糊的光晕能透出来；侧栏滚动容器是 `contain: layout paint`，靠左右边缘的光晕会被裁掉一点。运行中（未选中）的会话光晕降到 0.2。截图：[整窗](codex-screenshots/effects-thread-ring-bifrost.jpg)、[放大](codex-screenshots/effects-thread-ring-bifrost-zoom.jpg) |
| 输入框光标 | ProseMirror 的原生光标设成 `caret-color: transparent`，在 Selection 的位置画一根 6px 的光标，长相和 VS Code 里 Woodfish 的光标一样（900% 高的渐变往上滑）。截图：[打字和粒子](codex-screenshots/effects-codex-composer-typing.jpg)、[按 Home 时的拖尾](codex-screenshots/effects-codex-caret-trail.jpg) |
| 流式回复 = AI 在打字 | 每 400ms 看一次“当前会话在运行、最后一条回复在最后一条用户消息之后”，找到就只对那条回复挂 MutationObserver，每帧最多算一次末尾位置（`Range.getClientRects`），发插入事件和来源为 ai 的光标事件；回复写完发 `streamEnd`。效果都不改回复的 DOM。截图：[吐字中的光标、拖尾、淡入和粒子](codex-screenshots/effects-codex-streaming.jpg) |
| 拖尾 | 鼠标拖尾和光标拖尾都照 Animations 画单色白带子（长度 12）。截图：[鼠标拖尾](codex-screenshots/effects-codex-mouse-trail.jpg)、[打字时的光标拖尾和粒子](codex-screenshots/effects-codex-typing-trail.jpg)（带子的头盖在光标上，停下后收拢、露出彩虹光标） |
| AI 换行 | 一开始光标拖尾在换行时往回扫过整行，一大块白色盖住新字；现在来源为 ai 时换行直接从下一行开头重开（你自己的光标仍照 Animations 原样扫） |
| 设置页 | 设置 → 外观里“Woodfish 外观”一节：15 套主题、按 `effect.json` 生成的效果开关和参数、背景图片、「刷新效果」「全部恢复默认」。改动先在页面上预览，300ms 后经 `__woodfishCodexSaveSettings` 交给监视进程写进 `params.json`，监视进程看到文件变化再重新注入（同一份数据，改文件和改页面互相可见）。截图：[外观页](codex-screenshots/effects-settings-page.jpg)、[参数展开](codex-screenshots/effects-settings-params.jpg) |
| 刷新 | 保存效果文件后约 250ms 重新注入（监视进程 `fs.watch` 效果文件夹）。「刷新效果」、Ctrl+Alt+R 走新的 binding `__woodfishCodexReload`，`woodfish reload` 写 `effects/.reload`；三者都让页面重启全部效果（包括失败过的）。页面上的效果报错经 `__woodfishCodexLog` 写进监视进程日志 |
| 性能 | 真实流式回复里 5 秒窗口：流式相关效果开着，帧间隔平均 4.72ms、p95 8.4ms、最长 20.9ms；关掉 4.68 / 8.4 / 16.7ms；两边都没有 long task |
| 让 Codex 改效果 | 在负责人的 Codex 里新开聊天说“Woodfish 打字时迸出来的粒子，帮我改成金色的，再稍微大一点。效果文件夹在 %APPDATA%\Woodfish\effects。”用时 2 分 18 秒：读 `AGENTS.md` → 读 `typing-particles` 的 README、`effect.json`、`effect.js` → 新建 `params.json`（`colors: single`、`color: #FFD700`、`size: 2.8`）→ 跑 `codex effects` 看状态、`reload` 刷新，没碰 `effect.js`。约 40 秒花在找 `woodfish` 命令（不在 PATH 里，最后用了 `%LOCALAPPDATA%\Woodfish\woodfish.js`），所以 `AGENTS.md` 补了这条路径。没试过不告诉它文件夹位置的说法。截图：[改完后打字](codex-screenshots/effects-ai-demo-gold-particles.jpg) |

截图要点：Codex 窗口被挡住时 Chromium 把它标成 `hidden`（效果也会暂停），`PrintWindow` 拿到的是很久以前的帧——这次第一张截图里还是旧的 #8 光环。先用 UI 自动化把窗口切到前台（窗口标题是 `ChatGPT`），或者直接用 CDP 的 `Page.captureScreenshot` 截页面内容（背景开着时没有透明区域，不会出现白底）。拖尾要在鼠标还在动时截，而且不要给 `clip` 设 `scale`：带缩放的截图会让页面按另一个倍率重画，效果画布被清空，截出来没有拖尾（粒子还在飞所以照样能截到）。CDP 发 Ctrl+, 打不开设置，要点头像菜单里的“设置”。

VS Code 一侧在 1.144 的测试版里实测：工作台的 CSP 带 `require-trusted-types-for 'script'`，但 `import()` 全局存储里的 `effects.mjs` 可以用；编辑器用 EditContext（`.native-edit-context`），没有 `input` 事件，所以靠 keydown 加光标元素 `top/left` 的变化合成插入事件。改 VS Code 设置后不用重新加载窗口，下一次打字粒子就换了颜色和数量。截图：[打字](codex-screenshots/effects-vscode-typing.jpg)、[热刷新后](codex-screenshots/effects-vscode-hot-reload.jpg)。

## 窗口背景（2026-11-13 实测）

| 项目 | 结论 |
| --- | --- |
| 图片怎么进页面 | CSP 是 `img-src 'self' app: blob: data: https:`，但 `connect-src` 没有 `data:`，所以页面不能 `fetch` data URL。做法：监视进程把图片 base64 交给页面，页面用 `atob` 解成 `Blob`、`URL.createObjectURL` 得到 `blob:` 地址写进 CSS 变量。注入脚本只带图片编号，改设置不会重传整张图；CDP overlay 产物不内嵌图片（约 190 KB），Codex++ 用户脚本内嵌《彩云》（约 500 KB） |
| binding 刷新后会丢 | `Runtime.addBinding` 注册的函数在 `location.reload()` 后**不在了**（设置用的 `__woodfishCodexSaveSettings` 也一样，之前没发现）。监视进程现在每次 `Page.loadEventFired` 都重新注册，页面端发请求前最多等 10 秒 binding 出现 |
| 哪些元素要清掉底色 | `main.bg-surface`、`[data-app-shell-main-surface]`、设置等页面的容器 `[data-codex-history-swipe-page] > .electron\:bg-surface`（Tailwind 变体类）。侧栏 `[data-sidebar-navigation-root]` 原本是 65% 表面色，改成 35% 毛玻璃 |
| 内容会滚到下面的地方 | 顶部渐隐 `[data-app-shell-main-content-top-fade] > [aria-hidden="true"]`、输入框后方底条 `[data-thread-scroll-footer] > .bg-surface.pointer-events-none` 和它上面的 `.from-surface` 渐隐。半透明底色会在底条右边缘留下一道接缝；改成背景层的副本（同一张图、同样的遮罩，`background-attachment: fixed` 对齐窗口），和底下逐像素一致、没有接缝，又能挡住滚过去的内容；渐隐用 `mask-image` 柔化 |
| 输入框 | Codex 自己有 `--composer-layout-surface-background` / `--composer-layout-surface-backdrop-filter` 两个变量（变体 `default` / `opaque`）。Woodfish 把两者清空，改画背景的模糊副本加 35% 主题色 |
| 拖入图片 | 只在设置 → 外观页打开时拦截（捕获阶段，且只拦图片文件），不影响平时把图片拖进输入框当附件 |
| 性能：不用实时 backdrop-filter | 第一版给侧栏、输入框和底条用 `backdrop-filter: blur(10px)`。滚动没有差别，但**流式输出时帧时间约翻倍**（4 秒一段交替测：开 10.9 / 11.5 / 20.6 ms，关 6.7 / 7.5 / 11.9 ms）：侧栏里运行中的指示条、输入框的光标动画、滚到输入框下面的新文字，每一帧都逼它重算。背景本身是静止的，所以改成**预先模糊的静态副本**：页面拿到图片后用 canvas 生成一张 640px 的模糊副本（`--woodfish-background-image-soft`），侧栏和输入框画副本加 35% 主题色和 10% 亮度层，全程没有 `backdrop-filter`。等待模型思考时（指示条和光标在动）开 / 关都是 4.2–4.5 ms，没有差别 |
| 性能：实测 | 32000px 的长会话，每帧滚 30px：前 12000px 背景开 7.5 / 8.5 ms、关 6.5 / 7.0 ms，p95 都是 16.7 ms。流式输出（3.5 秒一段交替）：开 8.4 / 7.3 / 9.5 ms，关 7.6 / 6.8 / 5.0 ms；把底条和输入框换成纯色不更快（8.5 / 9.8 / 12.6 ms），剩下的 1–4 ms 是“对话区透明、底下有图”本身的代价，都在 60 Hz 的帧预算内。显示器是高刷屏，帧间隔基准约 4 ms |

截图（窗口切到前台后用 `PrintWindow` 截取）：[深色，关闭背景](codex-screenshots/background-before-dark.jpg)、[深色，默认《彩云》](codex-screenshots/background-after-dark.jpg)、[浅色](codex-screenshots/background-after-light.jpg)、[设置页的背景区](codex-screenshots/background-panel.jpg)。和负责人 VS Code 的观感对比：VS Code 里是 shalldie.background 把图以 15% 盖在**整个界面上面**（深色用 `screen` 混合，文字也被染上一层）；这里图在**底下**，同样 15% 的浓度，文字和代码块不被覆盖，侧栏多了一层磨砂。

## 一直生效：自动恢复

`woodfish codex autostart on` 注册计划任务 `\Woodfish\Woodfish Codex`：当前用户登录时触发、`Interactive` + `Limited`（普通权限，管理员终端里注册也一样）、不限运行时长，动作是 `conhost.exe --headless node <runtimeDir>\woodfish.js codex daemon`（`--headless` 让控制台程序完全没有窗口；任务跑的是 CLI 的私有副本，移动或更新仓库不影响它）。

常驻进程每 2 秒用 `tasklist` 看一眼 Codex（不起 PowerShell），发现新的主进程时才查命令行：

- 带着活的调试端口：直接注入，等 Codex 关闭连接后继续巡视；`launch` 起的监视进程已在服务这个端口时不重复注入。
- 没有端口、且启动不到 90 秒（用户刚从开始菜单、任务栏或开机自启打开）：结束它并带随机端口重新启动。每个进程只处理一次。实测从点开 Codex 到效果出现约 30 秒（发现 ~10 秒 + 重启 ~15 秒 + 注入）。
- 没有端口、但已经运行一段时间：不打断，下次启动时生效。
- 商店更新换了安装目录：每次发现新进程都重新 `Get-AppxPackage`，自动跟上。

`autostart off` 停止常驻进程、删除任务和空的 `\Woodfish\` 文件夹；`uninstall` 也会做这一步。日志在 `%LOCALAPPDATA%\Woodfish\codex-daemon.log`（超过 1 MB 重新开始）。

## 安装形态

- 商店签名的 MSIX 包，family 为 `OpenAI.Codex_2p2nqsd0c76g0`，AppId 为 `App`。主程序是 `app\ChatGPT.exe`，安装在只读的 `C:\Program Files\WindowsApps\...`。
- 运行时是 OpenAI 的 owl（Chromium 155.0.8059.80），里面承载 Electron 42 打包的应用 `openai-codex-electron`。
- Electron fuse 中，asar 完整性校验和 OnlyLoadAppFromAsar 已开启，RunAsNode、NODE_OPTIONS、`--inspect` 已关闭。**Woodfish 从不修改应用文件。**
- 应用只允许单实例运行。正式版禁用 DevTools，主进程代码里也没有远程调试相关逻辑，但 Chromium 自身的 `--remote-debugging-port` 开关有效。

## 实测结论

| 项目 | 结论 |
| --- | --- |
| 关闭窗口 | `CloseMainWindow` 只会把窗口缩到托盘，全部进程继续运行。要重启只能结束进程树（`taskkill /T /F`），需先征得用户同意 |
| 后台任务 | `~/.codex/packages/app-server-daemon/.../codex.exe` 是独立进程，界面进程重启时它不受影响 |
| 带端口启动 | `Invoke-CommandInDesktopPackage -PackageFamilyName <family> -AppId App -Command cmd.exe -Args '/d /c "<wrapper.cmd>"' -PreventBreakaway` 可行，wrapper 内用 `start "" /b "<ChatGPT.exe>" --remote-debugging-port=P --remote-allow-origins=http://127.0.0.1:P`。**不需要开发者模式** |
| 端口绑定 | 只监听 `127.0.0.1:P`，属于主进程 |
| `DevToolsActivePort` | **Codex 不写这个文件**，包目录里那份是旧文件，不能用来判断端口。改为按主进程查监听端口，再用 `/json/version` 确认 |
| CDP 目标 | 主窗口为 `type=page`、`url=app://-/index.html`。另有 `?initialRoute=/avatar-overlay`、`detached-window.html`、webview（`chatgpt.com`、`codex-sandbox://...`）和 iframe，全部跳过 |
| Origin | Node 22 自带的 WebSocket 能在 `--remote-allow-origins` 限制下正常连接 |
| 注入脚本的生命周期 | `Page.addScriptToEvaluateOnNewDocument` **随注册它的 CDP 会话结束而失效**：会话还连着时刷新页面能看到标记，会话关闭后再刷新就没有了。所以需要常驻的监视进程 |
| 刷新页面 | `Page.reload` / `location.reload()` 安全，界面几秒内恢复 |
| `config.toml` 生效时机 | Codex 重启后 5 秒内生效，前提是同时写入 `accentSource = "custom"`（见下一节）。Codex 运行期间也会自行改写这个文件（如 `service_tier`、模型计数），所以只能按键修改 |
| CDP binding | `Runtime.addBinding` 注册的函数被页面调用时，即使没有 `Runtime.enable` 也会收到 `Runtime.bindingCalled`，监视进程因此不必接收页面的控制台输出 |

## 原生配色：设置来源

Codex 界面的外观设置确实保存在 Windows 的 `~/.codex/config.toml`，重启后生效（启动后 5 秒内）。之前改了不生效，是因为缺少 **`accentSource = "custom"`**：缺了这个键，Codex 会把强调色当作 ChatGPT 账号同步的颜色，用账号颜色替换掉。在 Codex 设置页里手动改一次强调色，它自己就会写入 `accent` 和 `accentSource = "custom"`。Woodfish 的原生配色因此总是同时写这两个键。

深色和浅色各有一张表（`appearanceDarkChromeTheme` / `appearanceLightChromeTheme`），互不影响；`desktop.appearanceTheme`（`system` / `light` / `dark`）决定当前使用哪一张。深色表同样需要 `accentSource = "custom"`：缺了它，实测深色主题会显示账号同步的颜色（本机是绿色 `#53b559`）。

截图验证深色效果时不要用 CDP 的 `Page.captureScreenshot`：Codex 的侧栏和窗口外框是半透明的，会透出 Windows 11 的 Mica 材质，CDP 截图会把这些透明区域画成白色。用 `PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT)` 截取窗口本身即可，结果与屏幕上合成后的像素一致，而且窗口被其他程序挡住时也能截。窗口最小化时要先不激活地还原（`ShowWindow(SW_SHOWNOACTIVATE)`），等两秒左右让 Chromium 重绘。

（排查过程中确认过：界面不读 WSL 里的 `~/.codex/config.toml`；`desktop.sansFontSize` 这个键名不对，所以那次对照实验没有参考价值。）

app-server 接口本身可用：守护进程监听 `~/.codex/app-server-control/app-server-control.sock`，协议是 Unix 套接字上的 WebSocket，每帧一条 JSON-RPC 消息（不带 `"jsonrpc"` 字段），先发 `initialize`（`clientInfo.name` 和 `version` 必填），再发 `initialized`。Windows 上 Node 不能直接连 AF_UNIX，需要通过 `codex stdio-to-uds <socket>` 中转。写入后不会通知其他客户端。

## 主题交换格式

外观设置页的“复制主题”按钮会通过 Codex 自己的进程间通信写入剪贴板（不经过 `navigator.clipboard`），内容是：

```text
codex-theme-v1:{"codeThemeId":"codex","theme":{"accent":"#53b559","accentSource":"chatgpt","contrast":60,"fonts":{"code":null,"ui":null},"ink":"#ffffff","opaqueWindows":false,"semanticColors":{"diffAdded":"#40c977","diffRemoved":"#fa423e","skill":"#ad7bf9"},"surface":"#181818"},"variant":"dark"}
```

`theme` 就是 `config.toml` 里的 chrome theme 表，“导入主题”接受同样的字符串。深色代码主题只有“ChatGPT”（id 为 `codex`）和“Codex 主题”两个可选，所以 Woodfish 的语法配色只能靠注入。

## 渲染端结构

- **主题变量**：全部定义在 `@layer theme` 中，包括应用根据设置在运行时生成的那个 `<style>`。由于不分层的样式优先于任何分层样式，Woodfish 注入一个**不带 layer 的 `<style>`** 就能覆盖它们，不需要 `!important`。
- **变量层级**：
  - `--app-color-*`：由设置生成，例如 `--app-color-text-accent`、`--app-color-background-surface`。
  - `--color-*`：语义变量，例如 `--color-text`、`--color-surface-elevated`。
  - `--color-token-*`：旧版变量。
  - `--color-codex-syntax-{keyword,string,comment,variable,name,literal,attribute,error}`：代码语法色。
- **根节点属性**：
  - `data-theme="light|dark"`（另有 `--theme-variant`）
  - `data-codex-os=win32`、`data-codex-window-type=electron`、`data-codex-window-chrome=application-menu`、`data-reduced-motion`
  - 字体变量写在 `<html>` / `<body>` 的内联 style 上（如 `--font-ui-family`、`--font-code-size`）
- **代码块**：`[data-code-block=true][data-markdown-copy=code-block]` → `[data-code-block-source=true]` → `code` → `span`。语法高亮使用 **highlight.js 类名**（`.hljs-keyword` 等），颜色来自 `--color-codex-syntax-*`。纯文本代码块只有一个不带类名的 `span`。
- **助手回复**：`[data-markdown-text-style=assistant-message]`（CSS module 类名 `_MarkdownRoot_*`）、`[data-local-conversation-final-assistant=true]`。Codex++ 文档里提到的 `data-message-author-role` 和 `data-testid="conversation-turn"` 在这个版本中**不存在**。
- **diff**：使用自定义元素 `<diffs-container>`，内容在**开放的 Shadow Root** 里：`pre[data-diff] > code[data-code] > div[data-content] > div[data-line]`，每个 token 是一个 `<span style="color:#…">`（Shiki 输出，颜色写在行内）。页面样式进不了 Shadow Root，CSS 变量可以：背景、增删色通过 `--diffs-*`、`--codex-diffs-*`、`--color-codex-diff-*` 变量跟随配色。Woodfish 在每个 Shadow Root 里放一份 token 样式，并把 Shadow Root 交给渐变引擎。查看器只在可见时渲染，窗口最小化时里面只有一个占位元素。
  - token 颜色来自 Codex 的“代码主题”设置，不是 `--color-codex-syntax-*`。实测深色默认主题（ChatGPT）：关键字 `#F67576`、类型与函数 `#B06DFF`、变量 `#FA994C`、常量与数字 `#6DCBF4`、字符串 `#85DF7B`、注释和标点 `#999999`、正文 `#FCFCFC`；浅色的 `vscode-plus` 就是 VS Code Light+ 的颜色。Woodfish 按这张表把颜色换成配色里对应的角色（`renderer/diffs.ts`），表里没有的颜色保持原色，只加渐变。
- **主强调色**：Codex 实际使用的主强调色是 `--app-color-accent-blue`（不论名字），配置里的 `accent` 会写到这里；`--app-color-icon-accent`、`--app-color-background-accent-*` 由它派生。发送按钮用 `--color-background-composer-primary`。
- **运行时主题**：Codex 按 chrome theme 在运行时生成一个内联 `<style>`（同样在 `@layer theme` 中），为 `[data-theme="dark"]` / `[data-theme="light"]` 各定义一百多个变量：表面阶梯（`elevated-*`、`control-opaque`、`panel`、`composer-action-bar`）、用户气泡（`--color-background-user-message`）、选区（`--color-background-text-selection`）、发送按钮、`--codex-base-*` 等。`accentSource = "chatgpt"` 时，深色的用户气泡和选区会用账号强调色（本机是绿色 `#2c6732`）。Woodfish 注入的配色按深浅模式覆盖这整套变量，并把终端的 `--color-codex-terminal-ansi-*` 换成配色自带的 16 色。
- **灰阶**：少数控件仍使用 Codex 由 chrome theme 生成的 `--gray-*` 灰阶，只有原生配色（`config.toml`）会让 Codex 重新生成它。
- **窗口外框**：标题栏和左侧导航栏完全透明，直接露出 Mica；侧栏是 65% 的表面色叠在 Mica 上（`color-mix(var(--color-surface) 65%, transparent)`）。使用 Woodfish 配色时，`body` 叠一层 78% 的 `bgDeep`，让外框和页面同色，同时保留一点 Mica 的质感。
- **设置页**：外观页的模式单选框是 `input[type=radio][name="appearance-theme"]`，`name` 不随语言变化，Woodfish 用它识别外观页，并把自己的设置区插在“视觉风格”一节之后。设置页的节、卡片、行都由 Tailwind 工具类组成，没有稳定的 `data-*`，所以设置区在挂载时复制现有元素的类名。原生开关开启时是 `bg-chart-blue`，关闭时是 `bg-text/10`。
- **其他**：
  - 输入框：`[data-codex-composer-root]`，内部是 ProseMirror（`[contenteditable=true]`）。带圆角和背景的输入框本体是 `[data-composer-body]`（圆角 22px），外层根节点是直角
  - 纯文本代码块按行拆成多个不带类名的 `span`
  - 侧栏：`[data-app-action-sidebar-thread-row]`，当前会话带 `[data-app-action-sidebar-thread-active="true"]`
  - 整体框架：`nav[data-app-navigation-rail]`、`[data-app-shell-main-surface]`、`[data-app-shell-titlebar="true"]`、`[data-app-action-timeline-scroll]`
- **CSP**：`style-src 'self' 'unsafe-inline'`，允许注入 `<style>`。`script-src` 只允许 `'self'` 和一个哈希，但通过 CDP 执行脚本不受影响。`font-src 'self' data:` 意味着不能加载远程字体。

## 官方主题设置

`~/.codex/config.toml` 中的 `[desktop.appearanceLightChromeTheme]` / `[desktop.appearanceDarkChromeTheme]`，校验规则来自应用代码：

```text
accent, ink, surface             必须是 #rrggbb
accentSource                     可选，"chatgpt" 或 "custom"
contrast                         0–100 的整数
opaqueWindows                    布尔值；false 时 Windows 11 使用 Mica
fonts.{ui,code}                  字符串或 null；content/uiFace/codeFace/contentFace 可选
semanticColors.{diffAdded,diffRemoved,skill}   必须是 #rrggbb，三项都必需
```

这个文件同时保存用户的其他 Codex 设置，两个主题表也不相邻（本机分别在第 299 行和第 400 行，子表分散）。因此 Woodfish 只按键修改、先备份，并且能按原字节还原。

## 安全说明

调试端口开启期间，本机任何进程都能通过它在 Codex 中执行代码，包括访问已登录的会话。Woodfish 的做法：
- 每次使用随机端口，只绑定本机，并用 `--remote-allow-origins` 限制来源；
- 首次注入前说明风险，并记录用户同意；
- 原生配色模式从不开端口；
- `stop-inject` 之后提示用户重启 Codex 来关闭端口。

## 与 Codex++ 共存

- Codex++（AGPL-3.0）默认使用固定端口 9229，并通过 `Runtime.evaluate` 加载 `%APPDATA%\Codex++\user_scripts\*.js`。
- Woodfish 不使用它的任何代码。
- 两者同时启用时，用户脚本优先，CDP 注入会主动退让。
