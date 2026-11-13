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
- 侧栏行：高 30px、宽约 212px、圆角 12.5px，文字距行左缘 8px，行左边到滚动容器左缘有 8px 空隙。选中效果由负责人在 `docs/playground/tab-indicator.html` 里从 16 个方案中挑定：#8 旋转流光边框（4px、圆角 8.5px、无外发光；悬停 25% 静止，选中 16 秒一圈，运行中 8 秒一圈）。以后其他效果也用同样的 playground 让负责人挑。
- 右侧面板的标签页：`[data-app-shell-tab-controller] [role="tab"][aria-selected="true"]`（`role=tablist` 本身是 `sr-only` 的辅助节点）。
- “思考中”的扫光是 CSS module 类（`_cadencedShimmer*`），按规则不碰；运行状态由侧栏流光边框转得更快来表达。
- 菜单（Radix）没有入场动画，`data-state="open"` 可用来做淡入。

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
