# Woodfish Theme for JetBrains IDE — 15 套配色，加渐变与发光

[Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme)（VS Code 版）的 JetBrains 移植版。
内含 **15 套配色**（每套是界面主题加编辑器配色方案），与 VS Code 版逐色对应；
另有**通用渐变 + 发光叠层**，可叠加在任意编辑器配色方案上。

## 功能

| 功能 | 说明 |
|---|---|
| **15 套配色** | Woodfish Dark、Dracula、Light、Black、Neon、One Dark Pro、Tokyo Night、Catppuccin Mocha 与 Latte、Nord、GitHub Dark 与 Light、Night Owl、Ayu Mirage、Gruvbox Dark。在 `Settings \| Appearance & Behavior \| Appearance` 里选择。代码、控制台和终端（16 色 ANSI）、diff、行号区竖条、inlay 提示、折叠后的文字都跟随 VS Code 主题。 |
| **渐变语法** | 每个 token 以自身颜色为中点生成三色标 OKLCH 渐变；色相偏移、明度变化、中性色补色度和渐变角度均可调。 |
| **发光** | 在文字下方绘制分层柔光，三级模糊半径，强度由单个倍率缩放；浅色背景上自动减弱。 |
| **支持中日韩文字** | 中文、日文、韩文字符与代码获得同样的渐变与发光，且不会出现重影。 |
| **实时设置页** | `Settings \| Tools \| Woodfish Theme`，拖动参数时语法高亮预览实时重绘。 |
| **预设** | 五种内置效果组合（Woodfish 默认、柔和、霓虹、专注、性能），另可保存最多 32 个自定义预设。 |
| **状态栏** | `Woodfish on · A/G`，点击打开功能菜单。 |
| **诊断信息** | 一键复制当前状态、配色方案名称与缓存计数，方便提 issue。 |

叠层独立于任何配色方案：当前用什么方案，就叠加在什么方案上。
配色由 `pnpm jetbrains:generate` 从同一套调色板和 VS Code 主题生成，`pnpm jetbrains:check` 在已提交的文件过期时报错。
颜色怎么映射、和 VS Code 有多接近，写在 [docs/hosts/jetbrains.md](../../docs/hosts/jetbrains.md) 和
[docs/hosts/jetbrains-colors.md](../../docs/hosts/jetbrains-colors.md)。

## 兼容性

- IntelliJ Platform 2024.2+（`sinceBuild=242`），不设上限。
- JBR 21（2024.2 起平台使用的运行时）。
- 纯 Java 2D：不注入 CSS、不修改 IDE 文件、不在插件自身配置之外写任何东西。

## 安装

**从 JetBrains 插件市场安装**（要等 JetBrains 审核通过后才能用，通过之前[插件页](https://plugins.jetbrains.com/plugin/36347-woodfish-theme)不公开）：
在 IDE 里打开 设置 → 插件 → 市场，搜索 `Woodfish Theme`，点安装。

**从 zip 安装**（现在就能用，审核通过之前用这个）：

1. 从 [GitHub Release](https://github.com/woodfishhhh/Woodfish-Theme/releases/tag/v8.2.3) 下载 `woodfish-theme-jetbrains-8.2.3.zip`。
2. 在 IDE 里打开 设置 → 插件 → 齿轮 → 从磁盘安装插件，选这个 zip。

两种方式装好后，如果 IDE 提示重启就重启，然后在 设置 → 外观与行为 → 外观 里选一套 Woodfish 主题。

## 构建

要求 JDK 21，已包含 Gradle wrapper。

```bash
./gradlew buildPlugin    # 生成可分发 zip（在 build/distributions/）
./gradlew test           # 单元测试
./gradlew runIde         # 沙盒 IDE，自动打开 samples/
./gradlew verifyPlugin   # 二进制兼容性检查
```

装进自己的 IDE：`Settings | Plugins | ⚙ | Install Plugin from Disk…`，选这个 zip。

配色在仓库根目录重新生成：

```bash
pnpm jetbrains:generate  # themes/*.xml、themes/*.theme.json、licenses/、docs/hosts/jetbrains-keys.md
pnpm jetbrains:check     # 已提交的文件与调色板、VS Code 主题一致
```

如果不想下载平台分发包，可以指向本机已安装的 IDE。新建 `gradle.local.properties`（已被 git 忽略）：

```properties
platformLocalPath=D:/path/to/IntelliJIDEA2024.3
```

## 目录

```
core/color/   OKLCH、渐变端点、模糊核 —— 纯 Java，带单元测试
editor/       高亮器挂载点、帧扫描、渐变与发光渲染器、缓存
settings/     持久化状态、取值范围、预设
ui/           设置页、状态栏、动作、诊断
samples/      视觉检查用样例：英文代码、中文注释、连字、emoji、表格
```

## 实现要点

- **挂载点是范围高亮器，不是组件。** 叠层在编辑器的标记模型中添加自定义渲染器，不替换宿主的语法高亮器。
- **颜色按编辑器解析的方式读取**，而不是直接读主题文件。
- **渐变重绘字形，发光另走缓存。** 发光在 EDT 之外光栅化到缓存图片，再绘制到文字下方。
- **刻意不碰光标**，避免与光标动画类插件冲突。
- **中日韩文字逐字重绘**，避免原生字形光栅化叠加渐变后产生的重影。

## 许可

插件代码：[MIT](LICENSE)。版权行：Copyright (c) 2024 Woodfish（原版主题）与
Copyright (c) 2026 yyyyolo7a79（JetBrains 移植）。

渐变与发光实现的是原版 MIT 许可的 Woodfish Theme 的颜色算法。15 套配色里有几套源自第三方主题，
每套主题的许可随插件分发（`licenses/`）。第三方许可见[模块清单](THIRD_PARTY_NOTICES.md)。

## 致谢

- 原项目：[Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme)（VS Code 版），
  作者 woodfishhhh —— 颜色算法、图层设计与命名均来自原项目。
- JetBrains 移植：yyyyolo7a79 —— Java 2D 渲染管线、设置页与测试。
