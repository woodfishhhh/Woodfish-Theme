# Woodfish for Neovim

与 VS Code 扩展同款的 15 套配色，作为 Neovim 配色方案使用。这里是生成源码；要安装，用分发仓库 [woodfishhhh/woodfish.nvim](https://github.com/woodfishhhh/woodfish.nvim)（插件管理器只认仓库根目录）。生成方法、取色口径和实测数据见 [docs/hosts/neovim.md](../../docs/hosts/neovim.md)。

## 安装

在 Neovim 0.12 上验证过。高亮组用的是 0.9 起通用的 `@capture`、`@lsp.type.*` 写法，更早的版本没有测试。建议开启 `termguicolors`（0.10 起多数终端自动开启）。

```lua
-- lazy.nvim
{
  "woodfishhhh/woodfish.nvim",
  lazy = false,
  priority = 1000,
  config = function()
    vim.cmd.colorscheme("woodfish-dark")
  end,
}
```

```lua
-- packer.nvim
use({ "woodfishhhh/woodfish.nvim" })
vim.cmd.colorscheme("woodfish-dark")
```

```vim
" vim-plug
Plug 'woodfishhhh/woodfish.nvim'
colorscheme woodfish-dark
```

## 主题

| 主题 | 命令 |
|---|---|
| Woodfish Dark | `:colorscheme woodfish-dark` |
| Woodfish Dracula | `:colorscheme woodfish-dracula` |
| Woodfish Light | `:colorscheme woodfish-light` |
| Woodfish Black | `:colorscheme woodfish-black` |
| Woodfish Neon | `:colorscheme woodfish-neon` |
| Woodfish One Dark Pro | `:colorscheme woodfish-onedark` |
| Woodfish Tokyo Night | `:colorscheme woodfish-tokyonight` |
| Woodfish Catppuccin Mocha / Latte | `:colorscheme woodfish-catppuccin-mocha` / `woodfish-catppuccin-latte` |
| Woodfish Nord | `:colorscheme woodfish-nord` |
| Woodfish GitHub Dark / Light | `:colorscheme woodfish-github-dark` / `woodfish-github-light` |
| Woodfish Night Owl | `:colorscheme woodfish-nightowl` |
| Woodfish Ayu Mirage | `:colorscheme woodfish-ayu-mirage` |
| Woodfish Gruvbox Dark | `:colorscheme woodfish-gruvbox-dark` |

## 选项

只有一个选项，`setup()` 可选；写在 `:colorscheme` 之前或之后都行，之后加载的 Woodfish 配色也沿用：

```lua
require("woodfish").setup({ transparent = true }) -- 不画背景，用终端的背景
```

lualine：`require("lualine").setup({ options = { theme = "woodfish" } })`。

## 覆盖范围

基础高亮组、Treesitter、LSP 语义高亮、诊断、diff / git、终端 16 色；telescope、nvim-cmp、blink.cmp、gitsigns、neo-tree、nvim-tree、which-key、indent-blankline 和 lualine。

TypeScript（含 TSX）、JavaScript（含 JSX）、Python、Lua、Go、Rust、JSON、Markdown 的语法颜色和字体样式，是按 VS Code 实际给这些语言的颜色量出来的，所以同一份代码在两个编辑器里看起来一致。其他语言使用通用映射。Woodfish 只定义带语言后缀的高亮组，不改 Treesitter query，也不建自动命令。
