# Effects

可插拔效果的 Node 端和 builtin 效果目录；CLI 与 VS Code 扩展从这里同步用户效果文件夹。

- 构建：pnpm --filter @woodfish/effects run compile。
- 测试：pnpm --filter @woodfish/effects run test --runInBand。
- 产物：TypeScript 文件输出到 packages/effects/out，内置效果保留在 packages/effects/builtin。
