#!/usr/bin/env node
// Logic checks for the generator and the comparison helpers. Needs neither Neovim nor a browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generatedFiles, isStale, run, selectedPalettes } from './generate.mjs';
import { analyze, attachRendered, parseTohtml } from './lib/analysis.mjs';
import { CAPTURES_DIR, COMPARE_SAMPLES, REUSED_STATISTICS, ROOT, STATS_DIR, STATS_SAMPLES } from './lib/shared.mjs';
import { createShiki, joinChars, loadCaptures, loadTheme, majority, splitName, themeTargets } from './lib/targets.mjs';

const hex = /^#[0-9A-F]{6}$/;
const palettes = await selectedPalettes();
assert.equal(palettes.length, 15);

// Every palette has well-formed colors, 16 terminal colors and a color for each measured capture.
const entryColor = (value) => (typeof value === 'string' ? value : value.fg);
for (const palette of palettes) {
  for (const color of [...Object.values(palette.ui), ...Object.values(palette.tokens), ...palette.ansi]) {
    assert.match(color, hex, `${palette.slug}: ${color}`);
  }
  assert.equal(palette.ansi.length, 16, `${palette.slug} terminal colors`);
  const languages = Object.keys(palette.language);
  for (const language of [...STATS_SAMPLES.map((sample) => sample.parser), 'markdown_inline', ...Object.keys(REUSED_STATISTICS)]) {
    assert.ok(languages.includes(language), `${palette.slug} has no colors for ${language}`);
  }
  for (const [language, captures] of Object.entries(palette.language)) {
    assert.ok(Object.keys(captures).length > 0, `${palette.slug} ${language} is empty`);
    for (const [capture, value] of Object.entries(captures)) {
      assert.match(capture, /^[a-z]+(\.[a-z0-9_]+)*$/, `${palette.slug} ${language} capture name ${capture}`);
      assert.match(entryColor(value), hex, `${palette.slug} @${capture}.${language}`);
      if (typeof value === 'object') {
        const attributes = Object.keys(value).filter((name) => name !== 'fg');
        assert.ok(attributes.length > 0 && attributes.every((name) => ['italic', 'bold', 'underline', 'strikethrough'].includes(name)), `${palette.slug} @${capture}.${language} attributes`);
      }
    }
  }
  for (const [reusing, measured] of Object.entries(REUSED_STATISTICS)) {
    assert.deepEqual(palette.language[reusing], palette.language[measured], `${palette.slug}: ${reusing} must equal ${measured}`);
  }
}
const dracula = palettes.find((palette) => palette.slug === 'dracula');
assert.ok(Object.values(dracula.language.typescript).some((value) => typeof value === 'object' && value.italic), 'Dracula italicizes some TypeScript captures');

// Generated files: every one exists in the tree, and --check notices drift and missing files.
const files = await generatedFiles();
assert.equal(files.size, palettes.length + 2);
for (const [relative, text] of files) {
  assert.ok(fs.existsSync(path.join(ROOT, relative)), `missing generated file ${relative}`);
  assert.equal(isStale(text, text), false);
  assert.equal(isStale(`${text}\n`, text), true);
  assert.equal(isStale(text.replace(/\n/g, '\r\n'), text), false, 'CRLF checkouts are not stale');
}
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-nvim-test-'));
const quiet = console.log;
console.log = () => {};
await run(false, scratch);
await run(true, scratch);
const [victim] = [...files.keys()].filter((relative) => relative.startsWith('colors/'));
fs.appendFileSync(path.join(scratch, victim), '-- drift\n');
await assert.rejects(() => run(true, scratch), /stale/);
fs.rmSync(path.join(scratch, 'lua', 'woodfish', 'palettes.lua'));
await assert.rejects(() => run(true, scratch), /palettes\.lua is stale/);
console.log = quiet;
fs.rmSync(scratch, { recursive: true, force: true });

