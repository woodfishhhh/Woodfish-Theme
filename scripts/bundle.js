#!/usr/bin/env node
/*
 * Bundles the extension entry points with esbuild (VS Code's recommended
 * packaging). `tsc` still type-checks and emits out/ for tests; this step then
 * replaces out/extension.js and out/uninstall.js with minified single files.
 */
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const production = !process.argv.includes('--dev');

async function main() {
  await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: {
      extension: 'src/extension.ts',
      uninstall: 'src/uninstall.ts',
    },
    outdir: 'out',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['vscode'],
    minify: production,
    sourcemap: !production,
    legalComments: 'none',
    logLevel: 'info',
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
