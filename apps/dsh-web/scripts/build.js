#!/usr/bin/env node
/*
 * Builds the standalone, self-contained official native dsh plugin (`woodfish-dsh-plugin`)
 * under `apps/dsh-web/plugin/` (compatible with dsh 0.2.2-rc.5+ on both web and desktop).
 *
 *   node scripts/build.js          write apps/dsh-web/plugin/**
 *   node scripts/build.js --check  fail if the committed plugin artifacts are stale
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const APP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..', '..');
const PLUGIN_DIR = path.join(APP_ROOT, 'plugin');
const PLUGIN_NAME = 'woodfish-dsh-plugin';
const SETTINGS_NAMESPACE = 'woodfish-theme';
const BROWSER_TARGET = 'chrome120';
const REPOSITORY_URL = 'https://github.com/woodfishhhh/Woodfish-Theme';

const { readBuiltinEffectFiles } = require(
  path.join(REPO_ROOT, 'packages', 'effects', 'scripts', 'files.js')
);

const CAIYUN_SOURCE = path.join(
  REPO_ROOT,
  'packages',
  'renderer-runtime',
  'assets',
  'caiyun.webp'
);

const SOURCE_PACKAGES = ['theme-core', 'renderer-runtime', 'dsh-web'];

function listTsFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : listTsFiles(full);
    }
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

function computeBuildId() {
  const hash = crypto.createHash('sha256');
  for (const name of SOURCE_PACKAGES) {
    const root = path.join(REPO_ROOT, name === 'dsh-web' ? 'apps' : 'packages', name, 'src');
    for (const file of listTsFiles(root).sort()) {
      hash.update(path.relative(REPO_ROOT, file).split(path.sep).join('/'));
      hash.update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
    }
  }
  const builtins = readBuiltinEffectFiles();
  for (const key of Object.keys(builtins).sort()) {
    hash.update(`effects/${key}`);
    hash.update(builtins[key]);
  }
  return hash.digest('hex').slice(0, 16);
}

/** Compiles all shipped dsh effects into a pure JS array expression with CJS factories. */
async function buildDshEffectsExpression() {
  const effectsRoot = path.join(REPO_ROOT, 'packages', 'effects');
  const result = await esbuild.build({
    stdin: {
      contents: [
        "import { buildEffectsList, builtinEffects } from './src/index.ts';",
        "module.exports = buildEffectsList(builtinEffects(), 'dsh');",
      ].join('\n'),
      loader: 'ts',
      resolveDir: effectsRoot,
      sourcefile: 'dsh-effects.ts',
    },
    absWorkingDir: effectsRoot,
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    target: 'node22',
    conditions: ['source'],
    define: { __WOODFISH_BUILTIN_EFFECTS__: JSON.stringify(readBuiltinEffectFiles()) },
    logLevel: 'warning',
  });
  const mod = { exports: '' };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(
    mod,
    mod.exports,
    require
  );
  return mod.exports;
}

function readPluginVersion() {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'apps', 'cli', 'package.json'), 'utf8'))
    .version;
}

