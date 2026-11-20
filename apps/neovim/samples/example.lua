-- Comparison sample: a statusline helper plus a few Neovim configuration snippets.
local api, fn, opt = vim.api, vim.fn, vim.opt

local M = {}

---@alias Mode "n"|"i"|"v"|"c"|"t"

---@class Segment
---@field text string
---@field group string?
---@field priority integer

local icons = {
  branch = "\u{e0a0}",
  modified = "[+]",
  readonly = "RO",
  error = "E",
  warn = "W",
}

local mode_names = {
  n = "NORMAL",
  i = "INSERT",
  v = "VISUAL",
  V = "V-LINE",
  c = "COMMAND",
  t = "TERMINAL",
}

local function highlight(group, text)
  return ("%%#%s#%s%%*"):format(group, text)
end

local function mode_segment()
  local mode = api.nvim_get_mode().mode
  local name = mode_names[mode:sub(1, 1)] or mode:upper()
  return { text = " " .. name .. " ", group = "StatusLineMode", priority = 100 }
end

local function file_segment(bufnr)
  local name = api.nvim_buf_get_name(bufnr)
  local label = name == "" and "[No Name]" or fn.fnamemodify(name, ":t")
  local flags = {}
  if vim.bo[bufnr].modified then
    flags[#flags + 1] = icons.modified
  end
  if vim.bo[bufnr].readonly then
    flags[#flags + 1] = icons.readonly
  end
  return { text = table.concat({ label, unpack(flags) }, " "), priority = 90 }
end

local function diagnostics_segment(bufnr)
  local counts = vim.diagnostic.count(bufnr)
  local parts = {}
  for severity, icon in pairs({ [vim.diagnostic.severity.ERROR] = icons.error, [vim.diagnostic.severity.WARN] = icons.warn }) do
    local count = counts[severity] or 0
    if count > 0 then
      parts[#parts + 1] = icon .. count
    end
  end
  if #parts == 0 then
    return nil
  end
  return { text = table.concat(parts, " "), group = "DiagnosticWarn", priority = 60 }
end

local function git_segment()
  local head = vim.b.gitsigns_head
  if not head or head == "" then
    return nil
  end
  return { text = icons.branch .. " " .. head, priority = 50 }
end

local function position_segment()
  local line, column = unpack(api.nvim_win_get_cursor(0))
  local total = api.nvim_buf_line_count(0)
  return { text = string.format("%d:%d  %d%%%%", line, column + 1, math.floor(line / total * 100)), priority = 80 }
end

--- Render all segments, dropping the least important ones when the line is too narrow.
---@param width integer
---@return string
function M.render(width)
  local bufnr = api.nvim_get_current_buf()
  local segments = {}
  for _, build in ipairs({ mode_segment, file_segment, diagnostics_segment, git_segment, position_segment }) do
    local segment = build(bufnr)
    if segment then
      table.insert(segments, segment)
    end
  end
  table.sort(segments, function(a, b)
    return a.priority > b.priority
  end)
  local used, kept = 0, {}
  for _, segment in ipairs(segments) do
    local length = #segment.text + 1
    if used + length <= width or #kept == 0 then
      used = used + length
      kept[#kept + 1] = segment
    end
  end
  local output = {}
  for _, segment in ipairs(kept) do
    output[#output + 1] = segment.group and highlight(segment.group, segment.text) or segment.text
  end
  return table.concat(output, " ")
end

function M.setup()
  opt.laststatus = 3
  opt.number = true
  opt.relativenumber = true
  opt.termguicolors = true
  opt.listchars = { tab = "> ", trail = "-", nbsp = "+" }
  vim.g.mapleader = " "

  _G.WoodfishStatus = function()
    return M.render(vim.o.columns)
  end
  vim.o.statusline = "%!v:lua.WoodfishStatus()"

  local group = api.nvim_create_augroup("Statusline", { clear = true })
  api.nvim_create_autocmd({ "ModeChanged", "DiagnosticChanged", "BufEnter" }, {
    group = group,
    callback = function()
      vim.cmd.redrawstatus()
    end,
  })

  vim.keymap.set("n", "<leader>w", "<cmd>write<cr>", { desc = "Save file" })
  vim.keymap.set({ "n", "v" }, "<leader>y", '"+y', { desc = "Yank to clipboard" })
end

local ok, lualine = pcall(require, "lualine")
if ok and lualine then
  lualine.setup({ options = { theme = "auto", globalstatus = true } })
elseif not ok then
  vim.notify("lualine is not installed, using the built-in line", vim.log.levels.WARN)
end

return M
