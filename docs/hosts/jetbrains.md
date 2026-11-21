# JetBrains：15 套配色，加渐变与发光

[插件工程](../../apps/jetbrains) · [生成器](../../apps/jetbrains/scripts/generate.js) · [映射表](../../apps/jetbrains/scripts/scopeMap.js) · [属性名核实表](./jetbrains-keys.md) · [色值对照表](./jetbrains-colors.md)

`pnpm jetbrains:generate` 从 `WOODFISH_PALETTES` 枚举主题，按显示名找到 VS Code 扩展注册的主题 JSON，生成 `apps/jetbrains/src/main/resources/themes/woodfish-<slug>.xml`（编辑器配色方案）和 `.theme.json`（界面主题），并把每套主题的许可文本放进 `licenses/`。`pnpm jetbrains:check` 比较内容，检查多余文件和 `plugin.xml` 里的 `themeProvider`，不写文件。渐变与发光仍是同一个插件里的独立模块，生成脚本不碰它。

| 项目 | 做法 |
|---|---|
| 取色 | `themeMatch.js` 按 VS Code 分词器的规则对 scope 栈逐级取色：外层到内层，每层取最具体的规则，只覆盖该规则设置了的前景和字体样式。用 VS Code 自带语法和 `vscode-textmate` 对 15 套主题 × 8 种语言共 12 986 个 token 逐个对拍，结果 0 处不同。 |
| 属性 | `scopeMap.js` 每行是「JetBrains 属性名 → VS Code 里给同类 token 着色的 scope 栈」。多数语言属性回退到 `DEFAULT_*`，但父方案 Darcula / Default 和语言叠加文件（`PythonDarcula.xml`、`MarkdownDarcula.xml`、`XmlDarcula.xml`）显式定义了的属性不会回退，不覆盖就会漏出 Darcula 的颜色，所以都列出来。 |
| 属性名核实 | `scripts/audit-keys.py` 解析 IDE 发行包里的类常量池和配色方案 XML，记录每个名字在哪个产品、哪个版本里找到，写进 `scripts/verified-keys.json`；测试拒绝不在其中的名字。覆盖 IC 2024.1.7、IC 2025.2.6.4、IU 2026.3、PyCharm CE 2025.2.6.3、Go 插件 243 / 252 / 263、Rust 插件 233 / 262。新增属性时按 `--keys <文件> --merge` 只为新名字补记录。 |
| 界面主题 | 背景、前景、边框、选区、强调色来自调色板的 `ui`；不换图标、不加装饰，控件形状保持 JetBrains 原样。 |
| 编辑器界面色 | 背景、前景、行号、当前行、选区、光标、搜索高亮、错误和警告取 VS Code 主题的同名颜色；主题没写时用 VS Code 的默认值，当前行没写时不填充。带透明度的颜色在编辑器背景上合成，JetBrains 的颜色不带 alpha。 |
| 默认文字色 | JetBrains 的 `TEXT` 同时是代码里没有专用键的标识符的颜色，取 VS Code 里 `source` 规则给普通代码的颜色，没有这条规则时用 `editor.foreground`。只有 Woodfish Dark 两者不同（`#AFBBD2` 与 `#D0D7E4`）。Markdown 正文用 `MARKDOWN_TEXT` 单独取 `editor.foreground`。 |
| 控制台和终端 | 16 色 ANSI 用 `palette.ansi`，与终端配色包同一份值（15 套主题的 VS Code `terminal.ansi*` 与它完全相同）：经典终端读 `CONSOLE_*_OUTPUT`，新终端读 `BLOCK_TERMINAL_*`，两组都写。背景是 `CONSOLE_BACKGROUND_KEY`，前景是 `CONSOLE_NORMAL_OUTPUT`，取主题的 `terminal.background` / `terminal.foreground`，没写时取调色板的 `ui.bg` / `ui.fg`（终端配色包同样如此）。`CONSOLE_ERROR_OUTPUT` 用 ANSI 红。 |
| diff | 新增、删除行底色取 `diffEditor.insertedLineBackground` / `removedLineBackground`（`DIFF_INSERTED`、`DIFF_DELETED`）。VS Code 没有「修改」色，改动行是左边删除、右边新增，所以 `DIFF_MODIFIED` 取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色。滚动条上的标记取 `editorOverviewRuler.*`。行号区的新增、修改、删除竖条（`ADDED_LINES_COLOR` 等）取 `editorGutter.*Background`。 |
| inlay 提示 | 类型提示（`INLAY_DEFAULT`）和参数提示（`INLINE_PARAMETER_HINT`）各取 VS Code 的 `editorInlayHint.type*` / `parameter*`，没写时回退到基础的一对，再没有就是 VS Code 的默认值（前景 #969696，背景是 `badge.background` 的 10 %）。 |
| 折叠 | `FOLDED_TEXT_ATTRIBUTES`：占位文字取 `editor.foldPlaceholderForeground`，背景取 `editor.foldBackground`（主题没写时是选区色的 30 %）。 |
| VS Code 默认值 | 主题没写的颜色取 VS Code 1.147 自己的默认值，规则读自它的 workbench 包，写在 `scripts/editorMap.js`。 |
| 嵌入语言背景 | Darcula 和 Default 给 Markdown 围栏、字符串里的嵌入代码铺了底色（`INJECTED_LANGUAGE_FRAGMENT`），VS Code 没有，覆盖为编辑器背景色。 |