// The Lua side: the pieces the generated data depends on.
const init = fs.readFileSync(path.join(ROOT, 'lua', 'woodfish', 'init.lua'), 'utf8');
for (const needle of ['DiagnosticError', '@lsp.type.function', 'apply_languages(palette.language)', 'terminal_color_']) {
  assert.ok(init.includes(needle), `init.lua lacks ${needle}`);
}
assert.ok(!init.includes('nvim_create_autocmd("FileType"'), 'language colors must not depend on autocommands');

// Samples: 100+ lines each, and the comparison samples are not the statistics samples.
const linesOf = (file) => fs.readFileSync(file, 'utf8').trimEnd().split('\n');
for (const sample of STATS_SAMPLES) {
  const stats = linesOf(path.join(STATS_DIR, sample.file));
  const compare = linesOf(path.join(ROOT, 'samples', sample.file));
  assert.ok(stats.length >= 100, `${sample.file}: statistics samples need 100+ lines, has ${stats.length}`);
  assert.ok(compare.length >= 100, `${sample.file}: comparison samples need 100+ lines, has ${compare.length}`);
  assert.notEqual(compare.join('\n'), stats.join('\n'), `${sample.file}: comparison and statistics samples must differ`);
}
for (const sample of COMPARE_SAMPLES) assert.ok(fs.existsSync(path.join(ROOT, 'samples', sample.file)), `missing samples/${sample.file}`);

// Committed captures are tied to the statistics samples they were taken from.
const captures = loadCaptures();
for (const sample of STATS_SAMPLES) {
  assert.equal(captures[sample.key].lines.length, linesOf(path.join(STATS_DIR, sample.file)).length);
}
const stale = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-nvim-captures-'));
for (const file of fs.readdirSync(CAPTURES_DIR)) fs.copyFileSync(path.join(CAPTURES_DIR, file), path.join(stale, file));
fs.writeFileSync(path.join(stale, 'go.json'), fs.readFileSync(path.join(stale, 'go.json'), 'utf8').replace(/"sha256": "[0-9a-f]+"/, '"sha256": "0"'));
assert.throws(() => loadCaptures(stale), /go captures are stale/);
fs.rmSync(stale, { recursive: true, force: true });

// Majority: most characters win, ties go to the smaller value.
assert.equal(majority(new Map([['#222222', 2], ['#111111', 5], ['#333333', 5]])), '#111111');
assert.equal(majority(new Map([[0, 3], [1, 4]])), 1);
assert.deepEqual(splitName('typescript:keyword.function', 'markdown'), { lang: 'typescript', capture: 'keyword.function' });
assert.deepEqual(splitName(null, 'markdown'), { lang: 'markdown', capture: '' });

// Joining VS Code colors and styles with captures, one record per non-blank character (an astral character counts once).
const shiki = await createShiki();
const dark = await loadTheme(shiki, 'dark');
const typescript = STATS_SAMPLES.find((sample) => sample.key === 'typescript');
const code = 'const s = "\u{1F600}";\n';
const records = joinChars(shiki, dark, typescript, code, {
  names: ['typescript:keyword', 'typescript:string'],
  lines: [[code.length - 1, 0, 5, 0, 10, 14, 1]],
});
assert.deepEqual(records.map((r) => r.char).join(''), 'consts="\u{1F600}";');
assert.equal(records.filter((r) => r.name === 'typescript:keyword').length, 5);
assert.equal(records.filter((r) => r.name === 'typescript:string').length, 3);
assert.equal(records[0].name, 'typescript:keyword');
assert.equal(records[5].char, 's');
assert.equal(records[5].name, null, 'characters outside every run have no capture');
assert.throws(() => joinChars(shiki, dark, typescript, code, { names: [], lines: [[3]] }), /different text/);
// Italic text in the theme shows up as a style bit (Dracula italicizes parameters).
const draculaTargets = await themeTargets(shiki, 'dracula', captures);
assert.equal(draculaTargets.language.typescript['variable.parameter'].style, 1);
assert.equal(draculaTargets.language.typescript.function.style, 0);

