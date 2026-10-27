export type WoodfishThemeSlug = 'bearded' | 'dracula' | 'light' | 'black' | 'neon';

export type WoodfishThemeDefinition = {
  slug: WoodfishThemeSlug;
  label: string;
  directory: string;
  metaFile: string;
};

export const DEFAULT_WOODFISH_THEME_LABEL = 'Woodfish Dark';

const BUILT_IN_WOODFISH_THEMES: WoodfishThemeDefinition[] = [
  {
    label: 'Woodfish Dark',
    slug: 'bearded',
    directory: 'bearded',
    metaFile: 'theme.meta.json',
  },
  {
    label: 'Woodfish Dracula',
    slug: 'dracula',
    directory: 'dracula',
    metaFile: 'theme.meta.json',
  },
  {
    label: 'Woodfish Black',
    slug: 'black',
    directory: 'black',
    metaFile: 'theme.meta.json',
  },
  {
    label: 'Woodfish Neon',
    slug: 'neon',
    directory: 'neon',
    metaFile: 'theme.meta.json',
  },
  {
    label: 'Woodfish Light',
    slug: 'light',
    directory: 'light',
    metaFile: 'theme.meta.json',
  },
];

export function listWoodfishThemes(): WoodfishThemeDefinition[] {
  return [...BUILT_IN_WOODFISH_THEMES];
}

export function resolveWoodfishTheme(themeName: string): WoodfishThemeDefinition | undefined {
  return BUILT_IN_WOODFISH_THEMES.find((theme) => theme.label === themeName);
}

export function isWoodfishTheme(themeName: string): boolean {
  return resolveWoodfishTheme(themeName) !== undefined;
}
