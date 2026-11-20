#!/usr/bin/env node
// Records which Treesitter capture Neovim paints each character of stats-samples/ with.
//   node scripts/capture.mjs     (needs Neovim 0.11+, git and a C compiler; run when a sample or the pinned parsers change)
// The result is committed (scripts/captures/*.json) so `nvim:generate` / `nvim:check` need neither Neovim nor a compiler.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureTreesitterRuntime, nvimBinary, nvimVersion, runNvim } from './lib/nvim-env.mjs';
import { CAPTURES_DIR, LANGUAGES, ROOT, STATS_DIR } from './lib/shared.mjs';

const nvim = nvimBinary();
const runtime = ensureTreesitterRuntime();
const version = nvimVersion(nvim);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-capture-'));
fs.mkdirSync(CAPTURES_DIR, { recursive: true });

for (const [language, name] of Object.entries(LANGUAGES)) {
  const file = path.join(STATS_DIR, name);
  const raw = path.join(scratch, `${language}.json`);
  runNvim(nvim, runtime, path.join(ROOT, 'scripts', 'nvim', 'capture.lua'), [raw, file, language]);
  const { names, lines } = JSON.parse(fs.readFileSync(raw, 'utf8'));
  const body = [
    '{',
    `  "language": ${JSON.stringify(language)},`,
    `  "sha256": ${JSON.stringify(createHash('sha256').update(fs.readFileSync(file)).digest('hex'))},`,
    `  "neovim": ${JSON.stringify(version)},`,
    `  "names": ${JSON.stringify(names)},`,
    '  "lines": [',
    lines.map((line) => `    ${JSON.stringify(line)}`).join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(CAPTURES_DIR, `${language}.json`), body);
  console.log(`captured ${language}: ${lines.length} lines, ${names.length} capture names`);
}
fs.rmSync(scratch, { recursive: true, force: true });
