# Woodfish 桌面工具（Codex 桌面端）

`woodfish` 命令行工具负责把 Woodfish 的配色和效果带到 OpenAI Codex 桌面端。目前支持 Windows 上的 Microsoft Store 版 Codex，macOS 还没有支持。

Woodfish 不修改 Codex 的安装文件。商店版的安装目录是只读的，而且有签名和完整性校验，改动会导致 Codex 无法启动。

## 三种用法

| 方式 | 能做什么 | 是否开调试端口 | 何时生效 |
| --- | --- | --- | --- |
| **原生配色** `theme apply` | 把 Woodfish 配色写进 Codex 官方的主题设置（强调色、文字、背景、对比度、diff 颜色），Codex 会据此重新生成整套界面色阶。深色（Dark / Dracula / Black / Neon）和浅色（Light）可以同时设置，也能切换 Codex 的外观模式 | 否 | 重启 Codex 后几秒内 |
| **注入效果** `launch` | 代码块 OKLCH 渐变与发光、菜单与浮层毛玻璃、强调色光晕、彩色光标，可选正文渐变，也能临时覆盖配色 | 是，仅本机 | 立即生效，设置改动约 1 秒内同步 |
| **Codex++ 用户脚本** `install-userscript` | 与注入效果相同，由 Codex++ 加载 | 由 Codex++ 决定 | 在 Codex++ 中重新加载脚本后 |

原生配色和注入效果可以同时使用。

## 主题

VS Code 扩展里的 5 套主题都能用在 Codex 上：

| 主题 | 外观 | 来源 |
| --- | --- | --- |
| Woodfish Dark | 深色 | Bearded Theme Arc（GPL-3.0） |
| Woodfish Dracula | 深色 | Dracula 官方主题（MIT） |
| Woodfish Black | 深色 | Woodfish 原创 |
| Woodfish Neon | 深色 | Woodfish 原创 |
| Woodfish Light | 浅色 | Woodfish 原创 |

Dark 和 Dracula 的配色由 `apps/vscode-extension/scripts/port-palettes.js` 直接从扩展附带的主题文件读出，和 VS Code 里看到的一致。

## 在 Codex 里设置

注入效果开启后，打开 Codex 的 **设置 → 外观**，“视觉风格”下面会多出 **Woodfish** 一节：

- **深色主题 / 浅色主题**：点预览卡切换，“Codex 默认”表示保留 Codex 自己的配色。整个界面立刻换色，所有 Codex 窗口同步。
- **效果开关**：代码渐变、代码发光、毛玻璃浮层、强调色点缀、彩色光标、回复正文渐变。

改动由后台监视进程保存到 Woodfish 的设置文件，和 `woodfish codex settings` 改的是同一份。页面只能改主题和开关，模糊半径、渐变参数、自定义 CSS 等仍只能通过命令行修改。使用 Codex++ 用户脚本时，改动保存在 Codex 本机的 localStorage 中。

## 构建与运行

需要 Node.js 22 或更高版本。在仓库根目录运行：

```bash
npm install
npm run compile                 # 生成 apps/desktop-cli/out/woodfish.js
npm run woodfish -- codex status
```

也可以直接运行 `node apps/desktop-cli/out/woodfish.js codex <命令>`。

## 常用命令

```bash
# 原生配色（不开端口）
woodfish codex theme apply --dark neon --light light --restart     # 深色、浅色各一套
woodfish codex theme apply --dark black --appearance dark --restart  # 并把 Codex 固定为深色
woodfish codex theme restore                                         # 撤销全部（也可 --mode dark）

# 注入效果
woodfish codex launch                      # 首次运行会说明风险并请你确认
woodfish codex settings --set palette.dark=neon --set palette.light=light
woodfish codex settings --set bodyText.enabled=true --set glass.blur=24
woodfish codex stop-inject                 # 立即撤下效果
woodfish codex relaunch --normal           # 不带端口重启，关闭调试端口

# 诊断与清理
woodfish codex status
woodfish codex doctor                      # 检查效果是否生效、界面元素是否还能找到
woodfish codex shortcut                    # 开始菜单快捷方式“Woodfish Codex”
woodfish codex uninstall                   # 撤销 Woodfish 对 Codex 的全部修改
```

