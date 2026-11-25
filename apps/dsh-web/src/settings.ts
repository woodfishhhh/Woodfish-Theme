import {
  BackgroundParams,
  EffectManifest,
  EffectValues,
  GlowParams,
  PaletteTone,
  TextGradientParams,
  WOODFISH_PALETTES,
  WoodfishPalette,
  normalizeBackground,
  normalizeGlow,
  normalizeTextGradient,
  patchEffectValues,
  sanitizeCustomCssRules,
} from '@woodfish/theme-core';

export type DshMode = PaletteTone;

/**
 * What `woodfish dsh userscript` bakes into the user script besides the effects. Every
 * visual effect (caret, trails, glass, the window background, the code gradient…) is an
 * effect plugin from the shared effects folder (`%APPDATA%\Woodfish\effects`), as in Codex.
 */
export interface DshSettings {
  /**
   * Woodfish palette slug per dsh appearance mode; `null` keeps dsh's own colors. Any
   * palette in theme-core's `WOODFISH_PALETTES` made for that mode is accepted, so new
   * themes show up without changes here.
   */
  palette: { dark: string | null; light: string | null };
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

/**
 * Turns untrusted settings (file, CLI flags, user script storage) into complete settings.
 * Keys of the older format (`codeGradient`, `glass`, `caret`…) are dropped: those are
 * effect plugins now.
 */
export function normalizeDshSettings(input: unknown = {}): DshSettings {
  const palette = section(input, 'palette');
  return {
    palette: {
      dark: paletteFor('dark', palette.dark, defaultDshPalette('dark')),
      light: paletteFor('light', palette.light, defaultDshPalette('light')),
    },
    customCss: sanitizeCustomCssRules(isObject(input) ? input.customCss : undefined),
  };
}

export const DEFAULT_DSH_SETTINGS: Readonly<DshSettings> = Object.freeze(normalizeDshSettings());

/** What the user script menu may change: the themes and each effect's switch. */
export interface DshSettingsPatch {
  palette?: { dark?: string | null; light?: string | null };
  effects?: Record<string, { enabled: boolean }>;
}

/**
 * Applies the theme part of an untrusted patch kept by the page (the user script menu).
 * Custom CSS always comes from the settings baked in by `woodfish dsh userscript`, so
 * nothing in the page can inject CSS this way.
 */
export function applyDshSettingsPatch(settings: DshSettings, patch: unknown): DshSettings {
  const next = normalizeDshSettings(settings);
  const palette = section(patch, 'palette');
  for (const mode of ['dark', 'light'] as const) {
    if (palette[mode] !== undefined) {
      next.palette[mode] = paletteFor(mode, palette[mode], next.palette[mode]);
    }
  }
  return next;
}

/** An effect as the user script carries it; only what the menu needs is typed here. */
interface StoredEffect {
  id: string;
  manifest: EffectManifest;
  values: EffectValues;
}

function isStoredEffect(value: unknown): value is StoredEffect {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    isObject(value.manifest) &&
    isObject(value.values)
  );
}

/**
 * The baked-in effects with the menu's switches applied (untrusted page storage: only
 * `enabled` of known effects can change). Anything that is not an effect list is returned
 * as it is.
 */
export function applyStoredEffects(effects: unknown, patch: unknown): unknown {
  if (!Array.isArray(effects)) {
    return effects;
  }
  const switches = section(patch, 'effects');
  return effects.map((entry: unknown) => {
    if (!isStoredEffect(entry)) {
      return entry;
    }
    const enabled = section(switches, entry.id).enabled;
    return typeof enabled === 'boolean'
      ? { ...entry, values: patchEffectValues(entry.manifest, entry.values, { enabled }) }
      : entry;
  });
}

/**
 * The palette that follows `current` in the menu's cycle for `mode`: every Woodfish
 * palette for the mode, then `null` (dsh's own colors), then around again.
 */
export function nextDshPalette(mode: DshMode, current: string | null): string | null {
  const cycle: Array<string | null> = [...dshPalettes(mode).map((palette) => palette.slug), null];
  return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}

/**
 * What the core engines (code gradient, window background) need: the settings plus the
 * values of their effect folders (`null`: the effect is off or missing).
 */
export interface DshCoreView {
  palette: DshSettings['palette'];
  codeGradient: { enabled: boolean } & TextGradientParams;
  codeGlow: { enabled: boolean } & GlowParams;
  background: { enabled: boolean } & BackgroundParams;
  customCss: string[];
}

export function composeDshCoreView(
  settings: DshSettings,
  core: { 'code-gradient'?: EffectValues | null; background?: EffectValues | null }
): DshCoreView {
  const code = core['code-gradient'] ?? null;
  const background = core.background ?? null;
  return {
    palette: settings.palette,
    codeGradient: {
      enabled: code !== null,
      ...normalizeTextGradient({
        angle: code?.angle,
        hueShift: code?.hueShift,
        lightnessDelta: code?.lightnessDelta,
        neutralChroma: code?.neutralChroma,
      }),
    },
    codeGlow: {
      enabled: code !== null && code.glow === true,
      ...normalizeGlow({ intensity: code?.glowIntensity }),
    },
    background: {
      enabled: background !== null,
      ...normalizeBackground({
        opacity: background?.opacity,
        blur: background?.blur,
        mask: background?.mask,
        saturate: background?.saturate,
        luminosity: background?.luminosity,
        size: background?.size,
        position: background?.position,
      }),
    },
    customCss: settings.customCss,
  };
}
