#!/usr/bin/env node
// Logic checks for the generator and the comparison helpers. Needs neither Neovim nor a browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generatedFiles, isStale, run, selectedPalettes } from './generate.mjs';
import { analyze, attachRendered, parseTohtml } from './lib/analysis.mjs';
import { CAPTURES_DIR, LANGUAGES, ROOT, STATS_DIR } from './lib/shared.mjs';
import { createShiki, joinChars, loadCaptures, loadTheme, majority, splitName } from './lib/targets.mjs';

const hex = /^#[0-9A-F]{6}$/;
const palettes = await selectedPalettes();
assert.equal(palettes.length, 15);

// Every palette has well-formed colors, 16 terminal colors and a color for each measured capture.
for (const palette of palettes) {
  for (const color of [...Object.values(palette.ui), ...Object.values(palette.tokens), ...palette.ansi]) {
    assert.match(color, hex, `${palette.slug}: ${color}`);
  }
  assert.equal(palette.ansi.length, 16, `${palette.slug} terminal colors`);
  const languages = Object.keys(palette.language);
  for (const language of [...Object.keys(LANGUAGES), 'markdown_inline']) {
    assert.ok(languages.includes(language), `${palette.slug} has no colors for ${language}`);
  }
  for (const [language, captures] of Object.entries(palette.language)) {
    assert.ok(Object.keys(captures).length > 0, `${palette.slug} ${language} is empty`);
    for (const [capture, color] of Object.entries(captures)) {
      assert.match(capture, /^[a-z]+(\.[a-z0-9_]+)*$/, `${palette.slug} ${language} capture name ${capture}`);
      assert.match(color, hex, `${palette.slug} @${capture}.${language}`);
    }
  }
}

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
for (const needle of ['DiagnosticError', '@lsp.type.function', 'apply_languages(palette.language', 'terminal_color_']) {
  assert.ok(init.includes(needle), `init.lua lacks ${needle}`);
}
assert.ok(!init.includes('nvim_create_autocmd("FileType"'), 'language colors must not depend on autocommands');

// Committed captures are tied to the statistics samples they were taken from.
const captures = loadCaptures();
for (const [language, sample] of Object.entries(LANGUAGES)) {
  const lines = fs.readFileSync(path.join(STATS_DIR, sample), 'utf8').trimEnd().split('\n');
  assert.ok(lines.length >= 100, `${sample}: statistics samples need 100+ lines, has ${lines.length}`);
  assert.equal(captures[language].lines.length, lines.length);
  const compare = fs.readFileSync(path.join(ROOT, 'samples', sample), 'utf8').trimEnd().split('\n');
  assert.ok(compare.length >= 100, `${sample}: comparison samples need 100+ lines, has ${compare.length}`);
  assert.notEqual(compare.join('\n'), lines.join('\n'), `${sample}: comparison and statistics samples must differ`);
}
const stale = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-nvim-captures-'));
for (const file of fs.readdirSync(CAPTURES_DIR)) fs.copyFileSync(path.join(CAPTURES_DIR, file), path.join(stale, file));
fs.writeFileSync(path.join(stale, 'go.json'), fs.readFileSync(path.join(stale, 'go.json'), 'utf8').replace(/"sha256": "[0-9a-f]+"/, '"sha256": "0"'));
assert.throws(() => loadCaptures(stale), /go captures are stale/);
fs.rmSync(stale, { recursive: true, force: true });

// Majority color: most characters win, ties go to the smaller color string.
assert.equal(majority(new Map([['#222222', 2], ['#111111', 5], ['#333333', 5]])), '#111111');
assert.deepEqual(splitName('typescript:keyword.function', 'markdown'), { lang: 'typescript', capture: 'keyword.function' });
assert.deepEqual(splitName(null, 'markdown'), { lang: 'markdown', capture: '' });

