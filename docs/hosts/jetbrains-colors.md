# JetBrains 配色与 VS Code 的色值对照

[配色说明](./jetbrains.md) · [属性名核实表](./jetbrains-keys.md)

15 套主题，同一份示例代码（Java、Kotlin、Python、JSON、Markdown 各一段，20 到 31 行），JetBrains Mono 15 px，两边都用灰度抗锯齿。
JetBrains 一侧是 IntelliJ IDEA Community 2025.2.6.4（Python 用 PyCharm Community 2025.2.6.3），装的是只含主题的插件；
VS Code 一侧是 1.147，只加载主题，没有背景图和任何特效。颜色不靠眼看：先用 VS Code 自己的分词器算出每个 token 应有的颜色，
再从两张截图里取同一个字符格的颜色（离背景最远的像素），与期望值相差在容差内算一致。
TypeScript、Go、Rust 的语言专用高亮需要付费 IDE，没有截图，靠属性名核实表兜底。
终端、diff、行号区竖条、inlay 提示、折叠这几类不是 token，单独列行：方案里的值对照 VS Code 的值（15 套全做），
Dark 和 Light 再从 IDE 截图里取实际显示的颜色。

「没有细分键」：JetBrains 对这类内容只有一个属性（或没有对应的属性），VS Code 的主题却按 scope 分别着色，选了最接近的一个。
「映射错了」：JetBrains 有对应的细分属性，或映射的 scope 选错。这类问题已全部修掉。
「IDE 渲染」：方案里的值和 VS Code 一致，但 IDE 自己画出来的颜色不同，主题改不了。

## 总览

### 编辑器界面色、终端、diff、行号区竖条、inlay 提示、折叠

每套 13 行编辑器界面色加 30 行其余，15 套共 645 行：一致 627，没有细分键 16，IDE 渲染 2，映射错了 0。

- 没有细分键 16 行：Woodfish Dark 的「前景」1 行（JetBrains 只有一个默认文字色，它也是代码里没有专用键的标识符的颜色，所以取 `source` 规则的 #AFBBD2，而不是 `editor.foreground` 的 #D0D7E4）；
  每套的「修改行底色」1 行共 15 行（VS Code 没有「修改」色，改动行是左边删除、右边新增，这里取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色）。
- IDE 渲染 2 行：Dark 和 Light 的 inlay 参数提示底色。IDE 以约 55 % 不透明度画方块底色，Dark 的 #2B3343 实际画成 #242C3B。

| 主题 | 行数 | 一致 | 没有细分键 | IDE 渲染 | 映射错了 | 截图核对 |
| --- | --- | --- | --- | --- | --- | --- |
| Woodfish Dark | 30 | 28 | 1 | 1 | 0 | Dark/Light 截图实测 |
| Woodfish Dracula | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish Light | 30 | 28 | 1 | 1 | 0 | Dark/Light 截图实测 |
| Woodfish Black | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish Neon | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish One Dark Pro | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish Tokyo Night | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish Catppuccin Mocha | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish Catppuccin Latte | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish Nord | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish GitHub Dark | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish GitHub Light | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish Night Owl | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish Ayu Mirage | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| Woodfish Gruvbox Dark | 30 | 29 | 1 | 0 | 0 | 方案值与 VS Code 值对照 |
| **合计** | 450 | 433 | 15 | 2 | 0 | |

### token 颜色

15 套共 4156 个 token：一致 3344，没有细分键 812，映射错了 0。
判据不靠 scope 名：JetBrains 画成某个颜色的所有 token 里，只要在 VS Code 里期望的颜色不止一种，就是一个属性被多种 VS Code token 共用；
只有所有这些 token 都期望同一个别的颜色，才是映射错了。812 处不一致全部落在前一种。

| 主题 | 界面色一致 | token 总数 | 一致 | 没有细分键 | 映射错了 |
| --- | --- | --- | --- | --- | --- |
| Woodfish Dark | 12/13 | 276 | 197 | 79 | 0 |
| Woodfish Dracula | 13/13 | 278 | 232 | 46 | 0 |
| Woodfish Light | 13/13 | 278 | 210 | 68 | 0 |
| Woodfish Black | 13/13 | 278 | 209 | 69 | 0 |
| Woodfish Neon | 13/13 | 276 | 205 | 71 | 0 |
| Woodfish One Dark Pro | 13/13 | 278 | 245 | 33 | 0 |
| Woodfish Tokyo Night | 13/13 | 276 | 181 | 95 | 0 |
| Woodfish Catppuccin Mocha | 13/13 | 276 | 231 | 45 | 0 |
| Woodfish Catppuccin Latte | 13/13 | 278 | 234 | 44 | 0 |
| Woodfish Nord | 13/13 | 276 | 260 | 16 | 0 |
| Woodfish GitHub Dark | 13/13 | 278 | 244 | 34 | 0 |
| Woodfish GitHub Light | 13/13 | 278 | 244 | 34 | 0 |
| Woodfish Night Owl | 13/13 | 278 | 224 | 54 | 0 |
| Woodfish Ayu Mirage | 13/13 | 276 | 219 | 57 | 0 |
| Woodfish Gruvbox Dark | 13/13 | 276 | 209 | 67 | 0 |
| **合计** | | 4156 | 3344 | 812 | 0 |

没有细分键，按原因：

| 处数 | 原因 | 例 |
| ---: | --- | --- |
| 136 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | LIMIT, val, firstOrNul, emptyList |
| 108 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | str, int, println, 0x |
| 93 | 关键字细分：JetBrains 的关键字只有一个键，VS Code 对修饰符、声明、导入分别着色 | import, fun, new, return |
| 87 | true / false / null / None：JetBrains 当作关键字，没有独立键 | None, null, true, False |
| 80 | import / package 路径：JetBrains 与类型引用共用类名键，VS Code 单独着色 | java, util, kotlin.mat, ArrayList |
| 76 | 声明与引用共用一个键 | first, main, id, name |
| 74 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, path, list, int |
| 45 | 基本类型：JetBrains 当作关键字，没有独立键 | int, boolean, void, String |
| 34 | 点号前的限定名：VS Code 按位置着色，JetBrains 按语义（类、字段）着色 | List, System, out, items |
| 28 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | max, found = $h |
| 20 | 类声明：JetBrains 的声明与引用共用同一个类名键 | Example, class, User, Store |
| 15 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item t |
| 9 | JSON：JetBrains 的属性名、数字、字符串各只有一个键，VS Code 的这套主题按嵌套层级着色 | build, test, max, ratio |
| 7 | 类型引用细分：JetBrains 的类型引用只有一个键 | String |

其中「VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息」136 处来自对比用的 Kotlin 文法：VS Code 没有内置 Kotlin，对拍用的是社区文法，
它按位置给 `val`、常量、调用着色，没有语义信息，用户装了别的 Kotlin 扩展后的样子可能不同。

### 已修的映射错误

- 代码默认文字色：JetBrains 的 `TEXT` 同时是没有专用键的标识符的颜色。Woodfish Dark 里 `editor.foreground` 是 `#D0D7E4`，
  而没有更具体规则的代码取 `source` 规则的 `#AFBBD2`，改为后者，Python、Kotlin 里的普通标识符才一致。
- Markdown 正文：上一条改动后，Markdown 正文在 VS Code 里仍是 `editor.foreground`，加了 `MARKDOWN_TEXT` 单独着色。
- 嵌入语言背景：Darcula 和 Default 给 Markdown 围栏、字符串里的嵌入代码铺了底色（`INJECTED_LANGUAGE_FRAGMENT`），
  VS Code 没有，改为编辑器背景色。
- `PY.SELF_PARAMETER`：同一个属性覆盖形参和函数体里的 `self`，改取函数体里的颜色（出现得更多）。
  形参处的 `self` 在 5 套主题里会和 VS Code 不同：Tokyo Night、GitHub Dark、GitHub Light、Night Owl、Ayu Mirage
  （这 5 套里 VS Code 给形参和函数体里的 `self` 着不同的色）。
- 第一轮对拍里改过的：注解的成员级属性、Markdown 各级标题、Python 函数名、XML 的属性名。

### 新增的映射

控制台和终端的 16 色 ANSI（用终端配色包的 `palette.ansi`，经典终端用的 `CONSOLE_*_OUTPUT` 和新终端用的 `BLOCK_TERMINAL_*` 同值），
终端背景和前景；diff 的新增、删除、修改行底色；行号区的新增、修改、删除竖条；inlay 提示（类型、参数）；折叠后的占位文字。
VS Code 主题里没有写的颜色取 VS Code 1.147 自己的默认值（`diffEditor.insertedLineBackground` 的 #9BB95533 等，读自它的 workbench 包）。

