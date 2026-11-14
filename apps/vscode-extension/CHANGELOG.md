# 更新日志

## [8.1.0] - 2026-11-14

### 怀旧（5.x）

- 新增代码效果风格“怀旧”（#31）：在设置里把“代码效果风格”（`woodfishTheme.overlay.style`）选成 `classic`，或运行「选择效果预设」选「怀旧（5.x）」。代码加粗，发光回到 5.x 那圈和文字同色的大光晕，强弱仍由 `woodfishTheme.glow.intensity` 调。5.x 的特调渐变和彩虹光标 7.2.0 起就已经回来了。浅色主题上发光仍是亮色光晕，不会变成灰影
- 「霓虹全开」改用这圈大光晕：它调的渐变参数只影响自动推导的颜色，在内置主题上只是把贴字的柔和发光放大 1.6 倍，几乎看不出变化

### 修复

- 毛玻璃开着时，二级菜单被一级菜单裁掉或盖住（#32，感谢 @Cralemon）：菜单的毛玻璃改画在单独的一层上，不再裁切子菜单；VS Code 1.146 自带菜单毛玻璃时保留它的底色，Woodfish 只加强模糊和颗粒
- 卸载扩展时，用它「为 Codex 启用 Woodfish」开的部分一起撤下：Codex 里的效果、登录任务、开始菜单的“Woodfish Codex”。`%APPDATA%\Woodfish\effects` 里 Woodfish 放进去的效果文件也删掉，你自己写过或改过的保留；`settings.json` 不会被改动（#29）
- `woodfish` 命令行把登录任务换成 exe 或 Node 运行时，会删掉旧的 `woodfish.cmd`，扩展不再把这个任务当成自己的去重启或卸载

### 致谢

- 感谢 @Cralemon 的 PR #32（二级菜单的修复）

## [8.0.0] - 2026-11-14

Codex 桌面端支持和独立的 `woodfish` 命令行工具一起正式发布，所以是大版本。同日发出的 7.4.0 是这批改动的预发布，内容相同。

### Codex 桌面端

- 新增命令「为 Codex 启用 Woodfish」「为 Codex 停用 Woodfish」「从 Codex 卸载 Woodfish」（仅 Windows）：扩展自带 Woodfish 的 Codex 工具，借编辑器自带的运行时运行，不用另装 Node.js。第一次启用先在对话框里说明调试端口的风险，Codex 正在运行时会先问再重启；启用后登录 Windows 也会自动恢复，提示里可以顺手在开始菜单加一个直接带效果启动的“Woodfish Codex”
- 同一个 Codex 工具也发布在 GitHub Release：单文件 `woodfish.exe`（不用装任何东西）和 `woodfish.js`（有 Node.js 22+ 时用），效果相同、版本号与扩展一致；npm 包 `woodfish` 即将上线
- 不改动用户原来的 Codex 快捷方式。开了自动恢复后，用原来的快捷方式打开的 Codex 在启动后 1～2 秒内就被带端口重启（原来要 3～5 秒），赶在它的窗口出现之前（Codex 自己要 7 秒左右才出窗口），所以看不到闪一下，只比平时晚两三秒出窗口
- 修复正在带端口启动的 Codex 可能被后台进程当成“没有端口”而再重启一次

### 工程

- 安装包瘦身约 12%：默认背景《彩云》重新编码（2560px WebP，肉眼无差别），图标重新压缩，工作台渲染脚本去掉空白
- 去掉打包体积上限，打包时改为列出安装包里各文件的占比
- 安装包里多了 Codex 工具 `out/woodfish.js`（压缩后约 410 KB）。它和 Codex++ 用户脚本共用一份《彩云》，比直接打包小约 180 KB

## [7.4.0] - 2026-11-14

8.0.0 的预发布，改动相同，见上。

## [7.3.0] - 2026-11-14

### 主题

- 新增 10 套热门主题（均为 MIT 许可，原样收录上游文件）：One Dark Pro、Tokyo Night、Catppuccin Mocha / Latte、Nord、GitHub Dark / Light、Night Owl、Ayu Mirage、Gruvbox Dark，名字前带 `Woodfish`。渐变和发光顺着各自配色自动生成，强调色、标签页边框与光标颜色取自主题自己的色板
- 主题文件按 VS Code 的方式解析（允许注释和尾逗号），发布前检查覆盖每一套贡献的主题

### 窗口背景

