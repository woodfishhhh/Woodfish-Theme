#!/usr/bin/env node
// Renders every colorscheme in Neovim (Treesitter + :TOhtml) and in VS Code's own theme engine (Shiki),
// scores them against each other and writes the comparison pictures and report.
//   node scripts/compare.mjs [--out <dir>] [--only <slug>] [--lines <n>] [--no-screenshots]
// Needs Neovim 0.11+, git, a C compiler (first run), and Chrome or Edge for the pictures (headless, no window).
// The report records the commit it ran on and whether the tree was clean.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyze, attachRendered, parseTohtml } from './lib/analysis.mjs';
import { renderMarkdown } from './lib/report.mjs';
import { ensureTreesitterRuntime, nvimBinary, nvimVersion, runNvim } from './lib/nvim-env.mjs';
import { COMPARE_DIR, COMPARE_SAMPLES, REUSED_STATISTICS, ROOT, STATS_DIR, STATS_SAMPLES, WOODFISH_PALETTES } from './lib/shared.mjs';
import { createShiki, joinChars, loadCaptures, loadTheme, themeTargets } from './lib/targets.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const OUT = path.resolve(option('--out', path.join(os.tmpdir(), 'wf-neovim')));
const ONLY = option('--only', null);
const EXCERPT = Number(option('--lines', 30));
const REUSED_EXCERPT = Math.min(EXCERPT, 24);
const SCREENSHOTS = !args.includes('--no-screenshots');
const LINE_HEIGHT = 20;

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' }).trim();
const percent = (part, whole) => (whole === 0 ? 100 : Math.round((part / whole) * 10000) / 100);
const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isReused = (sample) => sample.parser in REUSED_STATISTICS;
const excerptLines = (sample) => (isReused(sample) ? REUSED_EXCERPT : EXCERPT);

function findBrowser() {
  const found = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((candidate) => candidate && fs.existsSync(candidate));
  if (!found) throw new Error('Chrome / Edge not found; set CHROME_PATH or pass --no-screenshots');
  return found;
}

/** Treesitter captures of the comparison samples (not committed: they are only used for this report). */
function captureSamples(nvim, runtime, scratch) {
  const result = {};
  for (const { key, file, parser } of COMPARE_SAMPLES) {
    const out = path.join(scratch, `capture-${key}.json`);
    runNvim(nvim, runtime, path.join(ROOT, 'scripts', 'nvim', 'capture.lua'), [out, path.join(COMPARE_DIR, file), parser]);
    result[key] = JSON.parse(fs.readFileSync(out, 'utf8'));
  }
  return result;
}

function renderTheme(nvim, runtime, slug, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const specs = [];
  for (const [corpus, folder, samples] of [['stats', STATS_DIR, STATS_SAMPLES], ['compare', COMPARE_DIR, COMPARE_SAMPLES]]) {
    for (const { key, file, parser } of samples) specs.push(`${corpus}-${key}`, parser, path.join(folder, file));
  }
  runNvim(nvim, runtime, path.join(ROOT, 'scripts', 'nvim', 'render.lua'), [`woodfish-${slug}`, dir, ...specs]);
}

