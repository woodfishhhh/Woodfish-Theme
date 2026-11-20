# VS Code 扩展适配说明

VS Code 扩展位于 apps/vscode-extension，发布为 Marketplace 和 Open VSX 上的 zhongjun.woodfish-theme。

- 构建：在仓库根目录运行 pnpm compile，再按需运行 pnpm runtime:build、pnpm themes:generate。
- 测试：运行 pnpm test 和 pnpm test:integration；发布前运行 pnpm pre-publish。
- 产物：编译文件留在 apps/vscode-extension/out，VSIX 输出到仓库根目录 dist/。
- 注入：扩展通过 workbenchPatcher.ts 管理 workbench.html 的受保护注入，并在卸载时恢复原文件。
