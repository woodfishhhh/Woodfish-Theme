<p align="center">
  <img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/assets/readme/hero.png" width="100%" alt="Woodfish Theme：为任意颜色主题叠加渐变语法、可调发光、彩虹光标和毛玻璃">
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme"><img src="https://img.shields.io/visual-studio-marketplace/v/zhongjun.woodfish-theme?style=flat-square&label=Marketplace&color=69C3FF" alt="VS Code Marketplace version"></a>
  <a href="https://open-vsx.org/extension/zhongjun/woodfish-theme"><img src="https://img.shields.io/open-vsx/v/zhongjun/woodfish-theme?style=flat-square&label=Open%20VSX&color=C160EF" alt="Open VSX version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme"><img src="https://img.shields.io/visual-studio-marketplace/d/zhongjun.woodfish-theme?style=flat-square&label=Downloads&color=22ECDB" alt="VS Code Marketplace downloads"></a>
  <a href="./apps/vscode-extension/THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/license-MIT%20%2B%20GPL--3.0-EACD61?style=flat-square" alt="MIT and GPL-3.0 licensing"></a>
  <a href="https://code.visualstudio.com/"><img src="https://img.shields.io/badge/VS%20Code-%5E1.74.0-B78AFF?style=flat-square" alt="Requires VS Code 1.74 or newer"></a>
</p>

<p align="center">
  中文 · <a href="https://github.com/woodfishhhh/Woodfish-Theme/blob/HEAD/README.en.md">English</a> ·
  <a href="https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme">VS Code 安装</a> ·
  <a href="https://open-vsx.org/extension/zhongjun/woodfish-theme">Cursor / Kiro / Trae 安装</a> ·
  <a href="./apps/vscode-extension/docs/TROUBLESHOOTING.md">故障排查</a>
</p>

Woodfish Theme 是一层叠在任意颜色主题上的视觉效果：它保留你正在用的配色，为代码文字自动计算 OKLCH 渐变和发光，再加上彩虹光标和毛玻璃。VS Code、Cursor、Kiro、Windsurf、Trae、VSCodium 都能用。

## 效果预览

<p align="center">
  <img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/assets/readme/dracula-preview.png" width="100%" alt="Woodfish Dracula 的渐变语法、分层发光、主题光标与完整工作台效果">
</p>

每个 token 以自己的原色为中点生成渐变：默认色相 `±24°`、明度 `ΔL ±0.060`，再映射回可显示的 sRGB。白色、灰色这类低色度文字会从当前主题的强调色借一个色相，所以普通前景色也有渐变和发光。上图使用 `Woodfish Dracula`，换成其他颜色主题效果同样成立。

<details>
<summary><strong>查看 Woodfish Dark 预览</strong></summary>

![Woodfish Dark 渐变语法与发光效果](https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/images/img2.png)

![Woodfish Dark 彩虹光标效果](https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/images/img1.png)

</details>

## 7.0 有什么新东西

- **支持 Cursor、Kiro、Windsurf、Trae、VSCodium**：同一个扩展，从各自的扩展面板（Open VSX）直接安装。
- **毛玻璃回来了**：菜单、悬浮提示、补全列表、命令面板、通知等 12 类浮层，可选普通模糊或亚克力质感，带 Reveal 光效和入场动画；VS Code 1.143 起与原生毛玻璃协同。
- **系统级透明窗口（实验）**：macOS vibrancy、Windows 11 亚克力 / 云母。
- **三套新主题**：`Woodfish Black`（纯黑）、`Woodfish Neon`（赛博朋克）、`Woodfish Light`（浅色）。
- **效果预设和光标配色**：6 套内置预设，可以保存自己的组合；8 套光标配色，也能自定义颜色。
- **卸载即还原**：卸载扩展后自动清理所有注入，不会再出现“卸载了光标还在”。
- **出错时说人话**：写入失败会按系统给出中文的处理办法；新增一键生成诊断信息，方便提 issue。
- **新手引导**：首次安装后在“欢迎”页里一步步带你开启效果。

## 它提供什么

- **任意主题叠层**：默认开启，切换到任何颜色主题后继续工作。
- **原色自动计算**：运行时读取 Monaco token 的实际颜色，不依赖固定的 `mtk` 编号。
- **渐变语法**：色相偏移、明度变化、低色度补色和渐变方向都能调。
- **可调发光**：独立开关，按倍率调整强度，适配不同字体和显示器。
- **彩虹光标**：颜色、循环速度、圆角、尾迹模糊和透明度都能调。
- **毛玻璃**：底色取自当前主题，不用改 `workbench.colorCustomizations`。
- **五套内置主题**：Dark、Dracula、Black、Neon、Light，都是可选基底，不是使用效果的前提。
- **安全恢复**：写入前保存并校验备份，失败自动回滚；修复和彻底停用只使用与当前安装匹配的可信备份。
- **动效降级**：遵循系统的“减少动态效果”“降低透明度”和 `workbench.reduceMotion`。
- **状态栏**：显示 `on / paused / off`，用 `A / G / C / F` 标出正在生效的效果层。

