# 更新日志

## [Unreleased]

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

完整历史见 [docs/CHANGELOG.md](docs/CHANGELOG.md)。
