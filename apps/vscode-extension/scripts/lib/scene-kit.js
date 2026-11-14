'use strict';
/*
 * Shared by the README screenshots and the promo video: the real extension pieces (built
 * workbench bootstrap, `buildRuntimeCss`, theme-core palettes) and helpers to lay code out
 * the way Monaco does. Requires `pnpm compile && pnpm runtime:build` first.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const EXTENSION_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(EXTENSION_ROOT, '../..');

const core = require(path.join(REPO_ROOT, 'packages/theme-core/out/index.js'));
const { buildRuntimeCss } = require(
  path.join(EXTENSION_ROOT, 'out/services/runtime/payloadBuilder.js')
);

const BOOTSTRAP_URL = pathToFileURL(
  path.join(EXTENSION_ROOT, 'themes/shared/overlay-bootstrap.js')
).href;
const SHARED_CSS = {
  cursorCore: fs.readFileSync(path.join(EXTENSION_ROOT, 'themes/shared/cursor-core.css'), 'utf8'),
  cursorGlow: fs.readFileSync(path.join(EXTENSION_ROOT, 'themes/shared/cursor-glow.css'), 'utf8'),
};
const DARK_THEME_COLORS = JSON.parse(
  fs.readFileSync(path.join(EXTENSION_ROOT, 'themes/bearded/Woodfish Dark.json'), 'utf8')
).colors;
const BACKSLASH = String.fromCharCode(92);

/** The CSS the extension injects for these settings (cursor and glass off unless asked). */
function runtimeCss(settings = {}, assets = {}) {
  return buildRuntimeCss(
    { cursor: { enabled: false }, glass: { enabled: false }, ...settings },
    { activityBar: '', tabBar: '', overlayBootstrap: '', nativeWindowHook: '', ...SHARED_CSS, ...assets }
  );
}

/** VS Code's own Dark Modern colors, to show Woodfish on a theme it does not ship. */
const DARK_MODERN = {
  slug: 'dark-modern',
  label: 'Dark Modern',
  type: 'dark',
  ui: { bg: '#1F1F1F', fg: '#CCCCCC', fgMuted: '#9D9D9D' },
  tokens: {
    keyword: '#C586C0',
    storage: '#569CD6',
    function: '#DCDCAA',
    type: '#4EC9B0',
    string: '#CE9178',
    number: '#B5CEA8',
    parameter: '#9CDCFE',
    variable: '#9CDCFE',
    property: '#9CDCFE',
    decorator: '#DCDCAA',
    operator: '#D4D4D4',
    punctuation: '#CCCCCC',
    comment: '#6A9955',
    tag: '#569CD6',
    attribute: '#9CDCFE',
    regexp: '#D16969',
    escape: '#D7BA7D',
    namespace: '#4EC9B0',
    macro: '#569CD6',
    self: '#569CD6',
    invalid: '#F44747',
  },
};

/** A built-in palette by slug, or the palette object itself. */
function resolvePalette(palette) {
  return typeof palette === 'string'
    ? core.WOODFISH_PALETTES.find((candidate) => candidate.slug === palette)
    : palette;
}

/** One code token: text, palette role (`fg` is the editor foreground), optional marker. */
const T = (text, role, marker) => (marker ? [text, role, marker] : [text, role]);

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Monaco renders a token longer than 50 characters as several 50-character spans. */
function splitLikeMonaco(text) {
  const parts = [];
  for (let index = 0; index < text.length; index += 50) {
    parts.push(text.slice(index, index + 50));
  }
  return parts.length > 0 ? parts : [''];
}

const SUGGESTIONS = [
  ['readFile', 'function readFile(path: PathLike): Promise<Buffer>'],
  ['readdir', ''],
  ['readlink', ''],
  ['realpath', ''],
  ['readv', ''],
];

/**
 * A Monaco-like suggest list styled with the Woodfish Dark widget colors. `selected` is the
 * focused row; `typed` is the prefix highlighted in every label.
 */
function suggestWidget({ font, selected = 0, typed = 'rea' } = {}) {
  const color = (key, fallback) => DARK_THEME_COLORS[key] ?? fallback;
  const rows = SUGGESTIONS.map(
    ([label, detail], index) =>
      `<div class="monaco-list-row${index === selected ? ' focused' : ''}"><i class="icon"></i><span class="label"><b>${escapeHtml(typed)}</b>${escapeHtml(label.slice(typed.length))}</span><span class="detail">${escapeHtml(detail)}</span></div>`
  ).join('');
  const css = `.suggest-widget{position:absolute;width:520px;border:1px solid ${color('editorSuggestWidget.border', '#405275')};border-radius:6px;overflow:hidden;font:${font};color:${color('editorSuggestWidget.foreground', '#D0D7E4')}}
.monaco-list-row{height:26px;display:flex;align-items:center;gap:8px;padding:0 10px}
.monaco-list-row.focused{background:${color('editorSuggestWidget.selectedBackground', '#405275')}}
.monaco-list-row .icon{width:14px;height:14px;border-radius:3px;background:${color('symbolIcon.functionForeground', '#B78AFF')};opacity:.85}
.monaco-list-row .label{font-family:Consolas,monospace;font-size:15px}
.monaco-list-row .label b{color:${color('editorSuggestWidget.highlightForeground', '#69C3FF')};font-weight:700}
.monaco-list-row .detail{margin-left:auto;opacity:.65;font-size:13px}`;
  const html = `<div class="suggest-widget"><div class="monaco-list"><div class="monaco-list-rows">${rows}</div></div></div>`;
  return { css, html };
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error('Chrome / Edge not found; set CHROME_PATH');
  }
  return found;
}

module.exports = {
  BACKSLASH,
  BOOTSTRAP_URL,
  DARK_MODERN,
  DARK_THEME_COLORS,
  EXTENSION_ROOT,
  REPO_ROOT,
  T,
  core,
  escapeHtml,
  findChrome,
  resolvePalette,
  runtimeCss,
  splitLikeMonaco,
  suggestWidget,
};
