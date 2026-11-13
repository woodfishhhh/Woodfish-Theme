# Woodfish 桌面工具（Codex 桌面端、dsh Web 版）

`woodfish` 命令行工具负责把 Woodfish 的配色和效果带到 OpenAI Codex 桌面端，并为 DeepSeek Harness（dsh）的 Web 版生成油猴脚本（见文末）。Codex 目前支持 Windows 上的 Microsoft Store 版，macOS 还没有支持。

Woodfish 不修改 Codex 的安装文件。商店版的安装目录是只读的，而且有签名和完整性校验，改动会导致 Codex 无法启动。

## 三种用法

| 方式 | 能做什么 | 是否开调试端口 | 何时生效 |
| --- | --- | --- | --- |
| **原生配色** `theme apply` | 把 Woodfish 配色写进 Codex 官方的主题设置（强调色、文字、背景、对比度、diff 颜色），Codex 会据此重新生成整套界面色阶。深色（Dark / Dracula / Black / Neon）和浅色（Light）可以同时设置，也能切换 Codex 的外观模式 | 否 | 重启 Codex 后几秒内 |
| **注入效果** `launch` | 代码块 OKLCH 渐变与发光、菜单与浮层毛玻璃、强调色光晕、彩色光标，可选正文渐变，也能临时覆盖配色 | 是，仅本机 | 立即生效，设置改动约 1 秒内同步 |
| **Codex++ 用户脚本** `install-userscript` | 与注入效果相同，由 Codex++ 加载 | 由 Codex++ 决定 | 在 Codex++ 中重新加载脚本后 |

原生配色和注入效果可以同时使用。

## 主题

VS Code 扩展里的 15 套主题都能用在 Codex 上（命令行里用括号中的名字）：

| 主题 | 外观 | 来源 |
| --- | --- | --- |
| Woodfish Dark（`dark`） | 深色 | Bearded Theme Arc（GPL-3.0） |
| Woodfish Dracula（`dracula`） | 深色 | Dracula 官方主题（MIT） |
| Woodfish Black（`black`）、Neon（`neon`） | 深色 | Woodfish 原创 |
| Woodfish Light（`light`） | 浅色 | Woodfish 原创 |
| One Dark Pro（`onedark`）、Tokyo Night（`tokyonight`）、Catppuccin Mocha（`catppuccin-mocha`）、Nord（`nord`）、GitHub Dark（`github-dark`）、Night Owl（`nightowl`）、Ayu Mirage（`ayu-mirage`）、Gruvbox Dark（`gruvbox-dark`） | 深色 | 各自的官方主题（MIT） |
| Catppuccin Latte（`catppuccin-latte`）、GitHub Light（`github-light`） | 浅色 | 各自的官方主题（MIT） |

除原创的三套外，配色都由 `apps/vscode-extension/scripts/port-palettes.js` 直接从扩展附带的主题文件读出，和 VS Code 里看到的一致。Woodfish 自己的 5 套用特调渐变，其余按同样的规律从各自配色推导；回复正文的彩虹、侧栏会话的流光边框、标签页下划线和光标颜色也都取自当前主题。

## 在 Codex 里设置

注入效果开启后，打开 Codex 的 **设置 → 外观**，“视觉风格”下面会多出 **Woodfish** 一节：

- **深色主题 / 浅色主题**：点预览卡切换，“Codex 默认”表示保留 Codex 自己的配色。整个界面立刻换色，所有 Codex 窗口同步。
- **效果开关**：代码渐变、代码发光、毛玻璃浮层、强调色点缀、彩色光标、回复正文渐变。

- **窗口背景**：一张图片铺在窗口底下，对话区直接透出，侧栏和输入框是毛玻璃。默认开启，用的是作者 woodfish 制作的《彩云》。点“上传图片…”选文件，或者把图片直接拖进 Codex 窗口（设置页打开时），窗口立刻预览；拖动透明度、模糊、遮罩三个滑块也是实时预览，满意再点“保存”，“取消”回到原样，“恢复默认”回到《彩云》和默认数值。保存过的图片都留在图库里，点一下切换，悬停后点 × 删除。

