// Generates the JetBrains color themes (UI theme JSON + editor color scheme XML) from theme-core and the
// VS Code themes. `--check` fails when a committed file is stale, missing or no longer generated.
const fs = require('node:fs');
const path = require('node:path');
const { WOODFISH_PALETTES, requireCssColor } = require('@woodfish/theme-core');
const { parseJsonc } = require('../../vscode-extension/scripts/lib/jsonc');
const { contributes } = require('../../vscode-extension/package.json');
const { createResolver, STYLE_BITS } = require('./themeMatch');
const scopeMap = require('./scopeMap');
const { keyTable } = require('./keyTable');

const vscode = path.resolve(__dirname, '../../vscode-extension');
const resources = path.resolve(__dirname, '../src/main/resources');
const KEY_DOC = path.resolve(__dirname, '../../../docs/hosts/jetbrains-keys.md');
const THEME_ID_PREFIX = 'io.github.woodfishhhh.woodfishtheme';
const SCHEME_VERSION = '142';

// VS Code's own defaults for editor colors a theme leaves out (VS Code 1.147 export).
const VSCODE_DEFAULTS = {
  dark: {
    'editorCursor.foreground': '#AEAFAD',
    'editor.selectionBackground': '#264F78',
    'editorError.foreground': '#F14C4C',
    'editorWarning.foreground': '#CCA700',
    'editorLineNumber.activeForeground': '#C6C6C6',
  },
  light: {
    'editor.selectionBackground': '#ADD6FF',
    'editorError.foreground': '#E51400',
    'editorWarning.foreground': '#BF8803',
    'editorLineNumber.activeForeground': '#0B216F',
  },
};

