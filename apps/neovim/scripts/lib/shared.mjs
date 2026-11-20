// Paths and tables shared by the generator and the dev tools (capture / compare).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const VSCODE_THEMES = path.join(ROOT, '..', 'vscode-extension', 'themes');
export const STATS_DIR = path.join(ROOT, 'stats-samples');
export const COMPARE_DIR = path.join(ROOT, 'samples');
export const CAPTURES_DIR = path.join(ROOT, 'scripts', 'captures');

export const { parseJsonc } = require('../../../vscode-extension/scripts/lib/jsonc');
export const { WOODFISH_PALETTES } = require('@woodfish/theme-core');

/** `key` names the sample; `shiki` is the VS Code grammar and `parser` the Neovim Treesitter language it is painted with. */
const sample = (key, file, extra = {}) => ({ key, file, shiki: key, parser: key, ...extra });

/** Measured samples (stats-samples/): their colors and styles become the highlight groups. */
export const STATS_SAMPLES = [
  sample('typescript', 'example.ts'),
  sample('python', 'example.py'),
  sample('lua', 'example.lua'),
  sample('go', 'example.go'),
  sample('rust', 'example.rs'),
  sample('json', 'example.json'),
  sample('markdown', 'example.md'),
  sample('javascript', 'example.js'),
  // Neovim has no JSX parser: .jsx files use `javascript`, so jsx and javascript samples land in the same `@capture.javascript` groups.
  sample('jsx', 'example.jsx', { parser: 'javascript' }),
  sample('tsx', 'example.tsx'),
];

/** The samples that were added after the first seven; reports show them apart so the older languages can be compared before / after. */
export const WEB_SAMPLE_KEYS = ['javascript', 'jsx', 'tsx'];

/** Held-out samples (samples/): the same languages as STATS_SAMPLES, different code. */
export const COMPARE_SAMPLES = STATS_SAMPLES;

/** Palette slug -> [theme folder, VS Code theme file]. */
export const THEME_FILES = {
  dark: ['bearded', 'Woodfish Dark.json'],
  dracula: ['dracula', 'Woodfish Dracula.json'],
  light: ['light', 'Woodfish Light.json'],
  black: ['black', 'Woodfish Black.json'],
  neon: ['neon', 'Woodfish Neon.json'],
  onedark: ['onedark', 'Woodfish One Dark Pro.json'],
  tokyonight: ['tokyonight', 'Woodfish Tokyo Night.json'],
  'catppuccin-mocha': ['catppuccin-mocha', 'Woodfish Catppuccin Mocha.json'],
  'catppuccin-latte': ['catppuccin-latte', 'Woodfish Catppuccin Latte.json'],
  nord: ['nord', 'Woodfish Nord.json'],
  'github-dark': ['github-dark', 'Woodfish GitHub Dark.json'],
  'github-light': ['github-light', 'Woodfish GitHub Light.json'],
  nightowl: ['nightowl', 'Woodfish Night Owl.json'],
  'ayu-mirage': ['ayu-mirage', 'Woodfish Ayu Mirage.json'],
  'gruvbox-dark': ['gruvbox-dark', 'Woodfish Gruvbox Dark.json'],
};

export function themeFile(slug) {
  const source = THEME_FILES[slug];
  if (!source) throw new Error(`no VS Code theme file registered for palette "${slug}"`);
  return path.join(VSCODE_THEMES, source[0], source[1]);
}

/** Font styles as Shiki / vscode-textmate encode them; Neovim highlight attribute names alongside. */
export const FONT_STYLES = [
  [1, 'italic'],
  [2, 'bold'],
  [4, 'underline'],
  [8, 'strikethrough'],
];

/** Blend `#RRGGBB[AA]` over `background` and return `#RRGGBB`. */
export function opaqueHex(value, background) {
  const match = /^#([0-9a-f]{3,8})$/i.exec(value);
  if (!match) return value;
  let digits = match[1];
  if (digits.length === 3 || digits.length === 4) digits = [...digits].map((digit) => digit + digit).join('');
  if (digits.length === 6) return `#${digits.toUpperCase()}`;
  if (digits.length !== 8) return value;
  const base = opaqueHex(background, background);
  const channels = [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16));
  const under = [0, 2, 4].map((offset) => parseInt(base.slice(offset + 1, offset + 3), 16));
  const alpha = parseInt(digits.slice(6, 8), 16) / 255;
  const result = channels.map((channel, index) => Math.round(channel * alpha + under[index] * (1 - alpha)));
  return `#${result.map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
