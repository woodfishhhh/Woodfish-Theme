# Renderer Runtime

共享的 Chromium 页面渲染运行时，包含文字渐变、背景、效果宿主和生命周期工具，不依赖具体宿主。

- 构建：pnpm --filter @woodfish/renderer-runtime run compile。
- 测试：pnpm --filter @woodfish/renderer-runtime run test --runInBand。
- 产物：TypeScript 文件输出到 packages/renderer-runtime/out。
