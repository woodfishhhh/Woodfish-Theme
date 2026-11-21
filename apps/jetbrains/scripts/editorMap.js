// Maps JetBrains editor, console, terminal, diff, inlay-hint and fold settings to the VS Code colors that decide
// the same thing. Token colors live in scopeMap.js; this file is everything else the editor scheme sets.
//
// Every name below is checked against real IDE distributions by `audit-keys.py` (see verified-keys.json).

// VS Code's own defaults for colors a theme leaves out (VS Code 1.147, read from its workbench bundle).
const VSCODE_DEFAULTS = {
  dark: {
    'editorCursor.foreground': '#AEAFAD',
    'editor.selectionBackground': '#264F78',
    'editorError.foreground': '#F14C4C',
    'editorWarning.foreground': '#CCA700',
    'editorLineNumber.activeForeground': '#C6C6C6',
    'editorInlayHint.foreground': '#969696',
    'editor.foldPlaceholderForeground': '#808080',
    'diffEditor.insertedLineBackground': '#9BB95533',
    'diffEditor.removedLineBackground': '#FF000033',
    'editorGutter.addedBackground': '#487E02',
    'editorGutter.modifiedBackground': '#1B81A8',
    'badge.background': '#4D4D4D',
  },
  light: {
    'editor.selectionBackground': '#ADD6FF',
    'editorError.foreground': '#E51400',
    'editorWarning.foreground': '#BF8803',
    'editorLineNumber.activeForeground': '#0B216F',
    'editorInlayHint.foreground': '#969696',
    'editor.foldPlaceholderForeground': '#808080',
    'diffEditor.insertedLineBackground': '#9BB95533',
    'diffEditor.removedLineBackground': '#FF000033',
    'editorGutter.addedBackground': '#48985D',
    'editorGutter.modifiedBackground': '#2090D3',
    'badge.background': '#C4C4C4',
  },
};

/** Editor colors: [VS Code color, JetBrains name, palette fallback]. Each channel is flattened over the editor background. */
const EDITOR_COLORS = [
  // VS Code draws no current-line fill when the theme sets none; JetBrains needs an explicit color to match
  ['editor.lineHighlightBackground', 'CARET_ROW_COLOR', 'bg'],
  ['editor.selectionBackground', 'SELECTION_BACKGROUND', 'selection'],
  ['editorCursor.foreground', 'CARET_COLOR', 'fg'],
  ['editorLineNumber.foreground', 'LINE_NUMBERS_COLOR', 'fgSubtle'],
  ['editorLineNumber.activeForeground', 'LINE_NUMBER_ON_CARET_ROW_COLOR', 'fg'],
  ['editorGutter.background', 'GUTTER_BACKGROUND', 'bg'],
  ['editorIndentGuide.background1', 'INDENT_GUIDE', 'border'],
  ['editorIndentGuide.activeBackground1', 'SELECTED_INDENT_GUIDE', 'fgSubtle'],
  ['editorWhitespace.foreground', 'WHITESPACES', 'fgSubtle'],
  ['editorHoverWidget.background', 'DOCUMENTATION_COLOR', 'bgWidget'],
];

/** Editor attributes made of one color: [VS Code color, JetBrains name, channel, palette fallback, extra]. */
const EDITOR_ATTRIBUTES = [
  ['editor.findMatchBackground', 'SEARCH_RESULT_ATTRIBUTES', 'BACKGROUND', 'findMatch'],
  ['editor.findMatchBackground', 'WRITE_SEARCH_RESULT_ATTRIBUTES', 'BACKGROUND', 'findMatch'],
  [
    'editor.findMatchHighlightBackground',
    'TEXT_SEARCH_RESULT_ATTRIBUTES',
    'BACKGROUND',
    'findMatch',
  ],
  [
    'editor.wordHighlightBackground',
    'IDENTIFIER_UNDER_CARET_ATTRIBUTES',
    'BACKGROUND',
    'selection',
  ],
  [
    'editor.wordHighlightStrongBackground',
    'WRITE_IDENTIFIER_UNDER_CARET_ATTRIBUTES',
    'BACKGROUND',
    'selection',
  ],
  ['editorBracketMatch.background', 'MATCHED_BRACE_ATTRIBUTES', 'BACKGROUND', 'selection'],
  ['editorError.foreground', 'ERRORS_ATTRIBUTES', 'EFFECT_COLOR', 'error', { EFFECT_TYPE: '2' }],
  [
    'editorWarning.foreground',
    'WARNING_ATTRIBUTES',
    'EFFECT_COLOR',
    'warning',
    { EFFECT_TYPE: '2' },
  ],
  ['editorError.foreground', 'WRONG_REFERENCES_ATTRIBUTES', 'FOREGROUND', 'error'],
];