- 新增窗口背景（`woodfishTheme.background.*`，默认关闭）：窗口底下铺一张图片，编辑器透出背景，侧边栏和面板用毛玻璃叠在上面。默认图片是《彩云》，用命令「设置背景图片」换成自己的图片；透明度、模糊和遮罩都能调

### 效果插件

- 效果改成插件：每个效果是 `%APPDATA%\Woodfish\effects`（macOS 在 `~/Library/Application Support/Woodfish/effects`）里的一个文件夹，`effect.js` 就是实现，可以直接改、新建，也可以让 AI 照文件夹里的 `AGENTS.md` 改。改了文件或设置自动刷新，也可以运行「刷新效果」（`Ctrl+Alt+R`），不用重新加载窗口；新增「打开效果文件夹」命令
- 自带三个效果，默认关闭：鼠标拖尾 `woodfishTheme.mouseTrail.*`、光标拖尾 `woodfishTheme.caretTrail.*`（都照 VS Code Animations 插件画单色带子，长度 12）、打字粒子 `woodfishTheme.typingParticles.*`（主题色光点，不震动）
- 新增 `user.css`：效果文件夹里的这个文件最后加载、优先级最高，Woodfish 升级不会覆盖它。每个效果参数都是一个 CSS 变量，例如 `:root { --woodfish-caret-trail-color: #ff4d4f; }` 一行就把光标拖尾换成红色，画布上画的拖尾和粒子也跟着变。全部变量、默认值和例子见效果文件夹的 `README.md`
- 同一个效果文件夹也给 Woodfish 的 Codex 桌面端效果用，改一次两边都变

## [7.2.0] - 2026-11-03

### 彩色字体

- 找回 Woodfish Dark 的特调渐变：5.x 手写的那套颜色（属性黄→粉、标签青→蓝、字符串荧光绿、声明紫→品红、普通文字马卡龙彩虹等）在 7.0 改用自动推导后丢失，现在原样恢复
- Woodfish Dracula / Black / Neon / Light 也有了按同一手法调的特调渐变
- 其他主题（以及特调表里没有的颜色）改用按特调规律重写的算法：从文字原色出发，沿色环往前转到更鲜艳的终点；普通文字是一条淡彩虹；注释保持低调；每个色标在背景上都不比原色难读
- 修复长名字、长段落（Markdown 最明显）的渐变每 50 个字就断开重来：Monaco 会把长 token 拆成几段，现在这几段共用一条连贯的渐变
- 修复浅色主题的发光像一圈深色阴影：浅色背景上改用同色相的亮色光晕
- `彩色字体` 下几项参数的默认值随新算法调整：色环转角 `32`、明暗 `0.12`、彩虹浓淡 `0.075`、方向 `45°`。这几项只影响自动推导的渐变

### 工程

- 依赖管理改用 pnpm

## [7.1.0] - 2026-10-29

### 更改

- 🧭 **设置页重新整理** - 34 项设置按“开关 / 彩色字体 / 发光字体 / 彩色光标 / 毛玻璃 / 透明窗口（实验） / 高级”分组，所有效果开关集中在最上面；自定义 CSS、校验和与自定义预设收进“高级”。
- ✍️ **说明改成大白话** - 每项设置只用一两句话讲清楚作用、默认值和范围，去掉 OKLCH、pseudo-element 等术语；所有下拉选项都带中文说明，设置里可以直接点链接打开效果预设和光标配色。

设置项的键名没有变化，已有的 `settings.json` 和自定义预设无需修改。

### 工程

- 仓库改为 npm workspaces monorepo：扩展迁入 `apps/vscode-extension`，扩展 ID、命令、配置键与卸载行为不变
- 新增共享包 `@woodfish/theme-core`，统一提供 OKLCH 颜色计算、渐变推导、原创调色板与效果参数；扩展设置、主题生成器和 workbench 渲染脚本都改为使用它，效果与之前一致
- workbench 渲染脚本改用 TypeScript 编写，构建时内联共享核心；VSIX 仍是单独可安装的自包含包

## [7.0.0] - 2026-10-27

### 新功能

