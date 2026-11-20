-- Statistics corpus: a small Neovim plugin that tracks recently edited files.
local api = vim.api
local fn = vim.fn
local uv = vim.uv or vim.loop

local M = {}

---@class Recent.Options
---@field limit integer maximum number of entries
---@field ignore string[] glob patterns to skip
---@field persist boolean write the list to disk
local defaults = {
  limit = 20,
  ignore = { "*.log", "node_modules/*", ".git/*" },
  persist = true,
}

local state = {
  entries = {},
  index = {},
  options = vim.deepcopy(defaults),
  group = api.nvim_create_augroup("RecentFiles", { clear = true }),
}

local function notify(message, level)
  vim.notify(("[recent] %s"):format(message), level or vim.log.levels.INFO)
end

local function matches_any(name, patterns)
  for _, pattern in ipairs(patterns) do
    local lua_pattern = pattern:gsub("%.", "%%."):gsub("%*", ".*")
    if name:match(lua_pattern) then
      return true
    end
  end
  return false
end

--- Remember a file, moving it to the front when it is already known.
---@param path string
---@return boolean added
function M.touch(path)
  if path == "" or matches_any(path, state.options.ignore) then
    return false
  end
  local position = state.index[path]
  if position then
    table.remove(state.entries, position)
  end
  table.insert(state.entries, 1, { path = path, time = os.time(), count = (position and 2 or 1) })
  while #state.entries > state.options.limit do
    state.entries[#state.entries] = nil
  end
  state.index = {}
  for i, entry in ipairs(state.entries) do
    state.index[entry.path] = i
  end
  return true
end

local function storage_path()
  return fn.stdpath("state") .. "/recent.json"
end

function M.save()
  if not state.options.persist then
    return
  end
  local ok, encoded = pcall(vim.json.encode, state.entries)
  if not ok then
    notify("could not encode entries: " .. tostring(encoded), vim.log.levels.ERROR)
    return
  end
  local file = assert(io.open(storage_path(), "w"))
  file:write(encoded)
  file:close()
end

function M.load()
  local stat = uv.fs_stat(storage_path())
  if not stat or stat.size == 0 then
    return
  end
  local lines = fn.readfile(storage_path())
  local decoded = vim.json.decode(table.concat(lines, "\n"))
  for _, entry in ipairs(decoded or {}) do
    if type(entry.path) == "string" and fn.filereadable(entry.path) == 1 then
      table.insert(state.entries, entry)
    end
  end
end

local function pick(callback)
  local items = {}
  for i, entry in ipairs(state.entries) do
    items[#items + 1] = string.format("%2d  %s", i, fn.fnamemodify(entry.path, ":~:."))
  end
  vim.ui.select(items, { prompt = "Recent files" }, function(_, index)
    if index then
      callback(state.entries[index].path)
    end
  end)
end

local function throttle(ms, callback)
  local timer = uv.new_timer()
  local waiting = false
  return function(...)
    local args = { ... }
    if waiting then
      return
    end
    waiting = true
    timer:start(ms, 0, vim.schedule_wrap(function()
      waiting = false
      callback(unpack(args))
    end))
  end
end

function M.setup(options)
  state.options = vim.tbl_deep_extend("force", defaults, options or {})
  M.load()

  api.nvim_create_autocmd({ "BufReadPost", "BufWritePost" }, {
    group = state.group,
    desc = "Track edited files",
    callback = throttle(200, function(event)
      M.touch(api.nvim_buf_get_name(event.buf))
    end),
  })
  api.nvim_create_autocmd("VimLeavePre", { group = state.group, callback = M.save })

  api.nvim_create_user_command("Recent", function(command)
    if command.bang then
      state.entries, state.index = {}, {}
      return notify("cleared")
    end
    pick(function(path)
      vim.cmd.edit(fn.fnameescape(path))
    end)
  end, { bang = true, desc = "Pick a recent file" })

  vim.keymap.set("n", "<leader>fr", "<cmd>Recent<cr>", { silent = true, desc = "Recent files" })
end

local stats = setmetatable({}, {
  __index = function(_, key)
    return key == "count" and #state.entries or nil
  end,
  __tostring = function()
    return "recent(" .. #state.entries .. ")"
  end,
})

M.stats = stats
goto done
::done::
return M