// The 16 ANSI colors are palette.ansi (black, red, green, yellow, blue, magenta, cyan, white, then the bright row),
// the same values the terminal color pack uses. JetBrains calls ANSI white "gray" and bright black "dark gray".
const CONSOLE_STEMS = [
  'BLACK',
  'RED',
  'GREEN',
  'YELLOW',
  'BLUE',
  'MAGENTA',
  'CYAN',
  'GRAY',
  'DARKGRAY',
  'RED_BRIGHT',
  'GREEN_BRIGHT',
  'YELLOW_BRIGHT',
  'BLUE_BRIGHT',
  'MAGENTA_BRIGHT',
  'CYAN_BRIGHT',
  'WHITE',
];
const BLOCK_STEMS = [
  'BLACK',
  'RED',
  'GREEN',
  'YELLOW',
  'BLUE',
  'MAGENTA',
  'CYAN',
  'WHITE',
  'BLACK_BRIGHT',
  'RED_BRIGHT',
  'GREEN_BRIGHT',
  'YELLOW_BRIGHT',
  'BLUE_BRIGHT',
  'MAGENTA_BRIGHT',
  'CYAN_BRIGHT',
  'WHITE_BRIGHT',
];
const ANSI_NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const ansiName = (i) => (i < 8 ? '' : 'bright ') + ANSI_NAMES[i % 8];

/**
 * Console, terminal, diff, inlay-hint and fold settings.
 * `ctx`: lookup(name) → the theme's color or VS Code's default (undefined when neither exists); paint(color, paper,
 * factor) → 6 hex digits of `color` (its alpha times `factor`) laid over the CSS color `paper`; alpha(color) → alpha
 * of a CSS color; palette; background and gutterBackground as CSS colors.
 */
function extraSettings({ lookup, paint, alpha, palette, background, gutterBackground }) {
  const colors = {};
  const attributes = {};
  const hash = (hex) => '#' + hex;
  const first = (...names) => names.map(lookup).find((color) => color !== undefined);

  // Console and terminal: terminal.background / terminal.foreground with the terminal pack's fallbacks, then the 16 colors.
  const terminalBackground = paint(lookup('terminal.background') ?? palette.ui.bg, palette.ui.bg);
  const terminalForeground = paint(
    lookup('terminal.foreground') ?? palette.ui.fg,
    hash(terminalBackground)
  );
  colors.CONSOLE_BACKGROUND_KEY = terminalBackground;
  attributes.CONSOLE_NORMAL_OUTPUT = { FOREGROUND: terminalForeground };
  attributes.CONSOLE_ERROR_OUTPUT = { FOREGROUND: palette.ansi[1].slice(1).toUpperCase() };
  palette.ansi.forEach((ansi, i) => {
    const color = ansi.slice(1).toUpperCase();
    attributes[`CONSOLE_${CONSOLE_STEMS[i]}_OUTPUT`] = { FOREGROUND: color, BACKGROUND: color };
    attributes[`BLOCK_TERMINAL_${BLOCK_STEMS[i]}`] = { FOREGROUND: color, BACKGROUND: color };
  });

  // Diff viewer: VS Code's changed-line backgrounds. VS Code has no "modified" color (a changed line is a removed
  // one on the left and an inserted one on the right), so modified lines tint the gutter's modified color to the
  // same strength as the inserted-line background.
  const inserted = lookup('diffEditor.insertedLineBackground');
  attributes.DIFF_INSERTED = {
    BACKGROUND: paint(inserted, background),
    ERROR_STRIPE_COLOR: paint(
      first('editorOverviewRuler.addedForeground', 'editorGutter.addedBackground'),
      background
    ),
  };
  attributes.DIFF_DELETED = {
    BACKGROUND: paint(lookup('diffEditor.removedLineBackground'), background),
    ERROR_STRIPE_COLOR: paint(
      first(
        'editorOverviewRuler.deletedForeground',
        'editorGutter.deletedBackground',
        'editorError.foreground'
      ),
      background
    ),
  };
  attributes.DIFF_MODIFIED = {
    BACKGROUND: paint(lookup('editorGutter.modifiedBackground'), background, alpha(inserted)),
    ERROR_STRIPE_COLOR: paint(
      first('editorOverviewRuler.modifiedForeground', 'editorGutter.modifiedBackground'),
      background
    ),
  };

  // Line-status bars next to the code (added, modified, deleted since the last commit).
  colors.ADDED_LINES_COLOR = paint(lookup('editorGutter.addedBackground'), gutterBackground);
  colors.MODIFIED_LINES_COLOR = paint(lookup('editorGutter.modifiedBackground'), gutterBackground);
  colors.DELETED_LINES_COLOR = paint(
    first('editorGutter.deletedBackground', 'editorError.foreground'),
    gutterBackground
  );

  // Inlay hints: type hints and parameter-name hints have their own VS Code colors, both falling back to the base pair.
  const hint = (kind) => {
    const set = first(`editorInlayHint.${kind}Background`, 'editorInlayHint.background');
    const chip = set ? paint(set, background) : paint(lookup('badge.background'), background, 0.1);
    const text = paint(
      first(`editorInlayHint.${kind}Foreground`, 'editorInlayHint.foreground'),
      hash(chip)
    );
    return { FOREGROUND: text, BACKGROUND: chip };
  };
  attributes.INLAY_DEFAULT = hint('type');
  attributes.INLINE_PARAMETER_HINT = hint('parameter');
  attributes.INLAY_TEXT_WITHOUT_BACKGROUND = { FOREGROUND: hint('type').FOREGROUND };

  // Folded code: the fold background (selection color at 30 % when the theme sets none) and the placeholder's text color.
  const fold = lookup('editor.foldBackground');
  const foldChip = fold
    ? paint(fold, background)
    : paint(lookup('editor.selectionBackground'), background, 0.3);
  attributes.FOLDED_TEXT_ATTRIBUTES = {
    FOREGROUND: paint(lookup('editor.foldPlaceholderForeground'), hash(foldChip)),
    BACKGROUND: foldChip,
  };

  return { colors, attributes };
}