## Woodfish Dark

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#1C2433` | `#1C2433` | ✓ |  |
| 前景 | `#AFBBD2` | `#D0D7E4` | ✗（没有细分键） | JetBrains 只有一个默认文字色，它也是代码里没有专用键的标识符的颜色，所以取上一行的 `source` 规则色 |
| 行号 | `#404A5F` | `#404A5F` | ✓ |  |
| 当前行行号 | `#8E9DBA` | `#8E9DBA` | ✓ |  |
| 当前行 | `#222B3B` | `#222B3B` | ✓ |  |
| 选区 | `#3A465A` | `#3A465A` | ✓ |  |
| 光标 | `#EACD61` | `#EACD61` | ✓ |  |
| 搜索高亮 | `#2F394B` | `#2F394B` | ✓ |  |
| 错误 | `#E35535` | `#E35535` | ✓ |  |
| 警告 | `#EACD61` | `#EACD61` | ✓ |  |
| 代码默认文字（`source` 规则） | `#AFBBD2` | `#AFBBD2` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#1C2433` | `#1C2433` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#222B3B` | `#222A3B` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 6/13 | `#22ECDB` → `#B78AFF` | 没有细分键 | 类声明：JetBrains 的声明与引用共用同一个类名键 | Example, LIMIT, User, Store |
| comment | 8/9 | `#4A5E84` → `#B78AFF` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#E35535` → `#AFBBD2` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 6/9 | `#FF955C` → `#AFBBD2` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | items, items, path |
| function call | 15/18 | `#FF738A` → `#F38CEC` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, os, path |
| function definition | 8/13 | `#B78AFF` → `#EACD61` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, boolean, def, int |
| json key | 17/17 |  |  |  |  |
| keyword | 28/53 | `#FF955C` → `#B78AFF` | 没有细分键 | import / package 路径：JetBrains 与类型引用共用类名键，VS Code 单独着色 | demo, woodfish, java, util |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#B78AFF` → `#FB955C` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 26/38 | `#AFBBD2` → `#69C3FF` | 没有细分键 | 点号前的限定名：VS Code 按位置着色，JetBrains 按语义（类、字段）着色 | List, items, items, System |
| parameter | 12/15 | `#F38CEC` → `#AFBBD2` | 没有细分键 | 声明与引用共用一个键 | id, name, users |
| string | 17/20 | `#3CEC85` → `#AFBBD2` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max, value |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#E35535` → `#EACD61` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 12/21 | `#B78AFF` → `#69C3FF` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, void, int, boolean |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#1C2433` `#E35535` `#3CEC85` `#EACD61` `#69C3FF` `#F38CEC` `#22ECDB` `#D0D7E4` `#3E4F71` `#FF4319` `#29FF82` `#FFD94C` `#69C3FF` `#FF80F6` `#0FFFEB` `#FFFFFF` | `#1C2433` `#E35535` `#3CEC85` `#EACD61` `#69C3FF` `#F38CEC` `#22ECDB` `#D0D7E4` `#3E4F71` `#FF4319` `#29FF82` `#FFD94C` `#69C3FF` `#FF80F6` `#0FFFEB` `#FFFFFF` | 同左，16 个块逐个取色 | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#1A212F` | `#1A212F` | `#1A212F` | ✓ |  |
| 终端 | 前景 | `#D0D7E4` | `#D0D7E4` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#1E3A3B` | `#1E3A3B` | `#1E3A3B` | ✓ |  |
| diff | 删除行底色 | `#322831` | `#322831` | `#322831` | ✓ |  |
| diff | 修改行底色 | `#223144` | — | `#223144` | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#36C475` | `#36C475` | `#36C475` | ✓ |  |
| 行号区竖条 | 修改 | `#5AA3D6` | `#5AA3D6` | `#5AA3D6` | ✓ |  |
| 行号区竖条 | 删除 | `#BB4B35` | `#BB4B35` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#2B3343` | `#2B3343` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#8892A7` | `#8892A7` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#2B3343` | `#2B3343` | `#242C3B` | ✗（IDE 渲染） | IDE 以约 55 % 不透明度绘制方块底色，主题改不了 |
| inlay 提示 | 参数提示前景 | `#8892A7` | `#8892A7` | `#8591A6` | ✓ |  |
| 折叠 | 占位文字前景 | `#4A5E84` | `#4A5E84` | `#4A5E84` | ✓ |  |
| 折叠 | 折叠背景 | `#161D29` | `#161D29` | `#161D29` | ✓ |  |

## Woodfish Dracula

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#282A36` | `#282A36` | ✓ |  |
| 前景 | `#F8F8F2` | `#F8F8F2` | ✓ |  |
| 行号 | `#6272A4` | `#6272A4` | ✓ |  |
| 当前行行号 | `#C6C6C6` | `#C6C6C6` | ✓ | VS Code 默认值 |
| 当前行 | `#282A36` | `#282A36` | ✓ | VS Code 无填充 |
| 选区 | `#44475A` | `#44475A` | ✓ |  |
| 光标 | `#AEAFAD` | `#AEAFAD` | ✓ | VS Code 默认值 |
| 搜索高亮 | `#947151` | `#947151` | ✓ |  |
| 错误 | `#FF5555` | `#FF5555` | ✓ |  |
| 警告 | `#8BE9FD` | `#8BE9FD` | ✓ |  |
| 代码默认文字（`source` 规则） | `#F8F8F2` | `#F8F8F2` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#282A36` | `#282A36` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#282A36` | `#282A36` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 10/13 | `#8BE9FD` → `#F8F8F2` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | LIMIT, User?, LIMIT |
| comment | 8/9 | `#6272A4` → `#8BE9FD` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#BD93F9` → `#F8F8F2` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 14/18 | `#F8F8F2` → `#FFB86C` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, println, println, path |
| function definition | 9/13 | `#8BE9FD` → `#FF79C6` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, boolean, first, main |
| json key | 17/17 |  |  |  |  |
| keyword | 47/55 | `#F8F8F2` → `#8BE9FD` | 没有细分键 | import / package 路径：JetBrains 与类型引用共用类名键，VS Code 单独着色 | demo, woodfish, java, util |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#FF79C6` → `#BA93F6` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 30/38 | `#F8F8F2` → `#8BE9FD` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, firstOrNull, id |
| parameter | 12/15 | `#FFB86C` → `#F8F8F2` | 没有细分键 | 声明与引用共用一个键 | id, name, users |
| string | 18/20 | `#F1FA8C` → `#F8F8F2` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#BD93F9` → `#FF79C6` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 16/21 | `#8BE9FD` → `#FF79C6` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, void, int, boolean |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#21222C` `#FF5555` `#50FA7B` `#F1FA8C` `#BD93F9` `#FF79C6` `#8BE9FD` `#F8F8F2` `#6272A4` `#FF6E6E` `#69FF94` `#FFFFA5` `#D6ACFF` `#FF92DF` `#A4FFFF` `#FFFFFF` | `#21222C` `#FF5555` `#50FA7B` `#F1FA8C` `#BD93F9` `#FF79C6` `#8BE9FD` `#F8F8F2` `#6272A4` `#FF6E6E` `#69FF94` `#FFFFA5` `#D6ACFF` `#FF92DF` `#A4FFFF` `#FFFFFF` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#282A36` | `#282A36` |  | ✓ |  |
| 终端 | 前景 | `#F8F8F2` | `#F8F8F2` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#3F473C` | `#3F473C` |  | ✓ |  |
| diff | 删除行底色 | `#53222B` | `#53222B` |  | ✓ |  |
| diff | 修改行底色 | `#323D4A` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#3C9259` | `#3C9259` |  | ✓ |  |
| 行号区竖条 | 修改 | `#5A8A9A` | `#5A8A9A` |  | ✓ |  |
| 行号区竖条 | 删除 | `#944046` | `#944046` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#2B2D3A` | `#2B2D3A` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#969696` | `#969696` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#2B2D3A` | `#2B2D3A` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#969696` | `#969696` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#242631` | `#242631` |  | ✓ |  |