- 支持 Cursor、Kiro、Windsurf / Devin、Trae、VSCodium 等 VS Code 衍生编辑器，在 Cursor 3.27 与 VSCodium 1.143 中实测注入、渐变、发光、光标与毛玻璃；提示信息显示当前编辑器名称
- 重新加入毛玻璃：菜单、悬浮提示、补全列表、命令面板、通知、查找框等 12 类浮层，可选 `blur` 或 SVG 亚克力质感，带 Reveal 光效与入场动画；底色取自当前主题，VS Code 1.143 起与原生毛玻璃协同，并遵循“降低透明度”
- 新增系统级透明窗口（实验）：macOS vibrancy、Windows 11 亚克力 / 云母 / 标签式云母
- 新增 `Woodfish Black`（纯黑）、`Woodfish Neon`（赛博朋克）、`Woodfish Light`（浅色，#16）三套主题，由生成脚本统一产出并校验对比度
- 新增 6 套效果预设与“保存为预设”，新增 8 套彩色光标配色与自定义颜色
- 新增“生成 Woodfish 诊断信息”“打开 Woodfish 设置”命令；功能菜单按分组重排
- 新增首次安装引导（欢迎页 Walkthrough）
- 状态栏新增 `F` 标记表示毛玻璃已开启

### 修复

- 卸载扩展后自动还原 `workbench.html`、校验和与系统级窗口钩子，不再残留光标和发光（#29、#11、#9、#5）
- 声明 `extensionKind: ui`，修复 Remote SSH / WSL / 容器中“找不到 workbench.html”的问题
- 写入失败时按系统给出中文处理办法，覆盖 macOS“App 管理”与从终端启动、AppTranslocation、Windows Program Files、Linux Snap / Flatpak 等情况
- 注入后同步 `product.json` 校验和，避免“安装似乎损坏”提示；仍出现时说明需完全退出编辑器
- 区分“重新加载窗口”和“完全退出重开”两类提示，需要重启进程的改动（系统级窗口）明确要求完全退出（#14）
- 修复“彻底停用”与后台同步并发时注入被重新写回的问题
- 修复系统级窗口钩子文件丢失后启动时不会自动补装的问题
- 光标、标签栏动画同时遵循 `workbench.reduceMotion`
- 渐变与发光都关闭时，运行时不再处理代码 token
- 其他扩展用行内装饰设置的文字颜色（如 Minecraft Color Highlighter）不再被渐变覆盖（#15）
- 修复 JetBrains Mono、Cascadia 等字体的斜体与连字在渐变下被裁切的问题

### 工程

- 发布脚本支持同时发布到 Open VSX（令牌从环境变量 `OVSX_PAT` 读取）
- 扩展入口改为 esbuild 打包，VSIX 约 130 KB；开发时写入的本机安装记录不会再被打包
- 集成测试适配 VS Code 1.110 起的目录调整

## [6.0.0-beta.1] - 2026-07-31

- 将 Woodfish 从内置主题专用特效改为默认开启的通用叠层，切换到任意 VS Code 颜色主题后仍继续工作
- 运行时直接读取 Monaco token 的计算颜色并生成具体 sRGB 渐变，不再依赖固定 `mtk` 编号或 CSS 相对色语法
- 默认使用色相 `±24°` 与 `ΔL ±0.060`；新增色相、明度、低色度补色、渐变方向和叠层总开关设置
- 为白色、灰色等低色度 token 自动提取当前主题强调色，补齐原本缺失的渐变与发光；标点使用较弱光晕
- 增加逐帧批处理、编辑器范围观察、主题变化检测和断开编辑器清理，控制通用叠层的运行时开销
- 将 `Woodfish Dark` 与 `Woodfish Dracula` 恢复为未注入语法调色的上游原版基底，并补齐各自许可证与来源声明
- 运行时 payload 哈希升级为同时覆盖 CSS、bootstrap 与 schema，设置关闭状态可持久化

- 将 README 预览资源移出 VSIX、改用显式远程链接，并增加必需文件、源文件体积与最终 VSIX 体积门禁
- 缓存扩展内置运行时资源，避免每次配置同步重复读取静态 CSS 和主题元数据
- 加强自定义 CSS 清洗，拒绝通过注释或 CSS 转义混淆的外部资源和样式边界注入
- 统一跨平台 LF 行尾，并让发布脚本在 Marketplace 发布失败时返回失败状态
- 在现有主版本范围内更新发布、Lint、格式化与测试工具，并将 VS Code 类型固定到最低兼容版本

## [5.2.0] - 2026-07-30

