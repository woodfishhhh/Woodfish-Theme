import {
  CursorParams,
  GlassParams,
  GlowParams,
  PaletteTone,
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

export type DshMode = PaletteTone;

export interface DshSettings {
  /**
   * Woodfish palette slug per dsh appearance mode; `null` keeps dsh's own colors. Any
   * palette in theme-core's `WOODFISH_PALETTES` made for that mode is accepted, so new
   * themes show up without changes here.
   */
  palette: { dark: string | null; light: string | null };
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

function isObject(value: unknown): value is Loose {
  return value !== null && typeof value === 'object';
}

function section(input: unknown, key: string): Loose {
  const value = isObject(input) ? input[key] : undefined;
  return isObject(value) ? value : {};
}

/** The Woodfish palettes made for `mode`, in theme-core order. */
export function dshPalettes(mode: DshMode): WoodfishPalette[] {
  return WOODFISH_PALETTES.filter((palette) => palette.type === mode);
}

/** The palette for `slug`, or `undefined` if theme-core has no such palette. */
export function findDshPalette(slug: string): WoodfishPalette | undefined {
  return WOODFISH_PALETTES.find((palette) => palette.slug === slug);
}

/** The default palette of a mode: the first one theme-core lists for it. */
export function defaultDshPalette(mode: DshMode): string | null {
  return dshPalettes(mode)[0]?.slug ?? null;
}

/**
 * `null` keeps dsh's colors; a slug of a palette made for `mode` is kept; anything else
 * (missing, unknown, removed from theme-core, made for the other mode) falls back to
 * `fallback`.
 */
function paletteFor(mode: DshMode, value: unknown, fallback: string | null): string | null {
  if (value === null) {
    return null;
  }
  return typeof value === 'string' && findDshPalette(value)?.type === mode ? value : fallback;
}

/** Turns untrusted settings (file, CLI flags, user script storage) into complete settings. */
export function normalizeDshSettings(input: unknown = {}): DshSettings {
  const palette = section(input, 'palette');
  const codeGradient = section(input, 'codeGradient');
  const codeGlow = section(input, 'codeGlow');
  const glass = section(input, 'glass');
  const caret = section(input, 'caret');
  const cursor = normalizeCursor(caret);

  return {
    palette: {
      dark: paletteFor('dark', palette.dark, defaultDshPalette('dark')),
      light: paletteFor('light', palette.light, defaultDshPalette('light')),
    },
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
    customCss: sanitizeCustomCssRules(isObject(input) ? input.customCss : undefined),
  };
}

export const DEFAULT_DSH_SETTINGS: Readonly<DshSettings> = Object.freeze(normalizeDshSettings());

/** The on/off features the user script menu shows, in display order. */
export const DSH_FEATURE_KEYS = Object.freeze([
  'codeGradient',
  'codeGlow',
  'glass',
  'accent',
  'caret',
  'bodyText',
] as const);
export type DshFeatureKey = (typeof DSH_FEATURE_KEYS)[number];

/** What the page may change: the themes and the feature switches. */
export interface DshSettingsPatch {
  palette?: { dark?: string | null; light?: string | null };
  codeGradient?: { enabled: boolean };
  codeGlow?: { enabled: boolean };
  glass?: { enabled: boolean };
  accent?: { enabled: boolean };
  caret?: { enabled: boolean };
  bodyText?: { enabled: boolean };
}

/**
 * Applies an untrusted patch kept by the page (the user script menu). Only the themes and
 * the feature switches can change; tunables and custom CSS always come from the settings
 * baked in by `woodfish dsh userscript`, so nothing in the page can inject CSS this way.
 */
export function applyDshSettingsPatch(settings: DshSettings, patch: unknown): DshSettings {
  const next = normalizeDshSettings(settings);
  if (!isObject(patch)) {
    return next;
  }
  const palette = section(patch, 'palette');
  for (const mode of ['dark', 'light'] as const) {
    if (palette[mode] !== undefined) {
      next.palette[mode] = paletteFor(mode, palette[mode], next.palette[mode]);
    }
  }
  for (const key of DSH_FEATURE_KEYS) {
    const enabled = section(patch, key).enabled;
    if (typeof enabled === 'boolean') {
      next[key].enabled = enabled;
    }
  }
  return next;
}

/**
 * The palette that follows `current` in the menu's cycle for `mode`: every Woodfish
 * palette for the mode, then `null` (dsh's own colors), then around again.
 */
export function nextDshPalette(mode: DshMode, current: string | null): string | null {
  const cycle: Array<string | null> = [...dshPalettes(mode).map((palette) => palette.slug), null];
  return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}
