import { WoodfishPalette } from '@woodfish/theme-core';

/** Keys of `[desktop.appearance{Light,Dark}ChromeTheme]` that Woodfish manages. */
export interface ChromeThemeFields {
  accent: string;
  /**
   * Must be `custom`: without it Codex treats the accent as account-synced and replaces it
   * with the ChatGPT profile color (verified on the Store build, see docs/hosts/codex.md).
   */
  accentSource: 'custom';
  contrast: number;
  ink: string;
  opaqueWindows: boolean;
  surface: string;
  semanticColors: {
    diffAdded: string;
    diffRemoved: string;
    skill: string;
  };
}

export type ChromeThemeMode = 'light' | 'dark';

/** Table name in `config.toml` for each appearance mode. */
export const CHROME_THEME_TABLES: Readonly<Record<ChromeThemeMode, string>> = Object.freeze({
  light: 'desktop.appearanceLightChromeTheme',
  dark: 'desktop.appearanceDarkChromeTheme',
});

/** Codex's own defaults: 45 in light mode, 60 in dark mode. */
const DEFAULT_CONTRAST: Readonly<Record<ChromeThemeMode, number>> = Object.freeze({
  light: 45,
  dark: 60,
});

/** Codex accepts only `#rrggbb` for chrome theme colors. */
export const CHROME_THEME_COLOR = /^#[0-9a-fA-F]{6}$/;

function color(value: string, field: string): string {
  if (!CHROME_THEME_COLOR.test(value)) {
    throw new Error(`${field} must be #rrggbb, got ${value}`);
  }
  return value.toLowerCase();
}

/**
 * Maps a Woodfish palette onto Codex's official chrome theme. `opaqueWindows` stays
 * false so Windows 11 keeps its Mica backdrop.
 */
export function paletteToChromeTheme(palette: WoodfishPalette): ChromeThemeFields {
  const mode: ChromeThemeMode = palette.type === 'light' ? 'light' : 'dark';
  return {
    accent: color(palette.ui.accent, 'accent'),
    accentSource: 'custom',
    contrast: DEFAULT_CONTRAST[mode],
    ink: color(palette.ui.fg, 'ink'),
    opaqueWindows: false,
    surface: color(palette.ui.bg, 'surface'),
    semanticColors: {
      diffAdded: color(palette.ui.success, 'semanticColors.diffAdded'),
      diffRemoved: color(palette.ui.error, 'semanticColors.diffRemoved'),
      skill: color(palette.ui.accent2, 'semanticColors.skill'),
    },
  };
}

/** The appearance mode a palette is designed for. */
export function paletteMode(palette: WoodfishPalette): ChromeThemeMode {
  return palette.type === 'light' ? 'light' : 'dark';
}