## 三步开始

1. 安装 **Woodfish Theme**：
   - VS Code：从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme) 安装。
   - Cursor、Kiro、Windsurf、Trae、VSCodium：在扩展面板里搜索 `Woodfish Theme`（来自 [Open VSX](https://open-vsx.org/extension/zhongjun/woodfish-theme)）。
2. 选一个你喜欢的颜色主题（任意主题都行）。
3. 点右下角弹出的 **重新加载窗口**。

叠层默认开启，不会替你切换颜色主题。点击状态栏右下角的 `Woodfish ...` 打开功能菜单，可以开关各项效果、选预设、开毛玻璃。

<details>
<summary><strong>手动安装 VSIX</strong></summary>

从 [GitHub Releases](https://github.com/woodfishhhh/Woodfish-Theme/releases) 下载 `.vsix` 后运行（Cursor 把 `code` 换成 `cursor`，其他编辑器同理）：

```bash
code --install-extension woodfish-theme-7.0.0.vsix
```

</details>

## 支持的编辑器

提示信息会显示你正在用的编辑器名字，比如“请重新加载 Cursor”。

| 编辑器 | 基于 VS Code | 从哪里安装 | 实测 |
|---|---|---|---|
| VS Code | 1.74+ | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme) | ✅ 1.143 |
| Cursor | 1.128 | 扩展面板（Open VSX） | ✅ 3.27 |
| VSCodium | 1.143 | 扩展面板（Open VSX） | ✅ 1.143 |
| Kiro | 1.131 | 扩展面板（Open VSX） | 结构已核对 |
| Windsurf / Devin | 1.126 | 扩展面板（Open VSX） | 结构已核对 |
| Trae / Trae CN | 1.107 | 扩展面板（Open VSX） | 结构已核对 |

“结构已核对”表示已逐项检查过该编辑器安装包里的 workbench 路径、安全策略（CSP）、校验和与主进程格式，与实测通过的编辑器一致。

Remote SSH、WSL 和开发容器里同样有效：Woodfish 始终运行在本地界面这一侧。

## 内置主题

按 `Ctrl+K Ctrl+T`（macOS 为 `Cmd+K Cmd+T`）打开主题选择器：

| 主题 | 风格 |
|---|---|
| `Woodfish Dark` | Bearded Theme Arc 原版配色 |
| `Woodfish Dracula` | Dracula 官方配色，自带粉紫青绿光标 |
| `Woodfish Black` | 纯黑背景，适合 OLED 屏 |
| `Woodfish Neon` | 深紫底的赛博朋克霓虹 |
| `Woodfish Light` | 暖白底的浅色主题，发光自动减弱 |

不用内置主题也没关系，效果层对任何颜色主题都生效。

## 毛玻璃

运行 `Woodfish Theme: 开启/关闭 Woodfish 毛玻璃`，或在功能菜单里打开。

- **两种质感**：`blur` 是普通模糊加噪点，开销最低；`acrylic` 是 SVG 亚克力滤镜，质感更好。
- **作用范围**：菜单、悬浮提示、补全列表、命令面板、通知、查找框、下拉框、面包屑、调试工具栏、粘性滚动、面板标题、对话框，可以在 `woodfishTheme.glass.targets` 里逐项取舍。
- **Reveal 光效**：鼠标划过列表、按钮、标签页时跟随指针的柔光。
- **系统级透明窗口（实验）**：运行 `开启/关闭系统级透明窗口（实验）`，让整个窗口透出桌面。它会在编辑器的 `out/main.js` 开头加一行受保护的加载语句，需要完全退出编辑器才会生效，编辑器更新后要重新开启。目前只支持 macOS 和 Windows 11。

## 效果预设

运行 `Woodfish Theme: 选择效果预设`：

| 预设 | 说明 |
|---|---|
| Woodfish 默认 | 渐变 + 发光 + 彩色光标，所有参数恢复默认 |
| 柔和护眼 | 更小的色相偏移、更弱的发光，适合长时间写代码 |
| 霓虹全开 | 更强的渐变和发光、更快的光标，加上毛玻璃和 Reveal |
| 毛玻璃 | 默认代码效果 + 亚克力毛玻璃 |
| 专注模式 | 只保留彩色光标，代码颜色交给主题 |
| 性能优先 | 保留渐变，关掉发光、光标尾迹和毛玻璃 |

调好一套自己喜欢的参数后，运行 `将当前效果保存为预设` 就能随时切回来。光标颜色可以用 `选择彩色光标配色` 单独换：跟随主题、彩虹、Dracula、赛博朋克、极光、日落、樱花、单色白，或者输入自己的颜色。

## 效果层与状态

```text
任意颜色主题
    └── Woodfish 通用叠层
        ├── A  渐变语法
        ├── G  文字发光
        ├── C  彩虹光标
        └── F  毛玻璃
```

| 状态栏 | 含义 |
| --- | --- |
| `on` | 叠层已开启，并检测到当前的注入内容 |
| `paused` | 效果开着，但注入内容缺失，通常运行一次“修复 Woodfish 注入”即可 |
| `off` | 叠层总开关关闭，或所有效果都关闭 |
| `A / G / C / F` | 渐变语法 / 文字发光 / 彩虹光标 / 毛玻璃已开启 |

> [!IMPORTANT]
> 效果是通过修改编辑器自带的 `workbench.html` 实现的，切换效果后需要重新加载窗口。写入前会做校验后的原子替换，并保存带哈希、路径和版本信息的备份。编辑器更新会覆盖这个文件，效果消失时运行 `Woodfish Theme: 修复 Woodfish 注入`。

## 常用命令

在命令面板（`Ctrl+Shift+P`）里搜索 `Woodfish`：

| 命令 | 用途 |
| --- | --- |
| `打开 Woodfish 功能菜单` | 按分组列出所有开关，状态栏入口也是它 |
| `开启 / 关闭 Woodfish 通用叠层` | 整体开关，关闭后保留参数 |
| `开启/关闭 Woodfish 彩色字体` | 切换渐变语法 |
| `开启/关闭 Woodfish 发光字体` | 切换文字发光 |
| `开启 Woodfish 彩色光标` / `开启/关闭彩色光标` | 启用并配置 / 快速切换彩虹光标 |
| `选择彩色光标配色` | 换光标颜色 |
| `开启/关闭 Woodfish 毛玻璃` | 切换浮层毛玻璃 |
| `开启/关闭系统级透明窗口（实验）` | 让整个窗口透出桌面 |
| `选择效果预设` / `将当前效果保存为预设` | 一键切换 / 保存参数组合 |
| `打开 Woodfish 设置` | 跳到设置页 |
| `修复 Woodfish 注入` | 编辑器更新后效果消失时使用 |
| `生成 Woodfish 诊断信息` | 复制一份环境报告，提 issue 时直接粘贴 |
| `彻底停用 Woodfish 叠层` | 移除全部注入、备份和系统级窗口钩子 |

## 配置示例

所有设置都以 `woodfishTheme.` 开头，也可以运行 `打开 Woodfish 设置` 在图形界面里调。下面是一组偏克制、带毛玻璃的配置：

```json
{
  "woodfishTheme.overlay.hueShift": 24,
  "woodfishTheme.overlay.lightnessDelta": 0.06,
  "woodfishTheme.glow.intensity": 0.8,
  "woodfishTheme.cursor.animationDuration": 8,
  "woodfishTheme.cursor.gradientStops": ["#ff2d95", "#ffd700", "#00ffff"],
  "woodfishTheme.cursor.glowOpacity": 0.55,
  "woodfishTheme.glass.enabled": true,
  "woodfishTheme.glass.mode": "acrylic",
  "woodfishTheme.glass.opacity": 0.75,
  "woodfishTheme.glass.reveal": true
}
```

- `overlay.hueShift`（`0 - 180` 度）：渐变两端的色相偏移，默认 `24`。
- `overlay.lightnessDelta`（`0 - 0.5`）：渐变两端的明度变化，默认 `0.06`。
- `overlay.neutralChroma`（`0 - 0.4`）：给白色、灰色文字补的色度，默认 `0.06`。
- `overlay.angle`（`0 - 360` 度）：渐变方向，默认 `90`（从左到右）。
- `glow.intensity`（`0.1 - 3`）：发光强度倍率，默认 `1`。
- `cursor.animationDuration`（`1 - 60` 秒）：光标颜色循环一圈的时间，默认 `8`。
- `glass.blur` / `glass.saturate` / `glass.opacity` / `glass.noise`：毛玻璃的模糊半径、饱和度、底色不透明度和颗粒强度。
- `syntaxGradient.customRules`、`glow.customRules`、`cursor.customRules`：在对应效果层之后追加自己的 CSS。

## 卸载与恢复

- **直接卸载就行**：卸载扩展后，下次完全重启编辑器时会自动还原 `workbench.html`、校验和与系统级窗口钩子。
- **想立刻恢复原样**：先运行 `彻底停用 Woodfish 叠层` 再卸载。
- Woodfish 只清理自己写入的内容，其他扩展的注入不会被改动。

## 排查问题

**效果没有出现**

确认右下角状态栏显示 `Woodfish on`，并且重新加载过窗口。显示 `paused` 时运行 `修复 Woodfish 注入`。

**编辑器更新后效果消失**

编辑器更新会覆盖 `workbench.html`，运行 `修复 Woodfish 注入` 后重新加载窗口。

**提示“没有权限写入”**

- macOS：如果是在终端里用 `code .`、`cursor .` 启动的，macOS 会把写入算到终端头上。请完全退出编辑器，改从程序坞打开后运行 `修复 Woodfish 注入`。仍然不行的话，到“系统设置 → 隐私与安全性 → App 管理”里允许这个编辑器。
- Windows：安装在 `Program Files` 时，以管理员身份运行一次编辑器再修复，或者改用“用户安装版”。
- Linux：Snap、Flatpak 版的安装目录是只读的，无法注入，请改用官方 `.deb`、`.rpm` 或 `.tar.gz`。

**提示“安装似乎损坏”**

开启、修改或移除效果后，在完全退出编辑器之前这条提示会一直出现，重新加载窗口不会消失。完全退出再打开就好，这是编辑器只在启动时读取校验和导致的。

**提 issue**

运行 `生成 Woodfish 诊断信息`，内容会复制到剪贴板，直接粘贴到 [issue](https://github.com/woodfishhhh/Woodfish-Theme/issues) 里。更多排查步骤见 [故障排查指南](./apps/vscode-extension/docs/TROUBLESHOOTING.md)。

## 已知限制

- **小地图（minimap）没有渐变**：小地图是 canvas 绘制的，CSS 改不了。
- **网页版和 Remote 服务器端**：效果只能注入到桌面版编辑器的本地界面。
- **JetBrains 系列（如 CLion）、Visual Studio**：它们不是基于 VS Code 的，Woodfish 无法支持。
- **截图类扩展（如 CodeSnap）**：截图里不会带上 Woodfish 的效果。

## Codex 桌面端

Woodfish 也能为 OpenAI Codex 桌面端（Windows 商店版）换上配色和效果。它不修改 Codex 的安装文件，有两种方式：

- **原生配色**：`woodfish codex theme apply --dark neon --light light`，写入 Codex 官方的主题设置，深色和浅色各一套，不开任何端口；加 `--appearance dark` 可把 Codex 固定为深色。
- **注入效果**：`woodfish codex launch`，加上代码块渐变与发光、浮层毛玻璃、强调色光晕和彩色光标。需要以本机调试端口启动 Codex，首次使用前会说明风险。

已经在用 Codex++ 的话，也可以运行 `woodfish codex install-userscript`，以用户脚本的形式加载。详见 [Woodfish 桌面工具](./apps/desktop-cli/README.md)。

## 本地开发

```bash
npm install
npm run compile
npm test
npm run test:integration
npm run lint
npm run format:check
npm run verify
npm run package
```

仓库是 npm workspaces monorepo，以上命令都在根目录运行。VS Code 扩展位于 `apps/vscode-extension/`，与宿主无关的颜色算法、渐变计算、调色板和效果参数位于 `packages/theme-core/`，结构与边界见 [仓库结构](./docs/ARCHITECTURE.md)。

`npm run test:integration` 会启动隔离的 VS Code 扩展宿主，验证开启、关闭和工作台恢复。扩展入口是 `apps/vscode-extension/src/extension.ts`；主题由 `apps/vscode-extension/scripts/generate-themes.js` 生成（`npm run themes:generate`），渲染端脚本源码在 `apps/vscode-extension/browser/`（`npm run runtime:build`），注入用 CSS 在 `apps/vscode-extension/themes/shared/`。发布到 Open VSX 需要先设置环境变量 `OVSX_PAT`。

## 项目信息

- [更新日志](./apps/vscode-extension/CHANGELOG.md)
- [参与贡献](./docs/CONTRIBUTING.md)
- [提交问题](https://github.com/woodfishhhh/Woodfish-Theme/issues)
- [许可与第三方主题声明](./apps/vscode-extension/THIRD_PARTY_NOTICES.md)
