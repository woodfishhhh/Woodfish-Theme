# Woodfish 桌面工具（Codex 桌面端）

`woodfish` 命令行工具负责把 Woodfish 的配色和效果带到 OpenAI Codex 桌面端。目前支持 Windows 上的 Microsoft Store 版 Codex，macOS 还没有支持。

Woodfish 不修改 Codex 的安装文件。商店版的安装目录是只读的，而且有签名和完整性校验，改动会导致 Codex 无法启动。

## 三种用法

| 方式 | 能做什么 | 是否开调试端口 | 何时生效 |
| --- | --- | --- | --- |
| **原生配色** `theme apply` | 把 Woodfish Light / Black / Neon 写进 Codex 官方的主题设置（强调色、文字、背景、对比度、diff 颜色），Codex 会据此重新生成整套界面色阶 | 否 | 重启 Codex 后 |
| **注入效果** `launch` | 代码块 OKLCH 渐变与发光、菜单与浮层毛玻璃、强调色光晕、彩色光标，可选正文渐变，也能临时覆盖配色 | 是，仅本机 | 立即生效，设置改动约 1 秒内同步 |
| **Codex++ 用户脚本** `install-userscript` | 与注入效果相同，由 Codex++ 加载 | 由 Codex++ 决定 | 在 Codex++ 中重新加载脚本后 |

原生配色和注入效果可以同时使用。

## 构建与运行

需要 Node.js 22 或更高版本。在仓库根目录运行：

```bash
npm install
npm run compile                 # 生成 apps/desktop-cli/out/woodfish.js
npm run woodfish -- codex status
```

也可以直接运行 `node apps/desktop-cli/out/woodfish.js codex <命令>`。

## 常用命令

```bash
# 原生配色（不开端口）
woodfish codex theme apply --palette neon --restart
woodfish codex theme restore

# 注入效果
woodfish codex launch                      # 首次运行会说明风险并请你确认
woodfish codex settings --set palette.dark=neon --set palette.light=light
woodfish codex settings --set bodyText.enabled=true --set glass.blur=24
woodfish codex stop-inject                 # 立即撤下效果
woodfish codex relaunch --normal           # 不带端口重启，关闭调试端口

# 诊断与清理
woodfish codex status
woodfish codex doctor                      # 检查效果是否生效、界面元素是否还能找到
woodfish codex shortcut                    # 开始菜单快捷方式“Woodfish Codex”
woodfish codex uninstall                   # 撤销 Woodfish 对 Codex 的全部修改
```

可调设置：

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| `palette.dark` / `palette.light` | `null` | `light`、`black`、`neon`；`null` 表示保留 Codex 自己的颜色 |
| `codeGradient.*` | 开 | `hueShift`、`lightnessDelta`、`neutralChroma`、`angle`，与 VS Code 扩展的参数一致 |
| `codeGlow.*` | 开 | `intensity` |
| `glass.*` | 开 | `blur`、`saturate`、`opacity`、`noise`、`borderRadius` |
| `accent.enabled` | 开 | 输入框聚焦光晕、当前会话行高亮 |
| `caret.*` | 开 | `animationDuration`、`gradientStops` |
| `bodyText.enabled` | 关 | 助手回复正文渐变 |
| `customCss` | `[]` | 追加的 CSS，会经过安全过滤 |

## 注入是怎么做的

1. 商店版 Codex 只能在它的包环境里启动。Woodfish 通过 `Invoke-CommandInDesktopPackage` 运行一个临时启动脚本，以 `--remote-debugging-port=<随机端口> --remote-allow-origins=http://127.0.0.1:<端口>` 启动 Codex。这一步不需要开发者模式。
2. 后台监视进程（`woodfish codex watch`）连接调试端口，把样式注入主窗口，并在页面刷新、新开窗口、设置变化时重新注入。这类注入只在调试连接保持期间有效，所以监视进程必须一直运行。
3. Codex 的主题变量都定义在 CSS 的 `@layer theme` 中。Woodfish 注入的样式不带 layer，优先级天然更高，不需要 `!important`。

已知限制：关闭 Codex 窗口只会把它缩到托盘，所以重启 Codex 时需要结束它的全部进程。Woodfish 会先征求你的同意；正在运行的任务可能因此中断。

## 安全

- 每次启动都使用随机端口，只监听 127.0.0.1，并限制连接来源；连接前会校验调试地址确实是本机。
- 端口开启期间，本机任何程序都能通过它控制 Codex。首次使用前 Woodfish 会说明这一点，并记录你的同意；风险说明的文字变了，会重新询问。
- 注入内容只由经过规范化的设置生成，Woodfish 从不执行页面传回的数据，日志里也不记录页面内容。
- `config.toml` 只按键修改，改前先备份，改后重新解析校验。还原时，如果文件之后没被改过就逐字节写回；如果 Codex 改过，就只还原 Woodfish 动过的键。

实测细节见 [docs/hosts/codex.md](../../docs/hosts/codex.md)。
