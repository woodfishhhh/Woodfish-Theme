-- Renders files the way Neovim paints them (Treesitter highlighting, the given colorscheme) to HTML with :TOhtml.
--   nvim --headless --clean -l render.lua <colorscheme> <out dir> <key> <language> <file> [<key> <language> <file> ...]
local scheme, outdir = arg[1], arg[2]

vim.cmd.packadd("nvim.tohtml")
vim.o.termguicolors = true
vim.cmd.colorscheme(scheme)
local tohtml = require("tohtml")

for i = 3, #arg, 3 do
  local key, language, file = arg[i], arg[i + 1], arg[i + 2]
  vim.cmd.edit(vim.fn.fnameescape(file))
  vim.wo.wrap, vim.wo.foldenable, vim.wo.conceallevel = false, false, 0
  vim.treesitter.start(0, language)
  vim.treesitter.get_parser(0, language):parse(true)
  vim.fn.writefile(tohtml.tohtml(0, { number_lines = false }), outdir .. "/" .. key .. ".html")
end