可调设置：

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| `palette.dark` | `null` | `dark`、`dracula`、`black`、`neon`；`null` 表示保留 Codex 自己的颜色 |
| `palette.light` | `null` | `light`；`null` 表示保留 Codex 自己的颜色 |
| `codeGradient.*` | 开 | `hueShift`、`lightnessDelta`、`neutralChroma`、`angle`，与 VS Code 扩展的参数一致 |
| `codeGlow.*` | 开 | `intensity` |
| `glass.*` | 开 | `blur`、`saturate`、`opacity`、`noise`、`borderRadius` |
| `accent.enabled` | 开 | 输入框聚焦光晕、当前会话行高亮 |
| `caret.*` | 开 | `animationDuration`、`gradientStops` |
| `bodyText.enabled` | 关 | 助手回复正文渐变 |
| `customCss` | `[]` | 追加的 CSS，会经过安全过滤 |

## 深色模式

- 深色配色有 Dark（Bearded Arc 蓝灰）、Dracula、Black（纯黑）和 Neon（赛博朋克），浅色是 Light。`--palette` 会按配色自动选择模式；`--dark` / `--light` 则显式指定，并检查配色和模式是否匹配。
- Codex 设成“跟随系统”时，深色配色只在系统切到深色后出现。`theme apply` 会在配色暂时看不到时提示；`--appearance dark` 可以直接把 Codex 固定为深色，并且能随 `theme restore` 一起撤销。
- 文件改动（diff）视图同样有渐变和发光，并换成所选主题的语法色。Codex 给 diff 用的是它自己的“代码主题”，Woodfish 认得默认的深色主题、VS Code Light+ 和 Dark+，其他代码主题保留原色，只加渐变。
- 注入的配色按 `[data-theme="dark"]` / `[data-theme="light"]` 分别生效，所以 `palette.dark` 和 `palette.light` 可以同时设置，Codex 切换外观时实时跟随。深色下代码发光保持完整强度，浅色下会自动减弱，避免发虚。
- Codex 原本只给代码高亮 8 个颜色槽位，注入时会按 highlight.js 的细分类名补齐函数、类型、参数、属性等颜色，让深色配色的完整色板都能显示。

## 注入是怎么做的

1. 商店版 Codex 只能在它的包环境里启动。Woodfish 通过 `Invoke-CommandInDesktopPackage` 运行一个临时启动脚本，以 `--remote-debugging-port=<随机端口> --remote-allow-origins=http://127.0.0.1:<端口>` 启动 Codex。这一步不需要开发者模式。
2. 后台监视进程（`woodfish codex watch`）连接调试端口，把样式注入主窗口，并在页面刷新、新开窗口、设置变化时重新注入。这类注入只在调试连接保持期间有效，所以监视进程必须一直运行。
3. Codex 的主题变量都定义在 CSS 的 `@layer theme` 中。Woodfish 注入的样式不带 layer，优先级天然更高，不需要 `!important`。

`theme apply --restart` 和 `theme restore --restart` 重启 Codex 时，如果注入效果正开着，Codex 会带着效果重新启动。

已知限制：关闭 Codex 窗口只会把它缩到托盘，所以重启 Codex 时需要结束它的全部进程。Woodfish 会先征求你的同意；正在运行的任务可能因此中断。

## 安全

- 每次启动都使用随机端口，只监听 127.0.0.1，并限制连接来源；连接前会校验调试地址确实是本机。
- 端口开启期间，本机任何程序都能通过它控制 Codex。首次使用前 Woodfish 会说明这一点，并记录你的同意；风险说明的文字变了，会重新询问。
- 注入内容只由经过规范化的设置生成，Woodfish 从不执行页面传回的数据，日志里也不记录页面内容。
- `config.toml` 只按键修改，改前先备份，改后重新解析校验。还原时，如果文件之后没被改过就逐字节写回；如果 Codex 改过，就只还原 Woodfish 动过的键。

实测细节见 [docs/hosts/codex.md](../../docs/hosts/codex.md)。