function pictureHtml({ palette, theme, rendered, highlighter, meta, summary }) {
  let styles = '';
  const rows = COMPARE_SAMPLES.map((sample) => {
    const html = fs.readFileSync(rendered[sample.key].file, 'utf8');
    styles += [...html.matchAll(/^\.[^\s{]+\s*\{[^}]*\}/gm)].map((m) => m[0]).join('\n') + '\n';
    const body = html.slice(html.indexOf('<pre>') + 5, html.lastIndexOf('</pre>')).replace(/^\n/, '');
    const shown = excerptLines(sample);
    const source = fs.readFileSync(path.join(COMPARE_DIR, sample.file), 'utf8').split('\n');
    const total = source.length - (source.at(-1) === '' ? 1 : 0);
    const scored = summary.byLanguage[sample.key];
    const shiki = highlighter.codeToHtml(source.slice(0, shown).join('\n'), { lang: sample.shiki, theme: theme.name });
    const note = isReused(sample) ? ' · colors reused from typescript' : '';
    const colors = `${scored.consistency}% of all ${scored.chars} characters match in color, ${scored.styleConsistency}% in font style`;
    const { background, foreground } = rendered[sample.key];
    return `<section><h2>${sample.file} <small>lines 1–${Math.min(shown, total)} of ${total} · ${colors}${note}</small></h2>
<div class="row" style="--h:${shown * LINE_HEIGHT + 16}px"><div class="pane"><div class="cap">Neovim · Treesitter · :TOhtml</div><pre class="nv" style="background:${background};color:${foreground}">${body.split('\n').slice(0, shown).join('\n')}</pre></div>
<div class="pane"><div class="cap">VS Code · theme engine (Shiki)</div>${shiki}</div></div></section>`;
  });
  return `<!doctype html><meta charset="utf-8"><title>${escapeHtml(palette.label)}</title><style>
${styles}
html,body{margin:0;background:#0d0f14;color:#c9d1e0;font:13px/1.4 "Segoe UI",sans-serif}
body{padding:18px 22px;width:1756px}
h1{font-size:20px;margin:0 0 4px}.meta{color:#8691a7;margin:0 0 14px;font-size:12px}
h2{font-size:14px;margin:12px 0 6px}h2 small{font-weight:400;color:#8691a7;margin-left:8px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pane{min-width:0;border:1px solid #2a3040;border-radius:4px;overflow:hidden}
.cap{padding:4px 10px;background:#161a23;color:#8f9ab0;font-size:12px;font-weight:600}
pre.nv,pre.shiki{height:var(--h);margin:0!important;padding:8px 12px!important;box-sizing:border-box;overflow:hidden;white-space:pre!important;font:12.5px/${LINE_HEIGHT}px "Cascadia Code","Cascadia Mono",Consolas,monospace!important;border-radius:0!important}
</style>
<h1>${escapeHtml(palette.label)}: Neovim / VS Code</h1>
<p class="meta">commit ${meta.commit}${meta.dirty ? ' (dirty tree)' : ''} · generated ${meta.generatedAt} · ${escapeHtml(meta.neovim)} · Shiki ${meta.shiki}.
Held-out samples, the seven measured languages: ${summary.consistency}% of ${summary.chars} characters get the same color and ${summary.styleConsistency}% the same font style; mapping errors ${summary.mappingErrors} (statistics samples: ${summary.statsMappingErrors}).
javascript / jsx / tsx reuse the typescript statistics: ${summary.reusedConsistency}% of ${summary.reusedChars} characters match in color.
The right side is VS Code's TextMate theme engine without language-server semantic tokens.</p>
${rows.join('\n')}`;
}

function screenshot(browser, htmlFile, png, width, height) {
  fs.rmSync(png, { force: true });
  execFileSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      '--virtual-time-budget=2000',
      `--user-data-dir=${path.join(os.tmpdir(), 'wf-compare-profile')}`,
      `--screenshot=${png}`,
      pathToFileURL(htmlFile).href,
    ],
    { stdio: 'ignore' }
  );
  if (!fs.existsSync(png)) throw new Error(`browser did not write ${png}`);
}

function formatDistribution(distribution, chars) {
  return distribution.map(([value, count]) => `${value} ${percent(count, chars)}%`).join(' / ');
}