改动由后台监视进程保存到 Woodfish 的设置文件，和 `woodfish codex settings` 改的是同一份。页面只能改主题、开关和背景的图片与三个滑块，模糊半径、渐变参数、自定义 CSS 等仍只能通过命令行修改。使用 Codex++ 用户脚本时，改动保存在 Codex 本机的 localStorage 中。

### 窗口背景是怎么存的

- 上传的图片先在 Codex 页面里用 canvas 缩到长边 2560 像素以内并转成 WebP，再通过一个**单独的** CDP binding（`__woodfishCodexBackground`）交给监视进程；设置用的 binding 仍然只收 4 KB 以内的改动。
- 监视进程按文件内容校验（只认 JPG、PNG、WebP 的文件头，6 MB 以内，长边不超过 2560），按内容哈希命名后存进 `%APPDATA%\Woodfish\backgrounds\`，最多保存 30 张。不上传任何服务器；原图删了也不影响。
- 设置里只记图片编号。页面需要哪张图时向监视进程要一次，转成 `blob:` 地址当作背景（Codex 的 CSP 允许 `img-src blob:`），不会每次改设置都把整张图塞进注入脚本。
- **Codex++ 用户脚本模式**没有监视进程：脚本里自带《彩云》，可以切换《彩云》和彩云渐变、调三个滑块（存在 localStorage），不能上传自己的图片。

## 构建与运行

需要 Node.js 22 或更高版本。在仓库根目录运行：

```bash
pnpm install
pnpm compile                 # 生成 apps/desktop-cli/out/woodfish.js
pnpm woodfish codex status
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

# 窗口背景
woodfish codex background set D:\图片\海边.jpg   # 保存一张图片并使用（超大图片借助正在运行的 Codex 页面缩小）
woodfish codex background list                  # 当前背景和保存的图片（* 是正在用的）
woodfish codex background use caiyun            # 切换：caiyun 是《彩云》，gradient 是彩云渐变，其他是图片编号
woodfish codex background reset                 # 恢复《彩云》和默认数值
woodfish codex background clear                 # 关闭窗口背景
woodfish codex background remove <编号>          # 删除保存的图片
woodfish codex stop-inject                 # 立即撤下效果
woodfish codex relaunch --normal           # 不带端口重启，关闭调试端口

# 一直生效（Codex 重启、商店更新后自动恢复）
woodfish codex autostart on                # 登录时启动的后台任务，无窗口、普通权限
woodfish codex autostart                   # 查看状态
woodfish codex autostart off               # 删除任务并停止后台进程

