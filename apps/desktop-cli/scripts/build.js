#!/usr/bin/env node
/*
 * Builds the renderer bundles (Codex overlay, Codex++ user script, dsh user script) and
 * the single-file CLI.
 *
 *   node scripts/build.js           out/woodfish.js (renderer bundles built in memory)
 *   node scripts/build.js --assets  write assets/*.js (the committed renderer bundles)
 *   node scripts/build.js --check   fail if the committed assets are stale
 *
 * The default build never rewrites committed files, so `--check` after a compile still
 * catches renderer changes that were not regenerated.
 *
 * The assets are committed (like the VS Code bootstrap) so changes to the shared packages
 * show up in review. Their build id is a hash of the renderer sources each bundle is
 * made from, so identical sources always produce identical files.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const APP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..', '..');
const CODEX_PACKAGES = ['theme-core', 'renderer-runtime', 'adapter-codex'];
const DSH_PACKAGES = ['theme-core', 'renderer-runtime', 'adapter-dsh'];
// Chromium 155 ships in the tested Codex build; target an older baseline for safety.
const BROWSER_TARGET = 'chrome120';

/*
 * The default background 《彩云》 (by woodfish), committed once in renderer-runtime. The
 * CLI serves it to the CDP overlay on request; the Codex++ user script has no watcher, so
 * it carries the picture itself. The CDP overlay never inlines it, so re-injecting on a
 * settings change stays small.
 */
const DEFAULT_BACKGROUND_BASE64 = fs
  .readFileSync(path.join(REPO_ROOT, 'packages', 'renderer-runtime', 'assets', 'caiyun.webp'))
  .toString('base64');

/*
 * The shipped effect plugins (packages/effects/builtin), copied into the user's effects
 * folder by the CLI. They run in the page from that folder, so they are not part of the
 * overlay bundle or its build id.
 */
const { readBuiltinEffectFiles } = require(
  path.join(REPO_ROOT, 'packages', 'effects', 'scripts', 'files.js')
);

const DSH_VERSION = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'packages', 'adapter-dsh', 'package.json'), 'utf8')
).version;

/*
 * Header of the dsh user script. dsh serves its Web UI on loopback (port 3080 by default,
 * any port with --port); a match pattern without a port matches every port, the @include
 * globs cover managers that still compare ports. The bundle itself only starts on pages
 * that carry dsh's theme bootstrap marker.
 */
const DSH_USERSCRIPT_HEADER = [
  '// ==UserScript==',
  '// @name         Woodfish for DeepSeek Harness',
  '// @namespace    https://github.com/woodfishhhh/Woodfish-Theme',
  `// @version      ${DSH_VERSION}`,
  '// @description  为 DeepSeek Harness（dsh）Web 版换上 Woodfish 配色、OKLCH 代码渐变与发光、毛玻璃浮层、强调色与彩色光标',
  '// @author       Woodfish',
  '// @homepageURL  https://github.com/woodfishhhh/Woodfish-Theme',
  '// @license      MIT',
  '// @match        http://127.0.0.1/*',
  '// @match        http://localhost/*',
  '// @match        http://[::1]/*',
  '// @match        https://127.0.0.1/*',
  '// @match        https://localhost/*',
  '// @include      http://127.0.0.1:*/*',
  '// @include      http://localhost:*/*',
  '// @run-at       document-end',
  '// @noframes',
  '// @grant        GM_registerMenuCommand',
  '// @grant        GM_unregisterMenuCommand',
  '// @grant        GM_getValue',
  '// @grant        GM_setValue',
  '// ==/UserScript==',
].join('\n');

const ASSETS = [
  {
    output: 'assets/codex-overlay.js',
    entry: "import { bootFromCdp } from '@woodfish/adapter-codex/renderer';\nbootFromCdp();\n",
    banner: 'Woodfish Codex overlay (CDP injection)',
    packages: CODEX_PACKAGES,
    buildDefine: '__WOODFISH_CODEX_BUILD__',
  },
  {
    output: 'assets/codex-userscript.js',
    entry: [
      "import { bootFromUserScript } from '@woodfish/adapter-codex/renderer';",
      'const host = globalThis as Record<string, unknown>;',
      'bootFromUserScript(host.__woodfishCodexUserScriptConfig, host.__woodfishCodexUserScriptEffects, host.__woodfishCodexUserScriptUserCss);',
      '',
    ].join('\n'),
    banner: 'Woodfish Codex overlay (Codex++ user script)',
    packages: CODEX_PACKAGES,
    buildDefine: '__WOODFISH_CODEX_BUILD__',
    define: { __WOODFISH_CODEX_DEFAULT_BACKGROUND__: JSON.stringify(DEFAULT_BACKGROUND_BASE64) },
  },
  {
    output: 'assets/woodfish-dsh.user.js',
    entry: [
      "import { bootFromUserScript } from '@woodfish/adapter-dsh/renderer';",
      'bootFromUserScript((globalThis as Record<string, unknown>).__woodfishDshUserScriptConfig);',
      '',
    ].join('\n'),
    banner: 'Woodfish for DeepSeek Harness (user script)',
    header: DSH_USERSCRIPT_HEADER,
    packages: DSH_PACKAGES,
    buildDefine: '__WOODFISH_DSH_BUILD__',
  },
];

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : listFiles(full);
    }
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