## 验收方法

- 所有窗口只在 WSL 里私有的 Xvfb 上打开：`DISPLAY=:77`（IDE）、`:78`（VS Code）、`:79`（PyCharm），并且 `unset WAYLAND_DISPLAY`，否则 WSLg 会把窗口画到 Windows 桌面上。
- IntelliJ IDEA Community 2025.2.6.4 打开带 JDK 和 Kotlin 标准库的项目，看 Java、Kotlin、JSON、Markdown；PyCharm Community 2025.2.6.3 看 Python。TypeScript、Go、Rust 的语言专用高亮需要付费 IDE，不截图，靠属性名核实表兜底。VS Code 1.147 只加载主题，不加载 Woodfish 扩展，没有背景图和任何特效；两边装的都是只含主题的包，JetBrains 一侧的渐变与发光关闭，只比配色。
- 两边用同一份代码、JetBrains Mono 15 px（字宽正好 9 px）、行高 26 px，编辑器区域裁成一样大。两边都用灰度抗锯齿：子像素抗锯齿的彩边会让取色出错。
- IDE 里关掉与配色无关的干扰：项目面板收起，意图灯泡、行号区图标、拼写和语法检查、内嵌提示、代码折叠、代码检查（语法级别）。光标放在第 1 行；Markdown 放在第 2 行，否则 Markdown 插件会把光标所在的标题当成「光标下的元素」铺上高亮色。
- 终端、diff、inlay、折叠、行号区竖条另拍：Hints.kt（Kotlin，带参数提示，折叠 `names`）加终端里用 `printf` 打出 16 个前景块和 16 个背景块；`idea diff` 打开两版 Java 文件（有新增、删除、修改各一处）；`Vcs.java` 在一个 git 仓库里与最后一次提交不同。块的颜色在截图里逐个取，行与行之间的位置不写死：先找到那一排 16 个与调色板相近的色块再取色。
- 每张截图落盘后检查项目面板是否真的收起，没收起就翻一次 `Ctrl+Shift+F12` 重拍；再测量代码起点的 x 坐标，75 张 IDE 截图的起点一致，才拿去合成和取色。
- 色值对照不靠眼看：用 VS Code 自己的分词器算出每个 token 应有的颜色，再从两张截图里取同一个字符格的颜色（离背景最远的像素），一致就是 JetBrains 里实际显示的颜色等于 VS Code 的颜色。结果见 [色值对照表](./jetbrains-colors.md)。
- 插件用 `./gradlew verifyPlugin` 对 IC 2024.2、IC 2024.3、IC 2025.2、IU 2026.3 做二进制兼容检查，均为 Compatible。
- JetBrains 的坑：`bin/idea` 原生启动器不认 `IDEA_PROPERTIES`，用 `idea.sh`；PyCharm 读的是 `PYCHARM_PROPERTIES`；PyCharm 每次启动都会问是否信任目录，需要点掉；首次启动新界面会把主题重置成默认，要先空跑一次再写 `laf.xml`；`options/*.xml` 的文件名或属性名写错时 IDE 不报错，只是不生效，新设置要用 IDE 类文件里的真名核对（`audit-keys.py` 的扫描思路同样适用）；`pkill -f` 的模式会匹配到调用它的 shell 自己。

## 没有映射的

控制台里的 system / user-input 输出色、diff 的冲突色、inlay 提示正在输入时的高亮（`INLINE_PARAMETER_HINT_CURRENT` / `_HIGHLIGHTED`）、终端选区、调试器和 VCS 日志的颜色：VS Code 里没有一一对应的颜色，不凭空造，这几项仍然是 Darcula / Default 的。

## 已知差异

IDE 自己的渲染：inlay 方块的底色以约 55 % 不透明度绘制（Dark 的 #2B3343 实际画成 #242C3B），有词级差异的修改行，整行底色被冲淡，词级片段才是方案色。默认设置下行号区不画「删除」标记，`DELETED_LINES_COLOR` 在截图里看不到。类型提示没有在截图里出现（Kotlin 对 `val` 的类型提示只在类型不明显时才显示），`INLAY_DEFAULT` 的值取法与参数提示相同，没有单独的实拍。



JetBrains 按语法树着色，VS Code 按文法的 scope 着色。下面这些情况下 JetBrains 没有对应的细分属性，选了最接近的一个：

- 类声明和类引用共用一个类名属性（VS Code 里声明和引用可以不同色）。
- `import` 和 `package` 后面的名字用类名属性。
- 基本类型（`int`、`void`）、`true`、`false`、`null`、`None` 都算关键字。
- 修饰符、`class`、`def`、`import` 都是关键字，VS Code 的主题可以分开着色。
- 点号前的限定名：VS Code 按位置着色，JetBrains 按语义（类、字段、参数）着色。
- `self`：形参和函数体里的 `self` 共用 `PY.SELF_PARAMETER`，取函数体里的颜色。
- JSON 的属性名只有一个属性，VS Code 的个别主题按嵌套层级着色。
- Kotlin：VS Code 没有内置 Kotlin 语法，对比用的是社区文法，只按位置粗略着色。

每类差异各有多少处见 [色值对照表](./jetbrains-colors.md)。
