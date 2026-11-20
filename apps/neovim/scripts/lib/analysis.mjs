// Pure helpers for the comparison: read what Neovim painted, score it against VS Code, classify the differences.
import { NO_CAPTURE, majority, splitName } from './targets.mjs';

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

function decode(text) {
  return text
    .replace(/&(?:lt|gt|amp|quot|nbsp|#39);/g, (entity) => ENTITIES[entity])
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

/**
 * Reads the HTML `:TOhtml` writes. Spans nest when highlights overlap and the innermost span that has a
 * color wins, as in the editor. Returns the page colors and, per line, the non-blank characters with the
 * color Neovim painted them with.
 */
export function parseTohtml(html) {
  const classColors = new Map();
  for (const [, name, body] of html.matchAll(/^\.([^\s{]+)\s*\{([^}]*)\}/gm)) {
    classColors.set(name, /(?:^|;\s*)color:\s*(#[0-9a-f]{6})/i.exec(body)?.[1].toUpperCase() ?? null);
  }
  const page = /^body\s*\{([^}]*)\}/m.exec(html)?.[1] ?? '';
  const foreground = /(?:^|;\s*)color:\s*(#[0-9a-f]{6})/i.exec(page)?.[1].toUpperCase();
  const background = /background-color:\s*(#[0-9a-f]{6})/i.exec(page)?.[1].toUpperCase();
  const start = html.indexOf('<pre>') + '<pre>'.length;
  const body = html.slice(start, html.lastIndexOf('</pre>')).replace(/^\n/, '');

  const stack = [];
  const lines = [[]];
  const paint = () => stack.findLast((color) => color !== null) ?? foreground;
  for (const [, open, text] of body.matchAll(/<span class="([^"]*)">|<\/span>|([^<]+)/g).map((m) => [m[0], m[1], m[2]])) {
    if (open !== undefined) {
      const colors = open.split(/\s+/).map((name) => classColors.get(name) ?? null).filter((color) => color !== null);
      stack.push(colors.at(-1) ?? null);
    } else if (text === undefined) {
      stack.pop();
    } else {
      for (const char of decode(text)) {
        if (char === '\n') lines.push([]);
        else if (!/\s/.test(char)) lines.at(-1).push({ char, color: paint() });
      }
    }
  }
  return { foreground, background, lines };
}

/** Adds `nvim` (the color Neovim painted) to the records of `joinChars`; both must list the same characters. */
export function attachRendered(records, rendered, label) {
  const seen = new Map();
  const attached = records.map((record) => {
    const index = seen.get(record.row) ?? 0;
    seen.set(record.row, index + 1);
    const painted = rendered.lines[record.row]?.[index];
    if (painted?.char !== record.char) throw new Error(`${label}:${record.row + 1}: Neovim painted ${painted?.char} where the sample has ${record.char}`);
    return { ...record, nvim: painted.color };
  });
  rendered.lines.forEach((line, row) => {
    if (line.length !== (seen.get(row) ?? 0)) throw new Error(`${label}:${row + 1}: Neovim painted ${line.length} characters, the sample has ${seen.get(row) ?? 0}`);
  });
  return attached;
}

/**
 * Scores one theme over a corpus. A "combination" is a Treesitter capture in a language; characters with no
 * capture form one extra combination per language. `chosen` is the table the generator wrote
 * (language -> capture -> color).
 *  - hit: Neovim and VS Code paint the character the same color.
 *  - mapping error: Neovim paints a combination in another color than the one chosen for it, which is the
 *    color VS Code paints most of the combination's characters in (in the statistics samples).
 *  - uncovered: the statistics samples never contained the combination, so no color was chosen for it.
 *  - unsplittable: everything else; VS Code gives the combination several colors and a capture cannot tell
 *    them apart. `flipped` marks combinations whose majority color in this corpus differs from the chosen one.
 */
export function analyze(records, chosen) {
  const groups = new Map();
  for (const record of records) {
    const { lang, capture } = splitName(record.name, record.language);
    const key = `${lang}\t${capture}`;
    const group = groups.get(key) ?? { lang, capture, vscode: new Map(), nvim: new Map(), chars: 0, hits: 0 };
    group.vscode.set(record.color, (group.vscode.get(record.color) ?? 0) + 1);
    group.nvim.set(record.nvim, (group.nvim.get(record.nvim) ?? 0) + 1);
    group.chars++;
    if (record.nvim === record.color) group.hits++;
    groups.set(key, group);
  }
  const result = { chars: 0, hits: 0, mappingErrorChars: 0, uncoveredChars: 0, unsplittableChars: 0, mappingErrors: [], uncovered: [], unsplittable: [], mixedGroups: [] };
  for (const group of groups.values()) {
    result.chars += group.chars;
    result.hits += group.hits;
    const painted = majority(group.nvim);
    const expected = group.capture === NO_CAPTURE ? undefined : chosen[group.lang]?.[group.capture];
    const vscode = majority(group.vscode);
    const distribution = [...group.vscode].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const misses = group.chars - group.hits;
    const summary = { lang: group.lang, capture: group.capture, chars: group.chars, misses, painted, expected, vscode, distribution };
    if (group.nvim.size > 1 && group.capture !== NO_CAPTURE) result.mixedGroups.push({ ...summary, rendered: [...group.nvim] });
    if (group.capture !== NO_CAPTURE && expected === undefined) {
      result.uncovered.push(summary);
      result.uncoveredChars += misses;
    } else if (expected !== undefined && painted !== expected) {
      result.mappingErrors.push(summary);
      result.mappingErrorChars += misses;
    } else if (misses > 0) {
      result.unsplittable.push({ ...summary, flipped: expected !== undefined && expected !== vscode });
      result.unsplittableChars += misses;
    }
  }
  result.unsplittable.sort((a, b) => b.misses - a.misses);
  return result;
}