/** Flattens an RGBA color over an opaque background into 6 hex digits (JetBrains colors carry no alpha). */
function opaque(color, background) {
  const ink = requireCssColor(color);
  const paper = requireCssColor(background);
  return ['r', 'g', 'b']
    .map((key) =>
      Math.round(ink[key] * ink.alpha + paper[key] * (1 - ink.alpha))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
    .toUpperCase();
}

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** JetBrains FONT_TYPE: 1 bold, 2 italic, 3 both. */
function fontType(fontStyle) {
  return (fontStyle & STYLE_BITS.bold ? 1 : 0) + (fontStyle & STYLE_BITS.italic ? 2 : 0);
}

function sourceTheme(palette) {
  const entry = contributes.themes.find(({ label }) => label === palette.label);
  return parseJsonc(fs.readFileSync(path.join(vscode, entry.path), 'utf8'));
}

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

function editorChrome(theme, palette, resolve) {
  const type = palette.type;
  const lookup = (name) => theme.colors[name] ?? VSCODE_DEFAULTS[type][name];
  const background = theme.colors['editor.background'] ?? palette.ui.bg;
  const foreground = theme.colors['editor.foreground'] ?? palette.ui.fg;
  const flat = (name, fallback) => opaque(lookup(name) ?? palette.ui[fallback], background);
  // Code without a more specific rule gets the theme's `source` rule in VS Code; JetBrains draws such
  // identifiers with TEXT. Woodfish Dark sets that rule apart from editor.foreground.
  const codeForeground = resolve('source').foreground ?? foreground;

  const colors = {};
  for (const [name, key, fallback] of EDITOR_COLORS) colors[key] = flat(name, fallback);
  const attributes = {
    TEXT: {
      FOREGROUND: opaque(codeForeground, background),
      BACKGROUND: opaque(background, background),
    },
    // Darcula and Default tint code embedded in Markdown fences or strings; VS Code draws no background there
    INJECTED_LANGUAGE_FRAGMENT: { BACKGROUND: opaque(background, background) },
  };
  for (const [name, key, channel, fallback, extra] of EDITOR_ATTRIBUTES) {
    attributes[key] = { [channel]: flat(name, fallback), ...extra };
  }
  return { colors, attributes, background, foreground };
}

function tokenAttributes(theme, background, foreground, resolve) {
  const attributes = {};
  for (const { key, scopes } of scopeMap) {
    const style = resolve(scopes);
    attributes[key] = {
      FOREGROUND: opaque(style.foreground ?? foreground, background),
      FONT_TYPE: String(fontType(style.fontStyle)),
    };
  }
  return attributes;
}

function option(name, value) {
  return `<option name="${xmlEscape(name)}" value="${xmlEscape(value)}"/>`;
}

function schemeXml(palette, theme) {
  const resolve = createResolver(theme.tokenColors);
  const chrome = editorChrome(theme, palette, resolve);
  const attributes = {
    ...chrome.attributes,
    ...tokenAttributes(theme, chrome.background, chrome.foreground, resolve),
  };
  const colorLines = Object.entries(chrome.colors).map(
    ([key, value]) => `    ${option(key, value)}`
  );
  const attributeLines = Object.entries(attributes).map(
    ([key, values]) =>
      `    <option name="${xmlEscape(key)}"><value>${Object.entries(values)
        .map(([name, value]) => option(name, value))
        .join('')}</value></option>`
  );
  const parent = palette.type === 'dark' ? 'Darcula' : 'Default';
  return [
    `<scheme name="${xmlEscape(palette.label)}" version="${SCHEME_VERSION}" parent_scheme="${parent}">`,
    '  <colors>',
    ...colorLines,
    '  </colors>',
    '  <attributes>',
    ...attributeLines,
    '  </attributes>',
    '</scheme>',
    '',
  ].join('\n');
}

function uiThemeJson(palette, file) {
  const { ui } = palette;
  const flat = (color, background) => '#' + opaque(color, background);
  const selection = flat(ui.selection, ui.bgAlt);
  const theme = {
    name: palette.label,
    dark: palette.type === 'dark',
    editorScheme: `/themes/${file}.xml`,
    ui: {
      '*': {
        background: ui.bgAlt,
        foreground: ui.fg,
        borderColor: ui.border,
        separatorColor: ui.border,
        disabledForeground: ui.fgSubtle,
        infoForeground: ui.fgMuted,
        selectionBackground: selection,
        selectionForeground: ui.fg,
        selectionInactiveBackground: selection,
        hoverBackground: flat(ui.lineHighlight, ui.bgAlt),
        focusColor: ui.accent,
        underlineColor: ui.accent,
      },
      Panel: { background: ui.bgAlt },
      Tree: { background: ui.bgAlt },
      EditorTabs: { underlinedTabBackground: ui.bg, underlineColor: ui.accent },
      ToolWindow: { Header: { background: ui.bgDeep } },
      StatusBar: { background: ui.bgDeep },
      PopupMenu: { background: ui.bgWidget },
    },
  };
  return JSON.stringify(theme, null, 2) + '\n';
}

function licenseText(palette) {
  const own = path.join(vscode, path.dirname(sourceEntry(palette).path), 'LICENSE.txt');
  const file = fs.existsSync(own) ? own : path.join(vscode, '../../LICENSE');
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function sourceEntry(palette) {
  return contributes.themes.find(({ label }) => label === palette.label);
}

function render(palette, theme = sourceTheme(palette)) {
  const file = `woodfish-${palette.slug}`;
  return {
    [`themes/${file}.xml`]: schemeXml(palette, theme),
    [`themes/${file}.theme.json`]: uiThemeJson(palette, file),
    [`licenses/${palette.slug}.txt`]: licenseText(palette),
  };
}

function outputs() {
  return Object.assign({}, ...WOODFISH_PALETTES.map((palette) => render(palette)));
}

function themeIds() {
  return WOODFISH_PALETTES.map((palette) => ({
    id: `${THEME_ID_PREFIX}.${palette.slug}`,
    path: `/themes/woodfish-${palette.slug}.theme.json`,
  }));
}

/** plugin.xml is written by hand; it must register exactly the generated themes. */
function missingRegistrations(root = resources) {
  const xml = fs.readFileSync(path.join(root, 'META-INF/plugin.xml'), 'utf8');
  return themeIds()
    .filter(
      ({ id, path: themePath }) => !xml.includes(`<themeProvider id="${id}" path="${themePath}"/>`)
    )
    .map(({ id }) => `META-INF/plugin.xml: themeProvider ${id}`);
}

function listGenerated(dir) {
  const found = [];
  for (const sub of ['themes', 'licenses']) {
    const root = path.join(dir, sub);
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) found.push(`${sub}/${name}`);
  }
  return found;
}

function main(check, root = resources) {
  const files = outputs();
  const stale = [];
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(root, name);
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== body)
        stale.push(name);
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, body);
    }
  }
  const doc = keyTable() + '\n';
  if (check) {
    if (!fs.existsSync(KEY_DOC) || fs.readFileSync(KEY_DOC, 'utf8').replace(/\r\n/g, '\n') !== doc)
      stale.push('docs/hosts/jetbrains-keys.md');
  } else {
    fs.writeFileSync(KEY_DOC, doc);
  }
  if (check) {
    for (const name of listGenerated(root)) if (!Object.hasOwn(files, name)) stale.push(name);
    stale.push(...missingRegistrations(root));
  }
  if (stale.length)
    throw Error(
      `JetBrains 配色产物缺失、过期或多余，请运行 pnpm jetbrains:generate 并核对 plugin.xml：\n${stale.join('\n')}`
    );
  console.log(
    `${check ? '已核对' : '已生成'} ${WOODFISH_PALETTES.length} 套 JetBrains 配色，${Object.keys(files).length} 个文件。`
  );
}

if (require.main === module) main(process.argv.includes('--check'));
module.exports = { main, opaque, render, schemeXml, uiThemeJson, themeIds, missingRegistrations };
