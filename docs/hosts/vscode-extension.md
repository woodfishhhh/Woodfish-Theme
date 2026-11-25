# VS Code 扩展适配说明

VS Code 扩展位于 apps/vscode-extension，发布为 Marketplace 和 Open VSX 上的 zhongjun.woodfish-theme。

- 构建：在仓库根目录运行 pnpm compile，再按需运行 pnpm runtime:build、pnpm themes:generate。
- 测试：运行 pnpm test 和 pnpm test:integration；发布前运行 pnpm pre-publish。
- 产物：编译文件留在 apps/vscode-extension/out，VSIX 输出到仓库根目录 dist/。
- 注入：扩展通过 workbenchPatcher.ts 管理 workbench.html 的受保护注入，并在卸载时恢复原文件。

## 苹果圆角

VS Code 设置 `woodfishTheme.squircleCorners.enabled` 默认开启，快速选择框和 Woodfish 毛玻璃浮层使用平滑圆角。切换走现有工作台补丁与校验和更新流程，完全退出并重开编辑器可看到新设置。

VS Code 1.147.0（Chromium 150）的独立扩展宿主完成了开启、关闭和再次开启测试。每次切换后，工作台文件与 `product.json` 记录的校验和一致。两种状态完整重启后均未报告安装损坏。

| 开启 | 关闭 |
| --- | --- |
| ![开启苹果圆角](vscode-screenshots/squircle-on.png) | ![关闭苹果圆角](vscode-screenshots/squircle-off.png) |

工作台的 `--vscode-cornerRadius-*` 取自当前主题。命令面板输入框使用 medium（默认 6px），平滑半径为 10.68px。选中行原生为 3px，保留圆弧。圆形头像、计数徽标、开关轨道和滑块也保留圆弧。原生固定半径与圆角变量按同一条规则处理。

在 Windows 的 VS Code 1.147.0 中，使用同一份编辑器程序分别加载 `main@bf12829` 原版扩展和本分支。原版集成测试切换现有叠层及毛玻璃时也记录了 `Installation has been modified on disk`。工作台文件与 product.json 的校验和匹配，完全重启后两种圆角设置都能正常启动。

| 场景 | 开启 | 关闭 |
| --- | --- | --- |
| 命令面板、输入框和选中行 | ![命令面板、输入框和选中行开启](vscode-screenshots/native-picker-on.png) | ![命令面板、输入框和选中行关闭](vscode-screenshots/native-picker-off.png) |
| 设置页的备份与同步按钮 | ![设置页的备份与同步按钮开启](vscode-screenshots/native-button-on.png) | ![设置页的备份与同步按钮关闭](vscode-screenshots/native-button-off.png) |
| 展开设置下拉菜单 | ![展开设置下拉菜单开启](vscode-screenshots/native-dropdown-on.png) | ![展开设置下拉菜单关闭](vscode-screenshots/native-dropdown-off.png) |
| 通知和信息图标 | ![通知和信息图标开启](vscode-screenshots/native-notification-on.png) | ![通知和信息图标关闭](vscode-screenshots/native-notification-off.png) |
| 编辑器悬停提示 | ![编辑器悬停提示开启](vscode-screenshots/native-hover-on.png) | ![编辑器悬停提示关闭](vscode-screenshots/native-hover-off.png) |
| 设置卡片和下拉控件 | ![设置卡片和下拉控件开启](vscode-screenshots/native-settings-on.png) | ![设置卡片和下拉控件关闭](vscode-screenshots/native-settings-off.png) |
| 编辑器查找框 | ![编辑器查找框开启](vscode-screenshots/native-find-on.png) | ![编辑器查找框关闭](vscode-screenshots/native-find-off.png) |