# 诊断与清理
woodfish codex status
woodfish codex doctor                      # 检查效果是否生效、界面元素是否还能找到
woodfish codex shortcut                    # 开始菜单快捷方式“Woodfish Codex”
woodfish codex uninstall                   # 撤销 Woodfish 对 Codex 的全部修改
```

可调设置：

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| `palette.dark` | `null` | 任一深色主题（见上表）；`null` 表示保留 Codex 自己的颜色 |
| `palette.light` | `null` | `light`、`catppuccin-latte`、`github-light`；`null` 表示保留 Codex 自己的颜色 |
| `codeGradient.*` | 开 | `hueShift`、`lightnessDelta`、`neutralChroma`、`angle`，与 VS Code 扩展的参数一致 |
| `codeGlow.*` | 开 | `intensity` |
| `glass.*` | 开 | `mode`（`blur` / `acrylic`）、`blur`、`saturate`、`opacity`、`noise`、`borderRadius`、`animations`（菜单与弹窗淡入）、`reveal`（列表项跟随指针的柔光） |
| `accent.enabled` | 开 | 输入框聚焦光晕、发送按钮渐变、侧栏会话的旋转流光边框、当前标签页下划线 |
| `caret.*` | 开 | `animationDuration`、`gradientStops`；不改时使用当前主题的光标配色 |
| `bodyText.enabled` | 开 | 助手回复的段落、标题、列表和表格用当前主题的彩虹渐变（纯 CSS，流式输出时同样生效） |
| `background.*` | 开 | `image`（`caiyun` / `gradient` / 图片编号）、`opacity` 0.15（背景图透出程度）、`blur` 10（侧栏和输入框毛玻璃的模糊）、`mask` 0.35（遮罩：面板盖在背景上的主题色浓度）、`saturate` 150、`luminosity` 0.1（亮度层）、`secondaryBlur` 10（输入框后方底条的模糊）、`size`（`cover` / `contain`）、`position`、`transition` 30（毫秒）、`fill`（没有图片时的渐变色，两个相同颜色即纯色） |
| `customCss` | `[]` | 追加的 CSS，会经过安全过滤 |

## 和 VS Code 版的对照

| VS Code 扩展 | Codex 桌面端 |
| --- | --- |
| 代码文字渐变、发光（特调表 + 自动推导） | 代码块、diff 视图（Shadow DOM 内）同样的渐变与发光；diff 的 token 颜色换成主题的语法色 |
| 15 套主题的界面配色 | 覆盖 Codex 的整套主题变量（表面阶梯、强调色、选区、气泡、终端 16 色、语法 8 槽 + highlight.js 细分类名） |
| 彩色光标（循环变色、圆角、光晕） | 输入框光标循环变色，颜色跟随主题；Codex 用的是原生文本光标，没有圆角和光晕可改 |
| 毛玻璃浮层（blur / acrylic、淡入动画、跟随指针的柔光） | 菜单、弹出框、对话框同样三项都有 |
| 活动栏徽章渐变 | Codex 没有计数徽章；未读圆点自动用主题强调色 |
| 当前标签页顶部渐变边框 | 右侧面板（变更、文件）当前标签页的渐变下划线 |
| — | Codex 独有：助手回复彩虹渐变字、侧栏会话旋转流光边框（悬停淡现、选中 8 秒一圈、运行中 4 秒一圈）、发光光标、输入框聚焦光晕、发送按钮渐变 |
| 系统窗口透明（亚克力 / 云母） | Codex 自带 Mica，Woodfish 只给外框叠一层主题底色 |
| 小地图、行号、括号配对等编辑器区域 | Codex 没有这些区域 |

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

## DeepSeek Harness（dsh）Web 版

dsh 的 Web 版（`dsh web`）是本机服务打开的网页，Woodfish 以油猴用户脚本的形式提供：Woodfish 配色（深色、浅色各选一套）、OKLCH 代码渐变与发光、毛玻璃浮层、强调色点缀、彩色光标，可选回复正文渐变。不修改 dsh 的任何文件和配置。

```bash
woodfish dsh userscript                                  # 生成 %APPDATA%\Woodfish\woodfish-dsh.user.js
woodfish dsh userscript --set palette.dark=neon --set glass.blur=24
woodfish dsh userscript --set palette.light=null         # 浅色保留 dsh 自带配色
woodfish dsh userscript --out D:\woodfish-dsh.user.js    # 写到别处（文件名需以 .user.js 结尾）
woodfish dsh userscript --reset                          # 恢复默认设置
woodfish dsh uninstall                                   # 删除生成的脚本和设置
```

安装：在浏览器里装好 Tampermonkey 或 Violentmonkey，在它的管理面板中导入生成的文件，然后刷新 dsh 页面。脚本匹配本机任意端口，但只在 dsh 页面里启动；dsh 放在反向代理后面时，需要在油猴里给脚本加上对应网址。

- **切换**：油猴扩展菜单里有“深色主题 / 浅色主题”（点一下换下一套，最后一项是 dsh 自带配色）和各效果开关，立即生效，改动由油猴保存。模糊半径、渐变参数、自定义 CSS 只能通过 `--set` 修改，改完重新导入。
- **主题**：默认深色用 Woodfish Dark、浅色用 Woodfish Light。所有 Woodfish 主题都能选，theme-core 新增的主题重新构建后自动出现。设置项与 Codex 相同（`codeGradient.*`、`codeGlow.*`、`glass.*`、`accent.enabled`、`caret.*`、`bodyText.enabled`、`customCss`），区别是 `palette.dark` / `palette.light` 默认就是 Woodfish 主题，设为 `null` 才保留 dsh 自带的颜色。
- **卸载**：在油猴管理面板删除“Woodfish for DeepSeek Harness”并刷新页面，效果全部撤下；`woodfish dsh uninstall` 再删掉本机生成的文件。
- 仓库里提交了一份默认设置的脚本 `apps/desktop-cli/assets/woodfish-dsh.user.js`，也可以直接导入。

实测细节与限制见 [docs/hosts/dsh.md](../../docs/hosts/dsh.md)。
