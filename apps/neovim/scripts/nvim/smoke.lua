-- Loads every colorscheme and checks the pieces a user relies on; exits non-zero with the reason on failure.
--   nvim --headless --clean -l smoke.lua <slug> [<slug> ...]
vim.o.termguicolors = true

local function fail(message)
  io.stderr:write("smoke: " .. message .. "\n")
  vim.cmd("cquit 1")
end

local function hl(name)
  return vim.api.nvim_get_hl(0, { name = name, link = false })
end

for _, slug in ipairs(arg) do
  local scheme = "woodfish-" .. slug
  local ok, err = pcall(vim.cmd.colorscheme, scheme)
  if not ok then
    fail(scheme .. ": " .. tostring(err))
  end
  if vim.g.colors_name ~= scheme then
    fail(scheme .. ": g:colors_name is " .. tostring(vim.g.colors_name))
  end
  for _, group in ipairs({ "Normal", "Comment", "Visual", "Pmenu", "StatusLine", "DiagnosticError", "@keyword", "@lsp.type.function", "@keyword.typescript", "@property.json" }) do
    if hl(group).fg == nil and hl(group).bg == nil then
      fail(scheme .. ": highlight group " .. group .. " has no color")
    end
  end
  if vim.g.terminal_color_0 == nil or vim.g.terminal_color_15 == nil then
    fail(scheme .. ": terminal colors are missing")
  end
  local lualine = dofile(vim.api.nvim_get_runtime_file("lua/lualine/themes/woodfish.lua", false)[1])
  if not (lualine.normal and lualine.normal.a.bg) then
    fail(scheme .. ": lualine theme is incomplete")
  end
  require("woodfish").setup({ transparent = true })
  if hl("Normal").bg ~= nil then
    fail(scheme .. ": transparent = true still paints a Normal background")
  end
  vim.cmd.colorscheme(scheme) -- options given to setup() apply to later loads too
  if hl("Normal").bg ~= nil then
    fail(scheme .. ": setup({ transparent = true }) was forgotten when the colorscheme was loaded again")
  end
  require("woodfish").setup({})
  if hl("Normal").bg == nil then
    fail(scheme .. ": setup({}) did not restore the Normal background")
  end
  if vim.v.errmsg ~= "" then
    fail(scheme .. ": " .. vim.v.errmsg)
  end
end
