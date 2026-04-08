# 更新日志

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
