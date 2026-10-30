#!/usr/bin/env node
/*
 * Ports the upstream VS Code themes Woodfish ships unmodified (Woodfish Dark, Woodfish
 * Dracula) into Woodfish palettes, so other hosts (the Codex desktop app) can use them.
 * The reverse of generate-themes.js, which renders the original palettes into themes.
 *
 *   node scripts/port-palettes.js          write packages/theme-core/src/palettes/ported.ts
 *   node scripts/port-palettes.js --check  fail if the generated file is stale
 *
 * Colors are read, never invented: UI roles come from workbench colors, token roles are
 * resolved from tokenColors the way VS Code matches TextMate scopes, accents come from
 * theme.meta.json. Only the muted text steps are derived (like Codex's own text levels).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.resolve(ROOT, '..', '..', 'packages', 'theme-core', 'src', 'palettes', 'ported.ts');

const SOURCES = [
  {
    slug: 'dark',
    folder: 'bearded',
    file: 'Woodfish Dark.json',
    upstream: 'Bearded Theme Arc 10.1.0 (GPL-3.0-only)',
    overrides: {},
  },
  {
    slug: 'dracula',
    folder: 'dracula',
    file: 'Woodfish Dracula.json',
    upstream: 'Dracula for Visual Studio Code 2.25.1 (MIT)',
    // The Dracula specification uses orange for warnings; the theme's cyan
    // editorWarning reads as "info" next to the other state colors in Codex.
    overrides: { warning: '#FFB86C' },
  },
];

// ---------- colors ----------

function parseColor(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value.trim());
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = [...digits].map((digit) => digit + digit).join('');
    }
    if (digits.length !== 6 && digits.length !== 8) {
      return null;
    }
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
    };
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i.exec(
    value.trim()
  );
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: alpha };
  }
  return null;
}

function toHex(color) {
  const channel = (value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`.toUpperCase();
}

/** `color` composited over `base` (both CSS strings), as opaque #RRGGBB. */
function over(color, base) {
  const top = parseColor(color);
  const bottom = parseColor(base);
  return toHex({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
  });
}

/** `color` at `amount` (0–1) over `base`, as opaque #RRGGBB. */
function mix(color, amount, base) {
  const top = parseColor(color);
  return over(toHex(top) + Math.round(amount * 255).toString(16).padStart(2, '0'), base);
}

