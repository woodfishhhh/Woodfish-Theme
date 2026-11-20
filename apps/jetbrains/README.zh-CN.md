# Woodfish Theme for JetBrains IDE — 渐变与发光核心

[Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme)（VS Code 版）的 JetBrains 移植版。
本模块是其中的**通用渐变 + 发光叠层**，可叠加在任意编辑器配色方案上；五套内置配色方案与主题
生成器会在后续变更中提交。

## 功能

| 效果 | 说明 |
|---|---|
| **渐变语法** | 每个 token 以自身颜色为中点生成三色标 OKLCH 渐变；色相偏移、明度变化、中性色补色度和渐变角度均可调。 |
| **发光** | 在文字下方绘制分层柔光，三级模糊半径，强度由单个倍率缩放；浅色背景上自动减弱。 |
| **支持中日韩文字** | 中文、日文、韩文字符与代码获得同样的渐变与发光，且不会出现重影。 |
| **实时设置页** | `Settings \| Tools \| Woodfish Theme`，拖动参数时语法高亮预览实时重绘。 |
| **预设** | 五种内置效果组合（Woodfish 默认、柔和、霓虹、专注、性能），另可保存最多 32 个自定义预设。 |
| **状态栏** | `Woodfish on · A/G`，点击打开功能菜单。 |
| **诊断信息** | 一键复制当前状态、配色方案名称与缓存计数，方便提 issue。 |

叠层独立于任何配色方案：当前用什么方案，就叠加在什么方案上。本模块不内置配色方案。

## 兼容性

- IntelliJ Platform 2024.2+（`sinceBuild=242`），不设上限。
- JBR 21（2024.2 起平台使用的运行时）。
- 纯 Java 2D：不注入 CSS、不修改 IDE 文件、不在插件自身配置之外写任何东西。

## 构建

要求 JDK 21，已包含 Gradle wrapper。

```bash
./gradlew buildPlugin    # 生成可分发 zip
./gradlew test           # 单元测试
./gradlew runIde         # 沙盒 IDE，自动打开 samples/
./gradlew verifyPlugin   # 二进制兼容性检查
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

- **挂载点是高亮器，不是组件。** 自定义 `EditorHighlighter` 包装平台高亮器并重绘字形，
  因此叠层跟随滚动、折叠与选择，但不接管编辑器组件本身。
- **颜色按编辑器解析的方式读取**，而不是直接读主题文件。
- **渐变重绘字形，发光另走缓存。** 发光在 EDT 之外光栅化到缓存图片，再绘制到文字下方。
- **刻意不碰光标**，避免与光标动画类插件冲突。
- **中日韩文字逐字重绘**，避免原生字形光栅化叠加渐变后产生的重影。

## 许可

插件代码：[MIT](LICENSE)。版权行：Copyright (c) 2024 Woodfish（原版主题）与
Copyright (c) 2026 yyyyolo7a79（JetBrains 移植）。

本模块不包含主题文件。渐变与发光实现的是原版 MIT 许可的 Woodfish Theme 的颜色算法；
五套配色方案的上游许可声明会随主题文件在后续变更中一起提交。

## 致谢

- 原项目：[Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme)（VS Code 版），
  作者 woodfishhhh —— 颜色算法、图层设计与命名均来自原项目。
- JetBrains 移植：yyyyolo7a79 —— Java 2D 渲染管线、设置页与测试。
