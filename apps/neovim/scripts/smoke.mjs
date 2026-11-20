#!/usr/bin/env node
// Loads every colorscheme in headless Neovim and checks what users rely on (highlight groups, terminal colors,
// the lualine theme, `transparent`). Needs Neovim 0.11+ only; no Treesitter parsers, no compiler.
//   node scripts/smoke.mjs        (WOODFISH_NVIM names the nvim binary when it is not on PATH)
import path from 'node:path';
import { nvimBinary, nvimVersion, runNvim } from './lib/nvim-env.mjs';
import { ROOT, WOODFISH_PALETTES } from './lib/shared.mjs';

const nvim = nvimBinary();
runNvim(nvim, null, path.join(ROOT, 'scripts', 'nvim', 'smoke.lua'), WOODFISH_PALETTES.map((palette) => palette.slug));
console.log(`✓ ${WOODFISH_PALETTES.length} colorschemes load in ${nvimVersion(nvim)}`);