## Woodfish Light

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#FBFAF7` | `#FBFAF7` | ✓ |  |
| 前景 | `#24292F` | `#24292F` | ✓ |  |
| 行号 | `#8C959F` | `#8C959F` | ✓ |  |
| 当前行行号 | `#24292F` | `#24292F` | ✓ |  |
| 当前行 | `#F1EEE6` | `#F1EEE6` | ✓ |  |
| 选区 | `#C9DCF7` | `#C9DCF7` | ✓ |  |
| 光标 | `#B4235A` | `#B4235A` | ✓ |  |
| 搜索高亮 | `#F6D58E` | `#F6D58E` | ✓ |  |
| 错误 | `#CF222E` | `#CF222E` | ✓ |  |
| 警告 | `#9A6700` | `#9A6700` | ✓ |  |
| 代码默认文字（`source` 规则） | `#24292F` | `#24292F` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#FBFAF7` | `#FBFAF7` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#F1EEE6` | `#F1EEE6` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 8/13 | `#0B7568` → `#24292F` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | Example, LIMIT, User?, LIMIT |
| comment | 8/9 | `#6A737D` → `#B4235A` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#A04F00` → `#24292F` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 6/9 | `#2B3A67` → `#24292F` | 没有细分键 | 声明与引用共用一个键 | item, offset, strict |
| function call | 16/18 | `#24292F` → `#8A6200` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, path |
| function definition | 6/13 | `#0B7568` → `#7B3FC4` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, boolean, def, first |
| json key | 17/17 |  |  |  |  |
| keyword | 38/55 | `#B4235A` → `#7B3FC4` | 没有细分键 | 关键字细分：JetBrains 的关键字只有一个键，VS Code 对修饰符、声明、导入分别着色 | package, import, import, new |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#7B3FC4` → `#A24F04` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 28/38 | `#24292F` → `#1F5FBF` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, out, demo.woodfis |
| parameter | 12/15 | `#8A6200` → `#24292F` | 没有细分键 | 声明与引用共用一个键 | id, name, users |
| string | 18/20 | `#3B7A1C` → `#24292F` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#A04F00` → `#B4245C` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 11/21 | `#0B7568` → `#7B3FC4` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, void, int, boolean |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#24292F` `#CF222E` `#1A7F37` `#9A6700` `#1F5FBF` `#8250DF` `#1B7C83` `#6E7781` `#57606A` `#A40E26` `#2DA44E` `#BF8700` `#218BFF` `#A475F9` `#3192AA` `#8C959F` | `#24292F` `#CF222E` `#1A7F37` `#9A6700` `#1F5FBF` `#8250DF` `#1B7C83` `#6E7781` `#57606A` `#A40E26` `#2DA44E` `#BF8700` `#218BFF` `#A475F9` `#3192AA` `#8C959F` | 同左，16 个块逐个取色 | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#F3F1EC` | `#F3F1EC` | `#F3F1EC` | ✓ |  |
| 终端 | 前景 | `#24292F` | `#24292F` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#E9F0E8` | `#E9F0E8` | `#E9F0E8` | ✓ |  |
| diff | 删除行底色 | `#F8EBE9` | `#F8EBE9` | `#F8EBE9` | ✓ |  |
| diff | 修改行底色 | `#EAEEF3` | — | `#EAEEF3` | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#1A7F37` | `#1A7F37` | `#1A7F37` | ✓ |  |
| 行号区竖条 | 修改 | `#1F5FBF` | `#1F5FBF` | `#1F5FBF` | ✓ |  |
| 行号区竖条 | 删除 | `#CF222E` | `#CF222E` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#EEEEEC` | `#EEEEEC` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#57606A` | `#57606A` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#EEEEEC` | `#EEEEEC` | `#F4F4F0` | ✗（IDE 渲染） | IDE 以约 55 % 不透明度绘制方块底色，主题改不了 |
| inlay 提示 | 参数提示前景 | `#57606A` | `#57606A` | `#59626C` | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` | `#808080` | ✓ |  |
| 折叠 | 折叠背景 | `#EAEEF3` | `#EAEEF3` | `#EAEEF3` | ✓ |  |

## Woodfish Black

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#000000` | `#000000` | ✓ |  |
| 前景 | `#E6E6E6` | `#E6E6E6` | ✓ |  |
| 行号 | `#6B6B6B` | `#6B6B6B` | ✓ |  |
| 当前行行号 | `#E6E6E6` | `#E6E6E6` | ✓ |  |
| 当前行 | `#0E0E0E` | `#0E0E0E` | ✓ |  |
| 选区 | `#2A2440` | `#2A2440` | ✓ |  |
| 光标 | `#EA618E` | `#EA618E` | ✓ |  |
| 搜索高亮 | `#5C4A12` | `#5C4A12` | ✓ |  |
| 错误 | `#FF5C7A` | `#FF5C7A` | ✓ |  |
| 警告 | `#EACD61` | `#EACD61` | ✓ |  |
| 代码默认文字（`source` 规则） | `#E6E6E6` | `#E6E6E6` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#000000` | `#000000` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#0E0E0E` | `#0E0E0E` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 8/13 | `#22ECDB` → `#E6E6E6` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | Example, LIMIT, User?, LIMIT |
| comment | 8/9 | `#6E7D92` → `#B78AFF` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#FF9E64` → `#E6E6E6` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 16/18 | `#E6E6E6` → `#EACD61` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, path |
| function definition | 6/13 | `#22ECDB` → `#B78AFF` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, boolean, def, first |
| json key | 17/17 |  |  |  |  |
| keyword | 34/55 | `#EA618E` → `#B78AFF` | 没有细分键 | 关键字细分：JetBrains 的关键字只有一个键，VS Code 对修饰符、声明、导入分别着色 | package, demo, woodfish, import |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#B78AFF` → `#FA9E62` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 28/38 | `#E6E6E6` → `#61AFEA` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, out, demo.woodfis |
| parameter | 12/15 | `#EACD61` → `#E6E6E6` | 没有细分键 | 声明与引用共用一个键 | id, name, users |
| string | 18/20 | `#3CEC85` → `#E6E6E6` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#FF9E64` → `#E9618C` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 11/21 | `#22ECDB` → `#B78AFF` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, void, int, boolean |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#1A1A1A` `#FF5C7A` `#3CEC85` `#EACD61` `#61AFEA` `#B78AFF` `#22ECDB` `#D4D4D4` `#5C5C5C` `#FF8197` `#6AF5A2` `#F5DD85` `#8AC6F2` `#CDB0FF` `#6BF5EA` `#FFFFFF` | `#1A1A1A` `#FF5C7A` `#3CEC85` `#EACD61` `#61AFEA` `#B78AFF` `#22ECDB` `#D4D4D4` `#5C5C5C` `#FF8197` `#6AF5A2` `#F5DD85` `#8AC6F2` `#CDB0FF` `#6BF5EA` `#FFFFFF` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#0A0A0A` | `#0A0A0A` |  | ✓ |  |
| 终端 | 前景 | `#E6E6E6` | `#E6E6E6` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#06180E` | `#06180E` |  | ✓ |  |
| diff | 删除行底色 | `#1A090C` | `#1A090C` |  | ✓ |  |
| diff | 修改行底色 | `#0A1218` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#3CEC85` | `#3CEC85` |  | ✓ |  |
| 行号区竖条 | 修改 | `#61AFEA` | `#61AFEA` |  | ✓ |  |
| 行号区竖条 | 删除 | `#FF5C7A` | `#FF5C7A` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#0D0D0D` | `#0D0D0D` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#A3A3A3` | `#A3A3A3` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#0D0D0D` | `#0D0D0D` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#A3A3A3` | `#A3A3A3` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#121008` | `#121008` |  | ✓ |  |