/** Hash of every renderer source file (normalized to LF), so the id is reproducible. */
function computeBuildId(packages = CODEX_PACKAGES) {
  const hash = crypto.createHash('sha256');
  for (const name of packages) {
    const root = path.join(REPO_ROOT, 'packages', name, 'src');
    for (const file of listFiles(root).sort()) {
      hash.update(path.relative(REPO_ROOT, file).split(path.sep).join('/'));
      hash.update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
    }
  }
  return hash.digest('hex').slice(0, 16);
}

async function buildAsset(asset, buildId) {
  const result = await esbuild.build({
    stdin: { contents: asset.entry, loader: 'ts', resolveDir: APP_ROOT, sourcefile: 'entry.ts' },
    absWorkingDir: APP_ROOT,
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: BROWSER_TARGET,
    conditions: ['source'],
    define: { ...asset.define, [asset.buildDefine]: JSON.stringify(buildId) },
    banner: {
      js: [
        // A user script manager reads its metadata block only at the very top.
        ...(asset.header ? [asset.header] : []),
        `/* ${asset.banner}. Generated by apps/desktop-cli/scripts/build.js (build ${buildId}). Do not edit. */`,
      ].join('\n'),
    },
    charset: 'utf8',
    legalComments: 'none',
    logLevel: 'warning',
  });
  return result.outputFiles[0].text;
}

async function buildAssets({ check, write }) {
  let stale = false;
  const contents = {};
  for (const asset of ASSETS) {
    const text = await buildAsset(asset, computeBuildId(asset.packages));
    contents[asset.output] = text;
    const file = path.join(APP_ROOT, asset.output);
    if (check) {
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      if (current !== text) {
        stale = true;
        console.error(`✗ ${asset.output} is out of date; run pnpm codex:build (or pnpm dsh:build)`);
      }
      continue;
    }
    if (write) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text, 'utf8');
      console.log(`✓ ${asset.output} (${text.length} bytes)`);
    }
  }
  return { stale, contents };
}

/**
 * The Codex++ user script carries 《彩云》 as well. The CLI ships the picture once and puts it
 * back when it writes the user script (inject/payload.ts), which keeps a third of the file.
 */
const BACKGROUND_TOKEN = '__WOODFISH_DEFAULT_BACKGROUND_BASE64__';

function withoutBackground(userscript) {
  if (userscript.split(DEFAULT_BACKGROUND_BASE64).length !== 2) {
    throw new Error('the Codex++ user script should carry the default background exactly once');
  }
  return userscript.replace(DEFAULT_BACKGROUND_BASE64, BACKGROUND_TOKEN);
}

async function buildCli(contents) {
  const pkg = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf8'));
  await esbuild.build({
    entryPoints: [path.join(APP_ROOT, 'src', 'cli.ts')],
    absWorkingDir: APP_ROOT,
    outfile: path.join(APP_ROOT, 'out', 'woodfish.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    conditions: ['source'],
    define: {
      __WOODFISH_CODEX_OVERLAY__: JSON.stringify(contents['assets/codex-overlay.js']),
      __WOODFISH_CODEX_USERSCRIPT__: JSON.stringify(
        withoutBackground(contents['assets/codex-userscript.js'])
      ),
      __WOODFISH_BACKGROUND_TOKEN__: JSON.stringify(BACKGROUND_TOKEN),
      __WOODFISH_DSH_USERSCRIPT__: JSON.stringify(contents['assets/woodfish-dsh.user.js']),
      __WOODFISH_CLI_VERSION__: JSON.stringify(pkg.version),
      __WOODFISH_DEFAULT_BACKGROUND__: JSON.stringify(DEFAULT_BACKGROUND_BASE64),
      __WOODFISH_BUILTIN_EFFECTS__: JSON.stringify(readBuiltinEffectFiles()),
    },
    banner: {
      js: '#!/usr/bin/env node\n/* Woodfish desktop CLI. Bundles smol-toml (BSD-3-Clause), see THIRD_PARTY_NOTICES.md. */',
    },
    legalComments: 'eof',
    logLevel: 'warning',
  });
  console.log('✓ out/woodfish.js');
}

async function main() {
  const check = process.argv.includes('--check');
  const assetsOnly = process.argv.includes('--assets');
  const { stale, contents } = await buildAssets({ check, write: assetsOnly });
  if (check) {
    process.exitCode = stale ? 1 : 0;
    return;
  }
  if (!assetsOnly) {
    await buildCli(contents);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { ASSETS, buildAsset, computeBuildId };
