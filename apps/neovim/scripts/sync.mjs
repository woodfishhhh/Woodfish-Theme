#!/usr/bin/env node
// Copies the generated plugin (colors/ and lua/) into a checkout of the distribution repository.
//   pnpm nvim:sync -- <woodfish.nvim checkout>      (or set WOODFISH_NVIM_REPO)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/shared.mjs';

const targetArg = process.argv[2] || process.env.WOODFISH_NVIM_REPO;
if (!targetArg) throw new Error('Usage: pnpm nvim:sync -- <woodfish.nvim checkout>');

const target = path.resolve(targetArg);
if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  throw new Error(`Neovim repository does not exist: ${target}`);
}

for (const name of ['colors', 'lua']) {
  // Replace, not merge, so a theme removed here disappears from the distribution too.
  fs.rmSync(path.join(target, name), { recursive: true, force: true });
  fs.cpSync(path.join(ROOT, name), path.join(target, name), { recursive: true });
}
console.log(`✓ synced generated Neovim plugin files to ${target}`);
