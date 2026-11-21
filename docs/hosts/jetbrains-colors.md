# JetBrains 配色与 VS Code 的色值对照

[配色说明](./jetbrains.md) · [属性名核实表](./jetbrains-keys.md)

15 套主题，同一份示例代码（Java、Kotlin、Python、JSON、Markdown 各一段，20 到 31 行），JetBrains Mono 15 px，两边都用灰度抗锯齿。
JetBrains 一侧是 IntelliJ IDEA Community 2025.2.6.4（Python 用 PyCharm Community 2025.2.6.3），装的是只含主题的插件；
VS Code 一侧是 1.147，只加载主题，没有背景图和任何特效。颜色不靠眼看：先用 VS Code 自己的分词器算出每个 token 应有的颜色，
再从两张截图里取同一个字符格的颜色（离背景最远的像素），与期望值相差在容差内算一致。
TypeScript、Go、Rust 的语言专用高亮需要付费 IDE，没有截图，靠属性名核实表兜底。

## 总览

「没有细分键」：JetBrains 对这类 token 只有一个属性，VS Code 的主题却按 scope 分别着色，选了最接近的一个。
「映射错了」：JetBrains 有对应的细分属性或映射的 scope 选错，这类问题已全部修掉。判据不靠 scope 名：
JetBrains 画成某个颜色的所有 token 里，只要在 VS Code 里期望的颜色不止一种，就是一个属性被多种 VS Code token 共用；
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

### 没有细分键，按原因

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

### 已修的映射错误

- 代码默认文字色：JetBrains 的 `TEXT` 同时是没有专用键的标识符的颜色。Woodfish Dark 里 `editor.foreground` 是 `#D0D7E4`，
  而没有更具体规则的代码取 `source` 规则的 `#AFBBD2`，改为后者，Python、Kotlin 里的普通标识符才一致。
- Markdown 正文：上一条改动后，Markdown 正文在 VS Code 里仍是 `editor.foreground`，加了 `MARKDOWN_TEXT` 单独着色。
- 嵌入语言背景：Darcula 和 Default 给 Markdown 围栏、字符串里的嵌入代码铺了底色（`INJECTED_LANGUAGE_FRAGMENT`），
  VS Code 没有，改为编辑器背景色。
- `PY.SELF_PARAMETER`：同一个属性覆盖形参和函数体里的 `self`，改取函数体里的颜色（出现得更多）。
- 第一轮对拍里改过的：注解的成员级属性、Markdown 各级标题、Python 函数名、XML 的属性名。

「前景」一行：Woodfish Dark 的 `editor.foreground` 和代码默认文字色不是同一个颜色，JetBrains 只有一个默认文字色，所以这一行标「没有细分键」，其余 14 套的界面色全部一致。

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