function buildStaticFiles(version, caiyunBytes, caiyunFileName) {
  const manifest = {
    name: PLUGIN_NAME,
    version,
    description:
      'Woodfish Theme for DeepSeek Harness (dsh): 15 dark/light palettes, full-window background, parameterized squircle corners, code & diff gradients, streaming effects, and full native settings.',
    license: 'MIT',
    type: 'module',
    icon: './icon.svg',
    homepage: `${REPOSITORY_URL}/blob/main/docs/hosts/dsh-web.md`,
    repository: {
      type: 'git',
      url: `git+${REPOSITORY_URL}.git`,
      directory: 'apps/dsh-web/plugin',
    },
    main: 'lib/index.js',
    exports: {
      '.': './lib/index.js',
      './client': './lib/client.js',
      './assets/*': './lib/assets/*',
      './cordis.patch.yml': './cordis.patch.yml',
      './locale/*.json': './locale/*.json',
      './package.json': './package.json',
    },
    files: [
      'README.md',
      'LICENSE',
      'icon.svg',
      'cordis.patch.yml',
      'locale/*.json',
      'lib/index.js',
      'lib/client.js',
      'lib/assets',
    ],
    engines: {
      dsh: '>=0.2.0-0 <1.0.0',
    },
    peerDependencies: {
      '@deepseek-ai/cordis': '~4.1.0',
      '@deepseek-ai/schemastery': '~3.19.0',
    },
    dsh: {
      manifestVersion: 1,
      bundle: {
        patch: './cordis.patch.yml',
      },
      client: {
        platform: 'web',
        inject: [
          '@deepseek-ai/dsh-client-connection',
          '@deepseek-ai/dsh-client-locale',
          '@deepseek-ai/dsh-client-ui-renderer',
          '@deepseek-ai/dsh-client-ui-settings',
          '@deepseek-ai/dsh-client-ui-theme',
          '@deepseek-ai/dsh-api-remotes',
        ],
        immediately: true,
      },
    },
  };

  const cordisPatch = [
    '# Woodfish Theme native dsh plugin: registers the Host settings/background service',
    '# and its matching browser/desktop client bundle.',
    '- insert:',
    `    - id: ${SETTINGS_NAMESPACE}`,
    `      name: '${PLUGIN_NAME}'`,
    '',
  ].join('\n');

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="wf-grad" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff4d94"/>
      <stop offset="45%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#4fd18b"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="16" fill="#10142a"/>
  <rect x="5.5" y="5.5" width="53" height="53" rx="14.5" stroke="url(#wf-grad)" stroke-width="3"/>
  <path d="M32 16a16 16 0 0 0 0 32h2.8a4.2 4.2 0 0 0 0-8.4H32a3.5 3.5 0 0 1 0-7h8a8 8 0 0 0 0-16h-8Z" stroke="url(#wf-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="24" cy="27" r="2.6" fill="#ffd25e"/>
  <circle cx="32" cy="23" r="2.6" fill="#ff5f4e"/>
  <circle cx="40" cy="27" r="2.6" fill="#38c6c8"/>
</svg>
`;

  const localeZh = {
    meta: {
      title: 'Woodfish 主题与视觉效果',
      description:
        '15 套深/浅色主题、全屏背景与自定义背景图、可调苹果圆角、代码与 Diff 渐变、吐字光标与粒子，全部效果参数均可在设置中实时调节。',
    },
  };

  const localeEn = {
    meta: {
      title: 'Woodfish Theme & Visual Effects',
      description:
        '15 dark/light palettes, full-window background with custom uploads, parameterized squircle corners, code & diff gradients, streaming effects, and full native settings.',
    },
  };

  const readme = `# ${PLUGIN_NAME}

DeepSeek Harness（dsh）原生主题与视觉效果插件，同时支持 \`dsh web\` 与 \`dsh desktop\`。

## 安装

\`\`\`bash
dsh plugin --profile web add ${PLUGIN_NAME}
# 或使用 woodfish CLI 一键安装：
woodfish dsh install --profile web
woodfish dsh install --profile desktop
\`\`\`

安装并启动 dsh 后，打开左下角「设置 → Woodfish」即可实时切换 15 套深/浅色主题、上传自定义背景图、调节全部 12 项视觉与动效参数（含苹果圆角倍率与曲率）以及编辑自定义 CSS。
`;

  const license = fs.readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf8').replace(/\r\n/g, '\n');

  return {
    'package.json': `${JSON.stringify(manifest, null, 2)}\n`,
    'cordis.patch.yml': cordisPatch,
    'icon.svg': iconSvg,
    'locale/zh.json': `${JSON.stringify(localeZh, null, 2)}\n`,
    'locale/en.json': `${JSON.stringify(localeEn, null, 2)}\n`,
    'README.md': readme,
    LICENSE: license,
    [`lib/assets/${caiyunFileName}`]: caiyunBytes,
  };
}

async function buildHostBundle(buildId) {
  const result = await esbuild.build({
    entryPoints: [path.join(APP_ROOT, 'src', 'host', 'index.ts')],
    absWorkingDir: APP_ROOT,
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    conditions: ['source'],
    external: ['@deepseek-ai/cordis', '@deepseek-ai/schemastery', 'fs', 'path', 'crypto', 'os', 'node:*'],
    define: {
      __WOODFISH_DSH_BUILD__: JSON.stringify(buildId),
    },
    banner: {
      js: `/* ${PLUGIN_NAME} host entry (build ${buildId}). Generated by apps/dsh-web/scripts/build.js. Do not edit. */`,
    },
    charset: 'utf8',
    legalComments: 'none',
    logLevel: 'warning',
  });
  return result.outputFiles[0].text;
}

