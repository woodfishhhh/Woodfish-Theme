# 更新日志

## [Unreleased]

- 将 README 预览资源移出 VSIX，并增加必需文件、源文件体积与最终 VSIX 体积门禁
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
