import {
  BackgroundParams,
  EffectManifest,
  EffectValues,
  GlowParams,
  PaletteTone,
  TextGradientParams,
  WOODFISH_PALETTES,
  WoodfishPalette,
  defaultEffectValues,
  isEffectId,
  normalizeBackground,
  normalizeGlow,
  normalizeTextGradient,
  patchEffectValues,
  sanitizeCustomCssRules,
} from '@woodfish/theme-core';
import { SQUIRCLE_K, SQUIRCLE_SHAPES, SquircleShape } from '@woodfish/renderer-runtime';
import { DshPersistedConfig } from './protocol';

export type DshMode = PaletteTone;

/** Bundled default window picture 《彩云》. */
export const DSH_DEFAULT_BACKGROUND_ID = 'caiyun';
/** Smooth CSS gradient fill built from 《彩云》's palette. */
export const DSH_GRADIENT_BACKGROUND_ID = 'gradient';

export type DshBackgroundId = string;

const CUSTOM_BACKGROUND_ID = /^[a-f0-9]{16}$/;

/** Per-effect overrides stored by the native plugin (`enabled` plus any effect parameter). */
export type DshEffectOverrides = Record<string, Record<string, number | boolean | string>>;

/** Complete Woodfish settings owned by the native dsh plugin. */
export interface DshSettings {
  /**
   * Woodfish palette slug per dsh appearance mode; `null` keeps dsh's own colors. Any
   * palette in theme-core's `WOODFISH_PALETTES` made for that mode is accepted.
   */
  palette: { dark: string | null; light: string | null };
  /** Background source: `'caiyun'`, `'gradient'`, or an uploaded 16-hex image id. */
  backgroundImage: DshBackgroundId;
  /** Extra CSS appended after core styles, sanitized like the VS Code custom rules. */
  customCss: string[];
  /** Highest-priority `user.css` text mounted in `<body>` to override CSS variables and rules. */
  userCss: string;
  /** Per-effect parameter overrides persisted via `@deepseek-ai/dsh-settings`. */
  effects: DshEffectOverrides;
}

/** Parameterized squircle corners view derived from the `squircle-corners` core effect. */
export interface DshSquircleView {
  enabled: boolean;
  scale: number;
  shape: SquircleShape;
  scanHardcoded: boolean;
}

type Loose = Record<string, unknown>;

