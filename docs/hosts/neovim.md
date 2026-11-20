# Neovim：15 套配色

[安装说明](../../apps/neovim/README.md) · [生成器](../../apps/neovim/scripts/generate.mjs) · 分发仓库 [woodfishhhh/woodfish.nvim](https://github.com/woodfishhhh/woodfish.nvim)

`apps/neovim` 生成标准的 Neovim 插件目录：`colors/woodfish-*.lua`（每套主题一个）和 `lua/woodfish/`、`lua/lualine/themes/woodfish.lua`。提交生成物；`pnpm nvim:check` 比较内容，不写文件。第一版只做配色：不含代码渐变、发光和光标动画，也不改任何 Treesitter query。

## 配色怎么来的

1. **界面与通用语法**：界面色、语法 8 槽、终端 16 色来自 `WOODFISH_PALETTES`，编辑器小部件、选区、行号等来自 VS Code 主题文件的 `colors`。覆盖基础高亮组、Treesitter、LSP 语义、诊断、diff / git，以及 telescope、nvim-cmp、blink.cmp、gitsigns、neo-tree、nvim-tree、which-key、indent-blankline 和 lualine 主题。
2. **按语言取色**：Treesitter 的捕获名比 TextMate 的 scope 粗得多，同一个 `@variable` 在 VS Code 里可能有好几种颜色。生成器不手写对应表，而是量出来：
   - `stats-samples/` 里每种语言一份 100 行以上的常见代码（TypeScript、Python、Lua、Go、Rust、JSON、Markdown）。
   - Shiki（vscode-textmate，与 VS Code 解析主题的是同一个库）按主题给这些代码上色，得到每个字符的颜色和字体样式。
   - Neovim 0.12 的 Treesitter 给同样的字符分配捕获组（`scripts/captures/`，已提交，用 `pnpm nvim:capture` 重新生成）。取实际生效的那个：优先级最高，同级取后一个。
   - 每个“捕获组 + 语言”取字符数占多数的颜色和字体样式（粗体、斜体、下划线、删除线），写成 `@capture.language`。没有开关选项，不加装饰。
   - `javascript`（含 jsx）和 `tsx` 复用 `typescript` 的结果。
3. **不改别人的东西**：只定义带语言后缀的高亮组，不写 query，不建自动命令。换成别的配色后，Woodfish 不留下任何影响。

## 命令

| 命令 | 作用 |
|---|---|
| `pnpm nvim:generate` / `nvim:check` | 生成 / 检查生成物。只需 Node；检查也会发现样例改了但捕获没重录 |
| `pnpm nvim:smoke` | 15 套逐一在无头 Neovim 里加载，检查高亮组、终端色、lualine 主题和 `transparent` |
| `pnpm nvim:capture` | 重录捕获。需要 Neovim 0.11+、git 和 C 编译器；解析器与 queries 按 `scripts/treesitter-sources.json` 的版本固定，构建到 `%TEMP%/wf-neovim/ts`，重建结果逐字相同 |
| `pnpm nvim:compare` | 对比 Neovim（`:TOhtml`）和 Shiki，写出每套主题的并排图与 `report.md`（默认 `%TEMP%/wf-neovim`）。报告记录它跑在哪个提交、工作树是否干净 |
| `pnpm nvim:sync -- <woodfish.nvim 检出>` | 把 `colors/` 和 `lua/` 整个替换进分发仓库 |

比对从不打开窗口：Neovim 全程 `--headless`，图片由无头 Chrome / Edge 渲染 HTML 得到。

## 实测（2026-11-21，Windows，Neovim 0.12.6，nvim-treesitter queries 37e52c7，Shiki 4.6.0）

比对用的 `samples/` 与统计用的 `stats-samples/` 内容完全不同。口径：

- **映射错误**：某个“捕获组 + 语言”在 Neovim 里的颜色不是统计样例里 VS Code 占多数的颜色，或缺少所选的字体样式。15 套都是 **0**（统计样例和比对样例都是），并且 Neovim 实际着色与捕获归属一致。
- **拆不开**：同一个捕获组在 VS Code 里本来就对应好几种颜色（或根本没有捕获组），一个高亮组无法全部对上。其余差异都归这一类，包括多数色在统计样例与比对样例之间翻转的组合。
- 7 种语言的颜色一致率：80.9%（Tokyo Night）到 93.8%（One Dark Pro），平均 90.6%；字体样式一致率 95.9% 到 100%。Tokyo Night 最低，主要因为它按嵌套深度给 JSON 键换 6 种颜色，以及 Markdown 正文色与编辑器前景不同而 Neovim 对段落没有捕获。
- javascript / jsx / tsx 复用 typescript 的结果，在各自的样例上颜色一致率 66% 到 89%（Night Owl 最低，它的 JS 规则带 `.js` 后缀，与 TypeScript 差别大）。JSX 标签的 `@tag.*` 不在统计里，走通用映射。
- 每套主题的“拆不开”清单（组、各色占比、差异字符数）见 `report.md`。跨主题最多的：rust `@constant`、json `@property`、lua `@comment.documentation`、typescript `@variable.member` / `@variable` / `@type`、python `@variable` / `@type`。

边界：

- 右侧是 VS Code 的 TextMate 主题引擎，不是打开着的窗口，不含语言服务器的语义着色。
- Neovim 合并重叠高亮的属性，而一个高亮组无法关掉下层的样式（`nocombine` 实测会连颜色一起丢掉），所以下层捕获的斜体可能留在上层捕获上。报告单独列出。
- 只测了上面这些语言；其他语言走通用映射。捕获名用 nvim-treesitter 当前的命名，Neovim 0.11 以下没有测过。

## 第二版：渐变、发光、光标

- **终端里的渐变**：可行。用装饰提供器（`nvim_set_decoration_provider` 的 `on_line`）给可见行的每个字符放 `ephemeral` extmark，每个字符一个按渐变算出的高亮组，只为屏幕上看得见的字符付出代价，不动缓冲区。难点与 VS Code 一样：Treesitter 节点要合并成一段再算渐变；颜色要缓存，高亮组数量会随渐变色阶增长；折行、多字节字符和 `conceal` 要按显示列算。风险：与语义着色（优先级 125）、其他插件的 extmark 叠加；每帧计算要量过。
- **发光**：终端没有模糊和外发光，做不到和 VS Code 一样。能做的只有把字符底色调亮一点点的近似，容易显脏，建议不做。
- **光标动画**：终端里的光标由终端程序画，Neovim 只能改形状和颜色（`guicursor`、`Cursor` 高亮）。拖尾要靠终端：Ghostty 的 GLSL 着色器可以读光标位置并画拖尾，Windows Terminal 只有整屏像素着色器。Neovide 自带光标特效（`neovide_cursor_vfx_mode`、`neovide_cursor_trail_size`、`neovide_cursor_animation_length`）和浮窗模糊（`neovide_floating_blur_amount`），但没有文字发光。这些都是用户配置，配色插件不应擅自设置，只能作为可选的文档配方。
