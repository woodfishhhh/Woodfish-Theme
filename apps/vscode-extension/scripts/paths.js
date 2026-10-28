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
 * Copies {@link STAGED_REPO_FILES} into the extension folder, runs `task`, then removes
 * the copies again. Refuses to overwrite a different file that already exists there.
 */
function withStagedRepoFiles(task, { extensionRoot = EXTENSION_ROOT, repoRoot = REPO_ROOT } = {}) {
  const staged = [];
  try {
    for (const fileName of STAGED_REPO_FILES) {
      const source = path.join(repoRoot, fileName);
      const target = path.join(extensionRoot, fileName);
      const content = fs.readFileSync(source);
      if (fs.existsSync(target) && !fs.readFileSync(target).equals(content)) {
        throw new Error(
          `${path.relative(repoRoot, target)} differs from the repository copy; remove it before packaging`
        );
      }
      fs.writeFileSync(target, content);
      staged.push(target);
    }
    return task();
  } finally {
    for (const target of staged) {
      fs.rmSync(target, { force: true });
    }
  }
}

module.exports = {
  EXTENSION_ROOT,
  REPO_ROOT,
  STAGED_REPO_FILES,
  get VSCE_ENTRY() {
    return resolveVsceEntry();
  },
  withStagedRepoFiles,
};
