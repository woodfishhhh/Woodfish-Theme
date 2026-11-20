// Works out, per theme, which color VS Code gives each "Treesitter capture + language" combination.
// VS Code's own theme resolution (vscode-textmate, through Shiki) colors the sample code; the committed
// captures say which capture Neovim paints the same characters with; the majority color of each
// combination becomes the color of the highlight group.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createHighlighter } from 'shiki';
import { CAPTURES_DIR, LANGUAGES, STATS_DIR, opaqueHex, parseJsonc, themeFile } from './shared.mjs';

/** Grammars VS Code embeds in the samples (Markdown fences and inline HTML). */
const SHIKI_LANGUAGES = [...Object.keys(LANGUAGES), 'html'];

export const NO_CAPTURE = '';

export async function createShiki() {
  return createHighlighter({ themes: [], langs: SHIKI_LANGUAGES });
}

export async function loadTheme(highlighter, slug) {
  const theme = parseJsonc(fs.readFileSync(themeFile(slug), 'utf8'));
  const name = `woodfish-${slug}`;
  await highlighter.loadTheme({ ...theme, name });
  return { name, background: theme.colors?.['editor.background'] ?? '#000000', foreground: theme.colors?.['editor.foreground'] };
}

/** The committed captures of stats-samples/, checked against the sample files they were taken from. */
export function loadCaptures(dir = CAPTURES_DIR) {
  return Object.fromEntries(
    Object.entries(LANGUAGES).map(([language, sample]) => {
      const file = path.join(dir, `${language}.json`);
      if (!fs.existsSync(file)) throw new Error(`${path.relative(process.cwd(), file)} is missing; run pnpm nvim:capture`);
      const captures = JSON.parse(fs.readFileSync(file, 'utf8'));
      const sha = createHash('sha256').update(fs.readFileSync(path.join(STATS_DIR, sample))).digest('hex');
      if (captures.sha256 !== sha) throw new Error(`${language} captures are stale (stats-samples/${sample} changed); run pnpm nvim:capture`);
      return [language, captures];
    })
  );
}

/**
 * One record per non-blank character: where it is, the capture Neovim paints it with (null when none)
 * and the color VS Code paints it with.
 */
export function joinChars(highlighter, theme, language, code, capture) {
  const text = code.endsWith('\n') ? code.slice(0, -1) : code;
  const lines = text.split('\n');
  const tokens = highlighter.codeToTokensBase(text, { lang: language, theme: theme.name });
  if (tokens.length !== lines.length || capture.lines.length !== lines.length) {
    throw new Error(`${language}: ${lines.length} lines, Shiki ${tokens.length}, captures ${capture.lines.length}`);
  }
  const records = [];
  lines.forEach((line, row) => {
    const [length, ...runs] = capture.lines[row];
    if (length !== line.length) throw new Error(`${language}:${row + 1}: captures were taken from different text`);
    const colors = [];
    for (const token of tokens[row]) {
      const color = opaqueHex(token.color ?? theme.foreground, theme.background);
      for (let i = 0; i < token.content.length; i++) colors.push(color);
    }
    if (colors.length !== line.length) throw new Error(`${language}:${row + 1}: Shiki tokens do not cover the line`);
    const names = new Array(line.length).fill(null);
    for (let i = 0; i < runs.length; i += 3) names.fill(capture.names[runs[i + 2]], runs[i], runs[i + 1]);
    for (let column = 0; column < line.length; column++) {
      if (/\s/.test(line[column]) || (column > 0 && line.charCodeAt(column) >= 0xdc00 && line.charCodeAt(column) <= 0xdfff)) continue;
      records.push({ row, column, language, char: String.fromCodePoint(line.codePointAt(column)), name: names[column], color: colors[column] });
    }
  });
  return records;
}

/** `lang:capture` -> `{ lang, capture }`; characters without a capture belong to the sample's own language. */
export function splitName(name, fallbackLanguage) {
  if (name === null) return { lang: fallbackLanguage, capture: NO_CAPTURE };
  const at = name.indexOf(':');
  return { lang: name.slice(0, at), capture: name.slice(at + 1) };
}

/** Counts of VS Code colors per combination: `Map<"lang\tcapture", Map<color, characters>>`. */
export function tally(records, fallbackLanguage, into = new Map()) {
  for (const { name, color } of records) {
    const { lang, capture } = splitName(name, fallbackLanguage);
    const key = `${lang}\t${capture}`;
    const colors = into.get(key) ?? new Map();
    colors.set(color, (colors.get(color) ?? 0) + 1);
    into.set(key, colors);
  }
  return into;
}

export function majority(colors) {
  return [...colors].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
}

/** Everything the generator and the reports need for one theme. */
export async function themeTargets(highlighter, slug, captures) {
  const theme = await loadTheme(highlighter, slug);
  const counts = new Map();
  for (const [language, sample] of Object.entries(LANGUAGES)) {
    const code = fs.readFileSync(path.join(STATS_DIR, sample), 'utf8');
    tally(joinChars(highlighter, theme, language, code, captures[language]), language, counts);
  }
  const language = {};
  for (const [key, colors] of [...counts].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const [lang, capture] = key.split('\t');
    if (capture === NO_CAPTURE) continue;
    (language[lang] ??= {})[capture] = majority(colors);
  }
  return { language, counts };
}
