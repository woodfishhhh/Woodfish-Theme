# JetBrains IDE 的 Woodfish Theme

在 **设置 → 外观与行为 → 外观** 选择 15 套界面主题和编辑器配色。在 **设置 → 工具 → Woodfish Theme** 调整效果，顶部的代码预览随参数更新，点击“应用”后作用于其他编辑器。

## 内置效果

| 效果 | 控制项与表现 |
|---|---|
| 语法渐变 | 五套原创主题使用手调色标和各自的角度，其余颜色沿用 VS Code 的 OKLCH 算法。正文彩虹保留全部色标，中日韩字形按编辑器的字符位置绘制。 |
| 文字光晕 | 现代样式在字形下绘制多层柔光，浅色主题采用明亮的同色相光晕。怀旧（5.x）使用粗体和宽光晕。 |
| 彩虹光标 | 可调渐变色、动画周期、圆角、光晕透明度和模糊。光标叠层跟随原生插入点。 |
| 光标拖尾与打字粒子 | 两项默认关闭，可分别开启。两款编辑器运行相同的内置效果模块，JetBrains 用 Java2D 绘制轨迹和光点。 |
| 编辑器背景 | 开启后显示《彩云》，也可选择本地 JPEG、PNG 或 WebP。图片居中覆盖编辑器视口，可调不透明度、模糊和主题遮罩。 |
| 苹果圆角与弹层透色 | 苹果圆角默认开启，关闭后恢复当前外观主题的控件圆角。弹层透色有独立开关和透明度。 |
| 效果预设 | Woodfish 默认、柔和护眼、霓虹全开、怀旧（5.x）、毛玻璃、专注模式、性能优先共七种，可另存最多 32 个自定义组合。 |

详见[宿主说明](../../docs/hosts/jetbrains.md)和[配色色值对照](../../docs/hosts/jetbrains-colors.md)。

## 兼容性

- IntelliJ Platform 2024.2+（`sinceBuild=242`），不设上限。
- JBR 21（2024.2 起平台使用的运行时）。
- 纯 Java 2D：不注入 CSS、不修改 IDE 文件、不在插件自身配置之外写任何东西。

## 安装

**插件市场**。在设置 → 插件 → 市场搜索 Woodfish Theme。[插件页](https://plugins.jetbrains.com/plugin/36347-woodfish-theme)

**Release ZIP**

1. 从 [GitHub Release](https://github.com/woodfishhhh/Woodfish-Theme/releases/tag/v8.3.0) 下载 `woodfish-theme-jetbrains-8.3.0.zip`。
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

## 实现

生成器将 theme-core 和内置输入效果随插件打包。Java2D 通过编辑器高亮器和 IDE 玻璃面板绘制字形、缓存的光晕图、光标和输入轨迹。插件读取当前配色方案，并使用编辑器公开的坐标定位字形。背景图片在后台线程解码，关闭主题覆盖后恢复原生 UI 值。

## 许可

插件代码采用 [MIT 许可](LICENSE)。每套主题的许可随插件放在 `licenses/` 中，详见[第三方许可](THIRD_PARTY_NOTICES.md)。