// Reuse: javascript and tsx get the typescript colors of the same theme.
const targets = await themeTargets(shiki, 'dark', captures);
assert.deepEqual(targets.language.javascript, targets.language.typescript);
assert.notEqual(targets.language.javascript, targets.language.typescript, 'reused tables are copies');

// Reading :TOhtml output: the innermost colored span wins, styles add up, entities and blanks are handled.
const html = `<style>
body {background-color: #101010; color: #eeeeee}
.-a {color: #ff0000; font-style: italic}
.-b {color: #00ff00}
.-c {font-weight: bold}
</style>
<pre>
<span class="-a">x <span class="-b">y</span>&lt;<span class="-c">z</span></span>
 plain
</pre>`;
const parsed = parseTohtml(html);
assert.equal(parsed.background, '#101010');
assert.deepEqual(parsed.lines[0].map((c) => [c.char, c.color, c.style]), [['x', '#FF0000', 1], ['y', '#00FF00', 1], ['<', '#FF0000', 1], ['z', '#FF0000', 3]]);
assert.deepEqual(parsed.lines[1].map((c) => [c.char, c.color, c.style]).slice(0, 2), [['p', '#EEEEEE', 0], ['l', '#EEEEEE', 0]]);
const aligned = attachRendered([{ row: 0, char: 'x' }], { lines: [[{ char: 'x', color: '#FF0000', style: 1 }]] }, 'fixture');
assert.deepEqual([aligned[0].nvim, aligned[0].nvimStyle], ['#FF0000', 1]);
assert.throws(() => attachRendered([{ row: 0, char: 'x' }], { lines: [[{ char: 'y', color: '#FF0000', style: 0 }]] }, 'fixture'), /painted y/);
assert.throws(
  () => attachRendered([{ row: 0, char: 'x' }], { lines: [[{ char: 'x', color: '#FF0000', style: 0 }, { char: 'z', color: '#FF0000', style: 0 }]] }, 'fixture'),
  /painted 2 characters/
);

// Scoring: hit, mapping error, uncovered and unsplittable are told apart, for colors and for styles.
const rec = (name, color, nvim, style = 0, nvimStyle = 0) => ({ language: 'typescript', name, color, nvim, style, nvimStyle });
const scored = analyze(
  [
    ...[1, 2, 3, 4].map(() => rec('typescript:keyword', '#AA0000', '#AA0000')), // chosen = majority: all hits
    ...[1, 2, 3].map(() => rec('typescript:type', '#00AA00', '#00AA00', 1, 1)), // split: 3 hits, 1 miss
    rec('typescript:type', '#0000AA', '#00AA00', 1, 1),
    ...[1, 2].map(() => rec('typescript:string', '#111111', '#222222')), // painted in a color VS Code barely uses
    rec('typescript:string', '#222222', '#222222'),
    rec('typescript:number', '#333333', '#444444'), // never measured
    rec(null, '#555555', '#666666'), // no capture
    rec('typescript:comment', '#777777', '#777777', 1, 0), // right color, italic lost
  ],
  {
    typescript: {
      keyword: { fg: '#AA0000', style: 0 },
      type: { fg: '#00AA00', style: 1 },
      string: { fg: '#111111', style: 0 },
      comment: { fg: '#777777', style: 1 },
    },
  }
);
assert.equal(scored.chars, 14);
assert.equal(scored.hits, 9);
assert.equal(scored.styleHits, 13);
assert.deepEqual(scored.mappingErrors.map((g) => g.capture).sort(), ['comment', 'string']);
assert.deepEqual(scored.uncovered.map((g) => g.capture), ['number']);
assert.deepEqual(scored.unsplittable.map((g) => g.capture).sort(), ['', 'type']);
assert.equal(scored.mappingErrorChars, 2);
assert.equal(scored.unsplittableChars, 2);
assert.equal(scored.uncoveredChars, 1);
assert.equal(scored.unsplittable.find((g) => g.capture === 'type').flipped, false);

console.log('✓ Neovim generator logic checks passed');
