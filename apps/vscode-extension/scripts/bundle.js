#!/usr/bin/env node
/*
 * Bundles the extension entry points with esbuild (VS Code's recommended
 * packaging). `tsc` still type-checks and emits out/ for tests; this step then
 * replaces out/extension.js and out/uninstall.js with minified single files and
 * copies in the Codex desktop CLI as out/woodfish.js.
 * Workspace packages such as @woodfish/theme-core are bundled from source, so the
 * VSIX is self-contained and does not need node_modules or the monorepo.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
// The shipped effect plugins, copied into the user's effects folder at activation.
const { readBuiltinEffectFiles } = require(
  path.resolve(ROOT, '..', '..', 'packages', 'effects', 'scripts', 'files.js')
);
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
    define: { __WOODFISH_BUILTIN_EFFECTS__: JSON.stringify(readBuiltinEffectFiles()) },
    minify: production,
    sourcemap: !production,
    legalComments: 'none',
    logLevel: 'info',
  });
  bundleCodexCli();
}

/**
 * The Codex desktop CLI (apps/desktop-cli), built the same way as for npm and the GitHub
 * Release and shipped as out/woodfish.js. 「为 Codex 启用 Woodfish」 runs it on the editor's
 * own Electron (src/services/codexCli.ts).
 */
function bundleCodexCli() {
  const cliRoot = path.resolve(ROOT, '..', 'desktop-cli');
  execFileSync(process.execPath, [path.join(cliRoot, 'scripts', 'build.js')], { stdio: 'inherit' });
  fs.copyFileSync(path.join(cliRoot, 'out', 'woodfish.js'), path.join(ROOT, 'out', 'woodfish.js'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