async function buildClientBundle(buildId, caiyunFileName, effectsExpr) {
  const assetRef = `plugins/${PLUGIN_NAME}/assets/${caiyunFileName}`;
  const result = await esbuild.build({
    entryPoints: [path.join(APP_ROOT, 'src', 'client', 'index.ts')],
    absWorkingDir: APP_ROOT,
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'browser',
    target: BROWSER_TARGET,
    conditions: ['source'],
    external: ['react'],
    define: {
      __WOODFISH_DSH_BUILD__: JSON.stringify(buildId),
      __WOODFISH_DSH_ASSET_REF__: JSON.stringify(assetRef),
    },
    charset: 'utf8',
    legalComments: 'none',
    logLevel: 'warning',
  });
  const body = result.outputFiles[0].text;
  return [
    `/* ${PLUGIN_NAME} client bundle (build ${buildId}). Generated by apps/dsh-web/scripts/build.js. Do not edit. */`,
    `window.__ModuleLoader__.load({`,
    `  id: ${JSON.stringify(PLUGIN_NAME)},`,
    `  factory: function (require) {`,
    `    var module = { exports: {} };`,
    `    var exports = module.exports;`,
    `    var __WOODFISH_DSH_RESOLVE_ASSET__ = typeof require.asset === 'function' ? function (ref) { return require.asset(ref); } : function (ref) { return ref; };`,
    `    var __WOODFISH_DSH_EFFECTS_FACTORY__ = function () { return ${effectsExpr}; };`,
    body,
    `    return module.exports;`,
    `  }`,
    `});`,
    '',
  ].join('\n');
}

async function buildPluginFiles() {
  const buildId = computeBuildId();
  const version = readPluginVersion();
  const caiyunBytes = fs.readFileSync(CAIYUN_SOURCE);
  const caiyunRev = crypto.createHash('sha1').update(caiyunBytes).digest('hex').slice(0, 12);
  const caiyunFileName = `caiyun-${caiyunRev}.webp`;
  const effectsExpr = await buildDshEffectsExpression();
  const [hostJs, clientJs] = await Promise.all([
    buildHostBundle(buildId),
    buildClientBundle(buildId, caiyunFileName, effectsExpr),
  ]);
  const files = {
    ...buildStaticFiles(version, caiyunBytes, caiyunFileName),
    'lib/index.js': hostJs,
    'lib/client.js': clientJs,
  };
  return { buildId, version, caiyunFileName, files };
}

function listExistingPluginFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listExistingPluginFiles(full, base);
    }
    return [path.relative(base, full).split(path.sep).join('/')];
  });
}

async function main() {
  const check = process.argv.includes('--check');
  const { buildId, version, files } = await buildPluginFiles();
  const expectedNames = Object.keys(files).sort();

  if (check) {
    let stale = false;
    const existing = listExistingPluginFiles(PLUGIN_DIR).sort();
    for (const extra of existing.filter((name) => !expectedNames.includes(name))) {
      stale = true;
      console.error(`✗ unexpected stale file in apps/dsh-web/plugin/${extra}`);
    }
    for (const rel of expectedNames) {
      const full = path.join(PLUGIN_DIR, ...rel.split('/'));
      const expected = files[rel];
      if (!fs.existsSync(full)) {
        stale = true;
        console.error(`✗ missing apps/dsh-web/plugin/${rel}; run pnpm dsh:build`);
        continue;
      }
      const actual = Buffer.isBuffer(expected)
        ? fs.readFileSync(full)
        : fs.readFileSync(full, 'utf8');
      const same = Buffer.isBuffer(expected) ? actual.equals(expected) : actual === expected;
      if (!same) {
        stale = true;
        console.error(`✗ apps/dsh-web/plugin/${rel} is out of date; run pnpm dsh:build`);
      }
    }
    process.exitCode = stale ? 1 : 0;
    return;
  }

  // Prune stale generated files (such as older revisioned asset hashes) before writing.
  for (const existing of listExistingPluginFiles(PLUGIN_DIR)) {
    if (!expectedNames.includes(existing)) {
      fs.unlinkSync(path.join(PLUGIN_DIR, ...existing.split('/')));
    }
  }
  for (const rel of expectedNames) {
    const full = path.join(PLUGIN_DIR, ...rel.split('/'));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    const content = files[rel];
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(full, content);
    } else {
      fs.writeFileSync(full, content, 'utf8');
    }
  }
  console.log(
    `✓ apps/dsh-web/plugin (${PLUGIN_NAME}@${version}, build ${buildId}, ${expectedNames.length} files)`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { PLUGIN_DIR, PLUGIN_NAME, buildPluginFiles, computeBuildId };
