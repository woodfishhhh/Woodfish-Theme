import {
  CursorParams,
  DEFAULT_CURSOR,
  GlassParams,
  GlowParams,
  ORIGINAL_PALETTES,
  TextGradientParams,
  WoodfishPalette,
  normalizeCursor,
  normalizeGlass,
  normalizeGlow,
  normalizeTextGradient,
  sanitizeBoolean,
  sanitizeCustomCssRules,
} from '@woodfish/theme-core';

/** Woodfish palettes that can recolor Codex (`null` keeps the user's Codex theme). */
export type CodexPaletteSlug = 'light' | 'black' | 'neon';
export const CODEX_PALETTE_SLUGS: readonly CodexPaletteSlug[] = Object.freeze([
  'light',
  'black',
  'neon',
]);

export interface CodexSettings {
  /** Palette per Codex appearance mode; `null` keeps Codex's own colors for that mode. */
  palette: { dark: CodexPaletteSlug | null; light: CodexPaletteSlug | null };
  codeGradient: { enabled: boolean } & TextGradientParams;
  codeGlow: { enabled: boolean } & GlowParams;
  glass: { enabled: boolean } & GlassParams;
  accent: { enabled: boolean };
  caret: { enabled: boolean } & Pick<CursorParams, 'animationDuration' | 'gradientStops'>;
  /** Gradient on assistant reply text. Off by default: most visible, most fragile. */
  bodyText: { enabled: boolean };
  /** Extra CSS appended last, sanitized like the VS Code custom rules. */
  customCss: string[];
}

type Loose = Record<string, unknown>;

function section(input: unknown, key: string): Loose {
  if (input === null || typeof input !== 'object') {
    return {};
  }
  const value = (input as Loose)[key];
  return value !== null && typeof value === 'object' ? (value as Loose) : {};
}

function paletteSlug(value: unknown): CodexPaletteSlug | null {
  return typeof value === 'string' && (CODEX_PALETTE_SLUGS as readonly string[]).includes(value)
    ? (value as CodexPaletteSlug)
    : null;
}

/** Turns untrusted settings (file, CLI flags) into complete, clamped Codex settings. */
export function normalizeCodexSettings(input: unknown = {}): CodexSettings {
  const palette = section(input, 'palette');
  const codeGradient = section(input, 'codeGradient');
  const codeGlow = section(input, 'codeGlow');
  const glass = section(input, 'glass');
  const caret = section(input, 'caret');
  const cursor = normalizeCursor(caret);
  const customCss =
    input !== null && typeof input === 'object' ? (input as Loose).customCss : undefined;

  return {
    palette: { dark: paletteSlug(palette.dark), light: paletteSlug(palette.light) },
    codeGradient: {
      enabled: sanitizeBoolean(codeGradient.enabled, true),
      ...normalizeTextGradient(codeGradient),
    },
    codeGlow: { enabled: sanitizeBoolean(codeGlow.enabled, true), ...normalizeGlow(codeGlow) },
    glass: { enabled: sanitizeBoolean(glass.enabled, true), ...normalizeGlass(glass) },
    accent: { enabled: sanitizeBoolean(section(input, 'accent').enabled, true) },
    caret: {
      enabled: sanitizeBoolean(caret.enabled, true),
      animationDuration: cursor.animationDuration,
      gradientStops: cursor.gradientStops,
    },
    bodyText: { enabled: sanitizeBoolean(section(input, 'bodyText').enabled, false) },
    customCss: sanitizeCustomCssRules(customCss),
  };
}

export const DEFAULT_CODEX_SETTINGS: Readonly<CodexSettings> =
  Object.freeze(normalizeCodexSettings());

/** The default caret stops, so callers can tell whether the user customised them. */
export const DEFAULT_CODEX_CARET_STOPS: readonly string[] = DEFAULT_CURSOR.gradientStops;

/** Looks up an original Woodfish palette by slug. */
export function findCodexPalette(slug: CodexPaletteSlug): WoodfishPalette {
  const palette = ORIGINAL_PALETTES.find((candidate) => candidate.slug === slug);
  if (!palette) {
    throw new Error(`Unknown palette: ${slug}`);
  }
  return palette;
}
