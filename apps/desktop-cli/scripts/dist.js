#!/usr/bin/env node
/*
 * Release artifacts of the `woodfish` CLI, all made from the same out/woodfish.js:
 *
 *   out/npm/            the npm package `woodfish` (npx woodfish …, npm i -g woodfish)
 *   out/release/        GitHub Release files: woodfish.exe (Node single executable, no Node
 *                       needed), woodfish.js and the third-party notices for both
 *
 *   node scripts/dist.js           build both (the exe only on Windows)
 *   node scripts/dist.js --check   build, then run the npm package and the exe once
 *
 * The CLI's version is the VS Code extension's: one release tag carries the VSIX, the exe
 * and the npm package, and the extension bundles the very same woodfish.js.
 */
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..', '..');
const OUT = path.join(APP_ROOT, 'out');
const REPOSITORY = 'https://github.com/woodfishhhh/Woodfish-Theme';
const SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

/** README links into the repository point at the release tag, so they work on npmjs.com. */
function rewriteRelativeLinks(markdown, version) {
  return markdown.replace(/\]\((\.\.?\/[^)\s]+)\)/g, (_match, target) => {
    const resolved = path.posix.join('apps/desktop-cli', target);
    return `](${REPOSITORY}/blob/v${version}/${resolved})`;
  });
}

function buildNpmPackage(version) {
  const dir = path.join(OUT, 'npm');
  resetDir(dir);
  const pkg = readJson(path.join(APP_ROOT, 'package.json'));
  const manifest = {
    name: 'woodfish',
    version,
    description: pkg.description,
    keywords: ['codex', 'openai-codex', 'theme', 'woodfish', 'deepseek', 'userscript', 'cdp'],
    homepage: `${REPOSITORY}/tree/main/apps/desktop-cli#readme`,
    bugs: `${REPOSITORY}/issues`,
    repository: { type: 'git', url: `git+${REPOSITORY}.git`, directory: 'apps/desktop-cli' },
    license: 'MIT',
    author: 'Woodfish',
    bin: { woodfish: 'woodfish.js' },
    engines: pkg.engines,
  };
  fs.writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.copyFileSync(path.join(OUT, 'woodfish.js'), path.join(dir, 'woodfish.js'));
  fs.copyFileSync(path.join(REPO_ROOT, 'LICENSE'), path.join(dir, 'LICENSE'));
  fs.copyFileSync(
    path.join(APP_ROOT, 'THIRD_PARTY_NOTICES.md'),
    path.join(dir, 'THIRD_PARTY_NOTICES.md')
  );
  const readme = fs.readFileSync(path.join(APP_ROOT, 'README.md'), 'utf8');
  fs.writeFileSync(path.join(dir, 'README.md'), rewriteRelativeLinks(readme, version));
  console.log(`✓ out/npm (woodfish@${version})`);
  return dir;
}

/**
 * Drops the Authenticode signature of a copied node.exe: injecting the CLI invalidates it,
 * and a broken signature looks worse to Windows than none (Node's docs use signtool for
 * this; the certificate table is simply cut off the end of the file).
 */
function stripSignature(buffer) {
  const pe = buffer.readUInt32LE(0x3c);
  if (buffer.readUInt32LE(pe) !== 0x00004550) {
    throw new Error('node.exe is not a PE file');
  }
  const optional = pe + 24;
  const magic = buffer.readUInt16LE(optional);
  const securityEntry = optional + (magic === 0x20b ? 112 : 96) + 4 * 8;
  const offset = buffer.readUInt32LE(securityEntry);
  const size = buffer.readUInt32LE(securityEntry + 4);
  if (size === 0) {
    return buffer;
  }
  if (offset + size !== buffer.length) {
    throw new Error('node.exe has data after its signature; cannot strip it safely');
  }
  buffer.writeUInt32LE(0, securityEntry);
  buffer.writeUInt32LE(0, securityEntry + 4);
  return buffer.subarray(0, offset);
}