## Woodfish Neon

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#0D0B1E` | `#0D0B1E` | ✓ |  |
| 前景 | `#E8E3FF` | `#E8E3FF` | ✓ |  |
| 行号 | `#6C6A99` | `#6C6A99` | ✓ |  |
| 当前行行号 | `#E8E3FF` | `#E8E3FF` | ✓ |  |
| 当前行 | `#151232` | `#151232` | ✓ |  |
| 选区 | `#3A2A6E` | `#3A2A6E` | ✓ |  |
| 光标 | `#00E5FF` | `#00E5FF` | ✓ |  |
| 搜索高亮 | `#6B2A5E` | `#6B2A5E` | ✓ |  |
| 错误 | `#FF4D6D` | `#FF4D6D` | ✓ |  |
| 警告 | `#FFE66D` | `#FFE66D` | ✓ |  |
| 代码默认文字（`source` 规则） | `#E8E3FF` | `#E8E3FF` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#0D0B1E` | `#0D0B1E` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#151232` | `#151232` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 8/13 | `#01FFC3` → `#E8E3FF` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | Example, LIMIT, User?, LIMIT |
| comment | 8/9 | `#7A76B0` → `#B967FF` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#FF9E3D` → `#E8E3FF` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 16/18 | `#E8E3FF` → `#FFE66D` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, path |
| function definition | 6/13 | `#01FFC3` → `#B967FF` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, boolean, def, first |
| json key | 17/17 |  |  |  |  |
| keyword | 30/53 | `#FF2E97` → `#B967FF` | 没有细分键 | 关键字细分：JetBrains 的关键字只有一个键，VS Code 对修饰符、声明、导入分别着色 | demo, woodfish, import, java |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#B967FF` → `#FA9E3C` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 28/38 | `#E8E3FF` → `#00E5FF` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, out, demo.woodfis |
| parameter | 12/15 | `#FFE66D` → `#E8E3FF` | 没有细分键 | 声明与引用共用一个键 | id, name, users |
| string | 18/20 | `#B8FF5A` → `#E8E3FF` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#FF9E3D` → `#FE2E95` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 11/21 | `#01FFC3` → `#B967FF` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, void, int, boolean |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#1B1740` `#FF4D6D` `#01FFC3` `#FFE66D` `#00A3FF` `#B967FF` `#00E5FF` `#D9D4F5` `#4A4580` `#FF7A93` `#5CFFD8` `#FFF09E` `#4DC0FF` `#D09BFF` `#7DF9FF` `#FFFFFF` | `#1B1740` `#FF4D6D` `#01FFC3` `#FFE66D` `#00A3FF` `#B967FF` `#00E5FF` `#D9D4F5` `#4A4580` `#FF7A93` `#5CFFD8` `#FFF09E` `#4DC0FF` `#D09BFF` `#7DF9FF` `#FFFFFF` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#110E27` | `#110E27` |  | ✓ |  |
| 终端 | 前景 | `#E8E3FF` | `#E8E3FF` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#0C242F` | `#0C242F` |  | ✓ |  |
| diff | 删除行底色 | `#261226` | `#261226` |  | ✓ |  |
| diff | 修改行底色 | `#0C2135` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#01FFC3` | `#01FFC3` |  | ✓ |  |
| 行号区竖条 | 修改 | `#00E5FF` | `#00E5FF` |  | ✓ |  |
| 行号区竖条 | 删除 | `#FF4D6D` | `#FF4D6D` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#19172D` | `#19172D` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#A9A3D9` | `#A9A3D9` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#19172D` | `#19172D` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#A9A3D9` | `#A9A3D9` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#200E27` | `#200E27` |  | ✓ |  |

## Woodfish One Dark Pro

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#282C34` | `#282C34` | ✓ |  |
| 前景 | `#ABB2BF` | `#ABB2BF` | ✓ |  |
| 行号 | `#495162` | `#495162` | ✓ |  |
| 当前行行号 | `#ABB2BF` | `#ABB2BF` | ✓ |  |
| 当前行 | `#2C313C` | `#2C313C` | ✓ |  |
| 选区 | `#404859` | `#404859` | ✓ |  |
| 光标 | `#528BFF` | `#528BFF` | ✓ |  |
| 搜索高亮 | `#554941` | `#554941` | ✓ |  |
| 错误 | `#C24038` | `#C24038` | ✓ |  |
| 警告 | `#D19A66` | `#D19A66` | ✓ |  |
| 代码默认文字（`source` 规则） | `#ABB2BF` | `#ABB2BF` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#282C34` | `#282C34` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#2C313C` | `#2C313C` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 11/13 | `#E5C07B` → `#ABB2BF` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | LIMIT, LIMIT |
| comment | 8/9 | `#7F848E` → `#E5C07B` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#D19A66` → `#ABB2BF` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 6/9 | `#E06C75` → `#ABB2BF` | 没有细分键 | 声明与引用共用一个键 | item, offset, strict |
| function call | 14/18 | `#56B6C2` → `#61AFEF` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, println, println, path |
| function definition | 11/13 | `#61AFEF` → `#ABB2BF` | 没有细分键 | 声明与引用共用一个键 | first, main |
| json key | 17/17 |  |  |  |  |
| keyword | 52/55 | `#C678DD` → `#E4BF79` | 没有细分键 | import / package 路径：JetBrains 与类型引用共用类名键，VS Code 单独着色 | demo, woodfish, kotlin.math. |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#C678DD` → `#CE9A65` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 30/38 | `#E5C07B` → `#E06C75` | 没有细分键 | 点号前的限定名：VS Code 按位置着色，JetBrains 按语义（类、字段）着色 | items, items, out, firstOrNull |
| parameter | 15/15 |  |  |  |  |
| string | 18/20 | `#98C379` → `#ABB2BF` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#D19A66` → `#C678DD` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 21/21 |  |  |  |  |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#3F4451` `#E05561` `#8CC265` `#D18F52` `#4AA5F0` `#C162DE` `#42B3C2` `#D7DAE0` `#4F5666` `#FF616E` `#A5E075` `#F0A45D` `#4DC4FF` `#DE73FF` `#4CD1E0` `#E6E6E6` | `#3F4451` `#E05561` `#8CC265` `#D18F52` `#4AA5F0` `#C162DE` `#42B3C2` `#D7DAE0` `#4F5666` `#FF616E` `#A5E075` `#F0A45D` `#4DC4FF` `#DE73FF` `#4CD1E0` `#E6E6E6` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#282C34` | `#282C34` |  | ✓ |  |
| 终端 | 前景 | `#ABB2BF` | `#ABB2BF` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#3F483B` | `#3F483B` |  | ✓ |  |
| diff | 删除行底色 | `#53232A` | `#53232A` |  | ✓ |  |
| diff | 修改行底色 | `#3E3F3D` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#109868` | `#109868` |  | ✓ |  |
| 行号区竖条 | 修改 | `#948B60` | `#948B60` |  | ✓ |  |
| 行号区竖条 | 删除 | `#9A353D` | `#9A353D` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#2C313C` | `#2C313C` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#ABB2BF` | `#ABB2BF` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#2C313C` | `#2C313C` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#ABB2BF` | `#ABB2BF` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#2F343F` | `#2F343F` |  | ✓ |  |

## Woodfish Tokyo Night

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#1A1B26` | `#1A1B26` | ✓ |  |
| 前景 | `#A9B1D6` | `#A9B1D6` | ✓ |  |
| 行号 | `#363B54` | `#363B54` | ✓ |  |
| 当前行行号 | `#787C99` | `#787C99` | ✓ |  |
| 当前行 | `#1E202E` | `#1E202E` | ✓ |  |
| 选区 | `#2B2F41` | `#2B2F41` | ✓ |  |
| 光标 | `#C0CAF5` | `#C0CAF5` | ✓ |  |
| 搜索高亮 | `#283457` | `#283457` | ✓ |  |
| 错误 | `#DB4B4B` | `#DB4B4B` | ✓ |  |
| 警告 | `#E0AF68` | `#E0AF68` | ✓ |  |
| 代码默认文字（`source` 规则） | `#A9B1D6` | `#A9B1D6` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#1A1B26` | `#1A1B26` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#1E202E` | `#1E202E` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 10/13 | `#C0CAF5` → `#9ABDF5` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | Example, LIMIT, LIMIT |
| comment | 8/9 | `#51597D` → `#89DDFF` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#FF9E64` → `#A9B1D6` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 4/9 | `#C0CAF5` → `#A9B1D6` | 没有细分键 | 声明与引用共用一个键 | item, offset, strict, items |
| function call | 13/18 | `#0DB9D7` → `#7AA2F7` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, println, println, os |
| function definition | 9/13 | `#BB9AF7` → `#9D7CD8` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, boolean, first, main |
| json key | 8/17 | `#0DB9D7` → `#7AA2F7` | 没有细分键 | JSON：JetBrains 的属性名、数字、字符串各只有一个键，VS Code 的这套主题按嵌套层级着色 | build, test, max, ratio |
| keyword | 19/53 | `#9D7CD8` → `#BB9AF7` | 没有细分键 | 关键字细分：JetBrains 的关键字只有一个键，VS Code 对修饰符、声明、导入分别着色 | demo, woodfish, import, java |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#BB9AF7` → `#FB9E63` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 29/38 | `#9ABDF5` → `#7AA2F7` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, demo.woodfis, firstOrNull |
| parameter | 11/15 | `#E0AF68` → `#9ABDF5` | 没有细分键 | 声明与引用共用一个键 | id, name, users, self |
| string | 17/20 | `#9ECE6A` → `#85DAFC` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max, value |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#FF9E64` → `#B898F6` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 11/21 | `#0DB9D7` → `#C0CAF5` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | int, void, int, boolean |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#363B54` `#F7768E` `#73DACA` `#E0AF68` `#7AA2F7` `#BB9AF7` `#7DCFFF` `#787C99` `#363B54` `#F7768E` `#73DACA` `#E0AF68` `#7AA2F7` `#BB9AF7` `#7DCFFF` `#ACB0D0` | `#363B54` `#F7768E` `#73DACA` `#E0AF68` `#7AA2F7` `#BB9AF7` `#7DCFFF` `#787C99` `#363B54` `#F7768E` `#73DACA` `#E0AF68` `#7AA2F7` `#BB9AF7` `#7DCFFF` `#ACB0D0` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#16161E` | `#16161E` |  | ✓ |  |
| 终端 | 前景 | `#787C99` | `#787C99` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#1F2C38` | `#1F2C38` |  | ✓ |  |
| diff | 删除行底色 | `#34212B` | `#34212B` |  | ✓ |  |
| diff | 修改行底色 | `#1E212F` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#164846` | `#164846` |  | ✓ |  |
| 行号区竖条 | 修改 | `#394B70` | `#394B70` |  | ✓ |  |
| 行号区竖条 | 删除 | `#823C41` | `#823C41` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#1C1D29` | `#1C1D29` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#646E9C` | `#646E9C` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#1C1D29` | `#1C1D29` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#646E9C` | `#646E9C` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#171822` | `#171822` |  | ✓ |  |

