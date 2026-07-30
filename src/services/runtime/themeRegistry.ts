export type WoodfishThemeSlug = 'bearded' | 'dracula';

export type WoodfishThemeDefinition = {
  slug: WoodfishThemeSlug;
  label: string;
  directory: string;
  themeFile: string;
  syntaxFile: string;
  metaFile: string;
  glowFile?: string;
};

export const DEFAULT_WOODFISH_THEME_LABEL = 'Woodfish Dark';

const BUILT_IN_WOODFISH_THEMES: WoodfishThemeDefinition[] = [
  {
    label: 'Woodfish Dark',
    slug: 'bearded',
    directory: 'bearded',
    themeFile: 'Woodfish Dark.json',
    syntaxFile: 'syntax-highlighting.css',
    metaFile: 'theme.meta.json',
    glowFile: 'glow-effects.css',
  },
  {
    label: 'Woodfish Dracula',
    slug: 'dracula',
    directory: 'dracula',
    themeFile: 'Woodfish Dracula.json',
    syntaxFile: 'syntax-highlighting.css',
    metaFile: 'theme.meta.json',
    glowFile: 'glow-effects.css',
  },
];

export function getDefaultWoodfishTheme(): WoodfishThemeDefinition {
  return BUILT_IN_WOODFISH_THEMES[0];
}

export function resolveWoodfishTheme(themeName: string): WoodfishThemeDefinition | undefined {
  return BUILT_IN_WOODFISH_THEMES.find((theme) => theme.label === themeName);
}

export function isWoodfishTheme(themeName: string): boolean {
  return resolveWoodfishTheme(themeName) !== undefined;
}