function luminance(color) {
  const { r, g, b } = parseColor(color);
  const linear = (value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(left, right) {
  const [high, low] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

/** Keeps translucent colors as #RRGGBBAA and normalizes the rest to #RRGGBB. */
function normalize(value) {
  const color = parseColor(value);
  if (!color) {
    return null;
  }
  return color.a < 1
    ? toHex(color) + Math.round(color.a * 255).toString(16).padStart(2, '0').toUpperCase()
    : toHex(color);
}

// ---------- token scopes ----------

/** Representative TextMate scopes per palette role, most specific first. */
const ROLE_SCOPES = {
  keyword: ['keyword.control', 'keyword'],
  storage: ['storage.type', 'storage'],
  function: ['entity.name.function', 'support.function'],
  type: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'],
  string: ['string.quoted.double', 'string'],
  number: ['constant.numeric', 'constant'],
  parameter: ['variable.parameter'],
  variable: ['variable.other.readwrite', 'variable.other', 'variable'],
  property: ['variable.other.property', 'support.type.property-name', 'meta.object-literal.key'],
  decorator: ['entity.name.function.decorator', 'meta.decorator', 'punctuation.decorator'],
  operator: ['keyword.operator.assignment', 'keyword.operator'],
  punctuation: ['punctuation.separator', 'punctuation.terminator', 'punctuation'],
  comment: ['comment.line.double-slash', 'comment'],
  tag: ['entity.name.tag'],
  attribute: ['entity.other.attribute-name'],
  regexp: ['string.regexp'],
  escape: ['constant.character.escape'],
  namespace: ['entity.name.namespace', 'entity.name.type.namespace', 'entity.name.type.module'],
  macro: ['entity.name.function.preprocessor', 'meta.preprocessor', 'entity.name.function.macro'],
  self: ['variable.language.this', 'variable.language'],
  invalid: ['invalid.illegal', 'invalid'],
};

/**
 * The foreground VS Code would give `scope`: among rules whose simple selector equals the
 * scope or is a dot-prefix of it, the deepest selector wins; later rules win ties.
 */
function resolveScope(tokenColors, scope) {
  let best = null;
  tokenColors.forEach((rule, index) => {
    const foreground = rule.settings && rule.settings.foreground;
    if (!foreground || rule.scope === undefined) {
      return;
    }
    // Descendant selectors and exclusions contain spaces; only simple scopes are matched.
    const selectors = (Array.isArray(rule.scope) ? rule.scope : String(rule.scope).split(','))
      .map((selector) => selector.trim())
      .filter((selector) => selector && !/\s/.test(selector));
    for (const selector of selectors) {
      if (scope !== selector && !scope.startsWith(`${selector}.`)) {
        continue;
      }
      const depth = selector.split('.').length;
      if (!best || depth > best.depth || (depth === best.depth && index >= best.index)) {
        best = { depth, index, foreground };
      }
    }
  });
  return best ? best.foreground : null;
}

/** Unmatched roles fall back to the plain text color, except invalid code (error color). */
function tokenRoles(theme, ui) {
  const roles = {};
  for (const [role, scopes] of Object.entries(ROLE_SCOPES)) {
    const found = scopes.map((scope) => resolveScope(theme.tokenColors || [], scope)).find(Boolean);
    roles[role] = found ? over(found, ui.bg) : role === 'invalid' ? ui.error : ui.fg;
  }
  return roles;
}

// ---------- workbench colors ----------

function pick(colors, keys) {
  for (const key of keys) {
    if (parseColor(colors[key])) {
      return colors[key];
    }
  }
  return null;
}

function gradientColors(gradient) {
  return (String(gradient).match(/#[0-9a-f]{3,8}\b/gi) || []).map((color) => toHex(parseColor(color)));
}

function uiRoles(theme, meta, overrides) {
  const c = theme.colors;
  const bg = toHex(parseColor(c['editor.background']));
  const fg = over(pick(c, ['editor.foreground', 'foreground']), bg);
  const ansiNames = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'];
  const ansi = [
    ...ansiNames.map((name) => over(c[`terminal.ansi${name}`], bg)),
    ...ansiNames.map((name) => over(c[`terminal.ansiBright${name}`], bg)),
  ];
  const [accent, accent2] = gradientColors(meta.activityBadgeGradient);
  const chrome = [
    'titleBar.activeBackground',
    'activityBar.background',
    'sideBar.background',
    'editorGroupHeader.tabsBackground',
    'statusBar.background',
    'panel.background',
  ]
    .map((key) => c[key])
    .filter((value) => parseColor(value))
    .map((value) => over(value, bg));
  const bgDeep = [bg, ...chrome].sort((left, right) => luminance(left) - luminance(right))[0];
  // Elevated surfaces (menus, the composer) must sit above the editor in a dark theme.
  const widget = ['editorWidget.background', 'dropdown.background', 'quickInput.background', 'input.background']
    .map((key) => c[key])
    .filter((value) => parseColor(value))
    .map((value) => over(value, bg))
    .find((value) => luminance(value) > luminance(bg));
  const border = ['sideBar.border', 'panel.border', 'editorGroup.border', 'tab.border']
    .map((key) => c[key])
    .filter((value) => parseColor(value) && parseColor(value).a > 0)
    .map((value) => over(value, bg))
    .find((value) => contrast(value, bg) < 1.6);
  const ui = {
    bg,
    bgAlt: over(pick(c, ['sideBar.background']) || bg, bg),
    bgDeep,
    bgWidget: widget || mix(fg, 0.08, bg),
    border: border || mix(fg, 0.12, bg),
    fg,
    // Codex's secondary and tertiary text levels (71% and 50% ink).
    fgMuted: mix(fg, 0.7, bg),
    fgSubtle: mix(fg, 0.48, bg),
    lineHighlight: normalize(pick(c, ['editor.lineHighlightBackground'])) || mix(fg, 0.05, bg),
    selection: normalize(pick(c, ['editor.selectionBackground'])) || mix(accent, 0.3, bg),
    selectionInactive:
      normalize(pick(c, ['editor.inactiveSelectionBackground', 'editor.selectionBackground'])) ||
      mix(accent, 0.2, bg),
    findMatch: normalize(pick(c, ['editor.findMatchBackground'])) || mix(ansi[3], 0.35, bg),
    accent,
    accentFg: toHex(parseColor(meta.activityBadgeTextColor || fg)),
    accent2,
    error: over(pick(c, ['editorError.foreground']) || ansi[1], bg),
    warning: over(pick(c, ['editorWarning.foreground']) || ansi[3], bg),
    info: over(pick(c, ['editorInfo.foreground', 'textLink.foreground']) || ansi[4], bg),
    success: over(pick(c, ['gitDecoration.untrackedResourceForeground']) || ansi[2], bg),
  };
  return { ui: { ...ui, ...overrides }, ansi };
}

// ---------- output ----------

function portPalette(source) {
  const folder = path.join(ROOT, 'themes', source.folder);
  const theme = JSON.parse(fs.readFileSync(path.join(folder, source.file), 'utf8'));
  const meta = JSON.parse(fs.readFileSync(path.join(folder, 'theme.meta.json'), 'utf8'));
  const { ui, ansi } = uiRoles(theme, meta, source.overrides);
  const metaOut = {
    activityBadgeGradient: meta.activityBadgeGradient,
    ...(meta.activityBadgeTextColor ? { activityBadgeTextColor: meta.activityBadgeTextColor } : {}),
    tabBorderGradient: meta.tabBorderGradient,
    ...(meta.runtime ? { runtime: meta.runtime } : {}),
  };
  return {
    slug: source.slug,
    label: meta.label,
    type: 'dark',
    ui,
    tokens: tokenRoles(theme, ui),
    ansi,
    meta: metaOut,
  };
}

function render(palettes) {
  const sources = SOURCES.map(
    (source) => ` * - ${source.slug}: themes/${source.folder}/${source.file}, ${source.upstream}`
  ).join('\n');
  return `/*
 * Generated by apps/vscode-extension/scripts/port-palettes.js; do not edit by hand.
 *
 * Woodfish palettes ported from the upstream VS Code themes the extension ships
 * unmodified (paths relative to apps/vscode-extension):
${sources}
 *
 * The colors are those themes' own; see THIRD_PARTY_NOTICES.md for their licenses.
 */
import { WoodfishPalette } from './types';

export const PORTED_PALETTES: readonly WoodfishPalette[] = ${JSON.stringify(palettes, null, 2).replace(
    /"([A-Za-z_][A-Za-z0-9_]*)":/g,
    '$1:'
  )};
`;
}

async function main() {
  const prettier = require('prettier');
  const config = (await prettier.resolveConfig(OUTPUT)) || {};
  const output = await prettier.format(render(SOURCES.map(portPalette)), {
    ...config,
    parser: 'typescript',
  });
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (current !== output) {
      console.error(`${path.relative(process.cwd(), OUTPUT)} is stale; run pnpm themes:generate`);
      process.exit(1);
    }
    console.log('✓ ported palettes are up to date');
    return;
  }
  fs.writeFileSync(OUTPUT, output);
  console.log(`✓ ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
