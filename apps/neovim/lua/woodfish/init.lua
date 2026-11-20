local palettes = require("woodfish.palettes")
local M = {}
local current = nil

local function set(name, value)
  vim.api.nvim_set_hl(0, name, value)
end

local function set_many(names, value)
  for _, name in ipairs(names) do
    set(name, value)
  end
end

local function surface(color, transparent)
  if transparent then
    return { fg = color.fg }
  end
  return color
end

local function background(color, transparent)
  if transparent then
    return nil
  end
  return color
end

local function apply_treesitter(tokens)
  local groups = {
    ["@comment"] = { fg = tokens.comment, italic = true },
    ["@constant"] = { fg = tokens.variable },
    ["@constant.builtin"] = { fg = tokens.self },
    ["@constructor"] = { fg = tokens.type },
    ["@function"] = { fg = tokens["function"] },
    ["@function.builtin"] = { fg = tokens["function"] },
    ["@function.call"] = { fg = tokens["function"] },
    ["@keyword"] = { fg = tokens.keyword },
    ["@keyword.conditional"] = { fg = tokens.keyword },
    ["@keyword.function"] = { fg = tokens.keyword },
    ["@keyword.operator"] = { fg = tokens.operator },
    ["@keyword.return"] = { fg = tokens.keyword },
    ["@label"] = { fg = tokens.label or tokens.keyword },
    ["@method"] = { fg = tokens["function"] },
    ["@method.call"] = { fg = tokens["function"] },
    ["@module"] = { fg = tokens.namespace },
    ["@namespace"] = { fg = tokens.namespace },
    ["@number"] = { fg = tokens.number },
    ["@number.float"] = { fg = tokens.number },
    ["@operator"] = { fg = tokens.operator },
    ["@parameter"] = { fg = tokens.parameter },
    ["@property"] = { fg = tokens.property },
    ["@punctuation.bracket"] = { fg = tokens.punctuation },
    ["@punctuation.delimiter"] = { fg = tokens.punctuation },
    ["@punctuation.special"] = { fg = tokens.punctuation },
    ["@string"] = { fg = tokens.string },
    ["@string.escape"] = { fg = tokens.escape },
    ["@string.regexp"] = { fg = tokens.regexp },
    ["@tag"] = { fg = tokens.tag },
    ["@tag.attribute"] = { fg = tokens.attribute },
    ["@tag.delimiter"] = { fg = tokens.punctuation },
    ["@type"] = { fg = tokens.type },
    ["@type.builtin"] = { fg = tokens.type },
    ["@type.definition"] = { fg = tokens.type },
    ["@variable"] = { fg = tokens.variable },
    ["@variable.builtin"] = { fg = tokens.self },
    ["@markup.heading"] = { fg = tokens.keyword, bold = true },
    ["@markup.link"] = { fg = tokens["function"], underline = true },
    ["@markup.raw"] = { fg = tokens.string },
    ["@markup.italic"] = { fg = tokens.comment, italic = true },
    ["@markup.strong"] = { fg = tokens.variable, bold = true },
  }
  for group, value in pairs(groups) do
    set(group, value)
  end
  return groups
end

local function apply_lsp(tokens)
  local groups = {
    ["@lsp.type.class"] = { fg = tokens.type },
    ["@lsp.type.comment"] = { fg = tokens.comment, italic = true },
    ["@lsp.type.decorator"] = { fg = tokens.decorator },
    ["@lsp.type.enum"] = { fg = tokens.type },
    ["@lsp.type.enumMember"] = { fg = tokens.property },
    ["@lsp.type.event"] = { fg = tokens.property },
    ["@lsp.type.function"] = { fg = tokens["function"] },
    ["@lsp.type.interface"] = { fg = tokens.type },
    ["@lsp.type.label"] = { fg = tokens.label or tokens.keyword },
    ["@lsp.type.macro"] = { fg = tokens.macro },
    ["@lsp.type.method"] = { fg = tokens["function"] },
    ["@lsp.type.namespace"] = { fg = tokens.namespace },
    ["@lsp.type.parameter"] = { fg = tokens.parameter },
    ["@lsp.type.property"] = { fg = tokens.property },
    ["@lsp.type.regexp"] = { fg = tokens.regexp },
    ["@lsp.type.struct"] = { fg = tokens.type },
    ["@lsp.type.type"] = { fg = tokens.type },
    ["@lsp.type.typeParameter"] = { fg = tokens.type },
    ["@lsp.type.variable"] = { fg = tokens.variable },
  }
  for group, value in pairs(groups) do
    set(group, value)
  end
