# Woodfish 桌面工具（Codex 桌面端、dsh Web 版）

`woodfish` 命令行工具负责把 Woodfish 的配色和效果带到 OpenAI Codex 桌面端，并为 DeepSeek Harness（dsh）的 Web 版生成油猴脚本（见文末）。Codex 目前支持 Windows 上的 Microsoft Store 版，macOS 还没有支持。

Woodfish 不修改 Codex 的安装文件。商店版的安装目录是只读的，而且有签名和完整性校验，改动会导致 Codex 无法启动。

## 安装：三种方式，效果相同

三种方式运行的是同一个 `woodfish.js`，版本号和 VS Code 扩展一致（8.0.0 起），功能、效果、设置文件完全一样，选一种即可。都需要 Windows 上的 Microsoft Store 版 Codex。

| 方式 | 怎么用 | 需要 |
| --- | --- | --- |
| **VS Code 扩展** | 装好 Woodfish Theme 扩展（8.0.0 起），命令面板运行 **Woodfish Theme: 为 Codex 启用 Woodfish**；撤下用 **为 Codex 停用 Woodfish**，全部撤销用 **从 Codex 卸载 Woodfish** | 不用另装 Node.js，借编辑器自带的运行时 |
| **单文件 exe** | 从 [GitHub Release](https://github.com/woodfishhhh/Woodfish-Theme/releases/latest) 下载 `woodfish.exe` 双击；或 `curl.exe -L -o woodfish.exe https://github.com/woodfishhhh/Woodfish-Theme/releases/latest/download/woodfish.exe` 后运行 `.\woodfish.exe codex launch` | 什么都不用装 |
| **woodfish.js** | 同一个 Release 里的 `woodfish.js`，`node woodfish.js codex launch`（npm 包 `woodfish` 即将上线） | Node.js 22 或更高 |

- **VS Code 扩展**：第一次启用会在对话框里说明调试端口的风险，同意后以带效果的方式重启 Codex，并开启“登录后自动恢复”（相当于 `launch` 加 `autostart on`）。启用成功的提示里可以顺手在开始菜单加一个“Woodfish Codex”。后台进程跑在编辑器自带的运行时上，VS Code 更新时会被结束，重新打开 VS Code 后扩展会把它拉起来。Cursor、Windsurf 等自带的 Node.js 低于 22 时，请改用 exe 或 npm。
- **单文件 exe**：是 Node.js 单文件程序（约 85 MB，内含 Node.js 22）。没有代码签名，第一次运行 Windows 可能提示“Windows 已保护你的电脑”，点“更多信息 → 仍要运行”。双击后说明风险、确认、以带效果的方式启动 Codex，再问是否登录后自动恢复；`woodfish.exe help` 列出全部命令，用法和下面的 `woodfish` 完全相同。第三方许可见 Release 里的 `THIRD_PARTY_NOTICES-woodfish.md`。
- **woodfish.js / npm**：`woodfish.js` 是单文件、没有依赖，有 Node.js 22+ 就能直接运行。npm 包 `woodfish`（同一个文件）即将上线，上线后 `npx woodfish codex launch` 即可。
- 开启自动恢复或创建开始菜单入口时，Woodfish 把自己复制一份到 `%LOCALAPPDATA%\Woodfish`（exe 复制 exe，`woodfish.js` 和扩展复制 `woodfish.js`）。所以删掉下载的 exe、清掉 npx 缓存、更新扩展都不影响它们；换了新版本后再运行一次 `woodfish codex autostart on`（或 VS Code 里再启用一次）就会换成新副本。

### 会不会“抢走”Codex 原来的快捷方式？

不会。Woodfish 从不修改、替换或删除你开始菜单、桌面、任务栏上的 Codex 快捷方式。

- **只用了 `launch`、没开自动恢复**：用原来的快捷方式打开的就是原版 Codex，没有效果；想要效果就再运行一次 `woodfish codex launch`（或 VS Code 里的启用命令）。
- **开了自动恢复**：用原来的快捷方式打开 Codex 时，后台进程在 Codex 启动后 1～2 秒内发现它没带调试端口，就结束它、带端口重新启动。Codex 自己要 7 秒左右才出窗口，所以切换在窗口出现之前就完成了：看不到“闪一下”，只是窗口比平时晚 2～4 秒出来（实测原版 7.4～8.6 秒，经过这次重启 10.7～11.5 秒）。已经运行超过 90 秒的 Codex 不会被打断。
- **连这几秒也想省**：`woodfish codex shortcut`（VS Code 里是启用成功提示上的按钮）在开始菜单另加一个“Woodfish Codex”，直接带效果启动（实测约 9.5 秒出窗口）。原来的“Codex”照旧在，两个并存；`woodfish codex uninstall` 会删掉 Woodfish 加的这一项。

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

## 效果插件

Codex 里 Woodfish 画的每个效果都是一个**插件文件夹**，放在 `%APPDATA%\Woodfish\effects\<名字>\`（VS Code 扩展共用同一个文件夹）：

| 文件 | 内容 |
| --- | --- |
| `effect.json` | 名字、说明、参数定义（默认值、范围），设置页按它自动生成开关和滑块 |
| `params.json` | 现在用的值。设置页、AI、`woodfish codex settings --set` 改的都是它 |
| `effect.js` | 实现：`module.exports = function (ctx) { … }`，只通过 `ctx` 拿事件、画布和样式 |
| `README.md` | 这个效果是什么、参数各管什么、改哪里会怎样 |

自带 12 个：输入框光标 `caret`、鼠标拖尾 `mouse-trail`（Codex 里默认关闭）、光标拖尾 `caret-trail`、打字粒子 `typing-particles`、吐字光标 `stream-cursor`、新字淡入 `text-reveal`、流光边框 `thread-ring`（Bifrost「创建 Key」按钮）、回复正文彩虹 `rainbow-text`、强调色点缀 `accent`、浮层毛玻璃 `glass`、窗口背景 `background`、代码渐变 `code-gradient`（后两个是核心效果：引擎在 Woodfish 里，文件夹管开关和参数）。

- **一行 CSS 就能改样子**：效果文件夹里的 `user.css` 最后加载、优先级最高。每个参数都是 CSS 变量 `--woodfish-<效果名>-<参数名>`，例如 `:root { --woodfish-caret-trail-color: #ff4d4f; }` 把光标拖尾换成红色；画布上的拖尾、粒子和窗口背景也读这些变量。光环、光标、回复正文的渐变色另有变量。全部变量（作用、默认值、例子）在效果文件夹的 `README.md`。保存一两秒后生效，升级不覆盖；设置页「Woodfish 外观」里有「打开 user.css」「恢复默认」，命令行 `woodfish codex effects restore user.css`（原内容留 `user.css.bak`）。
- **对 AI 说一句就能改**：文件夹根目录有 `AGENTS.md`（和指向它的 `CLAUDE.md`），写清楚找哪个文件夹、`ctx` 有什么、怎么验证。对 Codex 或 Claude 说“把打字粒子改成金色，效果文件夹在 %APPDATA%\Woodfish\effects”，它读完就知道改 `typing-particles` 的 `params.json`（实测 Codex 两分钟左右改完并刷新）。
- **打字和吐字是同一个事件**：效果订阅 `ctx.onInsert`（某处插入了文字）和 `ctx.onCaret`（光标在这里）。VS Code 里由你打字触发，Codex 里由你在输入框打字或 AI 流式吐字触发，所以同一个粒子、拖尾两边都能用。
- **刷新**：保存效果文件后一秒内自动重新加载；手动刷新用 `woodfish reload`（Codex 和 VS Code 一起，并打印每个效果的状态）、Codex 里按 **Ctrl+Alt+R**，或设置页的「刷新效果」。`woodfish codex reload --hard` 连窗口一起重新加载。
- **出错不影响别的**：语法错误（带行号）、`effect.json` 写坏、运行时连续报错的效果会被跳过并标出原因，其他效果和 Codex 照常。`woodfish codex effects` 列出状态，`effects restore <名字>` 恢复出厂文件（改过的留 `.bak`），`effects reset <名字>` 参数恢复默认。
- **升级不覆盖改动**：Woodfish 记下自己放进去的每个文件（`.woodfish-shipped.json`），只升级你没改过的文件；`params.json` 从不覆盖；删掉的效果也不会被放回来。
- **新增效果**：新建一个文件夹（小写字母、数字、横线），放 `effect.json` 和 `effect.js`，保存后自动加载，设置页自动出现它的开关和参数。

## 在 Codex 里设置

注入效果开启后，打开 Codex 的 **设置 → 外观**，“视觉风格”下面会多出 **Woodfish 外观** 一节：

- **深色主题 / 浅色主题**：点预览卡切换（15 套），“Codex 默认”表示保留 Codex 自己的配色。整个界面立刻换色，所有 Codex 窗口同步。
- **效果插件**：每个效果一行开关，点「参数」展开它的全部参数（滑块、选项、取色），改动立刻生效并写回该效果的 `params.json`；每个效果可单独「恢复默认」，顶部有「刷新效果」和「全部恢复默认」。加载失败的效果标红并写出原因。
- **背景图片**：《彩云》、彩云渐变和保存过的图片，点一下就换上；点“上传图片…”或把图片拖进 Codex 窗口（设置页打开时）。开关、透明度、模糊、遮罩在上面「窗口背景」效果的参数里。

主题和背景图片存在 `%APPDATA%\Woodfish\codex.json`，效果参数存在各效果文件夹的 `params.json`，和 `woodfish codex settings`、AI 改文件是同一份数据。使用 Codex++ 用户脚本时，改动保存在 Codex 本机的 localStorage 中。

### 窗口背景是怎么存的

- 上传的图片先在 Codex 页面里用 canvas 缩到长边 2560 像素以内并转成 WebP，再通过一个**单独的** CDP binding（`__woodfishCodexBackground`）交给监视进程；设置用的 binding 仍然只收 4 KB 以内的改动。
- 监视进程按文件内容校验（只认 JPG、PNG、WebP 的文件头，6 MB 以内，长边不超过 2560），按内容哈希命名后存进 `%APPDATA%\Woodfish\backgrounds\`，最多保存 30 张。不上传任何服务器；原图删了也不影响。
- 设置里只记图片编号。页面需要哪张图时向监视进程要一次，转成 `blob:` 地址当作背景（Codex 的 CSP 允许 `img-src blob:`），不会每次改设置都把整张图塞进注入脚本。
- **Codex++ 用户脚本模式**没有监视进程：脚本里自带《彩云》，可以切换《彩云》和彩云渐变、调三个滑块（存在 localStorage），不能上传自己的图片。

## 从源码构建

需要 Node.js 22 或更高版本。在仓库根目录运行：

```bash
pnpm install
pnpm compile                 # 生成 apps/desktop-cli/out/woodfish.js
pnpm woodfish codex status
pnpm cli:dist                # 发布产物：out/npm（npm 包）、out/release（woodfish.exe、woodfish.js、许可）
```

也可以直接运行 `node apps/desktop-cli/out/woodfish.js codex <命令>`。`cli:dist` 在 Windows 上用当前的 Node.js 生成单文件 exe（Node 官方的 single executable application，`postject` 注入），并试运行 npm 包和 exe；VS Code 扩展打包时把同一个 `woodfish.js` 放进 VSIX 的 `out/`。

## 常用命令

```bash
# 原生配色（不开端口）
woodfish codex theme apply --dark neon --light light --restart     # 深色、浅色各一套
woodfish codex theme apply --dark black --appearance dark --restart  # 并把 Codex 固定为深色
woodfish codex theme restore                                         # 撤销全部（也可 --mode dark）

# 注入效果
woodfish codex launch                      # 首次运行会说明风险并请你确认
woodfish codex settings --set palette.dark=neon --set palette.light=light
woodfish codex settings --set glass.blur=24 --set mouse-trail.length=20

# 效果插件
woodfish codex effects                     # 每个效果的状态（运行中 / 已关闭 / 失败原因）和文件夹位置
woodfish reload                            # 从磁盘重新加载所有效果（Codex 和 VS Code），不用重启
woodfish codex effects reset typing-particles   # 参数恢复默认
woodfish codex effects restore caret       # 恢复自带的效果文件

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
woodfish codex autostart on                # 登录时启动的后台任务，无窗口、普通权限（原快捷方式打开的 Codex 会在出窗口前被带端口重启）
woodfish codex autostart                   # 查看状态
woodfish codex autostart off               # 删除任务并停止后台进程

# 诊断与清理
woodfish codex status
woodfish codex doctor                      # 检查效果是否生效、界面元素是否还能找到
woodfish codex shortcut                    # 另加开始菜单项“Woodfish Codex”，直接带效果启动；不动原来的 Codex 快捷方式
woodfish codex uninstall                   # 撤销 Woodfish 对 Codex 的全部修改
```

可调设置（`--set 键=值`）：

| 设置 | 存在 | 说明 |
| --- | --- | --- |
| `palette.dark` / `palette.light` | `codex.json` | 深色 / 浅色主题（见上表）；`null` 表示保留 Codex 自己的颜色 |
| `backgroundImage` | `codex.json` | 窗口背景用哪张图：`caiyun` / `gradient` / 图片编号（也可写 `background.image`） |
| `customCss` | `codex.json` | 追加的 CSS，会经过安全过滤 |
| `<效果名>.<参数>` | 效果的 `params.json` | 例如 `mouse-trail.length=20`、`typing-particles.colors=rainbow`、`thread-ring.followTheme=true`，`enabled` 是开关；驼峰写法也行（`mouseTrail.length`）。参数和范围见各效果的 `effect.json` |

旧键名照样能用：`glass.*`、`caret.enabled`、`accent.enabled`、`background.*` 对应同名效果，`bodyText.*` 对应 `rainbow-text`，`codeGradient.*` 和 `codeGlow.*`（`enabled` → `glow`，`intensity` → `glowIntensity`）对应 `code-gradient`。升级后第一次运行时，旧 `codex.json` 里的效果设置会自动搬进各效果的 `params.json`。

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
