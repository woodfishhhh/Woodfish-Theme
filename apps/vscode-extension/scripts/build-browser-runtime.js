#!/usr/bin/env node
/*
 * Builds the workbench renderer scripts from browser/*.ts into self-contained IIFEs.
 *
 *   node scripts/build-browser-runtime.js          write themes/shared/*.js
 *   node scripts/build-browser-runtime.js --check  fail if the committed output is stale
 *
 * The output is committed (like the generated themes) because the extension reads it
 * from disk at runtime and the tests inspect it. `@woodfish/theme-core` is inlined, so
 * changing the shared core shows up here and in CI.
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { EXTENSION_ROOT } = require('./paths');

const VERSION = JSON.parse(
  fs.readFileSync(path.join(EXTENSION_ROOT, 'package.json'), 'utf8')
).version;

const BROWSER_ENTRIES = [
  {
    source: 'browser/overlay-bootstrap.ts',
    output: 'themes/shared/overlay-bootstrap.js',
  },
];

// VS Code 1.74 (the minimum engine) ships Electron 19 / Chromium 102.
const BROWSER_TARGET = 'chrome102';

async function buildEntry(entry) {
  const result = await esbuild.build({
    absWorkingDir: EXTENSION_ROOT,
    entryPoints: [entry.source],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: BROWSER_TARGET,
    conditions: ['source'],
    define: { __WOODFISH_VERSION__: JSON.stringify(VERSION) },
    banner: {
      js: `/* Generated from ${entry.source} by scripts/build-browser-runtime.js. Do not edit. */`,
    },
    charset: 'utf8',
    legalComments: 'none',
    logLevel: 'warning',
  });
  return result.outputFiles[0].text;
}

async function main() {
  const check = process.argv.includes('--check');
  let stale = false;

  for (const entry of BROWSER_ENTRIES) {
    const content = await buildEntry(entry);
    const outputPath = path.join(EXTENSION_ROOT, entry.output);
    if (check) {
      const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;
      if (current !== content) {
        stale = true;
        console.error(`✗ ${entry.output} is out of date; run pnpm runtime:build`);
      }
      continue;
    }
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`✓ ${entry.output}`);
  }

  process.exitCode = stale ? 1 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { BROWSER_ENTRIES, buildEntry };