function buildExe(dir) {
  const work = path.join(OUT, 'sea');
  resetDir(work);
  const config = path.join(work, 'sea-config.json');
  const blob = path.join(work, 'woodfish.blob');
  fs.writeFileSync(
    config,
    JSON.stringify({
      main: path.join(OUT, 'woodfish.js'),
      output: blob,
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
    })
  );
  execFileSync(process.execPath, ['--experimental-sea-config', config], { stdio: 'ignore' });
  const exe = path.join(dir, 'woodfish.exe');
  fs.writeFileSync(exe, stripSignature(fs.readFileSync(process.execPath)));
  const postject = require.resolve('postject/dist/cli.js', { paths: [APP_ROOT] });
  execFileSync(
    process.execPath,
    [postject, exe, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', SEA_FUSE],
    { stdio: 'ignore' }
  );
  fs.rmSync(work, { recursive: true, force: true });
  const mb = (fs.statSync(exe).size / 1024 / 1024).toFixed(1);
  console.log(`✓ out/release/woodfish.exe (${mb} MB, Node ${process.versions.node})`);
  return exe;
}

/** The release notices: the CLI's own, plus Node.js, which the exe carries. */
function writeReleaseNotices(dir) {
  const nodeLicense = path.join(path.dirname(process.execPath), 'LICENSE');
  if (!fs.existsSync(nodeLicense)) {
    throw new Error(`Node.js LICENSE not found next to ${process.execPath}`);
  }
  const notices = [
    fs.readFileSync(path.join(APP_ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8').trimEnd(),
    '',
    `## Node.js ${process.versions.node}（仅 woodfish.exe）`,
    '',
    'woodfish.exe 是 Node.js 单文件可执行程序（single executable application），内含 Node.js 运行时，按 Node.js 的许可分发：',
    '',
    '```text',
    fs.readFileSync(nodeLicense, 'utf8').trimEnd(),
    '```',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'THIRD_PARTY_NOTICES-woodfish.md'), notices);
}

/** The build takes 《彩云》 out of the bundled user script; the CLI must put it back intact. */
function checkUserScript(cli) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-dist-'));
  try {
    execFileSync(process.execPath, [cli, 'codex', 'install-userscript', '--force'], {
      env: {
        ...process.env,
        WOODFISH_DATA_DIR: path.join(sandbox, 'data'),
        WOODFISH_RUNTIME_DIR: path.join(sandbox, 'run'),
        WOODFISH_CODEX_PLUS_DIR: path.join(sandbox, 'Codex++'),
      },
      stdio: 'ignore',
    });
    const written = fs.readFileSync(
      path.join(sandbox, 'Codex++', 'user_scripts', 'woodfish-codex.js'),
      'utf8'
    );
    const committed = fs.readFileSync(path.join(APP_ROOT, 'assets', 'codex-userscript.js'), 'utf8');
    if (!written.includes(committed)) {
      throw new Error('the user script the CLI writes differs from assets/codex-userscript.js');
    }
    console.log('✓ Codex++ user script round-trips');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

function check(npmDir, exe, version) {
  const run = (command, args) =>
    execFileSync(command, args, { encoding: 'utf8', windowsHide: true }).trim();
  const fromNpm = run(process.execPath, [path.join(npmDir, 'woodfish.js'), '--version']);
  if (fromNpm !== version) {
    throw new Error(`npm package prints ${fromNpm}, expected ${version}`);
  }
  const report = JSON.parse(
    execSync(`npm pack --dry-run --json "${npmDir}"`, { encoding: 'utf8', windowsHide: true })
  );
  // npm 10 prints an array, npm 12 an object keyed by package name.
  const packed = Array.isArray(report) ? report[0] : report.woodfish;
  const files = packed.files.map((file) => file.path).sort();
  const expected = [
    'LICENSE',
    'README.md',
    'THIRD_PARTY_NOTICES.md',
    'package.json',
    'woodfish.js',
  ];
  if (JSON.stringify(files) !== JSON.stringify(expected)) {
    throw new Error(`npm package files: ${files.join(', ')}`);
  }
  console.log(`✓ npm pack: ${files.length} files, ${(packed.size / 1024).toFixed(0)} KB`);
  checkUserScript(path.join(npmDir, 'woodfish.js'));
  if (exe) {
    const fromExe = run(exe, ['--version']);
    if (fromExe !== version) {
      throw new Error(`woodfish.exe prints ${fromExe}, expected ${version}`);
    }
    if (!run(exe, ['help']).includes('woodfish codex')) {
      throw new Error('woodfish.exe help is missing');
    }
    console.log('✓ woodfish.exe runs');
  }
}

function main() {
  execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
  const version = readJson(path.join(APP_ROOT, 'package.json')).version;
  const extensionVersion = readJson(
    path.join(REPO_ROOT, 'apps', 'vscode-extension', 'package.json')
  ).version;
  if (version !== extensionVersion) {
    throw new Error(`CLI ${version} and extension ${extensionVersion} must share a version`);
  }
  const npmDir = buildNpmPackage(version);
  const release = path.join(OUT, 'release');
  resetDir(release);
  fs.copyFileSync(path.join(OUT, 'woodfish.js'), path.join(release, 'woodfish.js'));
  const exe = process.platform === 'win32' ? buildExe(release) : null;
  writeReleaseNotices(release);
  if (process.argv.includes('--check')) {
    check(npmDir, exe, version);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

module.exports = { rewriteRelativeLinks, stripSignature };
