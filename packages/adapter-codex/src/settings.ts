import {
  CursorParams,
  DEFAULT_CURSOR,
  GlassParams,
  GlowParams,
  TextGradientParams,
  WOODFISH_PALETTES,
  WoodfishPalette,
  normalizeCursor,
  normalizeGlass,
  normalizeGlow,
  normalizeTextGradient,
  sanitizeBoolean,
  sanitizeCustomCssRules,
} from '@woodfish/theme-core';

/**
 * The Woodfish themes that can recolor Codex (`null` keeps the user's Codex theme), in the
 * order the VS Code extension lists them. Every Woodfish palette qualifies, so a theme added
 * to theme-core shows up here without changes.
 */
export type CodexPaletteSlug = string;
export const CODEX_PALETTE_SLUGS: readonly CodexPaletteSlug[] = Object.freeze(
  WOODFISH_PALETTES.map((palette) => palette.slug)
);

export interface CodexSettings {
  /** Palette per Codex appearance mode; `null` keeps Codex's own colors for that mode. */
  palette: { dark: CodexPaletteSlug | null; light: CodexPaletteSlug | null };
  codeGradient: { enabled: boolean } & TextGradientParams;
  codeGlow: { enabled: boolean } & GlowParams;
  /** `animations`: menus and dialogs fade in; `reveal`: pointer-following light on rows. */
  glass: { enabled: boolean; animations: boolean; reveal: boolean } & GlassParams;
  accent: { enabled: boolean };
  /** `glow`: draw the composer caret (and a cursor after streaming text) as a glowing bar. */
  caret: { enabled: boolean; glow: boolean } & Pick<
    CursorParams,
    'animationDuration' | 'gradientStops'
  >;
  /** Rainbow gradient on assistant reply text (pure CSS, also while it streams). */
  bodyText: { enabled: boolean };
  /** Extra CSS appended last, sanitized like the VS Code custom rules. */
  customCss: string[];
}

type Loose = Record<string, unknown>;

/** Codex floating panels: more see-through and more saturated than the VS Code defaults. */
const CODEX_GLASS_DEFAULTS: Readonly<Loose> = Object.freeze({
  opacity: 0.4,
  saturate: 150,
  blur: 24,
});

function section(input: unknown, key: string): Loose {
  if (input === null || typeof input !== 'object') {
    return {};
  }
  const value = (input as Loose)[key];
  return value !== null && typeof value === 'object' ? (value as Loose) : {};
}

function paletteSlug(value: unknown): CodexPaletteSlug | null {
  return typeof value === 'string' && CODEX_PALETTE_SLUGS.includes(value) ? value : null;
}

/** The Codex appearance mode a Woodfish theme is made for. */
export function codexPaletteMode(slug: CodexPaletteSlug): 'dark' | 'light' {
  return findCodexPalette(slug).type === 'light' ? 'light' : 'dark';
}

/** A theme for `mode`, or `null` if the value is unknown or made for the other mode. */
function paletteFor(mode: 'dark' | 'light', value: unknown): CodexPaletteSlug | null {
  const slug = paletteSlug(value);
  return slug && codexPaletteMode(slug) === mode ? slug : null;
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
    palette: { dark: paletteFor('dark', palette.dark), light: paletteFor('light', palette.light) },
    codeGradient: {
      enabled: sanitizeBoolean(codeGradient.enabled, true),
      ...normalizeTextGradient(codeGradient),
    },
    // Large-area glow is off by default (the owner keeps it off in VS Code); the caret glows.
    codeGlow: { enabled: sanitizeBoolean(codeGlow.enabled, false), ...normalizeGlow(codeGlow) },
    glass: {
      enabled: sanitizeBoolean(glass.enabled, true),
      animations: sanitizeBoolean(glass.animations, true),
      reveal: sanitizeBoolean(glass.reveal, true),
      // The owner's VS Code look: thin, saturated glass (Frosted Glass Theme at ~0.4).
      ...normalizeGlass({ ...CODEX_GLASS_DEFAULTS, ...glass }),
    },
    accent: { enabled: sanitizeBoolean(section(input, 'accent').enabled, true) },
    caret: {
      enabled: sanitizeBoolean(caret.enabled, true),
      glow: sanitizeBoolean(caret.glow, true),
      animationDuration: cursor.animationDuration,
      gradientStops: cursor.gradientStops,
    },
    bodyText: { enabled: sanitizeBoolean(section(input, 'bodyText').enabled, true) },
    customCss: sanitizeCustomCssRules(customCss),
  };
}

export const DEFAULT_CODEX_SETTINGS: Readonly<CodexSettings> =
  Object.freeze(normalizeCodexSettings());

/** The default caret stops, so callers can tell whether the user customised them. */
export const DEFAULT_CODEX_CARET_STOPS: readonly string[] = DEFAULT_CURSOR.gradientStops;

/** Looks up a Woodfish palette by slug. */
export function findCodexPalette(slug: CodexPaletteSlug): WoodfishPalette {
  const palette = WOODFISH_PALETTES.find((candidate) => candidate.slug === slug);
  if (!palette) {
    throw new Error(`Unknown palette: ${slug}`);
  }
  return palette;
}

/** The on/off features the in-app settings panel shows, in display order. */
export const CODEX_FEATURE_KEYS = Object.freeze([
  'codeGradient',
  'codeGlow',
  'glass',
  'accent',
  'caret',
  'bodyText',
] as const);
export type CodexFeatureKey = (typeof CODEX_FEATURE_KEYS)[number];

/** What the in-app settings panel may change: the themes and the feature switches. */
export interface CodexSettingsPatch {
  palette?: { dark?: CodexPaletteSlug | null; light?: CodexPaletteSlug | null };
  codeGradient?: { enabled: boolean };
  codeGlow?: { enabled: boolean };
  glass?: { enabled: boolean };
  accent?: { enabled: boolean };
  caret?: { enabled: boolean };
  bodyText?: { enabled: boolean };
}

/**
 * Applies an untrusted patch from the page (the in-app settings panel). Only the themes
 * and the feature switches can change; tunables and custom CSS always come from the
 * settings file, so nothing running in the page can inject CSS this way.
 */
export function applyCodexSettingsPatch(settings: CodexSettings, patch: unknown): CodexSettings {
  const next = normalizeCodexSettings(settings);
  if (patch === null || typeof patch !== 'object') {
    return next;
  }
  const palette = section(patch, 'palette');
  for (const mode of ['dark', 'light'] as const) {
    if (palette[mode] === null) {
      next.palette[mode] = null;
    } else if (palette[mode] !== undefined) {
      next.palette[mode] = paletteFor(mode, palette[mode]) ?? next.palette[mode];
    }
  }
  for (const key of CODEX_FEATURE_KEYS) {
    const enabled = section(patch, key).enabled;
    if (typeof enabled === 'boolean') {
      next[key].enabled = enabled;
    }
  }
  return next;
}
