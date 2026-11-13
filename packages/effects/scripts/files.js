/*
 * Reads the shipped effect folders (packages/effects/builtin) into a map of relative path
 * to file content. Build scripts inline this map into the single-file CLI and the VS Code
 * extension (`__WOODFISH_BUILTIN_EFFECTS__`), so neither needs the repository at runtime.
 */
const fs = require('fs');
const path = require('path');

const BUILTIN_ROOT = path.resolve(__dirname, '..', 'builtin');

function readBuiltinEffectFiles(root = BUILTIN_ROOT) {
  const files = {};
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        files[path.relative(root, full).split(path.sep).join('/')] = fs
          .readFileSync(full, 'utf8')
          .replace(/\r\n/g, '\n');
      }
    }
  };
  walk(root);
  return files;
}

module.exports = { BUILTIN_ROOT, readBuiltinEffectFiles };