/** Editor colors and attributes the generator sets besides tokens: [group, JetBrains names, channels, VS Code source]. */
function editorKeyRows() {
  const rows = [
    [
      'Editor',
      ['TEXT'],
      'FOREGROUND, BACKGROUND',
      'the `source` rule (plain code), else `editor.foreground`; `editor.background`',
    ],
    [
      'Editor',
      ['INJECTED_LANGUAGE_FRAGMENT'],
      'BACKGROUND',
      '`editor.background` (VS Code tints nothing)',
    ],
  ];
  for (const [name, key] of EDITOR_COLORS) rows.push(['Editor', [key], 'color', `\`${name}\``]);
  for (const [name, key, channel] of EDITOR_ATTRIBUTES)
    rows.push(['Editor', [key], channel, `\`${name}\``]);
  return rows;
}

/** Every attribute the extra settings write: [group, JetBrains names, channels, where its color comes from]. */
function extraKeyRows() {
  const rows = [
    ['Console and terminal', ['CONSOLE_BACKGROUND_KEY'], 'color', '`terminal.background`'],
    ['Console and terminal', ['CONSOLE_NORMAL_OUTPUT'], 'FOREGROUND', '`terminal.foreground`'],
    ['Console and terminal', ['CONSOLE_ERROR_OUTPUT'], 'FOREGROUND', 'ANSI red'],
  ];
  const ansi = (i) => `ANSI ${ansiName(i)} (\`palette.ansi[${i}]\`)`;
  CONSOLE_STEMS.forEach((stem, i) =>
    rows.push([
      'Console and terminal',
      [`CONSOLE_${stem}_OUTPUT`],
      'FOREGROUND, BACKGROUND',
      ansi(i),
    ])
  );
  BLOCK_STEMS.forEach((stem, i) =>
    rows.push([
      'Console and terminal',
      [`BLOCK_TERMINAL_${stem}`],
      'FOREGROUND, BACKGROUND',
      ansi(i),
    ])
  );
  rows.push(
    ['Diff', ['DIFF_INSERTED'], 'BACKGROUND', '`diffEditor.insertedLineBackground`'],
    ['Diff', ['DIFF_DELETED'], 'BACKGROUND', '`diffEditor.removedLineBackground`'],
    [
      'Diff',
      ['DIFF_MODIFIED'],
      'BACKGROUND',
      '`editorGutter.modifiedBackground` at the strength of the inserted-line background (VS Code has no modified color)',
    ],
    [
      'Diff',
      ['DIFF_INSERTED', 'DIFF_DELETED', 'DIFF_MODIFIED'],
      'ERROR_STRIPE_COLOR',
      '`editorOverviewRuler.*Foreground`, else `editorGutter.*Background`',
    ],
    ['Diff', ['ADDED_LINES_COLOR'], 'color', '`editorGutter.addedBackground`'],
    ['Diff', ['MODIFIED_LINES_COLOR'], 'color', '`editorGutter.modifiedBackground`'],
    [
      'Diff',
      ['DELETED_LINES_COLOR'],
      'color',
      '`editorGutter.deletedBackground`, else `editorError.foreground`',
    ],
    [
      'Inlay hints',
      ['INLAY_DEFAULT'],
      'FOREGROUND, BACKGROUND',
      '`editorInlayHint.typeForeground` / `typeBackground`, else the base pair',
    ],
    [
      'Inlay hints',
      ['INLINE_PARAMETER_HINT'],
      'FOREGROUND, BACKGROUND',
      '`editorInlayHint.parameterForeground` / `parameterBackground`, else the base pair',
    ],
    [
      'Inlay hints',
      ['INLAY_TEXT_WITHOUT_BACKGROUND'],
      'FOREGROUND',
      '`editorInlayHint.typeForeground`',
    ],
    [
      'Folding',
      ['FOLDED_TEXT_ATTRIBUTES'],
      'FOREGROUND, BACKGROUND',
      '`editor.foldPlaceholderForeground` / `editor.foldBackground`',
    ]
  );
  return rows;
}

/** Every JetBrains name the editor settings write, for the tests that check them against the IDE scan. */
function editorKeyNames() {
  return [...new Set([...editorKeyRows(), ...extraKeyRows()].flatMap(([, keys]) => keys))];
}

module.exports = {
  VSCODE_DEFAULTS,
  EDITOR_COLORS,
  EDITOR_ATTRIBUTES,
  extraSettings,
  editorKeyRows,
  extraKeyRows,
  editorKeyNames,
};