function isObject(value: unknown): value is Loose {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

function paletteFor(mode: DshMode, value: unknown, fallback: string | null): string | null {
  if (value === null || value === '') {
    return null;
  }
  return typeof value === 'string' && findDshPalette(value)?.type === mode ? value : fallback;
}

export function normalizeBackgroundId(value: unknown): DshBackgroundId {
  if (value === DSH_DEFAULT_BACKGROUND_ID || value === DSH_GRADIENT_BACKGROUND_ID) {
    return value;
  }
  if (typeof value === 'string' && CUSTOM_BACKGROUND_ID.test(value)) {
    return value;
  }
  return DSH_DEFAULT_BACKGROUND_ID;
}

function normalizeEffectOverrides(input: unknown): DshEffectOverrides {
  if (!isObject(input)) {
    return {};
  }
  const result: DshEffectOverrides = {};
  for (const [id, rawValues] of Object.entries(input)) {
    if (!isEffectId(id) || !isObject(rawValues)) {
      continue;
    }
    const clean: Record<string, number | boolean | string> = {};
    for (const [key, value] of Object.entries(rawValues)) {
      if (
        typeof value === 'boolean' ||
        typeof value === 'string' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        clean[key] = value;
      }
    }
    if (Object.keys(clean).length > 0) {
      result[id] = clean;
    }
  }
  return result;
}

/** Turns untrusted settings input into complete, safe Woodfish dsh settings. */
export function normalizeDshSettings(input: unknown = {}): DshSettings {
  const palette = section(input, 'palette');
  const rawCustom = isObject(input) ? input.customCss : undefined;
  const customList =
    typeof rawCustom === 'string'
      ? rawCustom.trim()
        ? [rawCustom]
        : []
      : Array.isArray(rawCustom)
        ? rawCustom
        : undefined;
  const rawUserCss = isObject(input) ? input.userCss : undefined;
  return {
    palette: {
      dark: paletteFor('dark', palette.dark, defaultDshPalette('dark')),
      light: paletteFor('light', palette.light, defaultDshPalette('light')),
    },
    backgroundImage: normalizeBackgroundId(isObject(input) ? input.backgroundImage : undefined),
    customCss: sanitizeCustomCssRules(customList),
    userCss: typeof rawUserCss === 'string' ? rawUserCss.slice(0, 64 * 1024) : '',
    effects: normalizeEffectOverrides(isObject(input) ? input.effects : undefined),
  };
}

export const DEFAULT_DSH_SETTINGS: Readonly<DshSettings> = Object.freeze(normalizeDshSettings());

/** Default flat persisted configuration matching the Host Cordis Config schema defaults. */
export const DEFAULT_DSH_PERSISTED_CONFIG: Readonly<DshPersistedConfig> = Object.freeze(
  toPersistedConfig(DEFAULT_DSH_SETTINGS)
);

/** Converts flat Host settings (`@deepseek-ai/dsh-settings`) into rich `DshSettings`. */
export function fromPersistedConfig(raw: unknown): DshSettings {
  if (!isObject(raw)) {
    return normalizeDshSettings();
  }
  let parsedEffects: unknown = {};
  if (typeof raw.effectsJson === 'string' && raw.effectsJson.trim() !== '') {
    try {
      parsedEffects = JSON.parse(raw.effectsJson) as unknown;
    } catch {
      parsedEffects = {};
    }
  }
  return normalizeDshSettings({
    palette: {
      dark: raw.paletteDark === '' ? null : raw.paletteDark,
      light: raw.paletteLight === '' ? null : raw.paletteLight,
    },
    backgroundImage: raw.backgroundImage,
    customCss: typeof raw.customCss === 'string' ? raw.customCss : '',
    userCss: typeof raw.userCss === 'string' ? raw.userCss : '',
    effects: parsedEffects,
  });
}

/** Converts rich `DshSettings` into flat Host settings persisted by `@deepseek-ai/dsh-settings`. */
export function toPersistedConfig(settings: DshSettings): DshPersistedConfig {
  const clean = normalizeDshSettings(settings);
  return {
    paletteDark: clean.palette.dark ?? '',
    paletteLight: clean.palette.light ?? '',
    backgroundImage: clean.backgroundImage,
    customCss: clean.customCss.join('\n'),
    userCss: clean.userCss,
    effectsJson: JSON.stringify(clean.effects),
  };
}

/** Applies persisted per-effect parameter overrides onto a list of bundled effect sources. */
export function applyDshEffectOverrides<
  T extends { id: string; manifest: EffectManifest; values: EffectValues },
>(sources: readonly T[], overrides: DshEffectOverrides): T[] {
  return sources.map((source) => {
    const base = defaultEffectValues(source.manifest);
    const patch = overrides[source.id];
    const values = patch ? patchEffectValues(source.manifest, base, patch) : base;
    return { ...source, values };
  });
}

function normalizeSquircleShape(value: unknown): SquircleShape {
  return typeof value === 'string' && (SQUIRCLE_SHAPES as readonly string[]).includes(value)
    ? (value as SquircleShape)
    : 'squircle';
}

function normalizeSquircleScale(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(2.4, Math.max(1, value))
    : SQUIRCLE_K;
}

/**
 * What the core engines (squircle corners, code & diff gradient, window background) need:
 * the settings plus the normalized values of their core effect definitions (`null`: off).
 */
export interface DshCoreView {
  squircleCorners: DshSquircleView;
  palette: DshSettings['palette'];
  backgroundImage: DshBackgroundId;
  codeGradient: { enabled: boolean } & TextGradientParams;
  codeGlow: { enabled: boolean } & GlowParams;
  background: { enabled: boolean } & BackgroundParams;
  customCss: string[];
}

export function composeDshCoreView(
  settings: DshSettings,
  core: {
    'squircle-corners'?: EffectValues | null;
    'code-gradient'?: EffectValues | null;
    background?: EffectValues | null;
  }
): DshCoreView {
  const squircle = core['squircle-corners'] ?? null;
  const code = core['code-gradient'] ?? null;
  const background = core.background ?? null;
  return {
    squircleCorners: {
      enabled: squircle !== null,
      scale: normalizeSquircleScale(squircle?.scale),
      shape: normalizeSquircleShape(squircle?.shape),
      scanHardcoded: squircle?.scanHardcoded !== false,
    },
    palette: settings.palette,
    backgroundImage: settings.backgroundImage,
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
