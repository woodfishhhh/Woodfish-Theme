// Works out, per theme, which color and font style VS Code gives each "Treesitter capture + language" combination.
// VS Code's own theme resolution (vscode-textmate, through Shiki) colors the sample code; the committed
// captures say which capture Neovim paints the same characters with; the majority color and the majority
// style of each combination become the attributes of the highlight group.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createHighlighter } from 'shiki';
import { CAPTURES_DIR, COMPARE_SAMPLES, REUSED_STATISTICS, STATS_DIR, STATS_SAMPLES, opaqueHex, parseJsonc, themeFile } from './shared.mjs';

/** Grammars VS Code embeds in the samples (Markdown fences and inline HTML) plus the sample languages themselves. */
const SHIKI_LANGUAGES = [...new Set([...COMPARE_SAMPLES.map((sample) => sample.shiki), 'html'])];

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
    STATS_SAMPLES.map(({ key, file }) => {
      const captureFile = path.join(dir, `${key}.json`);
      if (!fs.existsSync(captureFile)) throw new Error(`${path.relative(process.cwd(), captureFile)} is missing; run pnpm nvim:capture`);
      const captures = JSON.parse(fs.readFileSync(captureFile, 'utf8'));
      const sha = createHash('sha256').update(fs.readFileSync(path.join(STATS_DIR, file))).digest('hex');
      if (captures.sha256 !== sha) throw new Error(`${key} captures are stale (stats-samples/${file} changed); run pnpm nvim:capture`);
      return [key, captures];
    })
  );
}

/**
 * One record per non-blank character: where it is, the capture Neovim paints it with (null when none) and
 * the color and font style VS Code paints it with. `sample` is an entry of STATS_SAMPLES / COMPARE_SAMPLES.
 */
export function joinChars(highlighter, theme, sample, code, capture) {
  const text = code.endsWith('\n') ? code.slice(0, -1) : code;
  const lines = text.split('\n');
  const tokens = highlighter.codeToTokensBase(text, { lang: sample.shiki, theme: theme.name });
  if (tokens.length !== lines.length || capture.lines.length !== lines.length) {
    throw new Error(`${sample.key}: ${lines.length} lines, Shiki ${tokens.length}, captures ${capture.lines.length}`);
  }
  const records = [];
  lines.forEach((line, row) => {
    const [length, ...runs] = capture.lines[row];
    if (length !== line.length) throw new Error(`${sample.key}:${row + 1}: captures were taken from different text`);
    const colors = [];
    const styles = [];
    for (const token of tokens[row]) {
      const color = opaqueHex(token.color ?? theme.foreground, theme.background);
      for (let i = 0; i < token.content.length; i++) {
        colors.push(color);
        styles.push(Math.max(0, token.fontStyle ?? 0));
      }
    }
    if (colors.length !== line.length) throw new Error(`${sample.key}:${row + 1}: Shiki tokens do not cover the line`);
    const names = new Array(line.length).fill(null);
    for (let i = 0; i < runs.length; i += 3) names.fill(capture.names[runs[i + 2]], runs[i], runs[i + 1]);
    for (let column = 0; column < line.length; column++) {
      const unit = line.charCodeAt(column);
      if (/\s/.test(line[column]) || (unit >= 0xdc00 && unit <= 0xdfff)) continue;
      records.push({
        row,
        column,
        sample: sample.key,
        language: sample.parser,
        char: String.fromCodePoint(line.codePointAt(column)),
        name: names[column],
        color: colors[column],
        style: styles[column],
      });
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

/** Counts of VS Code colors and styles per combination: `Map<"lang\tcapture", { color: Map, style: Map }>`. */
export function tally(records, into = new Map()) {
  for (const { name, color, style, language } of records) {
    const { lang, capture } = splitName(name, language);
    const key = `${lang}\t${capture}`;
    const counts = into.get(key) ?? { color: new Map(), style: new Map() };
    counts.color.set(color, (counts.color.get(color) ?? 0) + 1);
    counts.style.set(style, (counts.style.get(style) ?? 0) + 1);
    into.set(key, counts);
  }
  return into;
}

/** The value with the most characters; ties go to the smaller one so the result never depends on order. */
export function majority(counts) {
  return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
}

/**
 * Everything the generator and the reports need for one theme: `language[parser][capture] = { fg, style }`
 * (style is a bit set, see FONT_STYLES) and the raw counts. Languages in REUSED_STATISTICS copy a measured one.
 */
export async function themeTargets(highlighter, slug, captures) {
  const theme = await loadTheme(highlighter, slug);
  const counts = new Map();
  for (const sample of STATS_SAMPLES) {
    const code = fs.readFileSync(path.join(STATS_DIR, sample.file), 'utf8');
    tally(joinChars(highlighter, theme, sample, code, captures[sample.key]), counts);
  }
  const language = {};
  for (const [key, group] of [...counts].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const [lang, capture] = key.split('\t');
    if (capture === NO_CAPTURE) continue;
    (language[lang] ??= {})[capture] = { fg: majority(group.color), style: majority(group.style) };
  }
  for (const [reusing, measured] of Object.entries(REUSED_STATISTICS)) language[reusing] = structuredClone(language[measured]);
  return { language, counts };
}
