import { NumericRange, sanitizeEnum, sanitizeGradientStops, sanitizeNumber } from './sanitize';

/**
 * Host-independent tunables of each Woodfish effect. On/off switches, CSS selectors
 * and host-specific targets belong to each app, not here.
 */

export interface TextGradientParams {
  /** Hue rotation at each gradient end, degrees. */
  hueShift: number;
  /** OKLCH lightness change at each gradient end. */
  lightnessDelta: number;
  /** Minimum OKLCH chroma for neutral text. */
  neutralChroma: number;
  /** Gradient direction, degrees. */
  angle: number;
}

export interface GlowParams {
  /** Multiplier for the glow blur radii. */
  intensity: number;
}

export interface CursorParams {
  /** Color cycle duration, seconds. */
  animationDuration: number;
  gradientStops: string[];
  /** px */
  borderRadius: number;
  /** Trail blur, px. `0` disables the GPU blur. */
  glowBlur: number;
  glowOpacity: number;
}

export const GLASS_MODES = ['blur', 'acrylic'] as const;
export type GlassMode = (typeof GLASS_MODES)[number];

export interface GlassParams {
  mode: GlassMode;
  /** Backdrop blur, px. */
  blur: number;
  /** Backdrop saturation, %. */
  saturate: number;
  /** Tint opacity of the floating surface. */
  opacity: number;
  /** Grain strength. */
  noise: number;
  /** px; `0` keeps the host's own radius. */
  borderRadius: number;
}

export const NATIVE_WINDOWS_MATERIALS = ['acrylic', 'mica', 'tabbed'] as const;
export type NativeWindowsMaterial = (typeof NATIVE_WINDOWS_MATERIALS)[number];

export const NATIVE_MAC_VIBRANCY = [
  'under-window',
  'sidebar',
  'fullscreen-ui',
  'hud',
  'window',
  'content',
] as const;
export type NativeMacVibrancy = (typeof NATIVE_MAC_VIBRANCY)[number];

/**
 * OS-level window material, named after Electron's `BrowserWindow` options
 * (`backgroundMaterial` on Windows 11, `vibrancy` on macOS). Applying it needs host
 * main-process access; each app declares whether it supports it.
 */
export interface NativeWindowParams {
  windowsMaterial: NativeWindowsMaterial;
  macVibrancy: NativeMacVibrancy;
  /** Opacity of the host's main surfaces over the material. */
  opacity: number;
}

type Ranges<T> = { readonly [K in keyof T as T[K] extends number ? K : never]: NumericRange };

/** Freezes a range table and every range in it, so no consumer can widen limits for others. */
function freezeRanges<T extends Record<string, NumericRange>>(ranges: T): Readonly<T> {
  for (const range of Object.values(ranges)) {
    Object.freeze(range);
  }
  return Object.freeze(ranges);
}

export const DEFAULT_TEXT_GRADIENT: Readonly<TextGradientParams> = /* @__PURE__ */ Object.freeze({
  hueShift: 24,
  lightnessDelta: 0.06,
  neutralChroma: 0.06,
  angle: 90,
});

export const TEXT_GRADIENT_RANGES: Ranges<TextGradientParams> = /* @__PURE__ */ freezeRanges({
  hueShift: { minimum: 0, maximum: 180 },
  lightnessDelta: { minimum: 0, maximum: 0.5 },
  neutralChroma: { minimum: 0, maximum: 0.4 },
  angle: { minimum: 0, maximum: 360 },
});

export const DEFAULT_GLOW: Readonly<GlowParams> = /* @__PURE__ */ Object.freeze({ intensity: 1 });

export const GLOW_RANGES: Ranges<GlowParams> = /* @__PURE__ */ freezeRanges({
  intensity: { minimum: 0.1, maximum: 3 },
});

export const DEFAULT_CURSOR_GRADIENT_STOPS: readonly string[] = /* @__PURE__ */ Object.freeze([
  '#ff2d95',
  '#ff4500',
  '#ffd700',
  '#7cfc00',
  '#00ffff',
  '#1e90ff',
  '#9370db',
  '#ff00ff',
  '#ff1493',
]);

export const DEFAULT_CURSOR: Readonly<Omit<CursorParams, 'gradientStops'>> & {
  readonly gradientStops: readonly string[];
} = /* @__PURE__ */ Object.freeze({
  animationDuration: 8,
  gradientStops: DEFAULT_CURSOR_GRADIENT_STOPS,
  borderRadius: 2,
  glowBlur: 0,
  glowOpacity: 0.7,
});

export const CURSOR_RANGES: Ranges<CursorParams> = /* @__PURE__ */ freezeRanges({
  animationDuration: { minimum: 1, maximum: 60 },
  borderRadius: { minimum: 0, maximum: 24 },
  glowBlur: { minimum: 0, maximum: 24 },
  glowOpacity: { minimum: 0, maximum: 1 },
});