## Woodfish Catppuccin Mocha

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#1E1E2E` | `#1E1E2E` | ✓ |  |
| 前景 | `#CDD6F4` | `#CDD6F4` | ✓ |  |
| 行号 | `#7F849C` | `#7F849C` | ✓ |  |
| 当前行行号 | `#CBA6F7` | `#CBA6F7` | ✓ |  |
| 当前行 | `#2A2B3C` | `#2A2B3C` | ✓ |  |
| 选区 | `#3B3D4F` | `#3B3D4F` | ✓ |  |
| 光标 | `#F5E0DC` | `#F5E0DC` | ✓ |  |
| 搜索高亮 | `#5E3F53` | `#5E3F53` | ✓ |  |
| 错误 | `#F38BA8` | `#F38BA8` | ✓ |  |
| 警告 | `#FAB387` | `#FAB387` | ✓ |  |
| 代码默认文字（`source` 规则） | `#CDD6F4` | `#CDD6F4` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#1E1E2E` | `#1E1E2E` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#2A2B3C` | `#292A3B` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 9/13 | `#F9E2AF` → `#CDD6F4` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | Example, LIMIT, User?, LIMIT |
| comment | 8/9 | `#9399B2` → `#CBA6F7` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 1/1 |  |  |  |  |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 16/18 | `#CDD6F4` → `#EBA0AC` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, path |
| function definition | 10/13 | `#89B4FA` → `#CDD6F4` | 没有细分键 | 声明与引用共用一个键 | first, int, main |
| json key | 17/17 |  |  |  |  |
| keyword | 43/53 | `#CDD6F4` → `#CBA6F7` | 没有细分键 | import / package 路径：JetBrains 与类型引用共用类名键，VS Code 单独着色 | java, util, ArrayList, java |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#CBA6F7` → `#F6B386` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 30/38 | `#CDD6F4` → `#89B4FA` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, firstOrNull, id |
| parameter | 12/15 | `#EBA0AC` → `#CDD6F4` | 没有细分键 | 声明与引用共用一个键 | id, name, users |
| string | 18/20 | `#A6E3A1` → `#CDD6F4` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#F38BA8` → `#CBA6F7` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 16/21 | `#CBA6F7` → `#FAB387` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | str, int, int, bool |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#45475A` `#F38BA8` `#A6E3A1` `#F9E2AF` `#89B4FA` `#F5C2E7` `#94E2D5` `#A6ADC8` `#585B70` `#F37799` `#89D88B` `#EBD391` `#74A8FC` `#F2AEDE` `#6BD7CA` `#BAC2DE` | `#45475A` `#F38BA8` `#A6E3A1` `#F9E2AF` `#89B4FA` `#F5C2E7` `#94E2D5` `#A6ADC8` `#585B70` `#F37799` `#89D88B` `#EBD391` `#74A8FC` `#F2AEDE` `#6BD7CA` `#BAC2DE` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#1E1E2E` | `#1E1E2E` |  | ✓ | 主题没写 `terminal.background` 时取调色板的背景，与终端配色包一致 |
| 终端 | 前景 | `#CDD6F4` | `#CDD6F4` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#323B3F` | `#323B3F` |  | ✓ |  |
| diff | 删除行底色 | `#3E2E40` | `#3E2E40` |  | ✓ |  |
| diff | 修改行底色 | `#3F3B41` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#A6E3A1` | `#A6E3A1` |  | ✓ |  |
| 行号区竖条 | 修改 | `#F9E2AF` | `#F9E2AF` |  | ✓ |  |
| 行号区竖条 | 删除 | `#F38BA8` | `#F38BA8` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#1A1A27` | `#1A1A27` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#BAC2DE` | `#BAC2DE` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#1A1A27` | `#1A1A27` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#A6ADC8` | `#A6ADC8` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#394E5D` | `#394E5D` |  | ✓ |  |

## Woodfish Catppuccin Latte

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#EFF1F5` | `#EFF1F5` | ✓ |  |
| 前景 | `#4C4F69` | `#4C4F69` | ✓ |  |
| 行号 | `#8C8FA1` | `#8C8FA1` | ✓ |  |
| 当前行行号 | `#8839EF` | `#8839EF` | ✓ |  |
| 当前行 | `#E3E6EB` | `#E3E6EB` | ✓ |  |
| 选区 | `#CCCFD7` | `#CCCFD7` | ✓ |  |
| 光标 | `#DC8A78` | `#DC8A78` | ✓ |  |
| 搜索高亮 | `#E6ADBD` | `#E6ADBD` | ✓ |  |
| 错误 | `#D20F39` | `#D20F39` | ✓ |  |
| 警告 | `#FE640B` | `#FE640B` | ✓ |  |
| 代码默认文字（`source` 规则） | `#4C4F69` | `#4C4F69` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#EFF1F5` | `#EFF1F5` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#E3E6EB` | `#E3E6EA` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 9/13 | `#DF8E1D` → `#4C4F69` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | Example, LIMIT, User?, LIMIT |
| comment | 8/9 | `#7C7F93` → `#8839EF` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 1/1 |  |  |  |  |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 16/18 | `#4C4F69` → `#E64553` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, path |
| function definition | 10/13 | `#1E66F5` → `#4C4F69` | 没有细分键 | 声明与引用共用一个键 | first, int, main |
| json key | 17/17 |  |  |  |  |
| keyword | 45/55 | `#4C4F69` → `#8839EF` | 没有细分键 | import / package 路径：JetBrains 与类型引用共用类名键，VS Code 单独着色 | java, util, ArrayList, java |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#8839EF` → `#FE640F` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 30/38 | `#4C4F69` → `#1E66F5` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, firstOrNull, id |
| parameter | 12/15 | `#E64553` → `#4C4F69` | 没有细分键 | 声明与引用共用一个键 | id, name, users |
| string | 19/20 | `#40A02B` → `#2266F5` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#D20F39` → `#8839EF` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 16/21 | `#8839EF` → `#FE640B` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | str, int, int, bool |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#5C5F77` `#D20F39` `#40A02B` `#DF8E1D` `#1E66F5` `#EA76CB` `#179299` `#ACB0BE` `#6C6F85` `#DE293E` `#49AF3D` `#EEA02D` `#456EFF` `#FE85D8` `#2D9FA8` `#BCC0CC` | `#5C5F77` `#D20F39` `#40A02B` `#DF8E1D` `#1E66F5` `#EA76CB` `#179299` `#ACB0BE` `#6C6F85` `#DE293E` `#49AF3D` `#EEA02D` `#456EFF` `#FE85D8` `#2D9FA8` `#BCC0CC` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#EFF1F5` | `#EFF1F5` |  | ✓ | 主题没写 `terminal.background` 时取调色板的背景，与终端配色包一致 |
| 终端 | 前景 | `#4C4F69` | `#4C4F69` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#D5E5D7` | `#D5E5D7` |  | ✓ |  |
| diff | 删除行底色 | `#EBCFD9` | `#EBCFD9` |  | ✓ |  |
| diff | 修改行底色 | `#EDE2D5` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#40A02B` | `#40A02B` |  | ✓ |  |
| 行号区竖条 | 修改 | `#DF8E1D` | `#DF8E1D` |  | ✓ |  |
| 行号区竖条 | 删除 | `#D20F39` | `#D20F39` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#E8EBF1` | `#E8EBF1` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#5C5F77` | `#5C5F77` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#E8EBF1` | `#E8EBF1` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#6C6F85` | `#6C6F85` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#B4DEF1` | `#B4DEF1` |  | ✓ |  |

