# DeepSeek Harness 原生插件（`woodfish-dsh-plugin`）

这里实现 DeepSeek Harness（dsh 0.2.2+，`dsh web` 与 `dsh desktop`）的官方双端原生插件源码、侵入式样式/动效运行时与全参数原生设置面板，工作区包名为 `@woodfish/dsh-web`，构建出的可发布插件位于 `apps/dsh-web/plugin/`（包名 `woodfish-dsh-plugin`）。

- 构建插件包：`pnpm dsh:build`（检验一致性：`pnpm dsh:check`）。
- 编译类型：`pnpm --filter @woodfish/dsh-web run compile`。
- 单元测试：`pnpm --filter @woodfish/dsh-web run test --runInBand`。
- 安装到 dsh：`woodfish dsh install` 或 `dsh plugin --profile web add ./apps/dsh-web/plugin`。