end

-- Colors VS Code gives each capture in a language (majority over the sample code, see scripts/lib/targets.mjs).
-- Only the color is language specific; bold / italic / underline come from the generic capture.
local function style_of(groups, capture)
  local name = capture
  while name ~= "" do
    local base = groups["@" .. name]
    if base then
      return base
    end
    name = name:match("^(.*)%.[^.]*$") or ""
  end
  return {}
end

local function apply_languages(languages, groups)
  for language, captures in pairs(languages or {}) do
    for capture, color in pairs(captures) do
      local base = style_of(groups, capture)
      set("@" .. capture .. "." .. language, { fg = color, bold = base.bold, italic = base.italic, underline = base.underline })
    end
  end
end

local function apply_plugins(ui, tokens)
  set("TelescopeNormal", surface({ fg = ui.fg, bg = ui.bgWidget }, false))
  set("TelescopeBorder", { fg = ui.border, bg = ui.bgWidget })
  set("TelescopeTitle", { fg = ui.accent, bg = ui.bgWidget, bold = true })
  set("TelescopePromptTitle", { fg = ui.accentFg, bg = ui.accent, bold = true })
  set("TelescopePreviewTitle", { fg = ui.accentFg, bg = ui.accent2, bold = true })
  set("TelescopeResultsTitle", { fg = ui.accentFg, bg = ui.success, bold = true })
  set("CmpDocumentation", { fg = ui.fg, bg = ui.bgWidget })
  set("CmpDocumentationBorder", { fg = ui.border, bg = ui.bgWidget })
  set("CmpItemAbbr", { fg = ui.fgMuted, bg = ui.bgWidget })
  set("CmpItemAbbrMatch", { fg = ui.accent, bg = ui.bgWidget, bold = true })
  set("CmpItemKind", { fg = tokens.type, bg = ui.bgWidget })
  set("BlinkCmpMenu", { fg = ui.fg, bg = ui.bgWidget })
  set("BlinkCmpMenuBorder", { fg = ui.border, bg = ui.bgWidget })
  set("BlinkCmpLabelMatch", { fg = ui.accent, bg = ui.bgWidget, bold = true })
  set("NvimTreeNormal", { fg = ui.fgMuted, bg = ui.bgAlt })
  set("NvimTreeRootFolder", { fg = ui.accent, bg = ui.bgAlt, bold = true })
  set("NvimTreeFolderName", { fg = ui.fg, bg = ui.bgAlt })
  set("NvimTreeGitNew", { fg = ui.success, bg = ui.bgAlt })
  set("NvimTreeGitDeleted", { fg = ui.error, bg = ui.bgAlt })
  set("NeoTreeNormal", { fg = ui.fgMuted, bg = ui.bgAlt })
  set("NeoTreeDirectoryName", { fg = ui.fg, bg = ui.bgAlt })
  set("NeoTreeGitAdded", { fg = ui.success, bg = ui.bgAlt })
  set("NeoTreeGitDeleted", { fg = ui.error, bg = ui.bgAlt })
  set("WhichKey", { fg = ui.accent, bg = ui.bgWidget, bold = true })
  set("WhichKeyGroup", { fg = tokens.type, bg = ui.bgWidget })
  set("WhichKeyDesc", { fg = ui.fg, bg = ui.bgWidget })
  set("IblIndent", { fg = ui.border, nocombine = true })
  set("IblScope", { fg = ui.accent, nocombine = true })
end

