// Pure helpers for the comparison: read what Neovim painted, score it against VS Code, classify the differences.
import { NO_CAPTURE, majority, splitName } from './targets.mjs';

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const COLOR = /(?:^|;\s*)color:\s*(#[0-9a-f]{6})/i;

function decode(text) {
  return text
    .replace(/&(?:lt|gt|amp|quot|nbsp|#39);/g, (entity) => ENTITIES[entity])
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

/** Font style bits (1 italic, 2 bold, 4 underline, 8 strikethrough) a CSS rule body asks for. */
function cssStyle(body) {
  return (
    (/font-style:\s*italic/.test(body) ? 1 : 0) |
    (/font-weight:\s*bold/.test(body) ? 2 : 0) |
    (/text-decoration(?:-line)?:[^;]*underline/.test(body) ? 4 : 0) |
    (/text-decoration(?:-line)?:[^;]*line-through/.test(body) ? 8 : 0)
  );
}

/**
 * Reads the HTML `:TOhtml` writes. Spans nest when highlights overlap: the innermost span that has a color
 * decides the color, and font styles add up (Neovim merges the attributes of overlapping highlights). Returns
 * the page colors and, per line, the non-blank characters with the color and style Neovim painted them with.
 */
export function parseTohtml(html) {
  const classes = new Map();
  for (const [, name, body] of html.matchAll(/^\.([^\s{]+)\s*\{([^}]*)\}/gm)) {
    classes.set(name, { color: COLOR.exec(body)?.[1].toUpperCase() ?? null, style: cssStyle(body) });
  }
  const page = /^body\s*\{([^}]*)\}/m.exec(html)?.[1] ?? '';
  const foreground = COLOR.exec(page)?.[1].toUpperCase();
  const background = /background-color:\s*(#[0-9a-f]{6})/i.exec(page)?.[1].toUpperCase();
  const start = html.indexOf('<pre>') + '<pre>'.length;
  const body = html.slice(start, html.lastIndexOf('</pre>')).replace(/^\n/, '');

  const stack = [];
  const lines = [[]];
  for (const match of body.matchAll(/<span class="([^"]*)">|<\/span>|([^<]+)/g)) {
    const [, open, text] = match;
    if (open !== undefined) {
      const rules = open.split(/\s+/).map((name) => classes.get(name)).filter(Boolean);
      stack.push({ color: rules.map((rule) => rule.color).findLast(Boolean) ?? null, style: rules.reduce((bits, rule) => bits | rule.style, 0) });
    } else if (text === undefined) {
      stack.pop();
    } else {
      const color = stack.map((entry) => entry.color).findLast(Boolean) ?? foreground;
      const style = stack.reduce((bits, entry) => bits | entry.style, 0);
      for (const char of decode(text)) {
        if (char === '\n') lines.push([]);
        else if (!/\s/.test(char)) lines.at(-1).push({ char, color, style });
      }
    }
  }
  return { foreground, background, lines };
}

/** Adds `nvim` and `nvimStyle` (what Neovim painted) to the records of `joinChars`; both must list the same characters. */
export function attachRendered(records, rendered, label) {
  const seen = new Map();
  const attached = records.map((record) => {
    const index = seen.get(record.row) ?? 0;
    seen.set(record.row, index + 1);
    const painted = rendered.lines[record.row]?.[index];
    if (painted?.char !== record.char) throw new Error(`${label}:${record.row + 1}: Neovim painted ${painted?.char} where the sample has ${record.char}`);
    return { ...record, nvim: painted.color, nvimStyle: painted.style };
  });
  rendered.lines.forEach((line, row) => {
    if (line.length !== (seen.get(row) ?? 0)) throw new Error(`${label}:${row + 1}: Neovim painted ${line.length} characters, the sample has ${seen.get(row) ?? 0}`);
  });
  return attached;
}

const byShare = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
const count = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

/**
 * Scores one theme over a corpus. A "combination" is a Treesitter capture in a language; characters with no
 * capture form one extra combination per language. `chosen` is the table the generator wrote
 * (language -> capture -> { fg, style }).
 *  - hit: Neovim and VS Code paint the character the same color (`styleHits`: the same font style).
 *  - mapping error: Neovim paints a combination in another color than the one chosen for it, or without a
 *    font style chosen for it (the chosen ones are the majority ones VS Code gives the combination's
 *    characters in the statistics samples). Neovim merges the attributes of overlapping highlights and a
 *    group cannot switch a style off, so extra styles inherited from a capture underneath are listed in
 *    `styleOverlaps` instead.
 *  - uncovered: the statistics samples never contained the combination, so nothing was chosen for it.
 *  - unsplittable: every other color difference; VS Code gives the combination several colors and a capture
 *    cannot tell them apart. `flipped` marks combinations whose majority color in this corpus differs from the
 *    chosen one.
 */
export function analyze(records, chosen) {
  const groups = new Map();
  for (const record of records) {
    const { lang, capture } = splitName(record.name, record.language);
    const key = `${lang}\t${capture}`;
    const group = groups.get(key) ?? { lang, capture, vscode: new Map(), nvim: new Map(), vscodeStyle: new Map(), nvimStyle: new Map(), chars: 0, hits: 0, styleHits: 0 };
    count(group.vscode, record.color);
    count(group.nvim, record.nvim);
    count(group.vscodeStyle, record.style);
    count(group.nvimStyle, record.nvimStyle);
    group.chars++;
    if (record.nvim === record.color) group.hits++;
    if (record.nvimStyle === record.style) group.styleHits++;
    groups.set(key, group);
  }
  const result = { chars: 0, hits: 0, styleHits: 0, mappingErrorChars: 0, uncoveredChars: 0, unsplittableChars: 0, mappingErrors: [], uncovered: [], unsplittable: [], styleOverlaps: [], mixedGroups: [] };
  for (const group of groups.values()) {
    result.chars += group.chars;
    result.hits += group.hits;
    result.styleHits += group.styleHits;
    const expected = group.capture === NO_CAPTURE ? undefined : chosen[group.lang]?.[group.capture];
    const painted = majority(group.nvim);
    const paintedStyle = majority(group.nvimStyle);
    const vscode = majority(group.vscode);
    const misses = group.chars - group.hits;
    const summary = {
      lang: group.lang,
      capture: group.capture,
      chars: group.chars,
      misses,
      painted,
      paintedStyle,
      expected: expected?.fg,
      expectedStyle: expected?.style,
      vscode,
      distribution: [...group.vscode].sort(byShare),
      styleDistribution: [...group.vscodeStyle].sort(byShare),
    };
    if (group.nvim.size > 1 && group.capture !== NO_CAPTURE) result.mixedGroups.push({ ...summary, rendered: [...group.nvim] });
    const missingStyle = expected === undefined ? 0 : expected.style & ~paintedStyle;
    const extraStyle = expected === undefined ? 0 : paintedStyle & ~expected.style;
    if (extraStyle && !missingStyle && painted === expected.fg) result.styleOverlaps.push({ ...summary, extraStyle });
    if (group.capture !== NO_CAPTURE && expected === undefined) {
      result.uncovered.push(summary);
      result.uncoveredChars += misses;
    } else if (expected !== undefined && (painted !== expected.fg || missingStyle)) {
      result.mappingErrors.push(summary);
      result.mappingErrorChars += misses;
    } else if (misses > 0) {
      result.unsplittable.push({ ...summary, flipped: expected !== undefined && expected.fg !== vscode });
      result.unsplittableChars += misses;
    }
  }
  result.unsplittable.sort((a, b) => b.misses - a.misses);
  return result;
}