async function main() {
  const startedAt = new Date();
  const commit = git('rev-parse', 'HEAD');
  const dirty = git('status', '--porcelain').split('\n').filter(Boolean);
  const meta = { commit, dirty: dirty.length > 0, dirtyFiles: dirty, generatedAt: startedAt.toISOString() };
  const nvim = nvimBinary();
  const runtime = ensureTreesitterRuntime();
  meta.neovim = nvimVersion(nvim);
  meta.shiki = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'shiki', 'package.json'), 'utf8')).version;
  const browser = SCREENSHOTS ? findBrowser() : null;
  fs.mkdirSync(OUT, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-compare-'));

  const highlighter = await createShiki();
  const statsCaptures = loadCaptures();
  const compareCaptures = captureSamples(nvim, runtime, scratch);
  const palettes = WOODFISH_PALETTES.filter((palette) => !ONLY || palette.slug === ONLY);
  runNvim(nvim, runtime, path.join(ROOT, 'scripts', 'nvim', 'smoke.lua'), palettes.map((palette) => palette.slug));
  const report = { ...meta, excerptLines: EXCERPT, reusedExcerptLines: REUSED_EXCERPT, loadCheck: `${palettes.length} colorschemes loaded headless without errors`, themes: [] };

  for (const palette of palettes) {
    const theme = await loadTheme(highlighter, palette.slug);
    const targets = await themeTargets(highlighter, palette.slug, statsCaptures);
    const dir = path.join(scratch, palette.slug);
    renderTheme(nvim, runtime, palette.slug, dir);

    const statsRecords = [];
    const heldRecords = [];
    const rendered = {};
    for (const sample of STATS_SAMPLES) {
      const parsed = parseTohtml(fs.readFileSync(path.join(dir, `stats-${sample.key}.html`), 'utf8'));
      const code = fs.readFileSync(path.join(STATS_DIR, sample.file), 'utf8');
      statsRecords.push(...attachRendered(joinChars(highlighter, theme, sample, code, statsCaptures[sample.key]), parsed, `stats ${sample.key}`));
    }
    for (const sample of COMPARE_SAMPLES) {
      const file = path.join(dir, `compare-${sample.key}.html`);
      const parsed = parseTohtml(fs.readFileSync(file, 'utf8'));
      rendered[sample.key] = { file, ...parsed };
      const code = fs.readFileSync(path.join(COMPARE_DIR, sample.file), 'utf8');
      heldRecords.push(...attachRendered(joinChars(highlighter, theme, sample, code, compareCaptures[sample.key]), parsed, `samples ${sample.key}`));
    }
    const stats = analyze(statsRecords, targets.language);
    const held = analyze(heldRecords, targets.language);

    const rate = (records, test) => percent(records.filter(test).length, records.length);
    const sameColor = (record) => record.nvim === record.color;
    const sameStyle = (record) => record.nvimStyle === record.style;
    const reusedKeys = new Set(COMPARE_SAMPLES.filter(isReused).map((sample) => sample.key));
    const measured = heldRecords.filter((record) => !reusedKeys.has(record.sample));
    const reused = heldRecords.filter((record) => reusedKeys.has(record.sample));
    const byLanguage = Object.fromEntries(
      COMPARE_SAMPLES.map((sample) => {
        const own = heldRecords.filter((record) => record.sample === sample.key);
        return [sample.key, { chars: own.length, consistency: rate(own, sameColor), styleConsistency: rate(own, sameStyle), reused: reusedKeys.has(sample.key) }];
      })
    );
    const describe = (group) => ({
      ...group,
      distribution: formatDistribution(group.distribution, group.chars),
      styleDistribution: formatDistribution(group.styleDistribution, group.chars),
    });
    const summary = {
      slug: palette.slug,
      label: palette.label,
      chars: measured.length,
      consistency: rate(measured, sameColor),
      styleConsistency: rate(measured, sameStyle),
      reusedChars: reused.length,
      reusedConsistency: rate(reused, sameColor),
      reusedStyleConsistency: rate(reused, sameStyle),
      statsChars: stats.chars,
      statsConsistency: percent(stats.hits, stats.chars),
      statsStyleConsistency: percent(stats.styleHits, stats.chars),
      statsMappingErrors: stats.mappingErrors.length,
      statsMixedGroups: stats.mixedGroups.length,
      mappingErrors: held.mappingErrors.length,
      mappingErrorChars: held.mappingErrorChars,
      uncoveredChars: held.uncoveredChars,
      unsplittableChars: held.unsplittableChars,
      flippedGroups: held.unsplittable.filter((group) => group.flipped).length,
      byLanguage,
      statsMappingErrorGroups: stats.mappingErrors.map(describe),
      statsMixedGroupList: stats.mixedGroups.map(describe),
      mappingErrorGroups: held.mappingErrors.map(describe),
      styleOverlaps: held.styleOverlaps.map(describe),
      uncovered: held.uncovered.map(describe),
      unsplittable: held.unsplittable.map(describe),
    };
    report.themes.push(summary);

    const page = path.join(OUT, `compare-${palette.slug}.html`);
    fs.writeFileSync(page, pictureHtml({ palette, theme, rendered, highlighter, meta, summary }));
    if (SCREENSHOTS) {
      const height = 140 + COMPARE_SAMPLES.reduce((sum, sample) => sum + excerptLines(sample) * LINE_HEIGHT + 100, 0);
      screenshot(browser, page, path.join(OUT, `compare-${palette.slug}.png`), 1800, height);
    }
    console.log(
      `${palette.slug}: color ${summary.consistency}% style ${summary.styleConsistency}% (7 measured), js/jsx/tsx ${summary.reusedConsistency}%; mapping errors ${summary.statsMappingErrors} (stats) / ${summary.mappingErrors} (held-out)`
    );
  }

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'report.md'), renderMarkdown(report));
  fs.rmSync(scratch, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
