#!/usr/bin/env node
/*
 * Renders the README screenshots from the real extension: the built workbench bootstrap and
 * the CSS the extension injects (`buildRuntimeCss`), applied to a Monaco-like DOM in
 * headless Chrome. Each picture shows only code on the theme's editor background, plus the
 * one widget a feature needs (the cursor, a suggest list for frosted glass).
 *
 *   pnpm compile && pnpm runtime:build
 *   node apps/vscode-extension/scripts/render-readme-images.js
 *
 * Writes assets/readme/*.png at 2x pixel density. Set CHROME_PATH when Chrome or Edge is
 * not in a standard location.
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const EXTENSION_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(EXTENSION_ROOT, '../..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'assets', 'readme');
const SCALE = 2;
const LINE_HEIGHT = 34;
const PADDING_Y = 24;
const PADDING_X = 32;
const CODE_FAMILY = "Consolas, 'Microsoft YaHei', monospace";
const UI_FONT = "14px/24px 'Segoe UI', 'Microsoft YaHei', sans-serif";

const core = require(path.join(REPO_ROOT, 'packages/theme-core/out/index.js'));
const { buildRuntimeCss } = require(path.join(EXTENSION_ROOT, 'out/services/runtime/payloadBuilder.js'));

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
function runtimeCss(settings) {
  return buildRuntimeCss(
    { cursor: { enabled: false }, glass: { enabled: false }, ...settings },
    { activityBar: '', tabBar: '', overlayBootstrap: '', nativeWindowHook: '', ...SHARED_CSS }
  );
}

/** VS Code's own Dark Modern colors, to show Woodfish on a theme it does not ship. */
const DARK_MODERN = {
  slug: 'dark-modern',
  type: 'dark',
  ui: { bg: '#1F1F1F', fg: '#CCCCCC' },
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

/** Code lines as [text, palette token role] pairs; `fg` is the editor foreground. */
const T = (text, role, marker) => (marker ? [text, role, marker] : [text, role]);
const LINES = {
  comment: [T('// 读取主题文件，失败时重试', 'comment')],
  imports: [T('import', 'keyword'), T(' { ', 'punctuation'), T('readFile', 'variable'), T(' } ', 'punctuation'), T('from', 'keyword'), T(" 'node:fs/promises'", 'string'), T(';', 'punctuation')],
  blank: [],
  decorator: [T('@Injectable', 'decorator'), T('()', 'punctuation')],
  signature: [T('export', 'keyword'), T(' ', 'fg'), T('async', 'storage'), T(' ', 'fg'), T('function', 'storage'), T(' ', 'fg'), T('loadTheme', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(': ', 'punctuation'), T('string', 'type'), T(', ', 'punctuation'), T('retries', 'parameter'), T(' = ', 'operator'), T('3', 'number'), T('): ', 'punctuation'), T('Promise', 'type'), T('<', 'punctuation'), T('Theme', 'type'), T('> {', 'punctuation')],
  shortSignature: [T('export', 'keyword'), T(' ', 'fg'), T('async', 'storage'), T(' ', 'fg'), T('function', 'storage'), T(' ', 'fg'), T('loadTheme', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(': ', 'punctuation'), T('string', 'type'), T(') {', 'punctuation')],
  pattern: [T('  const', 'storage'), T(' ', 'fg'), T('pattern', 'variable'), T(' = ', 'operator'), T('/^#[0-9a-f]{6}$/i', 'regexp'), T(';', 'punctuation')],
  loop: [T('  for', 'keyword'), T(' (', 'punctuation'), T('let', 'storage'), T(' ', 'fg'), T('i', 'variable'), T(' = ', 'operator'), T('0', 'number'), T('; ', 'punctuation'), T('i', 'variable'), T(' < ', 'operator'), T('retries', 'parameter'), T('; ', 'punctuation'), T('i', 'variable'), T(' += ', 'operator'), T('1', 'number'), T(') {', 'punctuation')],
  read: [T('    const', 'storage'), T(' ', 'fg'), T('text', 'variable'), T(' = ', 'operator'), T('await', 'keyword'), T(' ', 'fg'), T('readFile', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(', ', 'punctuation'), T("'utf8'", 'string'), T(');', 'punctuation')],
  shortRead: [T('  const', 'storage'), T(' ', 'fg'), T('text', 'variable'), T(' = ', 'operator'), T('await', 'keyword'), T(' ', 'fg'), T('readFile', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(');', 'punctuation')],
  typing: [T('  const', 'storage'), T(' ', 'fg'), T('text', 'variable'), T(' = ', 'operator'), T('await', 'keyword'), T(' ', 'fg'), T('fs', 'namespace'), T('.', 'punctuation'), T('rea', 'variable', 'caret')],
  cache: [T('    if', 'keyword'), T(' (', 'punctuation'), T('this', 'self'), T('.', 'punctuation'), T('cache', 'property'), T('.', 'punctuation'), T('has', 'function'), T('(', 'punctuation'), T('text', 'variable'), T(')) ', 'punctuation'), T('return', 'keyword'), T(' { ', 'punctuation'), T('name', 'property'), T(': ', 'punctuation'), T('"woodfish"', 'string'), T(', ', 'punctuation'), T('size', 'property'), T(': ', 'punctuation'), T('42', 'number'), T(' };', 'punctuation')],
  shortReturn: [T('  return', 'keyword'), T(' { ', 'punctuation'), T('name', 'property'), T(': ', 'punctuation'), T('"woodfish"', 'string'), T(', ', 'punctuation'), T('size', 'property'), T(': ', 'punctuation'), T('42', 'number'), T(' };', 'punctuation')],
  loopEnd: [T('  }', 'punctuation')],
  error: [T('  throw', 'keyword'), T(' ', 'fg'), T('new', 'keyword'), T(' ', 'fg'), T('Error', 'type'), T('(', 'punctuation'), T('`missing ', 'string'), T(BACKSLASH + 'n', 'escape'), T('`', 'string'), T(');', 'punctuation')],
  close: [T('}', 'punctuation')],
  markup: [T('<', 'punctuation'), T('p', 'tag'), T(' ', 'fg'), T('class', 'attribute'), T('=', 'operator'), T('"hint"', 'string'), T('>', 'punctuation'), T('Hello Woodfish，这一行普通文字是一条连贯的彩虹', 'fg'), T('</', 'punctuation'), T('p', 'tag'), T('>', 'punctuation')],
  // 100 characters: Monaco shows it as two 50-character spans.
  paragraph: [T('Woodfish keeps the colors you already use and paints every single word with one hand-tuned gradient.', 'fg')],
};

const SCENES = [
  { file: 'hero', palette: 'dark', lines: ['comment', 'imports', 'blank', 'decorator', 'signature', 'pattern', 'loop', 'read', 'cache', 'loopEnd', 'error', 'close', 'blank', 'markup'], width: 1100 },
  ...['dark', 'dracula', 'black', 'neon', 'light'].map((slug) => ({
    file: `theme-${slug}`,
    palette: slug,
    lines: ['signature', 'pattern', 'read', 'cache', 'error', 'markup'],
    width: 1100,
  })),
  { file: 'any-theme-before', palette: DARK_MODERN, lines: ['shortSignature', 'pattern', 'shortRead', 'shortReturn', 'close'], width: 660, woodfish: false },
  { file: 'any-theme-after', palette: DARK_MODERN, lines: ['shortSignature', 'pattern', 'shortRead', 'shortReturn', 'close'], width: 660 },
  { file: 'glow-off', palette: 'dark', lines: ['shortSignature', 'pattern', 'shortRead', 'shortReturn', 'close'], width: 660, settings: { glow: { enabled: false } } },
  { file: 'glow-on', palette: 'dark', lines: ['shortSignature', 'pattern', 'shortRead', 'shortReturn', 'close'], width: 660 },
  { file: 'long-before', palette: 'dark', lines: ['paragraph'], width: 1440, fontSize: 25, splitRuns: true },
  { file: 'long-after', palette: 'dark', lines: ['paragraph'], width: 1440, fontSize: 25 },
  { file: 'cursor', palette: 'dark', lines: ['typing', 'typing', 'typing', 'typing', 'typing', 'typing'], width: 420, settings: { cursor: { enabled: true } }, cursor: true },
  // Glass at opacity 0.5 and a 14px blur (both within the settings' ranges), so the code behind shows through.
  { file: 'glass', palette: 'dark', lines: ['signature', 'pattern', 'typing', 'cache', 'error', 'cache', 'blank', 'markup'], width: 1100, settings: { glass: { enabled: true, opacity: 0.5, blur: 14 } }, suggest: true },
];

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

function resolvePalette(palette) {
  return typeof palette === 'string'
    ? core.WOODFISH_PALETTES.find((candidate) => candidate.slug === palette)
    : palette;
}

function renderLines(palette, lineNames, splitRuns) {
  const roles = { ...palette.tokens, fg: palette.ui.fg };
  const classOf = new Map();
  for (const color of new Set(Object.values(roles))) {
    classOf.set(color, `mtk${classOf.size + 1}`);
  }
  // An empty element between the pieces of a split token stops the engine from joining
  // them, which is how every version before 7.2 painted them.
  const joiner = splitRuns ? '<b class="split"></b>' : '';
  const body = lineNames
    .map((name) => {
      const tokens = LINES[name];
      const spans = tokens.length
        ? tokens
            .map(([text, role, marker]) =>
              splitLikeMonaco(text)
                .map(
                  (part) =>
                    `<span class="${classOf.get(roles[role])}"${marker ? ` data-${marker}` : ''}>${escapeHtml(part)}</span>`
                )
                .join(joiner)
            )
            .join('')
        : `<span class="${classOf.get(roles.fg)}"> </span>`;
      return `<div class="view-line"><span>${spans}</span></div>`;
    })
    .join('');
  const rules = [...classOf].map(([color, name]) => `.${name} { color: ${color}; }`).join('\n');
  return { body, rules };
}

const SUGGESTIONS = [
  ['readFile', 'function readFile(path: PathLike): Promise<Buffer>'],
  ['readdir', ''],
  ['readlink', ''],
  ['realpath', ''],
  ['readv', ''],
];

function suggestWidget() {
  const color = (key, fallback) => DARK_THEME_COLORS[key] ?? fallback;
  const rows = SUGGESTIONS.map(
    ([label, detail], index) =>
      `<div class="monaco-list-row${index === 0 ? ' focused' : ''}"><i class="icon"></i><span class="label"><b>rea</b>${escapeHtml(label.slice(3))}</span><span class="detail">${escapeHtml(detail)}</span></div>`
  ).join('');
  const css = `.suggest-widget{position:absolute;width:520px;border:1px solid ${color('editorSuggestWidget.border', '#405275')};border-radius:6px;overflow:hidden;font:${UI_FONT};color:${color('editorSuggestWidget.foreground', '#D0D7E4')}}
.monaco-list-row{height:26px;display:flex;align-items:center;gap:8px;padding:0 10px}
.monaco-list-row.focused{background:${color('editorSuggestWidget.selectedBackground', '#405275')}}
.monaco-list-row .icon{width:14px;height:14px;border-radius:3px;background:${color('symbolIcon.functionForeground', '#B78AFF')};opacity:.85}
.monaco-list-row .label{font-family:Consolas,monospace;font-size:15px}
.monaco-list-row .label b{color:${color('editorSuggestWidget.highlightForeground', '#69C3FF')};font-weight:700}
.monaco-list-row .detail{margin-left:auto;opacity:.65;font-size:13px}`;
  const html = `<div class="suggest-widget"><div class="monaco-list"><div class="monaco-list-rows">${rows}</div></div></div>`;
  return { css, html };
}

/** Places one cursor after each token marked `data-caret`, and the suggest list under the first. */
const PLACE_WIDGETS = `
(() => {
  const anchors = [...document.querySelectorAll('[data-caret]')];
  if (anchors.length === 0) return;
  const lines = document.querySelector('.view-lines').getBoundingClientRect();
  [...document.querySelectorAll('.cursor')].forEach((cursor, index) => {
    const rect = anchors[index].getBoundingClientRect();
    cursor.style.left = (rect.right - lines.left - 2) + 'px';
    cursor.style.top = (rect.top - lines.top + 3) + 'px';
  });
  const suggest = document.querySelector('.suggest-widget');
  if (suggest) {
    const rect = anchors[0].getBoundingClientRect();
    suggest.style.left = (rect.left - lines.left - 6) + 'px';
    suggest.style.top = (rect.bottom - lines.top + 2) + 'px';
  }
})();`;

/**
 * The cursor's colors cycle over time, so one frame shows a single color. Each line gets
 * its own cursor started a step later in the same animation: the rows read as moments of
 * one cycle.
 */
function cursorFrames(count) {
  const duration = core.DEFAULT_CURSOR.animationDuration;
  const cursors = Array.from({ length: count }, () => '<div class="cursor"></div>').join('');
  const css = Array.from({ length: count }, (_, index) => {
    const delay = -((duration * index) / count).toFixed(3);
    return `.cursor:nth-child(${index + 1})::before,.cursor:nth-child(${index + 1})::after{animation-delay:${delay}s !important}`;
  }).join('\n');
  return { html: `<div class="cursors-layer">${cursors}</div>`, css };
}

function scenePage(scene) {
  const palette = resolvePalette(scene.palette);
  const { body, rules } = renderLines(palette, scene.lines, scene.splitRuns);
  const woodfish = scene.woodfish !== false;
  const css = woodfish ? runtimeCss(scene.settings ?? {}) : '';
  const suggest = scene.suggest ? suggestWidget() : null;
  const cursors = scene.cursor ? cursorFrames(scene.lines.length) : null;
  const fontSize = scene.fontSize ?? 21;
  const lineHeight = Math.round(fontSize * (LINE_HEIGHT / 21));
  const height = lineHeight * scene.lines.length + PADDING_Y * 2;
  // Light themes get VS Code's `vs` workbench class, which switches the glow to its light form.
  const workbenchClass = palette.type === 'light' ? 'monaco-workbench vs' : 'monaco-workbench';
  const suggestBackground = DARK_THEME_COLORS['editorSuggestWidget.background'] ?? '#1C2433';
  const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:${scene.width}px;height:${height}px;overflow:hidden;background:${palette.ui.bg}}
.monaco-workbench{--vscode-editor-background:${palette.ui.bg};--vscode-editor-foreground:${palette.ui.fg};--vscode-editorSuggestWidget-background:${suggestBackground};padding:${PADDING_Y}px ${PADDING_X}px}
.view-lines{position:relative}
.view-line{font:${fontSize}px/${lineHeight}px ${CODE_FAMILY};white-space:pre;color:${palette.ui.fg};height:${lineHeight}px}
.split{display:inline}
.cursors-layer{position:absolute;inset:0;pointer-events:none}
.cursor{position:absolute;width:2px;height:28px}
${rules}
${suggest ? suggest.css : ''}
${css}
${cursors ? cursors.css : ''}
</style><div class="${workbenchClass}"><div class="monaco-editor"><div class="view-lines">${body}${cursors ? cursors.html : ''}${suggest ? suggest.html : ''}</div></div></div>
${woodfish ? `<script src="${BOOTSTRAP_URL}"></script>` : ''}<script>${PLACE_WIDGETS}</script>`;
  return { width: scene.width, height, html };
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

function screenshot(chrome, workDir, name, { width, height, html }) {
  const file = path.join(workDir, `${name}.html`);
  const output = path.join(OUTPUT_DIR, `${name}.png`);
  fs.writeFileSync(file, html);
  fs.rmSync(output, { force: true });
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--force-device-scale-factor=${SCALE}`,
      `--window-size=${width},${height}`,
      // Lets the bootstrap's animation-frame batches finish before the capture.
      '--virtual-time-budget=4000',
      '--allow-file-access-from-files',
      `--user-data-dir=${path.join(workDir, 'profile')}`,
      `--screenshot=${output}`,
      pathToFileURL(file).href,
    ],
    { stdio: 'ignore' }
  );
  if (!fs.existsSync(output)) {
    throw new Error(`Chrome did not write ${output}`);
  }
  console.log(`✓ assets/readme/${name}.png`);
}

function main() {
  const chrome = findChrome();
  const only = process.argv.slice(2);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-readme-'));
  try {
    for (const scene of SCENES) {
      if (only.length === 0 || only.includes(scene.file)) {
        screenshot(chrome, workDir, scene.file, scenePage(scene));
      }
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main();
