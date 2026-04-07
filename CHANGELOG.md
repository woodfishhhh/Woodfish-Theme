# 更新日志

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