## Woodfish Nord

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#2E3440` | `#2E3440` | ✓ |  |
| 前景 | `#D8DEE9` | `#D8DEE9` | ✓ |  |
| 行号 | `#4C566A` | `#4C566A` | ✓ |  |
| 当前行行号 | `#D8DEE9` | `#D8DEE9` | ✓ |  |
| 当前行 | `#3B4252` | `#3B4252` | ✓ |  |
| 选区 | `#3F4758` | `#3F4758` | ✓ |  |
| 光标 | `#D8DEE9` | `#D8DEE9` | ✓ |  |
| 搜索高亮 | `#526C7A` | `#526C7A` | ✓ |  |
| 错误 | `#BF616A` | `#BF616A` | ✓ |  |
| 警告 | `#EBCB8B` | `#EBCB8B` | ✓ |  |
| 代码默认文字（`source` 规则） | `#D8DEE9` | `#D8DEE9` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#2E3440` | `#2E3440` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#3B4252` | `#3B4252` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 10/13 | `#8FBCBB` → `#D8DEE9` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | LIMIT, User?, LIMIT |
| comment | 8/9 | `#616E88` → `#8FBCBB` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 1/1 |  |  |  |  |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 18/18 |  |  |  |  |
| function definition | 11/13 | `#88C0D0` → `#D8DEE9` | 没有细分键 | 声明与引用共用一个键 | first, main |
| json key | 17/17 |  |  |  |  |
| keyword | 52/53 | `#81A1C1` → `#D8DEE9` | 没有细分键 | import / package 路径：JetBrains 与类型引用共用类名键，VS Code 单独着色 | kotlin.math. |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#81A1C1` → `#B18EAB` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 32/38 | `#D8DEE9` → `#88C0D0` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, firstOrNull, emptyList |
| parameter | 15/15 |  |  |  |  |
| string | 18/20 | `#A3BE8C` → `#D8DEE9` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 9/9 |  |  |  |  |
| type reference | 21/21 |  |  |  |  |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#3B4252` `#BF616A` `#A3BE8C` `#EBCB8B` `#81A1C1` `#B48EAD` `#88C0D0` `#E5E9F0` `#4C566A` `#BF616A` `#A3BE8C` `#EBCB8B` `#81A1C1` `#B48EAD` `#8FBCBB` `#ECEFF4` | `#3B4252` `#BF616A` `#A3BE8C` `#EBCB8B` `#81A1C1` `#B48EAD` `#88C0D0` `#E5E9F0` `#4C566A` `#BF616A` `#A3BE8C` `#EBCB8B` `#81A1C1` `#B48EAD` `#8FBCBB` `#ECEFF4` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#2E3440` | `#2E3440` |  | ✓ |  |
| 终端 | 前景 | `#D8DEE9` | `#D8DEE9` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#444F44` | `#444F44` |  | ✓ |  |
| diff | 删除行底色 | `#582A33` | `#582A33` |  | ✓ |  |
| diff | 修改行底色 | `#54524F` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#A3BE8C` | `#A3BE8C` |  | ✓ |  |
| 行号区竖条 | 修改 | `#EBCB8B` | `#EBCB8B` |  | ✓ |  |
| 行号区竖条 | 删除 | `#BF616A` | `#BF616A` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#434C5E` | `#434C5E` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#D8DEE9` | `#D8DEE9` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#434C5E` | `#434C5E` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#D8DEE9` | `#D8DEE9` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#333A47` | `#333A47` |  | ✓ |  |

## Woodfish GitHub Dark

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#0D1117` | `#0D1117` | ✓ |  |
| 前景 | `#E6EDF3` | `#E6EDF3` | ✓ |  |
| 行号 | `#6E7681` | `#6E7681` | ✓ |  |
| 当前行行号 | `#E6EDF3` | `#E6EDF3` | ✓ |  |
| 当前行 | `#171B22` | `#171B22` | ✓ |  |
| 选区 | `#264F78` | `#264F78` | ✓ | VS Code 默认值 |
| 光标 | `#2F81F7` | `#2F81F7` | ✓ |  |
| 搜索高亮 | `#9E6A03` | `#9E6A03` | ✓ |  |
| 错误 | `#F14C4C` | `#F14C4C` | ✓ | VS Code 默认值 |
| 警告 | `#CCA700` | `#CCA700` | ✓ | VS Code 默认值 |
| 代码默认文字（`source` 规则） | `#E6EDF3` | `#E6EDF3` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#0D1117` | `#0D1117` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#171B22` | `#161B21` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 9/13 | `#FFA657` → `#E6EDF3` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | Example, LIMIT, User?, LIMIT |
| comment | 8/9 | `#8B949E` → `#E6EDF3` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#79C0FF` → `#E6EDF3` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 15/18 | `#79C0FF` → `#D2A8FF` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | offset, println, println |
| function definition | 10/13 | `#D2A8FF` → `#E6EDF3` | 没有细分键 | 声明与引用共用一个键 | String, first, main |
| json key | 17/17 |  |  |  |  |
| keyword | 55/55 |  |  |  |  |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#FF7B72` → `#77C0FB` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 33/38 | `#E6EDF3` → `#D2A8FF` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | demo.woodfis, firstOrNull, emptyList, find |
| parameter | 14/15 | `#E6EDF3` → `#79C0FF` | 没有细分键 | 声明与引用共用一个键 | self |
| string | 18/20 | `#A5D6FF` → `#E6EDF3` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#79C0FF` → `#FF7B72` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 14/21 | `#79C0FF` → `#FFA657` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | String, Int, String, Int |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#484F58` `#FF7B72` `#3FB950` `#D29922` `#58A6FF` `#BC8CFF` `#39C5CF` `#B1BAC4` `#6E7681` `#FFA198` `#56D364` `#E3B341` `#79C0FF` `#D2A8FF` `#56D4DD` `#FFFFFF` | `#484F58` `#FF7B72` `#3FB950` `#D29922` `#58A6FF` `#BC8CFF` `#39C5CF` `#B1BAC4` `#6E7681` `#FFA198` `#56D364` `#E3B341` `#79C0FF` `#D2A8FF` `#56D4DD` `#FFFFFF` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#0D1117` | `#0D1117` |  | ✓ | 主题没写 `terminal.background` 时取调色板的背景，与终端配色包一致 |
| 终端 | 前景 | `#E6EDF3` | `#E6EDF3` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#10221C` | `#10221C` |  | ✓ |  |
| diff | 删除行底色 | `#2C171B` | `#2C171B` |  | ✓ |  |
| diff | 修改行底色 | `#171816` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#1A4A29` | `#1A4A29` |  | ✓ |  |
| 行号区竖条 | 修改 | `#533D11` | `#533D11` |  | ✓ |  |
| 行号区竖条 | 删除 | `#6B2B2B` | `#6B2B2B` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#262B32` | `#262B32` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#7D8590` | `#7D8590` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#262B32` | `#262B32` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#7D8590` | `#7D8590` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#171B22` | `#171B22` |  | ✓ |  |