// Joining VS Code colors with captures, one record per non-blank character (an astral character counts once).
const shiki = await createShiki();
const theme = await loadTheme(shiki, 'dark');
const code = 'const s = "\u{1F600}";\n';
const records = joinChars(shiki, theme, 'typescript', code, {
  names: ['typescript:keyword', 'typescript:string'],
  lines: [[code.length - 1, 0, 5, 0, 10, 14, 1]],
});
assert.deepEqual(records.map((r) => r.char).join(''), 'consts="\u{1F600}";');
assert.equal(records.filter((r) => r.name === 'typescript:keyword').length, 5);
assert.equal(records.filter((r) => r.name === 'typescript:string').length, 3);
assert.equal(records[0].name, 'typescript:keyword');
assert.equal(records[5].char, 's');
assert.equal(records[5].name, null, 'characters outside every run have no capture');
assert.throws(() => joinChars(shiki, theme, 'typescript', code, { names: [], lines: [[3]] }), /different text/);

// Reading :TOhtml output: the innermost colored span wins, entities and blanks are handled.
const html = `<style>
body {background-color: #101010; color: #eeeeee}
.-a {color: #ff0000}
.-b {color: #00ff00}
.-c {font-weight: bold}
</style>
<pre>
<span class="-a">x <span class="-b">y</span>&lt;<span class="-c">z</span></span>
 plain
</pre>`;
const parsed = parseTohtml(html);
assert.equal(parsed.background, '#101010');
assert.deepEqual(parsed.lines[0].map((c) => [c.char, c.color]), [['x', '#FF0000'], ['y', '#00FF00'], ['<', '#FF0000'], ['z', '#FF0000']]);
assert.deepEqual(parsed.lines[1].map((c) => [c.char, c.color]), [['p', '#EEEEEE'], ['l', '#EEEEEE'], ['a', '#EEEEEE'], ['i', '#EEEEEE'], ['n', '#EEEEEE']]);
const aligned = attachRendered([{ row: 0, char: 'x' }], { lines: [[{ char: 'x', color: '#FF0000' }]] }, 'fixture');
assert.equal(aligned[0].nvim, '#FF0000');
assert.throws(() => attachRendered([{ row: 0, char: 'x' }], { lines: [[{ char: 'y', color: '#FF0000' }]] }, 'fixture'), /painted y/);
assert.throws(() => attachRendered([{ row: 0, char: 'x' }], { lines: [[{ char: 'x', color: '#FF0000' }, { char: 'z', color: '#FF0000' }]] }, 'fixture'), /painted 2 characters/);

// Scoring: hit, mapping error, uncovered and unsplittable are told apart.
const rec = (name, color, nvim) => ({ language: 'typescript', name, color, nvim });
const scored = analyze(
  [
    ...[1, 2, 3, 4].map(() => rec('typescript:keyword', '#AA0000', '#AA0000')), // chosen = majority: all hits
    ...[1, 2, 3].map(() => rec('typescript:type', '#00AA00', '#00AA00')), // split: 3 hits, 1 miss
    rec('typescript:type', '#0000AA', '#00AA00'),
    ...[1, 2].map(() => rec('typescript:string', '#111111', '#222222')), // painted in a color VS Code barely uses
    rec('typescript:string', '#222222', '#222222'),
    rec('typescript:number', '#333333', '#444444'), // never measured
    rec(null, '#555555', '#666666'), // no capture
  ],
  { typescript: { keyword: '#AA0000', type: '#00AA00', string: '#111111' } }
);
assert.equal(scored.chars, 13);
assert.equal(scored.hits, 8);
assert.deepEqual(scored.mappingErrors.map((g) => g.capture), ['string']);
assert.deepEqual(scored.uncovered.map((g) => g.capture), ['number']);
assert.deepEqual(scored.unsplittable.map((g) => g.capture).sort(), ['', 'type']);
assert.equal(scored.mappingErrorChars, 2);
assert.equal(scored.unsplittableChars, 2);
assert.equal(scored.uncoveredChars, 1);
assert.equal(scored.unsplittable.find((g) => g.capture === 'type').flipped, false);

console.log('✓ Neovim generator logic checks passed');
