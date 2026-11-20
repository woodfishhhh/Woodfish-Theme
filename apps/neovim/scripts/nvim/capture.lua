-- Dumps, for every non-blank character of a file, the Treesitter capture Neovim would paint it with.
--   nvim --headless --clean -l capture.lua <out.json> <file> <lang>
-- Output: { names = { "lang:capture", ... }, lines = { { <utf16 length>, from, to, name_index, ... }, ... } }
-- Columns are UTF-16 offsets so they line up with JavaScript strings.
local out, file, lang = arg[1], arg[2], arg[3]

-- Captures that never paint a foreground color (Neovim merges them without touching the color).
local function paints(capture)
  return capture ~= "spell" and capture ~= "nospell" and capture ~= "conceal" and capture ~= "none" and capture:sub(1, 1) ~= "_"
end

vim.cmd.edit(vim.fn.fnameescape(file))
vim.treesitter.start(0, lang)
vim.treesitter.get_parser(0, lang):parse(true)

local names, name_index = {}, {}

-- The winning capture is the highest priority one; later captures win ties (this is how the highlighter paints).
local function effective(row, col)
  local best, best_priority
  for _, capture in ipairs(vim.treesitter.get_captures_at_pos(0, row, col)) do
    if paints(capture.capture) then
      local metadata = capture.metadata or {}
      local priority = tonumber(metadata.priority or (metadata[capture.id] or {}).priority) or 100
      if best == nil or priority >= best_priority then
        best, best_priority = capture, priority
      end
    end
  end
  return best and (best.lang .. ":" .. best.capture) or nil
end

local lines = {}
for row, text in ipairs(vim.api.nvim_buf_get_lines(0, 0, -1, false)) do
  local entry = { vim.str_utfindex(text, "utf-16") }
  local positions = vim.str_utf_pos(text)
  local run_name, run_end -- run_end is the index of the "to" slot of the open run
  for i, start in ipairs(positions) do
    local char = text:sub(start, (positions[i + 1] or (#text + 1)) - 1)
    if not char:match("^%s$") then
      local name = effective(row - 1, start - 1)
      local from = vim.str_utfindex(text, "utf-16", start - 1)
      local to = from + (#char == 4 and 2 or 1)
      if name == nil then
        run_name = nil
      elseif name == run_name then
        entry[run_end] = to
      else
        if not name_index[name] then
          names[#names + 1] = name
          name_index[name] = #names - 1
        end
        vim.list_extend(entry, { from, to, name_index[name] })
        run_name, run_end = name, #entry - 1
      end
    end
  end
  lines[#lines + 1] = entry
end

vim.fn.writefile({ vim.json.encode({ names = names, lines = lines }) }, out)