## Woodfish GitHub Light

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#FFFFFF` | `#FFFFFF` | ✓ |  |
| 前景 | `#1F2328` | `#1F2328` | ✓ |  |
| 行号 | `#8C959F` | `#8C959F` | ✓ |  |
| 当前行行号 | `#1F2328` | `#1F2328` | ✓ |  |
| 当前行 | `#F4F6F8` | `#F4F6F8` | ✓ |  |
| 选区 | `#ADD6FF` | `#ADD6FF` | ✓ | VS Code 默认值 |
| 光标 | `#0969DA` | `#0969DA` | ✓ |  |
| 搜索高亮 | `#BF8700` | `#BF8700` | ✓ |  |
| 错误 | `#E51400` | `#E51400` | ✓ | VS Code 默认值 |
| 警告 | `#BF8803` | `#BF8803` | ✓ | VS Code 默认值 |
| 代码默认文字（`source` 规则） | `#1F2328` | `#1F2328` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#FFFFFF` | `#FFFFFF` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#F4F6F8` | `#F4F6F8` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 9/13 | `#953800` → `#1F2328` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | Example, LIMIT, User?, LIMIT |
| comment | 8/9 | `#6E7781` → `#1F2328` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#0550AE` → `#1F2328` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 15/18 | `#0550AE` → `#8250DF` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | offset, println, println |
| function definition | 10/13 | `#8250DF` → `#1F2328` | 没有细分键 | 声明与引用共用一个键 | String, first, main |
| json key | 17/17 |  |  |  |  |
| keyword | 55/55 |  |  |  |  |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#CF222E` → `#0A50AF` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 33/38 | `#1F2328` → `#8250DF` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | demo.woodfis, firstOrNull, emptyList, find |
| parameter | 14/15 | `#1F2328` → `#0550AE` | 没有细分键 | 声明与引用共用一个键 | self |
| string | 18/20 | `#0A3069` → `#1F2328` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#0550AE` → `#CF222E` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 14/21 | `#0550AE` → `#953800` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | String, Int, String, Int |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#24292F` `#CF222E` `#116329` `#4D2D00` `#0969DA` `#8250DF` `#1B7C83` `#6E7781` `#57606A` `#A40E26` `#1A7F37` `#633C01` `#218BFF` `#A475F9` `#3192AA` `#8C959F` | `#24292F` `#CF222E` `#116329` `#4D2D00` `#0969DA` `#8250DF` `#1B7C83` `#6E7781` `#57606A` `#A40E26` `#1A7F37` `#633C01` `#218BFF` `#A475F9` `#3192AA` `#8C959F` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#FFFFFF` | `#FFFFFF` |  | ✓ | 主题没写 `terminal.background` 时取调色板的背景，与终端配色包一致 |
| 终端 | 前景 | `#1F2328` | `#1F2328` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#E6FAEA` | `#E6FAEA` |  | ✓ |  |
| diff | 删除行底色 | `#FFF0EF` | `#FFF0EF` |  | ✓ |  |
| diff | 修改行底色 | `#FAF4E6` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#B7E7C4` | `#B7E7C4` |  | ✓ |  |
| 行号区竖条 | 修改 | `#EEDCAB` | `#EEDCAB` |  | ✓ |  |
| 行号区竖条 | 删除 | `#FFCDCD` | `#FFCDCD` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#EFF1F3` | `#EFF1F3` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#656D76` | `#656D76` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#EFF1F3` | `#EFF1F3` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#656D76` | `#656D76` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#F0F1F2` | `#F0F1F2` |  | ✓ |  |

## Woodfish Night Owl

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#011627` | `#011627` | ✓ |  |
| 前景 | `#D6DEEB` | `#D6DEEB` | ✓ |  |
| 行号 | `#4B6479` | `#4B6479` | ✓ |  |
| 当前行行号 | `#C5E4FD` | `#C5E4FD` | ✓ |  |
| 当前行 | `#072435` | `#072435` | ✓ |  |
| 选区 | `#1D3B53` | `#1D3B53` | ✓ |  |
| 光标 | `#80A4C2` | `#80A4C2` | ✓ |  |
| 搜索高亮 | `#2E475C` | `#2E475C` | ✓ |  |
| 错误 | `#EF5350` | `#EF5350` | ✓ |  |
| 警告 | `#B39554` | `#B39554` | ✓ |  |
| 代码默认文字（`source` 规则） | `#D6DEEB` | `#D6DEEB` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#011627` | `#011627` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#072435` | `#062434` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 5/13 | `#FFCB8B` → `#D5DDE9` | 没有细分键 | 类声明：JetBrains 的声明与引用共用同一个类名键 | Example, User, Store, Repo |
| comment | 8/9 | `#637777` → `#C792EA` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#82AAFF` → `#D6DEEB` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 4/9 | `#C5E478` → `#D6DEEB` | 没有细分键 | 声明与引用共用一个键 | item, offset, strict, items |
| function call | 14/18 | `#C5E478` → `#82AAFF` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | println, println, os, path |
| function definition | 11/13 | `#82AAFF` → `#D6DEEB` | 没有细分键 | 声明与引用共用一个键 | first, main |
| json key | 17/17 |  |  |  |  |
| keyword | 54/55 | `#C792EA` → `#D6DEEB` | 没有细分键 | import / package 路径：JetBrains 与类型引用共用类名键，VS Code 单独着色 | kotlin.math. |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#C792EA` → `#F28C6B` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 29/38 | `#D6DEEB` → `#82AAFF` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, out, firstOrNull |
| parameter | 11/15 | `#7FDBCA` → `#D6DEEB` | 没有细分键 | 声明与引用共用一个键 | id, name, users, self |
| string | 17/20 | `#ECC48D` → `#D6DEEB` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max, value |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 0/9 | `#FF5874` → `#C691E7` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 15/21 | `#C5E478` → `#D6DEEB` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | Int, String, Int, List |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#011627` `#EF5350` `#22DA6E` `#C5E478` `#82AAFF` `#C792EA` `#21C7A8` `#FFFFFF` `#575656` `#EF5350` `#22DA6E` `#FFEB95` `#82AAFF` `#C792EA` `#7FDBCA` `#FFFFFF` | `#011627` `#EF5350` `#22DA6E` `#C5E478` `#82AAFF` `#C792EA` `#21C7A8` `#FFFFFF` `#575656` `#EF5350` `#22DA6E` `#FFEB95` `#82AAFF` `#C792EA` `#7FDBCA` `#FFFFFF` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#011627` | `#011627` |  | ✓ | 主题没写 `terminal.background` 时取调色板的背景，与终端配色包一致 |
| 终端 | 前景 | `#D6DEEB` | `#D6DEEB` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#203730` | `#203730` |  | ✓ |  |
| diff | 删除行底色 | `#34121F` | `#34121F` |  | ✓ |  |
| diff | 修改行底色 | `#2E372B` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#9CCC65` | `#9CCC65` |  | ✓ |  |
| 行号区竖条 | 修改 | `#E2B93D` | `#E2B93D` |  | ✓ |  |
| 行号区竖条 | 删除 | `#EF5350` | `#EF5350` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#011627` | `#011627` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#829D9D` | `#829D9D` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#011627` | `#011627` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#829D9D` | `#829D9D` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#092134` | `#092134` |  | ✓ |  |

## Woodfish Ayu Mirage

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#242936` | `#242936` | ✓ |  |
| 前景 | `#CCCAC2` | `#CCCAC2` | ✓ |  |
| 行号 | `#4B5362` | `#4B5362` | ✓ |  |
| 当前行行号 | `#737D8F` | `#737D8F` | ✓ |  |
| 当前行 | `#1A1F29` | `#1A1F29` | ✓ |  |
| 选区 | `#2B4768` | `#2B4768` | ✓ |  |
| 光标 | `#FFCC66` | `#FFCC66` | ✓ |  |
| 搜索高亮 | `#736950` | `#736950` | ✓ |  |
| 错误 | `#FF6666` | `#FF6666` | ✓ |  |
| 警告 | `#FFCC66` | `#FFCC66` | ✓ |  |
| 代码默认文字（`source` 规则） | `#CCCAC2` | `#CCCAC2` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#242936` | `#242936` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#1A1F29` | `#1A1F29` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 10/13 | `#73D0FF` → `#CCCAC2` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | LIMIT, User?, LIMIT |
| comment | 8/9 | `#6E7C8F` → `#73D0FF` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#95E6CB` → `#CCCAC2` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 14/18 | `#CCCAC2` → `#DFBFFF` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, println, println, path |
| function definition | 8/13 | `#5CCFE6` → `#FFA659` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, boolean, first, int |
| json key | 17/17 |  |  |  |  |
| keyword | 40/53 | `#FFA659` → `#73D0FF` | 没有细分键 | import / package 路径：JetBrains 与类型引用共用类名键，VS Code 单独着色 | demo, woodfish, java, util |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#FFA659` → `#DCBFFC` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 29/38 | `#CCCAC2` → `#FFCD66` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, demo.woodfis, firstOrNull |
| parameter | 11/15 | `#DFBFFF` → `#CCCAC2` | 没有细分键 | 声明与引用共用一个键 | id, name, users, self |
| string | 19/20 | `#D5FF80` → `#FBCD65` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#DFBFFF` → `#FFA659` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 12/21 | `#5CCFE6` → `#F28779` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | int, void, int, boolean |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#171B24` `#F28273` `#87D96C` `#FCCA60` `#6ACDFF` `#DDBBFF` `#93E2C8` `#C7C7C7` `#686868` `#F28779` `#D5FF80` `#FFCD66` `#73D0FF` `#DFBFFF` `#95E6CB` `#FFFFFF` | `#171B24` `#F28273` `#87D96C` `#FCCA60` `#6ACDFF` `#DDBBFF` `#93E2C8` `#C7C7C7` `#686868` `#F28779` `#D5FF80` `#FFCD66` `#73D0FF` `#DFBFFF` `#95E6CB` `#FFFFFF` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#1F2430` | `#1F2430` |  | ✓ |  |
| 终端 | 前景 | `#CAC8C1` | `#CAC8C1` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#3C463C` | `#3C463C` |  | ✓ |  |
| diff | 删除行底色 | `#50212B` | `#50212B` |  | ✓ |  |
| diff | 修改行底色 | `#36475E` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#87D96C` | `#87D96C` |  | ✓ |  |
| 行号区竖条 | 修改 | `#80BFFF` | `#80BFFF` |  | ✓ |  |
| 行号区竖条 | 删除 | `#F27983` | `#F27983` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#282C37` | `#282C37` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#7A7B7D` | `#7A7B7D` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#282C37` | `#282C37` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#7A7B7D` | `#7A7B7D` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#263245` | `#263245` |  | ✓ |  |