- 新增 `Woodfish Dracula` 内置主题，并将主题运行时重构为 `bearded / dracula / shared` 资源结构
- 开启主题时恢复最近一次选择的内置 Woodfish 主题
- 彩色光标尾迹默认关闭 GPU blur，同时保留透明度与显式 blur 配置
- 运行时写入改为校验后的原子替换，并记录备份哈希、VS Code 版本与路径；修复和彻底停用会优先恢复可信备份
- 自定义 CSS、颜色与数值配置增加边界校验，工作区不受信任时限制可注入配置，并为动画效果补充 reduced-motion 降级
- 启动与后台同步失败会写入输出通道并提示用户，避免未处理的异步错误
- 新增真实 VS Code 扩展宿主集成测试、持续集成与 VSIX 内容校验，发布流程不再删除本地构建产物
- 完善 Dracula 视觉层级：修正语法渐变映射、收紧文字发光、增加主题光标默认值，并补齐标签动效与工作台对比度
- 移除活动标签关键帧中无效的 `!important` 声明，确保动画定义符合 CSS Animations 规范
- 正式版本地打包产物更新为 `woodfish-theme-5.2.0.vsix`

## [5.1.6] - 2026-04-11

- 修复扩展市场简介图片无法显示的问题，统一 README 相对图片所依赖的 GitHub 仓库元数据
- 新增 Marketplace 元数据回归测试，防止 `repository / bugs / homepage` 再次指向错误仓库
- 正式版本地打包产物更新为 `woodfish-theme-5.1.6.vsix`

## [5.1.5] - 2026-04-10

- 改用 `transform` 驱动彩色光标流光层，修复 Chromium 场景下 `background-position` 看起来挂着动画却不实际流动的问题
- 将光标样式文件重命名为 `cursor-core.css` 与 `cursor-glow.css`，让主体层与尾迹层职责更清晰
- 预发布本地打包产物更新为 `woodfish-theme-5.1.5.vsix`

## [5.1.4] - 2026-04-10

- 修复彩色光标 `bp-animation` 关键帧里的 `background-position` 无法动画的问题，恢复完整的赤橙黄绿青蓝紫流光效果
- 新增回归测试，确保运行时 payload 里的光标关键帧保持可动画，不会再退化成只停在红橙段
- 预发布本地打包产物为 `woodfish-theme-5.1.4.vsix`

## [5.1.3] - 2026-04-08

- 修复 VS Code 升级后仍沿用旧 `workbench.html.woodfish-backup` 路径，导致启用或修复注入时报 `ENOENT` 的问题
- 新增回归测试，确保持久化的旧备份路径失效时会自动回退到当前 VS Code 版本目录
- 新的本地打包产物为 `woodfish-theme-5.1.3.vsix`

## [5.1.2] - 2026-04-07

- 清理已确认无引用的旧遗物文件，包括旧入口 shim、旧 Bash 发布脚本、无用版本检查代码与过时图片说明
- 将占位测试整理为仓库清理回归测试，并补强对旧架构文案回潮的保护
- 更新贡献指南与 AI 协作文档，使其完全对齐当前 integrated runtime 主线
- 新的本地打包产物为 `woodfish-theme-5.1.2.vsix`

## [5.1.1] - 2026-04-07

- 修正扩展市场插件描述，统一为当前稳定版的一体化 Woodfish 主题表述
- 修复彻底停用或移除注入后状态栏仍短暂显示 `Woodfish on` 的问题
- 新的本地打包产物为 `woodfish-theme-5.1.1.vsix`

## [5.1.0] - 2026-04-07

- 设置面板瘦身，移除误导性的 runtime / preset 配置项
- 状态栏与右下角菜单改为显示真实运行态 `on / paused / off`
- 启用与修复流程支持接管已知旧版 Woodfish payload
- 清理旧拼装时代残留 CSS 文件，正式版本地打包产物为 `woodfish-theme-5.1.0.vsix`

## [5.0.2] - 2026-04-07

- 右下角 `Woodfish` 状态栏菜单改为显示全部主要指令，包括开启/关闭主题、特效开关、修复注入、彻底停用和 `Reload Window`
- 新的本地打包产物为 `woodfish-theme-5.0.2.vsix`

## [5.0.1] - 2026-04-07

- 修复 `woodfishTheme.runtime.enabled` 与 `woodfishTheme.glow.enabled` 在部分会话里无法写入用户设置的问题
- 预发布渠道对应新的修复版打包产物 `woodfish-theme-5.0.1.vsix`

## [5.0.0] - 2026-04-06

- 一体化 runtime 默认启用，首次切换到 `Woodfish Dark` 后即可走内置注入主路径
- 修复 fresh 安装时 glow 默认链路，彩色字体 / 发光字体 / 彩色光标可按默认值一起生效
- 保留旧命令兼容，同时统一对外语义为一体化 runtime
- 发布脚本支持按 VS Code Marketplace 预发布渠道发版

完整历史见 [docs/CHANGELOG.md](https://github.com/woodfishhhh/Woodfish-Theme/blob/HEAD/docs/CHANGELOG.md)。
