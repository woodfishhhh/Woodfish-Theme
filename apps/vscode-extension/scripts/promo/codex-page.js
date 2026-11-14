'use strict';
/*
 * The Codex half of the promo: a page laid out like the Codex desktop app (the same data-*
 * hooks the adapter targets, see packages/adapter-codex/src/selectors.ts and
 * docs/hosts/codex.md), running the real Woodfish overlay for Codex and the shipped effect
 * plugins. Only the host DOM is a stand-in; every color, ring, caret, trail and particle on
 * screen is drawn by Woodfish's own code. `codex-stage.js` drives it frame by frame.
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { REPO_ROOT } = require('../lib/scene-kit');

const effectsPackage = require(path.join(REPO_ROOT, 'packages/effects/out/index.js'));

const BUILTIN_EFFECTS = path.join(REPO_ROOT, 'packages/effects/builtin');
const CAIYUN = path.join(REPO_ROOT, 'packages/renderer-runtime/assets/caiyun.webp');
const UI_FONT = "'Segoe UI Variable Text', 'Segoe UI', 'Microsoft YaHei UI', sans-serif";
const CODE_FONT = "'Cascadia Code', Consolas, 'Microsoft YaHei UI', monospace";

/** The overlay bundle: startCodexOverlay exposed, 《彩云》 inlined like the Codex++ script. */
async function buildOverlayBundle() {
  const result = await esbuild.build({
    stdin: {
      contents:
        "import { startCodexOverlay } from '@woodfish/adapter-codex/renderer';\n(globalThis as Record<string, unknown>).__promoStartCodex = startCodexOverlay;\n",
      loader: 'ts',
      resolveDir: path.join(REPO_ROOT, 'apps/desktop-cli'),
      sourcefile: 'promo-codex-entry.ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'chrome120',
    conditions: ['source'],
    define: {
      __WOODFISH_CODEX_BUILD__: JSON.stringify('promo'),
      __WOODFISH_CODEX_DEFAULT_BACKGROUND__: JSON.stringify(fs.readFileSync(CAIYUN).toString('base64')),
    },
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

/** The shipped effects (defaults, no params.json) as the page payload. */
function effectsList(host) {
  return effectsPackage.buildEffectsList(effectsPackage.readUserEffects(BUILTIN_EFFECTS), host);
}

const ICONS = {
  back: '<path d="M12 4 6 10l6 6"/>',
  forward: '<path d="m8 4 6 6-6 6"/>',
  panel: '<rect x="3" y="4" width="14" height="12" rx="2"/><path d="M8 4v12"/>',
  home: '<path d="M3.5 9 10 3.8 16.5 9v7a1 1 0 0 1-1 1H12v-5H8v5H4.5a1 1 0 0 1-1-1z"/>',
  chats: '<path d="M4 5h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8l-3 2.5V13H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M14 8h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v2l-2.4-2"/>',
  clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2"/>',
  book: '<path d="M4 4h4v12H4zM9 4h3v12H9zM13.5 4.5l2.6-.7 2.5 11.5-2.6.7z"/>',
  at: '<circle cx="10" cy="10" r="3"/><path d="M13 10v1.2a2.3 2.3 0 0 0 4.6 0V10a7.6 7.6 0 1 0-3 6"/>',
  dots: '<circle cx="5" cy="10" r=".9"/><circle cx="10" cy="10" r=".9"/><circle cx="15" cy="10" r=".9"/>',
  folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3.2l1.6 1.8h6.2A1.5 1.5 0 0 1 17 8.3v6.2a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"/>',
  edit: '<path d="M11 4H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 16h9a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="m14.5 3.5 2 2L10 12l-2.8.8L8 10z"/>',
  bell: '<path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.3 1.5H4.2z"/><path d="M8.5 17h3"/>',
  search: '<circle cx="9" cy="9" r="5"/><path d="m13 13 3.5 3.5"/>',
  chevron: '<path d="m6 8 4 4 4-4"/>',
  right: '<path d="m8 5 5 5-5 5"/>',
  plus: '<path d="M10 4v12M4 10h12"/>',
  shield: '<path d="M10 3 4.5 5v4.6c0 3.5 2.4 6 5.5 7.4 3.1-1.4 5.5-3.9 5.5-7.4V5z"/><path d="M10 7.5v3.5M10 13.2v.3"/>',
  mic: '<rect x="7.5" y="3" width="5" height="9" rx="2.5"/><path d="M5 9.5a5 5 0 0 0 10 0M10 14.5V17"/>',
  up: '<path d="M10 15V5M5.5 9.5 10 5l4.5 4.5"/>',
  copy: '<rect x="7" y="7" width="9" height="9" rx="2"/><path d="M13 4.5V4a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 3 4v7a1.5 1.5 0 0 0 1.5 1.5H5"/>',
  speaker: '<path d="M4 8h3l4-3v10l-4-3H4z"/><path d="M14 7.5a3.5 3.5 0 0 1 0 5"/>',
  thumb: '<path d="M7 9.5 9.5 4a2 2 0 0 1 2 2v2.5h4a1.5 1.5 0 0 1 1.5 1.8l-1 5A1.5 1.5 0 0 1 14.5 16.5H7z"/><path d="M4 9.5h3v7H4z"/>',
  minimize: '<path d="M5 10h10"/>',
  maximize: '<rect x="5.5" y="5.5" width="9" height="9" rx="1"/>',
  close: '<path d="m5.5 5.5 9 9M14.5 5.5l-9 9"/>',
  code: '<path d="m7 6-4 4 4 4M13 6l4 4-4 4"/>',
  split: '<path d="M4 4h12v12H4zM10 4v12"/>',
  list: '<path d="M8 6h8M8 10h8M8 14h8"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="10" r=".8"/><circle cx="4.5" cy="14" r=".8"/>',
  mcp: '<path d="m4 11 6-6a2.1 2.1 0 0 1 3 3l-5.5 5.5M9 12l4.5-4.5a2.1 2.1 0 0 1 3 3L11 16"/>',
  gauge: '<path d="M4 14a6 6 0 1 1 12 0"/><path d="m10 14 3-4"/>',
  feedback: '<path d="M4 4h12v9H8l-4 3z"/><path d="M8 8h4"/>',
  brain: '<path d="M10 4v12M7 5a3 3 0 0 0-3 3v1a3 3 0 0 0 1 5.6A2.5 2.5 0 0 0 10 16M13 5a3 3 0 0 1 3 3v1a3 3 0 0 1-1 5.6A2.5 2.5 0 0 1 10 16"/>',
  cube: '<path d="m10 3 6 3.5v7L10 17l-6-3.5v-7z"/><path d="m4 6.5 6 3.5 6-3.5M10 10v7"/>',
  status: '<path d="M4 13a6 6 0 1 1 3 5.2"/><path d="M10 10V7"/>',
  target: '<circle cx="10" cy="10" r="6.5"/><circle cx="10" cy="10" r="3"/>',
  sketch: '<path d="M4 15c2-3 3-8 5-8s-1 7 1 7 3-5 5-5"/>',
};

const icon = (name, size = 16) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/** The slash menu, copied from a real screenshot (docs/hosts/codex-screenshots/popup-after.jpg). */
const SLASH_ITEMS = [
  ['mcp', 'MCP', '显示 MCP 服务器状态', true],
  ['gauge', '使用情况和计费', '打开用量和账单设置'],
  ['feedback', '反馈', '发送有关此聊天的反馈'],
  ['folder', '在项目中使用 Work', '为新聊天选择项目', true],
  ['brain', '推理', 'Max', true],
  ['cube', '模型', '', true],
  ['status', '状态', '显示聊天 ID、上下文用量和速率限制'],
  ['target', '目标', '设置要持续追求的目标'],
  ['sketch', '绘图', '绘制草图'],
];

function slashMenuHtml() {
  const rows = SLASH_ITEMS.map(
    ([name, label, detail, more], index) =>
      `<div role="option" class="slash-item" aria-selected="${index === 0}">${icon(name, 15)}<b>${label}</b><span>${detail}</span>${more ? `<i>${icon('right', 13)}</i>` : ''}</div>`
  ).join('');
  return `<div class="slash-menu" role="listbox" data-state="open">${rows}</div>`;
}

const PAGE_CSS = `
@layer theme {
  :root {
    --app-color-background-surface: #181818;
    --app-color-background-shell: #111111;
    --app-color-text-foreground: #ffffff;
    --app-color-text-foreground-secondary: #afafaf;
    --app-color-text-foreground-tertiary: #8a8a8a;
    --app-color-background-elevated-primary: #222222;
    --app-color-background-editor-opaque: #1f1f1f;
    --app-color-border: #ffffff1a;
    --app-color-text-warning: #f5b84c;
    --color-background-user-message: #2c2c2c;
    --color-background-composer-primary: #339cff;
    --color-surface: var(--app-color-background-surface);
    --color-text: var(--app-color-text-foreground);
    --color-text-secondary: var(--app-color-text-foreground-secondary);
    --color-text-tertiary: var(--app-color-text-foreground-tertiary);
    --color-surface-elevated: var(--app-color-background-elevated-primary);
    --color-border: var(--app-color-border);
  }
}
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
body { font: 14px/1.5 ${UI_FONT}; color: var(--color-text); background: var(--app-color-background-shell); -webkit-font-smoothing: antialiased; }
.icon { display: block; flex: none; }
#app { position: fixed; inset: 0; display: grid; grid-template-rows: 36px 1fr; grid-template-columns: 48px 222px 1fr; }
[data-app-shell-titlebar] { grid-column: 1 / -1; display: flex; align-items: center; gap: 4px; padding-left: 10px; color: var(--color-text-secondary); font-size: 13px; }
[data-app-shell-titlebar] .nav-buttons { display: flex; gap: 14px; margin-right: 18px; opacity: .8; }
[data-app-shell-titlebar] .menus { display: flex; gap: 22px; }
[data-app-shell-titlebar] .window-buttons { margin-left: auto; display: flex; height: 100%; }
[data-app-shell-titlebar] .window-buttons span { width: 46px; display: grid; place-items: center; }
nav[data-app-navigation-rail] { grid-row: 2; display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 8px; color: var(--color-text-secondary); }
nav[data-app-navigation-rail] button { all: unset; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; }
nav[data-app-navigation-rail] button.on { background: color-mix(in oklab, var(--color-text) 8%, transparent); color: var(--color-text); }
nav[data-app-navigation-rail] .avatar { margin-top: auto; margin-bottom: 14px; width: 26px; height: 26px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ffe6a8, #f08fb4 45%, #6a8cff 80%); }
nav[data-app-navigation-rail] hr { width: 22px; border: 0; border-top: 1px solid var(--color-border); margin: 2px 0; }
[data-sidebar-navigation-root] { grid-row: 2; overflow: hidden; border-radius: 12px 0 0 0; background: color-mix(in oklab, var(--color-surface) 65%, transparent); padding: 10px 8px; display: flex; flex-direction: column; gap: 1px; }
.sb-head { display: flex; align-items: center; gap: 4px; padding: 2px 8px 10px; font-size: 17px; font-weight: 600; }
.sb-head .tools { margin-left: auto; display: flex; gap: 14px; color: var(--color-text-secondary); }
.sb-row, [data-app-action-sidebar-thread-row] { display: flex; align-items: center; gap: 8px; height: 30px; padding: 0 8px; border-radius: 12.5px; white-space: nowrap; color: var(--color-text); }
.sb-row { overflow: hidden; }
[data-sidebar-navigation-root] > * { flex: none; }
.sb-row.muted { color: var(--color-text-tertiary); }
.sb-label { padding: 14px 8px 6px; font-size: 12.5px; color: var(--color-text-tertiary); display: flex; align-items: center; gap: 2px; }
[data-app-action-sidebar-thread-row] .title { flex: 1; overflow: hidden; text-overflow: ellipsis; }
[data-app-action-sidebar-thread-row] .motion-safe\\:animate-spin { width: 12px; height: 12px; border-radius: 50%; border: 1.6px solid color-mix(in oklab, var(--color-text) 25%, transparent); border-top-color: var(--color-text-secondary); animation: spin 0.9s linear infinite; flex: none; }
@keyframes spin { to { transform: rotate(360deg); } }
main.bg-surface { grid-row: 2; grid-column: 3; background: var(--color-surface); display: flex; flex-direction: column; min-width: 0; overflow: hidden; position: relative; }
.thread-header { height: 44px; flex: none; display: flex; align-items: center; gap: 8px; padding: 0 18px; font-weight: 600; }
.thread-header .tools { margin-left: auto; display: flex; gap: 18px; color: var(--color-text-secondary); }
[data-app-action-timeline-scroll] { flex: 1; overflow: hidden; display: flex; flex-direction: column; align-items: center; }
.column { width: min(690px, calc(100% - 72px)); padding-top: 10px; }
.turn-user { display: flex; justify-content: flex-end; margin: 18px 0 26px; }
[data-user-message-bubble] { max-width: 78%; padding: 9px 16px; border-radius: 16px; background: var(--color-background-user-message); color: var(--color-text-user-message, var(--color-text)); line-height: 1.7; }
[data-markdown-text-style="assistant-message"] { line-height: 1.8; }
[data-markdown-text-style="assistant-message"] p { margin: 0 0 12px; }
[data-markdown-text-style="assistant-message"] h3 { font-size: 16px; line-height: 1.5; font-weight: 650; margin: 16px 0 6px; }
[data-markdown-text-style="assistant-message"] > :first-child { margin-top: 0; }
.turn-actions { display: flex; gap: 14px; color: var(--color-text-tertiary); margin: 4px 0 18px; }
[data-code-block="true"] { margin: 6px 0 14px; border-radius: 14px; background: var(--app-color-background-editor-opaque); border: 1px solid var(--color-border); overflow: hidden; }
[data-code-block="true"] .head { display: flex; align-items: center; gap: 8px; padding: 9px 16px 0; font-size: 13px; color: var(--color-text-secondary); }
[data-code-block="true"] .head .tools { margin-left: auto; display: flex; gap: 14px; }
pre[data-code-block-source="true"] { margin: 0; padding: 10px 18px 14px; font: 13px/1.7 ${CODE_FONT}; color: var(--color-text); white-space: pre; }
.hljs-selector-pseudo, .hljs-keyword { color: var(--color-codex-syntax-keyword); }
.hljs-attr { color: var(--color-codex-syntax-attribute); }
.hljs-number { color: var(--color-codex-syntax-literal); }
.hljs-string { color: var(--color-codex-syntax-string); }
.hljs-comment { color: var(--color-codex-syntax-comment); }
[data-codex-composer-root] { flex: none; display: flex; justify-content: center; padding: 0 0 16px; position: relative; }
[data-composer-surface-variant] { width: min(690px, calc(100% - 72px)); border-radius: 22px; background: var(--composer-layout-surface-background, color-mix(in oklab, var(--color-surface-elevated) 90%, transparent)); }
[data-composer-body] { border-radius: 22px; border: 1px solid var(--color-border); padding: 13px 14px 10px; min-height: 92px; box-sizing: border-box; display: flex; flex-direction: column; }
[data-composer-body] [contenteditable="true"] { outline: none; min-height: 24px; line-height: 24px; flex: 1; padding: 0 2px; word-break: break-word; }
[data-composer-body] [contenteditable="true"] p { margin: 0; }
[data-composer-body] [contenteditable="true"] p.is-empty::before { content: attr(data-placeholder); color: var(--color-text-tertiary); pointer-events: none; float: left; height: 0; }
.composer-actions { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-size: 13px; color: var(--color-text-secondary); }
.composer-actions .access { display: flex; align-items: center; gap: 5px; color: var(--app-color-text-warning); }
.composer-actions .model { margin-left: auto; display: flex; align-items: center; gap: 4px; color: var(--color-text); }
.composer-actions .model em { font-style: normal; color: var(--color-text-tertiary); }
.composer-actions .bg-composer-primary { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--color-background-composer-primary); color: var(--color-text-composer-primary, #fff); }
.composer-actions .bg-composer-primary.idle { opacity: .55; }
[data-composer-overlay-floating-ui][hidden] { display: none; }
[data-composer-overlay-floating-ui="true"] { position: absolute; left: 0; right: 0; bottom: calc(100% - 4px); display: flex; justify-content: center; pointer-events: none; }
.slash-menu { width: min(690px, calc(100% - 72px)); box-sizing: border-box; padding: 6px; border-radius: 18px; border: 1px solid var(--color-border); background: var(--color-surface-elevated); }
.slash-item { display: flex; align-items: center; gap: 10px; height: 32px; padding: 0 12px; border-radius: 10px; color: var(--color-text); }
.slash-item span { color: var(--color-text-tertiary); }
.slash-item i { margin-left: auto; color: var(--color-text-tertiary); }
.slash-item[aria-selected="true"] { background: color-mix(in oklab, var(--color-text) 9%, transparent); }
`;

function pageHtml({ stageUrl, bundleUrl, overlayUrl }) {
  const rail = ['home', 'chats', 'clock', 'book', 'at', 'dots']
    .map((name, index) => `<button class="${index === 0 ? 'on' : ''}">${icon(name, 18)}</button>`)
    .join('');
  return `<!doctype html><html lang="zh-CN" data-theme="dark" data-codex-os="win32" data-codex-window-type="electron"><meta charset="utf-8">
<style>${PAGE_CSS}</style>
<body>
<div id="app">
  <div data-app-shell-titlebar="true"><span class="nav-buttons">${icon('back')}${icon('forward')}${icon('panel')}</span><span class="menus"><span>文件</span><span>编辑</span><span>视图</span><span>帮助</span></span><span class="window-buttons"><span>${icon('minimize', 14)}</span><span>${icon('maximize', 13)}</span><span>${icon('close', 14)}</span></span></div>
  <nav data-app-navigation-rail>${rail}<hr><button>${icon('folder', 18)}</button><span class="avatar"></span></nav>
  <div data-sidebar-navigation-root>
    <div class="sb-head">Codex ${icon('chevron', 14)}<span class="tools">${icon('bell', 15)}${icon('search', 15)}</span></div>
    <div class="sb-row">${icon('edit', 15)}新聊天</div>
    <div class="sb-label">置顶</div>
    <div class="sb-row">${icon('folder', 15)}woodfish-theme</div>
    <div class="sb-row">${icon('folder', 15)}个人博客</div>
    <div class="sb-row muted">${icon('folder', 15)}周报</div>
    <div class="sb-label">项目 ${icon('right', 12)}</div>
    <div class="sb-label">最近</div>
    <div class="threads"></div>
  </div>
  <main class="bg-surface" data-app-shell-main-surface>
    <div class="thread-header"><span class="thread-title"></span><span class="tools">${icon('dots', 16)}${icon('list', 16)}${icon('split', 15)}</span></div>
    <div data-app-action-timeline-scroll><div class="column"></div></div>
    <div data-codex-composer-root>
      <div data-composer-overlay-floating-ui="true" hidden>${slashMenuHtml()}</div>
      <div data-composer-surface-variant="default">
        <div data-composer-body>
          <div contenteditable="true" class="ProseMirror" spellcheck="false"><p class="is-empty" data-placeholder="和 Codex 一起工作"><br class="ProseMirror-trailingBreak"></p></div>
          <div class="composer-actions">${icon('plus', 17)}<span class="access">${icon('shield', 15)}完全访问</span><span class="model">6 Astra <em>Max</em>${icon('chevron', 12)}</span>${icon('mic', 16)}<span class="bg-composer-primary idle">${icon('up', 15)}</span></div>
        </div>
      </div>
    </div>
  </main>
</div>
<script>window.__promoCodexEffects = ${effectsList('codex')};
window.__promoIcons = ${JSON.stringify({ copy: icon('copy', 15), speaker: icon('speaker', 15), thumb: icon('thumb', 15), code: icon('code', 14), split: icon('split', 14) })};</script>
<script src="${bundleUrl}"></script>
<script src="${stageUrl}"></script>
<script src="${overlayUrl}"></script>
</body></html>`;
}

module.exports = { buildOverlayBundle, effectsList, codexPageHtml: pageHtml, BUILTIN_EFFECTS, effectsPackage };
