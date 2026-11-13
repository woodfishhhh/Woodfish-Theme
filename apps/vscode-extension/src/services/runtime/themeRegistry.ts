export type WoodfishThemeSlug =
  | 'bearded'
  | 'dracula'
  | 'light'
  | 'black'
  | 'neon'
  | 'onedark'
  | 'tokyonight'
  | 'catppuccin-mocha'
  | 'catppuccin-latte'
  | 'nord'
  | 'github-dark'
  | 'github-light'
  | 'nightowl'
  | 'ayu-mirage'
  | 'gruvbox-dark';

export type WoodfishThemeDefinition = {
  slug: WoodfishThemeSlug;
  label: string;
  directory: string;
  metaFile: string;
};

export const DEFAULT_WOODFISH_THEME_LABEL = 'Woodfish Dark';

/** Every bundled theme lives in `themes/<directory>/` next to its `theme.meta.json`. */
const BUILT_IN_WOODFISH_THEMES: WoodfishThemeDefinition[] = (
  [
    ['Woodfish Dark', 'bearded'],
    ['Woodfish Dracula', 'dracula'],
    ['Woodfish Black', 'black'],
    ['Woodfish Neon', 'neon'],
    ['Woodfish Light', 'light'],
    // Popular MIT themes, bundled unmodified (see THIRD_PARTY_NOTICES.md).
    ['Woodfish One Dark Pro', 'onedark'],
    ['Woodfish Tokyo Night', 'tokyonight'],
    ['Woodfish Catppuccin Mocha', 'catppuccin-mocha'],
    ['Woodfish Catppuccin Latte', 'catppuccin-latte'],
    ['Woodfish Nord', 'nord'],
    ['Woodfish GitHub Dark', 'github-dark'],
    ['Woodfish GitHub Light', 'github-light'],
    ['Woodfish Night Owl', 'nightowl'],
    ['Woodfish Ayu Mirage', 'ayu-mirage'],
    ['Woodfish Gruvbox Dark', 'gruvbox-dark'],
  ] as const
).map(([label, slug]) => ({ label, slug, directory: slug, metaFile: 'theme.meta.json' }));

export function listWoodfishThemes(): WoodfishThemeDefinition[] {
  return [...BUILT_IN_WOODFISH_THEMES];
}

export function resolveWoodfishTheme(themeName: string): WoodfishThemeDefinition | undefined {
  return BUILT_IN_WOODFISH_THEMES.find((theme) => theme.label === themeName);
}

export function isWoodfishTheme(themeName: string): boolean {
  return resolveWoodfishTheme(themeName) !== undefined;
}