local function apply(name, options)
  local palette = palettes[name] or palettes["woodfish-" .. name] or palettes["woodfish-dark"]
  local ui = palette.ui
  local tokens = palette.tokens
  local host = palette.host or {}
  local transparent = options.transparent == true
  current = palette

  vim.cmd("highlight clear")
  if vim.fn.exists("syntax_on") == 1 then
    vim.cmd("syntax reset")
  end
  vim.g.colors_name = name

  local normal = { fg = ui.fg, bg = background(ui.bg, transparent) }
  set("Normal", normal)
  set("NormalNC", normal)
  set("NormalFloat", { fg = ui.fg, bg = background(host["editorWidget.background"] or ui.bgWidget, transparent) })
  set("SignColumn", { fg = ui.fgMuted, bg = background(ui.bg, transparent) })
  set("EndOfBuffer", { fg = ui.bgDeep, bg = background(ui.bg, transparent) })
  set("ColorColumn", { bg = background(host["editor.lineHighlightBackground"] or ui.lineHighlight, transparent) })
  set("CursorLine", { bg = background(host["editor.lineHighlightBackground"] or ui.lineHighlight, transparent) })
  set("CursorColumn", { bg = background(host["editor.lineHighlightBackground"] or ui.lineHighlight, transparent) })
  set("Cursor", { fg = ui.bg, bg = host["editorCursor.foreground"] or ui.accent })
  set("lCursor", { fg = ui.bg, bg = host["editorCursor.foreground"] or ui.accent })
  set("LineNr", { fg = host["editorLineNumber.foreground"] or ui.fgSubtle, bg = background(ui.bg, transparent) })
  set("CursorLineNr", { fg = ui.accent, bg = background(host["editor.lineHighlightBackground"] or ui.lineHighlight, transparent), bold = true })
  set("StatusLine", { fg = ui.fg, bg = background(ui.bgAlt, transparent) })
  set("StatusLineNC", { fg = ui.fgSubtle, bg = background(ui.bgAlt, transparent) })
  set("WinSeparator", { fg = ui.border, bg = background(ui.bg, transparent) })
  set("VertSplit", { fg = ui.border, bg = background(ui.bg, transparent) })
  set("TabLine", { fg = ui.fgSubtle, bg = background(ui.bgAlt, transparent) })
  set("TabLineFill", { fg = ui.fgSubtle, bg = background(ui.bgDeep, transparent) })
  set("TabLineSel", { fg = ui.fg, bg = background(ui.bg, transparent), bold = true })
  set("Pmenu", { fg = ui.fg, bg = host["editorSuggestWidget.background"] or ui.bgWidget })
  set("PmenuSel", { fg = ui.accentFg, bg = ui.accent, bold = true })
  set("PmenuSbar", { bg = ui.border })
  set("PmenuThumb", { bg = ui.accent })
  set("FloatBorder", { fg = ui.border, bg = host["editorWidget.background"] or ui.bgWidget })
  set("FloatTitle", { fg = ui.accent, bg = host["editorWidget.background"] or ui.bgWidget, bold = true })
  set("Search", { fg = ui.bg, bg = host["editor.findMatchBackground"] or ui.findMatch })
  set("IncSearch", { fg = ui.bg, bg = ui.accent })
  set("CurSearch", { fg = ui.bg, bg = ui.accent2 })
  set("Visual", { bg = host["editor.selectionBackground"] or ui.selection })
  set("VisualNOS", { bg = ui.selectionInactive })
  set("MatchParen", { fg = ui.accent, bg = ui.selection, bold = true })
  set("Folded", { fg = ui.fgMuted, bg = background(ui.bgAlt, transparent) })
  set("FoldColumn", { fg = ui.fgSubtle, bg = background(ui.bg, transparent) })
  set("Directory", { fg = ui.info })
  set("Title", { fg = ui.accent, bold = true })
  set("Question", { fg = ui.success })
  set("ErrorMsg", { fg = ui.error, bold = true })
  set("WarningMsg", { fg = ui.warning })
  set("MoreMsg", { fg = ui.success })
  set("ModeMsg", { fg = ui.info, bold = true })
  set("MsgArea", { fg = ui.fg })
  set_many({ "NonText", "SpecialKey", "Whitespace" }, { fg = ui.fgSubtle })

  set("Comment", { fg = tokens.comment, italic = true })
  set("Constant", { fg = tokens.variable })
  set("String", { fg = tokens.string })
  set("Character", { fg = tokens.string })
  set("Number", { fg = tokens.number })
  set("Boolean", { fg = tokens.number })
  set("Float", { fg = tokens.number })
  set("Identifier", { fg = tokens.variable })
  set("Function", { fg = tokens["function"] })
  set_many({ "Statement", "Conditional", "Repeat", "Label", "Keyword", "Exception" }, { fg = tokens.keyword })
  set("Operator", { fg = tokens.operator })
  set_many({ "PreProc", "Include", "Define", "Macro", "PreCondit" }, { fg = tokens.macro })
  set_many({ "Type", "StorageClass", "Structure", "Typedef" }, { fg = tokens.type })
  set_many({ "Special", "SpecialChar", "Tag" }, { fg = tokens.tag })
  set_many({ "Delimiter", "SpecialComment" }, { fg = tokens.punctuation })
  set("Underlined", { fg = ui.info, underline = true })
  set("Error", { fg = tokens.invalid, bg = background(ui.bg, transparent) })
  set("Todo", { fg = ui.accentFg, bg = ui.accent, bold = true })

  set("DiagnosticError", { fg = host["editorError.foreground"] or ui.error })
  set("DiagnosticWarn", { fg = host["editorWarning.foreground"] or ui.warning })
  set("DiagnosticInfo", { fg = ui.info })
  set("DiagnosticHint", { fg = ui.success })
  set("DiagnosticOk", { fg = ui.success })
  set("DiagnosticUnderlineError", { sp = host["editorError.foreground"] or ui.error, undercurl = true })
  set("DiagnosticUnderlineWarn", { sp = host["editorWarning.foreground"] or ui.warning, undercurl = true })
  set("DiagnosticUnderlineInfo", { sp = ui.info, undercurl = true })
  set("DiagnosticUnderlineHint", { sp = ui.success, undercurl = true })
  set("DiagnosticVirtualTextError", { fg = host["editorError.foreground"] or ui.error, bg = background(ui.bgAlt, transparent) })
  set("DiagnosticVirtualTextWarn", { fg = host["editorWarning.foreground"] or ui.warning, bg = background(ui.bgAlt, transparent) })
  set("DiagnosticVirtualTextInfo", { fg = ui.info, bg = background(ui.bgAlt, transparent) })
  set("DiagnosticVirtualTextHint", { fg = ui.success, bg = background(ui.bgAlt, transparent) })

  set("DiffAdd", { fg = ui.success, bg = background(ui.bgAlt, transparent) })
  set("DiffDelete", { fg = ui.error, bg = background(ui.bgAlt, transparent) })
  set("DiffChange", { fg = ui.info, bg = background(ui.bgAlt, transparent) })
  set("DiffText", { fg = ui.accent, bg = ui.selection })
  set_many({ "GitSignsAdd", "Added" }, { fg = ui.success })
  set_many({ "GitSignsChange", "Changed" }, { fg = ui.info })
  set_many({ "GitSignsDelete", "Removed" }, { fg = ui.error })
  set("GitSignsCurrentLineBlame", { fg = ui.fgSubtle, italic = true })

  for index, color in ipairs(palette.ansi) do
    vim.g["terminal_color_" .. (index - 1)] = color
  end

  local groups = apply_treesitter(tokens)
  apply_languages(palette.language, groups)
  apply_lsp(tokens)
  apply_plugins(ui, tokens)
end

function M.load(name)
  apply(name, {})
end

function M.setup(options)
  apply(vim.g.colors_name or "woodfish-dark", options or {})
end

function M.palette()
  return current or palettes[vim.g.colors_name] or palettes["woodfish-dark"]
end

return M