## Woodfish Gruvbox Dark

### 编辑器界面色

| 项目 | JetBrains | VS Code | 一致 | 说明 |
| --- | --- | --- | --- | --- |
| 背景 | `#282828` | `#282828` | ✓ |  |
| 前景 | `#EBDBB2` | `#EBDBB2` | ✓ |  |
| 行号 | `#665C54` | `#665C54` | ✓ |  |
| 当前行行号 | `#C6C6C6` | `#C6C6C6` | ✓ | VS Code 默认值 |
| 当前行 | `#302E2D` | `#302E2D` | ✓ |  |
| 选区 | `#384539` | `#384539` | ✓ |  |
| 光标 | `#EBDBB2` | `#EBDBB2` | ✓ |  |
| 搜索高亮 | `#505F59` | `#505F59` | ✓ |  |
| 错误 | `#CC241D` | `#CC241D` | ✓ |  |
| 警告 | `#D79921` | `#D79921` | ✓ |  |
| 代码默认文字（`source` 规则） | `#EBDBB2` | `#EBDBB2` | ✓ | JetBrains 的默认文字色同时用于代码里没有专用键的标识符 |
| 背景（截图） | `#282828` | `#282828` | ✓ | 从截图取色，允许 ±3 |
| 当前行（截图） | `#302E2D` | `#2F2D2D` | ✓ | 从截图取色，允许 ±3 |

### token 颜色（同一份代码，从两边的截图里取同一个字符格的颜色）

| 类别 | 一致 / 总数 | 不一致时 VS Code → JetBrains | 类型 | 原因 | 例 |
| --- | --- | --- | --- | --- | --- |
| annotation/decorator | 5/5 |  |  |  |  |
| class declaration | 10/13 | `#FABD2F` → `#EBDBB2` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | LIMIT, User?, LIMIT |
| comment | 8/9 | `#928374` → `#FABD2F` | 没有细分键 | Javadoc 里的 {@link} 目标：JetBrains 当作引用着色 | the item typ |
| constant | 0/1 | `#D3869B` → `#EBDBB2` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | MAX_ITEMS |
| doc comment tag | 1/1 |  |  |  |  |
| field/local variable | 9/9 |  |  |  |  |
| function call | 14/18 | `#EBDBB2` → `#FABD2F` | 没有细分键 | 调用实参、属性访问：VS Code 按位置着色，JetBrains 按语义着色或不着色 | offset, println, println, path |
| function definition | 11/13 | `#FE8019` → `#FABD2F` | 没有细分键 | 基本类型：JetBrains 当作关键字，没有独立键 | String, int |
| json key | 17/17 |  |  |  |  |
| keyword | 30/53 | `#BDAE93` → `#FABD2F` | 没有细分键 | 关键字细分：JetBrains 的关键字只有一个键，VS Code 对修饰符、声明、导入分别着色 | demo, woodfish, import, java |
| md bold | 2/2 |  |  |  |  |
| md code | 2/2 |  |  |  |  |
| md italic | 1/1 |  |  |  |  |
| md link | 6/6 |  |  |  |  |
| md quote/list | 6/6 |  |  |  |  |
| number | 12/13 | `#FE8019` → `#D0869A` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | 0x |
| operator | 1/1 |  |  |  |  |
| other | 29/38 | `#EBDBB2` → `#FABD2F` | 没有细分键 | VS Code 的 Kotlin 文法按位置粗略着色，没有语义信息 | List, System, demo.woodfis, firstOrNull |
| parameter | 12/15 | `#83A598` → `#EBDBB2` | 没有细分键 | 声明与引用共用一个键 | id, name, users |
| string | 18/20 | `#B8BB26` → `#EBDBB2` | 没有细分键 | 字符串模板与标点：JetBrains 的模板表达式、标点按各自的键着色 | found = $hit, max |
| this/self | 3/3 |  |  |  |  |
| true/false/null | 3/9 | `#D3869B` → `#FA4834` | 没有细分键 | true / false / null / None：JetBrains 当作关键字，没有独立键 | null, true, False, None |
| type reference | 9/21 | `#EBDBB2` → `#FABD2F` | 没有细分键 | Python / Kotlin 内置名与常量：JetBrains 的内置名只有一个键 | String, Int, String, Int |

### 终端、diff、行号区竖条、inlay 提示、折叠

| 类别 | 项目 | JetBrains 方案 | VS Code | 截图 | 一致 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 终端 16 色 | 黑红绿黄蓝洋红青白，再亮色一行 | `#3C3836` `#CC241D` `#98971A` `#D79921` `#458588` `#B16286` `#689D6A` `#A89984` `#928374` `#FB4934` `#B8BB26` `#FABD2F` `#83A598` `#D3869B` `#8EC07C` `#EBDBB2` | `#3C3836` `#CC241D` `#98971A` `#D79921` `#458588` `#B16286` `#689D6A` `#A89984` `#928374` `#FB4934` `#B8BB26` `#FABD2F` `#83A598` `#D3869B` `#8EC07C` `#EBDBB2` |  | 16/16 ✓ | 控制台和新终端（BLOCK_TERMINAL_*）用同一组值 |
| 终端 | 背景 | `#282828` | `#282828` |  | ✓ |  |
| 终端 | 前景 | `#EBDBB2` | `#EBDBB2` |  | ✓ | 截图里的命令行文字有 shell 语法着色，不取 |
| diff | 新增行底色 | `#3F4531` | `#3F4531` |  | ✓ |  |
| diff | 删除行底色 | `#532020` | `#532020` |  | ✓ |  |
| diff | 修改行底色 | `#3A413E` | — |  | ✗（没有细分键） | VS Code 没有「修改」色（改动行是左边删除、右边新增），取 `editorGutter.modifiedBackground` 按新增行底色的浓度叠色；整行底色会被 IDE 冲淡，词级差异片段是方案色 |
| 行号区竖条 | 新增 | `#B8BB26` | `#B8BB26` |  | ✓ |  |
| 行号区竖条 | 修改 | `#83A598` | `#83A598` |  | ✓ |  |
| 行号区竖条 | 删除 | `#FB4934` | `#FB4934` |  | ✓ | 默认设置下 IDE 不在行号区画删除标记，截图里看不到 |
| inlay 提示 | 类型提示背景 | `#302E2D` | `#302E2D` |  | ✓ |  |
| inlay 提示 | 类型提示前景 | `#928374` | `#928374` |  | ✓ |  |
| inlay 提示 | 参数提示背景 | `#302E2D` | `#302E2D` |  | ✓ |  |
| inlay 提示 | 参数提示前景 | `#928374` | `#928374` |  | ✓ |  |
| 折叠 | 占位文字前景 | `#808080` | `#808080` |  | ✓ |  |
| 折叠 | 折叠背景 | `#2D312D` | `#2D312D` |  | ✓ |  |

