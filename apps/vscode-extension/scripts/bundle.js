#!/usr/bin/env node
/*
 * Bundles the extension entry points with esbuild (VS Code's recommended
 * packaging). `tsc` still type-checks and emits out/ for tests; this step then
 * replaces out/extension.js and out/uninstall.js with minified single files.
 * Workspace packages such as @woodfish/theme-core are bundled from source, so the
 * VSIX is self-contained and does not need node_modules or the monorepo.
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
    conditions: ['source'],
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
