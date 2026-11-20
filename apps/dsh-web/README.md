# DeepSeek Harness Web 适配

这里实现 dsh Web 版的选择器、CSS 变量覆盖和油猴 overlay，工作区包名为 @woodfish/dsh-web。

- 构建：pnpm --filter @woodfish/dsh-web run compile。
- 测试：pnpm --filter @woodfish/dsh-web run test --runInBand。
- 产物：TypeScript 文件输出到 apps/dsh-web/out，用户脚本由 apps/cli/scripts/build.js 写入 apps/cli/assets。
