/*
 * Shared locations for the extension's build and release scripts.
 *
 * The extension lives in apps/vscode-extension of the Woodfish monorepo. Tooling is
 * hoisted to the repository root, and repository-wide documents (README, LICENSE)
 * live there too, so scripts must not assume the extension folder is the repo root.
 */
const fs = require('fs');
const path = require('path');

const EXTENSION_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(EXTENSION_ROOT, '..', '..');

/** Resolved on first use so scripts that never call vsce do not require it to be installed. */
function resolveVsceEntry() {
  return path.join(
    path.dirname(require.resolve('@vscode/vsce/package.json', { paths: [EXTENSION_ROOT] })),
    'vsce'
  );
}

/**
 * Repository files the Marketplace listing needs inside the extension folder. vsce only
 * collects files below its working directory, so they are copied in while packaging.
 */
const STAGED_REPO_FILES = ['README.md', 'LICENSE'];

/**
 * Shared assets the extension ships, staged the same way: the default window background
 * 《彩云》 is committed once in renderer-runtime (Codex uses it too). When running from the
 * repository the extension reads it from there directly.
 */
const STAGED_ASSET_FILES = [
  {
    source: 'packages/renderer-runtime/assets/caiyun.webp',
    target: 'themes/shared/backgrounds/caiyun.webp',
  },
];

/**
 * Copies {@link STAGED_REPO_FILES} into the extension folder, runs `task`, then removes
 * the copies again. Refuses to overwrite a different file that already exists there.
 */
function withStagedRepoFiles(task, { extensionRoot = EXTENSION_ROOT, repoRoot = REPO_ROOT } = {}) {
  const staged = [];
  const createdDirectories = [];
  const files = [
    ...STAGED_REPO_FILES.map((fileName) => ({ source: fileName, target: fileName })),
    ...STAGED_ASSET_FILES,
  ];
  try {
    for (const file of files) {
      const source = path.join(repoRoot, file.source);
      const target = path.join(extensionRoot, file.target);
      const content = fs.readFileSync(source);
      if (fs.existsSync(target) && !fs.readFileSync(target).equals(content)) {
        throw new Error(
          `${path.relative(repoRoot, target)} differs from the repository copy; remove it before packaging`
        );
      }
      const created = fs.mkdirSync(path.dirname(target), { recursive: true });
      if (created) {
        createdDirectories.push(created);
      }
      fs.writeFileSync(target, content);
      staged.push(target);
    }
    return task();
  } finally {
    for (const target of staged) {
      fs.rmSync(target, { force: true });
    }
    for (const directory of createdDirectories) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
}

module.exports = {
  EXTENSION_ROOT,
  REPO_ROOT,
  STAGED_ASSET_FILES,
  STAGED_REPO_FILES,
  get VSCE_ENTRY() {
    return resolveVsceEntry();
  },
  withStagedRepoFiles,
};
