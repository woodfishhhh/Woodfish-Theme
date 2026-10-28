#!/usr/bin/env node
/*
 * Renders the original Woodfish palettes (Light, Black, Neon) into VS Code themes.
 *
 *   node scripts/generate-themes.js          write themes/<slug>/*
 *   node scripts/generate-themes.js --check  fail if generated files are stale
 *
 * Every palette is validated before writing:
 * - WCAG 2.x contrast ≥ 4.5 for token colors (≥ 3.0 for comments) on the editor background
 * - keyword vs variable differ by ≥ 40° OKLCH hue (Go/Python feedback, issue #6)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const {
  ORIGINAL_PALETTES: PALETTES,
  paletteContrast: contrast,
  paletteHueDistance: hueDistance,
  validatePalette: validate,
  withHexAlpha: alpha,
} = require('@woodfish/theme-core');

// Palette specs, color math and readability rules live in @woodfish/theme-core so every
// Woodfish app shares them. This script only renders them into VS Code theme files.

// ---------- theme template ----------

function workbenchColors(p) {
  const u = p.ui;
  const t = p.tokens;
  const light = p.type === 'light';
  const hover = light ? '#00000010' : '#FFFFFF0D';
  const active = light ? '#00000018' : '#FFFFFF14';
  return {
    focusBorder: u.accent,
    foreground: u.fg,
    disabledForeground: u.fgSubtle,
    descriptionForeground: u.fgMuted,
    errorForeground: u.error,
    'icon.foreground': u.fgMuted,
    'widget.shadow': light ? '#0000001F' : '#00000080',
    'widget.border': u.border,
    'selection.background': alpha(u.accent, 0.35),
    'sash.hoverBorder': u.accent,
    'textLink.foreground': u.accent,
    'textLink.activeForeground': u.accent2,
    'textPreformat.foreground': t.string,
    'textBlockQuote.background': u.bgAlt,
    'textBlockQuote.border': u.accent,
    'textCodeBlock.background': u.bgAlt,
    'textSeparator.foreground': u.border,

    'window.activeBorder': u.border,
    'window.inactiveBorder': u.border,
    'titleBar.activeBackground': u.bgDeep,
    'titleBar.activeForeground': u.fg,
    'titleBar.inactiveBackground': u.bgDeep,
    'titleBar.inactiveForeground': u.fgSubtle,
    'titleBar.border': u.border,
    'commandCenter.background': u.bgAlt,
    'commandCenter.foreground': u.fgMuted,
    'commandCenter.border': u.border,
    'commandCenter.activeBackground': active,
    'menubar.selectionBackground': hover,
    'menu.background': u.bgWidget,
    'menu.foreground': u.fg,
    'menu.selectionBackground': alpha(u.accent, light ? 0.16 : 0.22),
    'menu.selectionForeground': u.fg,
    'menu.separatorBackground': u.border,
    'menu.border': u.border,

    'activityBar.background': u.bgAlt,
    'activityBar.foreground': u.fg,
    'activityBar.inactiveForeground': u.fgSubtle,
    'activityBar.border': u.border,
    'activityBar.activeBorder': u.accent,
    'activityBar.activeBackground': hover,
    'activityBarBadge.background': u.accent,
    'activityBarBadge.foreground': u.accentFg,
    'activityBarTop.foreground': u.fg,
    'activityBarTop.inactiveForeground': u.fgSubtle,
    'activityBarTop.activeBorder': u.accent,

    'sideBar.background': u.bgAlt,
    'sideBar.foreground': u.fgMuted,
    'sideBar.border': u.border,
    'sideBarTitle.foreground': u.fg,
    'sideBarSectionHeader.background': u.bgAlt,
    'sideBarSectionHeader.foreground': u.fg,
    'sideBarSectionHeader.border': u.border,
    'sideBarStickyScroll.background': u.bgAlt,

    'list.activeSelectionBackground': alpha(u.accent, light ? 0.18 : 0.24),
    'list.activeSelectionForeground': u.fg,
    'list.inactiveSelectionBackground': alpha(u.accent, light ? 0.1 : 0.14),
    'list.inactiveSelectionForeground': u.fg,
    'list.hoverBackground': hover,
    'list.hoverForeground': u.fg,
    'list.focusOutline': u.accent,
    'list.focusBackground': alpha(u.accent, 0.16),
    'list.highlightForeground': u.accent2,
    'list.focusHighlightForeground': u.accent2,
    'list.errorForeground': u.error,
    'list.warningForeground': u.warning,
    'list.dropBackground': alpha(u.accent, 0.2),
    'tree.indentGuidesStroke': u.border,
    'tree.inactiveIndentGuidesStroke': alpha(u.border, 0.6),

    'editorGroup.border': u.border,
    'editorGroup.dropBackground': alpha(u.accent, 0.15),
    'editorGroupHeader.tabsBackground': u.bgAlt,
    'editorGroupHeader.tabsBorder': u.border,
    'editorGroupHeader.noTabsBackground': u.bg,
    'tab.activeBackground': u.bg,
    'tab.activeForeground': u.fg,
    'tab.activeBorder': u.bg,
    'tab.activeBorderTop': u.accent,
    'tab.inactiveBackground': u.bgAlt,
    'tab.inactiveForeground': u.fgSubtle,
    'tab.hoverBackground': u.bg,
    'tab.hoverForeground': u.fg,
    'tab.unfocusedActiveForeground': u.fgMuted,
    'tab.unfocusedInactiveForeground': u.fgSubtle,
    'tab.unfocusedActiveBorderTop': u.border,
    'tab.border': u.border,
    'tab.lastPinnedBorder': u.border,
    'tab.modifiedBorder': u.warning,
    'breadcrumb.background': u.bg,
    'breadcrumb.foreground': u.fgSubtle,
    'breadcrumb.focusForeground': u.fg,
    'breadcrumb.activeSelectionForeground': u.accent,
    'breadcrumbPicker.background': u.bgWidget,

    'editor.background': u.bg,
    'editor.foreground': u.fg,
    'editorLineNumber.foreground': u.fgSubtle,
    'editorLineNumber.activeForeground': u.fg,
    'editorCursor.foreground': u.accent2,
    'editor.selectionBackground': u.selection,
    'editor.inactiveSelectionBackground': u.selectionInactive,
    'editor.selectionHighlightBackground': alpha(u.accent, light ? 0.14 : 0.18),
    'editor.wordHighlightBackground': alpha(u.accent, light ? 0.12 : 0.16),
    'editor.wordHighlightStrongBackground': alpha(u.accent2, light ? 0.12 : 0.18),
    'editor.findMatchBackground': u.findMatch,
    'editor.findMatchBorder': u.warning,
    'editor.findMatchHighlightBackground': alpha(u.findMatch, 0.55),
    'editor.findRangeHighlightBackground': alpha(u.accent, 0.08),
    'editor.lineHighlightBackground': u.lineHighlight,
    'editor.lineHighlightBorder': u.lineHighlight,
    'editor.rangeHighlightBackground': alpha(u.accent, 0.08),
    'editor.hoverHighlightBackground': alpha(u.accent, 0.12),
    'editor.foldBackground': alpha(u.accent, 0.08),
    'editorLink.activeForeground': u.accent,
    'editorWhitespace.foreground': alpha(u.fgSubtle, 0.5),
    'editorIndentGuide.background1': alpha(u.border, light ? 1 : 0.9),
    'editorIndentGuide.activeBackground1': u.fgSubtle,
    'editorRuler.foreground': u.border,
    'editorCodeLens.foreground': u.fgSubtle,
    'editorInlayHint.background': alpha(u.fgSubtle, 0.12),
    'editorInlayHint.foreground': u.fgMuted,
    'editorBracketMatch.background': alpha(u.accent, 0.15),
    'editorBracketMatch.border': u.accent,
    'editorBracketHighlight.foreground1': t.parameter,
    'editorBracketHighlight.foreground2': t.keyword,
    'editorBracketHighlight.foreground3': t.function,
    'editorBracketHighlight.foreground4': t.type,
    'editorBracketHighlight.foreground5': t.storage,
    'editorBracketHighlight.foreground6': t.number,
    'editorBracketHighlight.unexpectedBracket.foreground': u.error,
    'editorBracketPairGuide.activeBackground1': alpha(t.parameter, 0.6),
    'editorBracketPairGuide.activeBackground2': alpha(t.keyword, 0.6),
    'editorBracketPairGuide.activeBackground3': alpha(t.function, 0.6),
    'editorError.foreground': u.error,
    'editorWarning.foreground': u.warning,
    'editorInfo.foreground': u.info,
    'editorHint.foreground': u.success,
    'editorGutter.background': u.bg,
    'editorGutter.addedBackground': u.success,
    'editorGutter.modifiedBackground': u.info,
    'editorGutter.deletedBackground': u.error,
    'editorGutter.foldingControlForeground': u.fgMuted,
    'editorOverviewRuler.border': u.border,
    'editorOverviewRuler.errorForeground': u.error,
    'editorOverviewRuler.warningForeground': u.warning,
    'editorOverviewRuler.infoForeground': u.info,
    'editorOverviewRuler.findMatchForeground': u.warning,
    'editorOverviewRuler.selectionHighlightForeground': u.accent,
    'editorStickyScroll.background': u.bg,
    'editorStickyScrollHover.background': u.lineHighlight,
    'editorUnnecessaryCode.opacity': '#000000AA',

    'editorWidget.background': u.bgWidget,
    'editorWidget.foreground': u.fg,
    'editorWidget.border': u.border,
    'editorSuggestWidget.background': u.bgWidget,
    'editorSuggestWidget.border': u.border,
    'editorSuggestWidget.foreground': u.fg,
    'editorSuggestWidget.highlightForeground': u.accent2,
    'editorSuggestWidget.focusHighlightForeground': u.accent2,
    'editorSuggestWidget.selectedBackground': alpha(u.accent, light ? 0.16 : 0.22),
    'editorSuggestWidget.selectedForeground': u.fg,
    'editorHoverWidget.background': u.bgWidget,
    'editorHoverWidget.foreground': u.fg,
    'editorHoverWidget.border': u.border,
    'editorHoverWidget.statusBarBackground': u.bgAlt,
    'peekView.border': u.accent,
    'peekViewEditor.background': u.bgAlt,
    'peekViewEditor.matchHighlightBackground': alpha(u.findMatch, 0.6),
    'peekViewResult.background': u.bgAlt,
    'peekViewResult.matchHighlightBackground': alpha(u.findMatch, 0.6),
    'peekViewResult.selectionBackground': alpha(u.accent, 0.2),
    'peekViewTitle.background': u.bgDeep,
    'peekViewTitleLabel.foreground': u.fg,
    'peekViewTitleDescription.foreground': u.fgMuted,
    'diffEditor.insertedTextBackground': alpha(u.success, light ? 0.16 : 0.18),
    'diffEditor.removedTextBackground': alpha(u.error, light ? 0.14 : 0.18),
    'diffEditor.insertedLineBackground': alpha(u.success, light ? 0.08 : 0.1),
    'diffEditor.removedLineBackground': alpha(u.error, light ? 0.07 : 0.1),
    'diffEditor.diagonalFill': u.border,
    'merge.currentHeaderBackground': alpha(u.success, 0.4),
    'merge.incomingHeaderBackground': alpha(u.info, 0.4),

    'minimap.background': u.bg,
    'minimap.selectionHighlight': alpha(u.accent, 0.5),
    'minimap.findMatchHighlight': u.warning,
    'minimap.errorHighlight': u.error,
    'minimap.warningHighlight': u.warning,
    'minimapGutter.addedBackground': u.success,
    'minimapGutter.modifiedBackground': u.info,
    'minimapGutter.deletedBackground': u.error,
    'minimapSlider.background': alpha(u.fgSubtle, 0.15),
    'minimapSlider.hoverBackground': alpha(u.fgSubtle, 0.25),
    'minimapSlider.activeBackground': alpha(u.fgSubtle, 0.35),
    'scrollbar.shadow': light ? '#0000001A' : '#00000066',
    'scrollbarSlider.background': alpha(u.fgSubtle, 0.2),
    'scrollbarSlider.hoverBackground': alpha(u.fgSubtle, 0.35),
    'scrollbarSlider.activeBackground': alpha(u.fgSubtle, 0.5),

    'panel.background': u.bgAlt,
    'panel.border': u.border,
    'panelTitle.activeForeground': u.fg,
    'panelTitle.activeBorder': u.accent,
    'panelTitle.inactiveForeground': u.fgSubtle,
    'panelSection.border': u.border,
    'panelInput.border': u.border,
    'statusBar.background': u.bgDeep,
    'statusBar.foreground': u.fgMuted,
    'statusBar.border': u.border,
    'statusBar.noFolderBackground': u.bgDeep,
    'statusBar.noFolderForeground': u.fgMuted,
    'statusBar.debuggingBackground': u.accent2,
    'statusBar.debuggingForeground': light ? '#FFFFFF' : u.accentFg,
    'statusBarItem.hoverBackground': hover,
    'statusBarItem.activeBackground': active,
    'statusBarItem.remoteBackground': u.accent,
    'statusBarItem.remoteForeground': u.accentFg,
    'statusBarItem.prominentBackground': alpha(u.accent, 0.25),
    'statusBarItem.errorBackground': u.error,
    'statusBarItem.errorForeground': '#FFFFFF',
    'statusBarItem.warningBackground': u.warning,
    'statusBarItem.warningForeground': light ? '#FFFFFF' : u.accentFg,

    'terminal.background': u.bgAlt,
    'terminal.foreground': u.fg,
    'terminal.border': u.border,
    'terminal.selectionBackground': u.selection,
    'terminalCursor.foreground': u.accent2,
    'terminal.ansiBlack': p.ansi[0],
    'terminal.ansiRed': p.ansi[1],
    'terminal.ansiGreen': p.ansi[2],
    'terminal.ansiYellow': p.ansi[3],
    'terminal.ansiBlue': p.ansi[4],
    'terminal.ansiMagenta': p.ansi[5],
    'terminal.ansiCyan': p.ansi[6],
    'terminal.ansiWhite': p.ansi[7],
    'terminal.ansiBrightBlack': p.ansi[8],
    'terminal.ansiBrightRed': p.ansi[9],
    'terminal.ansiBrightGreen': p.ansi[10],
    'terminal.ansiBrightYellow': p.ansi[11],
    'terminal.ansiBrightBlue': p.ansi[12],
    'terminal.ansiBrightMagenta': p.ansi[13],
    'terminal.ansiBrightCyan': p.ansi[14],
    'terminal.ansiBrightWhite': p.ansi[15],
    'terminalCommandDecoration.successBackground': u.success,
    'terminalCommandDecoration.errorBackground': u.error,

    'input.background': light ? '#FFFFFF' : u.bgWidget,
    'input.foreground': u.fg,
    'input.border': u.border,
    'input.placeholderForeground': u.fgSubtle,
    'inputOption.activeBorder': u.accent,
    'inputOption.activeBackground': alpha(u.accent, 0.2),
    'inputValidation.errorBackground': u.bgWidget,
    'inputValidation.errorBorder': u.error,
    'inputValidation.warningBackground': u.bgWidget,
    'inputValidation.warningBorder': u.warning,
    'inputValidation.infoBackground': u.bgWidget,
    'inputValidation.infoBorder': u.info,
    'dropdown.background': u.bgWidget,
    'dropdown.foreground': u.fg,
    'dropdown.border': u.border,
    'dropdown.listBackground': u.bgWidget,
    'checkbox.background': u.bgWidget,
    'checkbox.border': u.border,
    'checkbox.foreground': u.fg,
    'button.background': u.accent,
    'button.foreground': u.accentFg,
    'button.hoverBackground': alpha(u.accent, 0.85),
    'button.secondaryBackground': u.bgDeep,
    'button.secondaryForeground': u.fg,
    'button.secondaryHoverBackground': u.border,
    'button.border': '#00000000',
    'badge.background': u.accent,
    'badge.foreground': u.accentFg,
    'progressBar.background': u.accent2,
    'keybindingLabel.background': alpha(u.fgSubtle, 0.12),
    'keybindingLabel.foreground': u.fg,
    'keybindingLabel.border': u.border,
    'keybindingLabel.bottomBorder': u.border,

    'quickInput.background': u.bgWidget,
    'quickInput.foreground': u.fg,
    'quickInputTitle.background': u.bgAlt,
    'quickInputList.focusBackground': alpha(u.accent, light ? 0.16 : 0.22),
    'quickInputList.focusForeground': u.fg,
    'pickerGroup.border': u.border,
    'pickerGroup.foreground': u.accent2,
    'notifications.background': u.bgWidget,
    'notifications.foreground': u.fg,
    'notifications.border': u.border,
    'notificationCenterHeader.background': u.bgAlt,
    'notificationCenterHeader.foreground': u.fg,
    'notificationToast.border': u.border,
    'notificationsErrorIcon.foreground': u.error,
    'notificationsWarningIcon.foreground': u.warning,
    'notificationsInfoIcon.foreground': u.info,
    'notificationLink.foreground': u.accent,
    'debugToolBar.background': u.bgWidget,
    'debugToolBar.border': u.border,
    'debugIcon.breakpointForeground': u.error,
    'editor.stackFrameHighlightBackground': alpha(u.warning, 0.18),
    'editor.focusedStackFrameHighlightBackground': alpha(u.success, 0.18),

    'gitDecoration.addedResourceForeground': u.success,
    'gitDecoration.modifiedResourceForeground': u.info,
    'gitDecoration.deletedResourceForeground': u.error,
    'gitDecoration.renamedResourceForeground': t.type,
    'gitDecoration.untrackedResourceForeground': t.string,
    'gitDecoration.ignoredResourceForeground': u.fgSubtle,
    'gitDecoration.conflictingResourceForeground': u.warning,
    'gitDecoration.submoduleResourceForeground': t.storage,

    'settings.headerForeground': u.fg,
    'settings.modifiedItemIndicator': u.accent,
    'settings.focusedRowBackground': hover,
    'settings.rowHoverBackground': hover,
    'welcomePage.tileBackground': u.bgAlt,
    'welcomePage.tileHoverBackground': u.bgDeep,
    'walkThrough.embeddedEditorBackground': u.bgAlt,
    'chat.requestBackground': u.bgAlt,
    'chat.requestBorder': u.border,
    'chat.slashCommandForeground': u.accent2,
    'chat.avatarBackground': u.bgDeep,
    'inlineChat.background': u.bgWidget,
    'inlineChat.border': u.border,
    'inlineChatInput.background': u.bgAlt,
    'inlineChatInput.border': u.border,
    'charts.foreground': u.fg,
    'charts.red': u.error,
    'charts.blue': u.info,
    'charts.yellow': u.warning,
    'charts.green': u.success,
    'charts.orange': t.number,
    'charts.purple': t.storage,
  };
}

function tokenColors(p) {
  const t = p.tokens;
  const rule = (name, scope, foreground, fontStyle) => ({
    name,
    scope,
    settings: fontStyle === undefined ? { foreground } : { foreground, fontStyle },
  });
  return [
    rule(
      'Comment',
      ['comment', 'punctuation.definition.comment', 'string.comment'],
      t.comment,
      'italic'
    ),
    rule(
      'Doc comment tag',
      [
        'comment.block.documentation entity.name.tag',
        'storage.type.class.jsdoc',
        'keyword.other.phpdoc',
      ],
      t.storage,
      'italic'
    ),
    rule(
      'Keyword',
      [
        'keyword',
        'keyword.control',
        'keyword.other.using',
        'keyword.other.operator',
        'keyword.go',
        'keyword.package.go',
        'keyword.import.go',
        'keyword.function.go',
        'keyword.var.go',
        'keyword.const.go',
        'keyword.type.go',
        'keyword.struct.go',
        'keyword.interface.go',
        'keyword.map.go',
        'keyword.channel.go',
      ],
      t.keyword
    ),
    rule(
      'Control flow',
      [
        'keyword.control.flow',
        'keyword.control.flow.python',
        'keyword.control.conditional',
        'keyword.control.loop',
        'keyword.control.return',
        'keyword.control.import',
        'keyword.control.export',
        'keyword.control.from',
        'keyword.control.trycatch',
      ],
      t.keyword,
      'italic'
    ),
    rule(
      'Storage',
      [
        'storage',
        'storage.type',
        'storage.modifier',
        'storage.type.function.python',
        'storage.type.class.python',
        'storage.type.function.arrow',
        'storage.type.go',
        'storage.type.rust',
        'storage.type.java',
        'keyword.declaration',
      ],
      t.storage
    ),
    rule(
      'Operator',
      [
        'keyword.operator',
        'keyword.operator.assignment',
        'keyword.operator.arithmetic',
        'keyword.operator.logical',
        'keyword.operator.comparison',
        'punctuation.separator.key-value',
        'keyword.operator.address.go',
      ],
      t.operator
    ),
    rule(
      'Word operators',
      [
        'keyword.operator.new',
        'keyword.operator.expression',
        'keyword.operator.logical.python',
        'keyword.operator.word',
        'keyword.operator.sizeof',
      ],
      t.keyword
    ),
    rule(
      'Punctuation',
      [
        'punctuation',
        'punctuation.separator',
        'punctuation.terminator',
        'meta.brace',
        'punctuation.section',
        'punctuation.definition.parameters',
        'punctuation.definition.block',
      ],
      t.punctuation
    ),
    rule(
      'Function',
      [
        'entity.name.function',
        'support.function',
        'meta.function-call.generic.python',
        'meta.function-call entity.name.function',
        'entity.name.function.go',
        'entity.name.function.member',
        'entity.name.function.rust',
        'entity.name.function.java',
      ],
      t.function
    ),
    rule(
      'Method',
      [
        'entity.name.function.method',
        'meta.method-call entity.name.function',
        'variable.function',
        'entity.name.method',
      ],
      t.function
    ),
    rule(
      'Built-in function',
      [
        'support.function.builtin',
        'support.function.builtin.python',
        'support.function.builtin.go',
        'support.function.magic.python',
        'support.function.console',
      ],
      t.function,
      'italic'
    ),
    rule(
      'Preprocessor / macro',
      [
        'keyword.control.directive',
        'meta.preprocessor',
        'entity.name.function.preprocessor',
        'entity.name.function.macro.rust',
        'support.macro',
      ],
      t.macro
    ),
    rule(
      'Decorator',
      [
        'entity.name.function.decorator',
        'entity.name.function.decorator.python',
        'meta.decorator',
        'punctuation.decorator',
        'storage.type.annotation',
        'punctuation.definition.annotation',
        'meta.attribute.rust',
      ],
      t.decorator,
      'italic'
    ),
    rule(
      'Parameter',
      [
        'variable.parameter',
        'variable.parameter.function',
        'variable.parameter.function.language.python',
        'meta.parameter variable',
        'variable.parameter.go',
        'meta.function.parameters variable',
      ],
      t.parameter,
      'italic'
    ),
    rule(
      'Variable',
      [
        'variable',
        'variable.other',
        'variable.other.readwrite',
        'variable.other.go',
        'variable.other.assignment.go',
        'variable.other.declaration.go',
        'meta.definition.variable',
        'variable.other.local',
      ],
      t.variable
    ),
    rule(
      'Self / this',
      [
        'variable.language',
        'variable.language.this',
        'variable.language.self',
        'variable.language.special.self.python',
        'variable.parameter.function.language.special.self.python',
        'variable.language.super',
      ],
      t.self,
      'italic'
    ),
    rule(
      'Constant variable',
      [
        'variable.other.constant',
        'variable.other.enummember',
        'constant.other',
        'entity.name.constant',
      ],
      t.number
    ),
    rule(
      'Property',
      [
        'variable.other.property',
        'variable.other.object.property',
        'variable.other.member',
        'meta.object-literal.key',
        'support.variable.property',
        'entity.name.variable.field',
        'variable.other.field.go',
        'meta.field.declaration.go',
        'variable.other.member.c',
        'variable.other.member.cpp',
      ],
      t.property
    ),
    rule('Object', ['variable.other.object', 'support.variable'], t.variable),
    rule(
      'Type',
      [
        'entity.name.type',
        'entity.name.class',
        'entity.name.struct',
        'entity.name.enum',
        'entity.name.interface',
        'entity.name.type.go',
        'entity.name.type.rust',
        'entity.name.type.class.java',
        'support.type',
        'support.class',
        'entity.other.inherited-class',
        'meta.type.annotation entity.name.type',
      ],
      t.type
    ),
    rule(
      'Primitive type',
      [
        'support.type.primitive',
        'storage.type.primitive',
        'storage.type.numeric.go',
        'storage.type.string.go',
        'storage.type.boolean.go',
        'storage.type.byte.go',
        'storage.type.error.go',
        'storage.type.built-in',
        'support.type.builtin.python',
        'entity.name.type.numeric.rust',
        'entity.name.type.primitive.rust',
      ],
      t.type,
      'italic'
    ),
    rule(
      'Type parameter',
      ['entity.name.type.parameter', 'storage.type.generic', 'entity.name.type.template'],
      t.type,
      'italic'
    ),
    rule(
      'Namespace / package',
      [
        'entity.name.namespace',
        'entity.name.package',
        'entity.name.package.go',
        'entity.name.import.go',
        'entity.name.type.module',
        'entity.name.module',
        'support.other.namespace',
        'entity.name.scope-resolution',
        'storage.modifier.import.java',
        'storage.modifier.package.java',
      ],
      t.namespace
    ),
    rule(
      'String',
      [
        'string',
        'string.quoted',
        'string.template',
        'punctuation.definition.string',
        'string.quoted.raw.go',
        'string.quoted.docstring.python',
      ],
      t.string
    ),
    rule(
      'String escape',
      [
        'constant.character.escape',
        'constant.character.format.placeholder',
        'constant.other.placeholder',
        'punctuation.definition.template-expression',
        'punctuation.section.embedded',
        'meta.template.expression',
      ],
      t.escape
    ),
    rule(
      'Regular expression',
      [
        'string.regexp',
        'constant.other.character-class.regexp',
        'keyword.operator.quantifier.regexp',
      ],
      t.regexp
    ),
    rule(
      'Number',
      [
        'constant.numeric',
        'constant.numeric.decimal.go',
        'constant.numeric.integer',
        'constant.numeric.float',
        'keyword.other.unit',
      ],
      t.number
    ),
    rule(
      'Language constant',
      [
        'constant.language',
        'constant.language.boolean',
        'constant.language.null',
        'constant.language.python',
        'constant.language.go',
        'support.constant',
      ],
      t.number,
      'italic'
    ),
    rule(
      'HTML / JSX tag',
      ['entity.name.tag', 'meta.tag.sgml', 'punctuation.definition.tag', 'support.class.component'],
      t.tag
    ),
    rule(
      'Attribute',
      [
        'entity.other.attribute-name',
        'entity.other.attribute-name.html',
        'entity.other.attribute-name.jsx',
      ],
      t.attribute,
      'italic'
    ),
    rule(
      'CSS selector',
      [
        'entity.other.attribute-name.class.css',
        'entity.other.attribute-name.id.css',
        'entity.name.tag.css',
        'entity.other.attribute-name.pseudo-class.css',
        'entity.other.attribute-name.pseudo-element.css',
      ],
      t.function
    ),
    rule(
      'CSS property',
      [
        'support.type.property-name',
        'support.type.property-name.css',
        'support.type.vendored.property-name',
      ],
      t.property
    ),
    rule(
      'CSS value',
      [
        'support.constant.property-value',
        'support.constant.color',
        'constant.other.color',
        'support.constant.font-name',
      ],
      t.number
    ),
    rule(
      'CSS at-rule',
      ['keyword.control.at-rule', 'punctuation.definition.keyword.css'],
      t.keyword
    ),
    rule(
      'JSON key',
      [
        'support.type.property-name.json',
        'meta.mapping.key string',
        'entity.name.tag.yaml',
        'support.type.property-name.toml',
      ],
      t.property
    ),
    rule(
      'Markdown heading',
      ['markup.heading', 'entity.name.section', 'punctuation.definition.heading.markdown'],
      t.keyword,
      'bold'
    ),
    rule('Markdown bold', ['markup.bold'], t.number, 'bold'),
    rule('Markdown italic', ['markup.italic'], t.storage, 'italic'),
    rule('Markdown link', ['markup.underline.link', 'string.other.link', 'meta.link'], t.function),
    rule('Markdown code', ['markup.inline.raw', 'markup.fenced_code', 'markup.raw'], t.string),
    rule('Markdown quote', ['markup.quote'], t.comment, 'italic'),
    rule(
      'Markdown list',
      ['punctuation.definition.list', 'beginning.punctuation.definition.list'],
      t.parameter
    ),
    rule('Diff inserted', ['markup.inserted', 'meta.diff.header.to-file'], t.string),
    rule('Diff deleted', ['markup.deleted', 'meta.diff.header.from-file'], t.invalid),
    rule('Diff changed', ['markup.changed'], t.number),
    rule(
      'Rust lifetime',
      ['entity.name.type.lifetime', 'punctuation.definition.lifetime'],
      t.decorator,
      'italic'
    ),
    rule(
      'Shell variable',
      [
        'variable.other.normal.shell',
        'punctuation.definition.variable.shell',
        'variable.other.special.shell',
      ],
      t.parameter
    ),
    rule('Invalid', ['invalid', 'invalid.illegal'], t.invalid),
    rule('Deprecated', ['invalid.deprecated'], t.invalid, 'strikethrough'),
  ];
}

function semanticTokenColors(p) {
  const t = p.tokens;
  return {
    namespace: t.namespace,
    class: t.type,
    'class.defaultLibrary': { foreground: t.type, italic: true },
    enum: t.type,
    interface: { foreground: t.type, italic: true },
    struct: t.type,
    typeParameter: { foreground: t.type, italic: true },
    type: t.type,
    'type.defaultLibrary': { foreground: t.type, italic: true },
    parameter: { foreground: t.parameter, italic: true },
    variable: t.variable,
    'variable.readonly': t.number,
    'variable.defaultLibrary': { foreground: t.self, italic: true },
    property: t.property,
    'property.readonly': t.property,
    enumMember: t.number,
    event: t.property,
    function: t.function,
    'function.defaultLibrary': { foreground: t.function, italic: true },
    method: t.function,
    'method.defaultLibrary': { foreground: t.function, italic: true },
    macro: t.macro,
    keyword: t.keyword,
    modifier: t.storage,
    comment: { foreground: t.comment, italic: true },
    string: t.string,
    number: t.number,
    regexp: t.regexp,
    operator: t.operator,
    decorator: { foreground: t.decorator, italic: true },
    label: t.decorator,
    selfKeyword: { foreground: t.self, italic: true },
    lifetime: { foreground: t.decorator, italic: true },
    builtinType: { foreground: t.type, italic: true },
  };
}

function buildTheme(p) {
  return {
    $schema: 'vscode://schemas/color-theme',
    name: p.label,
    type: p.type,
    semanticHighlighting: true,
    colors: workbenchColors(p),
    tokenColors: tokenColors(p),
    semanticTokenColors: semanticTokenColors(p),
  };
}

function buildNotice(p) {
  return [
    `# ${p.label}`,
    '',
    `${p.label} 是 Woodfish 原创配色，MIT 许可，由 \`scripts/generate-themes.js\` 生成，请勿手改 JSON。`,
    `${p.label} is an original Woodfish palette (MIT), generated by \`scripts/generate-themes.js\`.`,
    '它为通用叠层提供语义区分清晰的基础 token 颜色；渐变与发光由运行时叠加。',
    '',
  ].join('\n');
}

function render(p) {
  const directory = path.join(ROOT, 'themes', p.slug);
  return [
    // Compact output: the generator is the source of truth and the VSIX has a size budget.
    [path.join(directory, `${p.label}.json`), `${JSON.stringify(buildTheme(p))}\n`],
    [
      path.join(directory, 'theme.meta.json'),
      `${JSON.stringify({ label: p.label, slug: p.slug, ...p.meta }, null, 2)}\n`,
    ],
    [path.join(directory, 'NOTICE.md'), buildNotice(p)],
  ];
}

function main() {
  const check = process.argv.includes('--check');
  let failed = false;

  for (const palette of PALETTES) {
    const problems = validate(palette);
    if (problems.length > 0) {
      failed = true;
      console.error(`✗ ${palette.label}\n  - ${problems.join('\n  - ')}`);
      continue;
    }

    const minimum = Math.min(
      ...Object.entries(palette.tokens)
        .filter(([role]) => role !== 'comment')
        .map(([, color]) => contrast(color, palette.ui.bg))
    );
    for (const [filePath, content] of render(palette)) {
      if (check) {
        const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
        if (current !== content) {
          failed = true;
          console.error(
            `✗ ${path.relative(ROOT, filePath)} is out of date; run node scripts/generate-themes.js`
          );
        }
        continue;
      }
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    console.log(
      `✓ ${palette.label}: min token contrast ${minimum.toFixed(2)}, comment ${contrast(
        palette.tokens.comment,
        palette.ui.bg
      ).toFixed(
        2
      )}, keyword↔variable ${hueDistance(palette.tokens.keyword, palette.tokens.variable).toFixed(0)}°`
    );
  }

  process.exitCode = failed ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = { PALETTES, validate, contrast, hueDistance, buildTheme };