export const DEFAULT_GLASS: Readonly<GlassParams> = /* @__PURE__ */ Object.freeze({
  mode: 'blur',
  blur: 30,
  saturate: 125,
  opacity: 0.7,
  noise: 0.02,
  borderRadius: 0,
});

export const GLASS_RANGES: Ranges<GlassParams> = /* @__PURE__ */ freezeRanges({
  blur: { minimum: 0, maximum: 60 },
  saturate: { minimum: 100, maximum: 250 },
  opacity: { minimum: 0.15, maximum: 1 },
  noise: { minimum: 0, maximum: 0.2 },
  borderRadius: { minimum: 0, maximum: 16 },
});

export const DEFAULT_NATIVE_WINDOW: Readonly<NativeWindowParams> = /* @__PURE__ */ Object.freeze({
  windowsMaterial: 'acrylic',
  macVibrancy: 'under-window',
  opacity: 0.78,
});

export const NATIVE_WINDOW_RANGES: Ranges<NativeWindowParams> = /* @__PURE__ */ freezeRanges({
  opacity: { minimum: 0.3, maximum: 1 },
});

/** Untrusted settings input: any value per key; `null`/`undefined` mean "use the default". */
type Loose<T> = { readonly [K in keyof T]?: unknown };

export function normalizeTextGradient(
  input?: Loose<TextGradientParams> | null
): TextGradientParams {
  const partial = input ?? {};
  return {
    hueShift: sanitizeNumber(
      partial.hueShift,
      DEFAULT_TEXT_GRADIENT.hueShift,
      TEXT_GRADIENT_RANGES.hueShift
    ),
    lightnessDelta: sanitizeNumber(
      partial.lightnessDelta,
      DEFAULT_TEXT_GRADIENT.lightnessDelta,
      TEXT_GRADIENT_RANGES.lightnessDelta
    ),
    neutralChroma: sanitizeNumber(
      partial.neutralChroma,
      DEFAULT_TEXT_GRADIENT.neutralChroma,
      TEXT_GRADIENT_RANGES.neutralChroma
    ),
    angle: sanitizeNumber(partial.angle, DEFAULT_TEXT_GRADIENT.angle, TEXT_GRADIENT_RANGES.angle),
  };
}

export function normalizeGlow(input?: Loose<GlowParams> | null): GlowParams {
  const partial = input ?? {};
  return {
    intensity: sanitizeNumber(partial.intensity, DEFAULT_GLOW.intensity, GLOW_RANGES.intensity),
  };
}

export function normalizeCursor(input?: Loose<CursorParams> | null): CursorParams {
  const partial = input ?? {};
  return {
    animationDuration: sanitizeNumber(
      partial.animationDuration,
      DEFAULT_CURSOR.animationDuration,
      CURSOR_RANGES.animationDuration
    ),
    gradientStops: sanitizeGradientStops(partial.gradientStops, DEFAULT_CURSOR.gradientStops),
    borderRadius: sanitizeNumber(
      partial.borderRadius,
      DEFAULT_CURSOR.borderRadius,
      CURSOR_RANGES.borderRadius
    ),
    glowBlur: sanitizeNumber(partial.glowBlur, DEFAULT_CURSOR.glowBlur, CURSOR_RANGES.glowBlur),
    glowOpacity: sanitizeNumber(
      partial.glowOpacity,
      DEFAULT_CURSOR.glowOpacity,
      CURSOR_RANGES.glowOpacity
    ),
  };
}

export function normalizeGlass(input?: Loose<GlassParams> | null): GlassParams {
  const partial = input ?? {};
  return {
    mode: sanitizeEnum(partial.mode, GLASS_MODES, DEFAULT_GLASS.mode),
    blur: sanitizeNumber(partial.blur, DEFAULT_GLASS.blur, GLASS_RANGES.blur),
    saturate: sanitizeNumber(partial.saturate, DEFAULT_GLASS.saturate, GLASS_RANGES.saturate),
    opacity: sanitizeNumber(partial.opacity, DEFAULT_GLASS.opacity, GLASS_RANGES.opacity),
    noise: sanitizeNumber(partial.noise, DEFAULT_GLASS.noise, GLASS_RANGES.noise),
    borderRadius: sanitizeNumber(
      partial.borderRadius,
      DEFAULT_GLASS.borderRadius,
      GLASS_RANGES.borderRadius
    ),
  };
}

export function normalizeNativeWindow(
  input?: Loose<NativeWindowParams> | null
): NativeWindowParams {
  const partial = input ?? {};
  return {
    windowsMaterial: sanitizeEnum(
      partial.windowsMaterial,
      NATIVE_WINDOWS_MATERIALS,
      DEFAULT_NATIVE_WINDOW.windowsMaterial
    ),
    macVibrancy: sanitizeEnum(
      partial.macVibrancy,
      NATIVE_MAC_VIBRANCY,
      DEFAULT_NATIVE_WINDOW.macVibrancy
    ),
    opacity: sanitizeNumber(
      partial.opacity,
      DEFAULT_NATIVE_WINDOW.opacity,
      NATIVE_WINDOW_RANGES.opacity
    ),
  };
}
