import {
  BackgroundParams,
  DEFAULT_CURSOR,
  EffectValues,
  GlowParams,
  TextGradientParams,
  WOODFISH_PALETTES,
  WoodfishPalette,
  normalizeBackground,
  normalizeGlow,
  normalizeTextGradient,
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

/**
 * What `codex.json` keeps. Every visual effect (caret, trails, particles, glass, the window
 * background's look, the code gradient…) is a plugin with its values in its own folder
 * (`%APPDATA%\Woodfish\effects\<id>\params.json`); this file keeps what is not an effect.
 */
export interface CodexSettings {
  /** Palette per Codex appearance mode; `null` keeps Codex's own colors for that mode. */
  palette: { dark: CodexPaletteSlug | null; light: CodexPaletteSlug | null };
  /**
   * The picture under the window when the `background` effect is on: `caiyun` (the bundled
   * 《彩云》), `gradient` (the 彩云 gradient) or the id of a picture the user saved.
   */
  backgroundImage: CodexBackgroundId;
  /** Extra CSS appended last, sanitized like the VS Code custom rules. */
  customCss: string[];
}

export type CodexBackgroundId = string;
/** The bundled default picture 《彩云》 by woodfish. */
export const CODEX_DEFAULT_BACKGROUND_ID = 'caiyun';
/** The `fill` gradient instead of a picture. */
export const CODEX_GRADIENT_BACKGROUND_ID = 'gradient';
/** Saved pictures are named by the first 12 hex digits of their SHA-256. */
const SAVED_BACKGROUND_ID = /^[0-9a-f]{12}$/;

export function isCodexBackgroundId(value: unknown): value is CodexBackgroundId {
  return (
    typeof value === 'string' &&
    (value === CODEX_DEFAULT_BACKGROUND_ID ||
      value === CODEX_GRADIENT_BACKGROUND_ID ||
      SAVED_BACKGROUND_ID.test(value))
  );
}

/** True for a picture the user saved (as opposed to the bundled ones). */
export function isSavedBackgroundId(value: string): boolean {
  return SAVED_BACKGROUND_ID.test(value);
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

/** Turns untrusted settings (file, CLI flags) into complete Codex settings. */
export function normalizeCodexSettings(input: unknown = {}): CodexSettings {
  const palette = section(input, 'palette');
  const loose = input !== null && typeof input === 'object' ? (input as Loose) : {};
  // Before effects became plugins the picture lived in `background.image`.
  const image = loose.backgroundImage ?? section(input, 'background').image;
  return {
    palette: { dark: paletteFor('dark', palette.dark), light: paletteFor('light', palette.light) },
    backgroundImage: isCodexBackgroundId(image) ? image : CODEX_DEFAULT_BACKGROUND_ID,
    customCss: sanitizeCustomCssRules(loose.customCss),
  };
}

export const DEFAULT_CODEX_SETTINGS: Readonly<CodexSettings> =
  Object.freeze(normalizeCodexSettings());

/** The default caret stops (Woodfish's rainbow). */
export const DEFAULT_CODEX_CARET_STOPS: readonly string[] = DEFAULT_CURSOR.gradientStops;

/** Looks up a Woodfish palette by slug. */
export function findCodexPalette(slug: CodexPaletteSlug): WoodfishPalette {
  const palette = WOODFISH_PALETTES.find((candidate) => candidate.slug === slug);
  if (!palette) {
    throw new Error(`Unknown palette: ${slug}`);
  }
  return palette;
}

/**
 * Values an older `codex.json` had for features that are effect plugins now, keyed by
 * effect folder. Only keys the file actually had are returned, so the plugin's own
 * defaults fill the rest; used once to seed `params.json`.
 */
export function legacyEffectValues(input: unknown): Record<string, Loose> {
  const result: Record<string, Loose> = {};
  const pick = (source: Loose, keys: readonly string[], rename: Loose = {}): Loose => {
    const picked: Loose = {};
    for (const key of keys) {
      if (key in source) {
        picked[typeof rename[key] === 'string' ? rename[key] : key] = source[key];
      }
    }
    return picked;
  };
  const add = (id: string, values: Loose): void => {
    if (Object.keys(values).length > 0) {
      result[id] = { ...result[id], ...values };
    }
  };
  add(
    'code-gradient',
    pick(section(input, 'codeGradient'), [
      'enabled',
      'angle',
      'hueShift',
      'lightnessDelta',
      'neutralChroma',
    ])
  );
  add(
    'code-gradient',
    pick(section(input, 'codeGlow'), ['enabled', 'intensity'], {
      enabled: 'glow',
      intensity: 'glowIntensity',
    })
  );
  add(
    'glass',
    pick(section(input, 'glass'), [
      'enabled',
      'mode',
      'blur',
      'saturate',
      'opacity',
      'noise',
      'borderRadius',
      'animations',
      'reveal',
    ])
  );
  add('accent', pick(section(input, 'accent'), ['enabled']));
  add('thread-ring', pick(section(input, 'accent'), ['enabled']));
  add('caret', pick(section(input, 'caret'), ['enabled']));
  add('rainbow-text', pick(section(input, 'bodyText'), ['enabled']));
  add(
    'background',
    pick(section(input, 'background'), [
      'enabled',
      'opacity',
      'blur',
      'mask',
      'saturate',
      'luminosity',
      'size',
      'position',
    ])
  );
  return result;
}

/**
 * What the core engines (code gradient, window background) need, composed from the
 * settings file and the values of their effect folders. `null` values mean the effect is
 * off (or its folder is missing).
 */
export interface CodexCoreView {
  palette: CodexSettings['palette'];
  codeGradient: { enabled: boolean } & TextGradientParams;
  codeGlow: { enabled: boolean } & GlowParams;
  background: { enabled: boolean; image: CodexBackgroundId } & BackgroundParams;
  customCss: string[];
}

export function composeCodexCoreView(
  settings: CodexSettings,
  core: { 'code-gradient'?: EffectValues | null; background?: EffectValues | null }
): CodexCoreView {
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
      image: settings.backgroundImage,
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

/**
 * What the in-app settings panel may change. Effect values go to the effect folders (the
 * watcher validates them against each `effect.json`); everything else here is the file.
 */
export interface CodexSettingsPatch {
  palette?: { dark?: CodexPaletteSlug | null; light?: CodexPaletteSlug | null };
  backgroundImage?: CodexBackgroundId;
  /** Per effect folder: values to change (`enabled` and parameters). */
  effects?: Record<string, Record<string, unknown>>;
  /** Effect folders to put back to their defaults. */
  reset?: string[];
}

/**
 * Applies the file part of an untrusted patch from the page. Only the themes and the
 * background picture can change; custom CSS always comes from the file, so nothing running
 * in the page can inject CSS this way.
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
  const image = (patch as Loose).backgroundImage;
  if (isCodexBackgroundId(image)) {
    next.backgroundImage = image;
  }
  return next;
}
