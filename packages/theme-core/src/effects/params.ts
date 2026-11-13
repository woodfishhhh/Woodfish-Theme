import { NumericRange, sanitizeEnum, sanitizeGradientStops, sanitizeNumber } from './sanitize';

/**
 * Host-independent tunables of each Woodfish effect. On/off switches, CSS selectors
 * and host-specific targets belong to each app, not here.
 */

export interface TextGradientParams {
  /** Hue rotation from the start to the end of a derived gradient, degrees. */
  hueShift: number;
  /** Largest OKLCH lightness change of a derived gradient stop. */
  lightnessDelta: number;
  /** OKLCH chroma of the rainbow on neutral text. */
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

export const BACKGROUND_SIZES = ['cover', 'contain'] as const;
export type BackgroundSize = (typeof BACKGROUND_SIZES)[number];

export const BACKGROUND_POSITIONS = ['center', 'top', 'bottom', 'left', 'right'] as const;
export type BackgroundPosition = (typeof BACKGROUND_POSITIONS)[number];

/**
 * A picture (or a gradient) under the whole window, with the host's panels laid over it
 * as frosted glass. The picture shows through the theme's own background color at
 * `opacity`; main content areas stay clear, panels take the theme tint at `mask`.
 */
export interface BackgroundParams {
  /** How strongly the picture shows over the theme background. */
  opacity: number;
  /** Backdrop blur of the frosted panels, px. */
  blur: number;
  /** Theme tint of the panels over the picture (the mask). */
  mask: number;
  /** Backdrop saturation of the frosted panels, %. */
  saturate: number;
  /** Neutral luminosity layer under the tint (Fluent acrylic). */
  luminosity: number;
  /** Cheaper backdrop blur for secondary areas (strips behind the composer, fades), px. */
  secondaryBlur: number;
  size: BackgroundSize;
  position: BackgroundPosition;
  /** Panel color transitions, ms. */
  transition: number;
  /** Gradient used instead of a picture; two equal stops make a solid color. */
  fill: string[];
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
  hueShift: 32,
  lightnessDelta: 0.12,
  neutralChroma: 0.075,
  angle: 45,
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

/** Sky blue, cloud gold and sunset pink of the default picture 《彩云》, top to bottom. */
export const DEFAULT_BACKGROUND_FILL: readonly string[] = /* @__PURE__ */ Object.freeze([
  '#2990bd',
  '#e2ab5b',
  '#e384be',
]);

/**
 * The owner's look: the picture at 15 % cover / center (his VS Code background), panels at
 * 35 % of the theme color with blur(10px) saturate(150%) (picked in the Codex playground),
 * a 10 % luminosity layer and 30 ms transitions (his Frosted Glass Theme settings).
 */
export const DEFAULT_BACKGROUND: Readonly<Omit<BackgroundParams, 'fill'>> & {
  readonly fill: readonly string[];
} = /* @__PURE__ */ Object.freeze({
  opacity: 0.15,
  blur: 10,
  mask: 0.35,
  saturate: 150,
  luminosity: 0.1,
  secondaryBlur: 10,
  size: 'cover',
  position: 'center',
  transition: 30,
  fill: DEFAULT_BACKGROUND_FILL,
});

export const BACKGROUND_RANGES: Ranges<BackgroundParams> = /* @__PURE__ */ freezeRanges({
  opacity: { minimum: 0, maximum: 1 },
  blur: { minimum: 0, maximum: 60 },
  mask: { minimum: 0, maximum: 1 },
  saturate: { minimum: 100, maximum: 250 },
  luminosity: { minimum: 0, maximum: 0.6 },
  secondaryBlur: { minimum: 0, maximum: 40 },
  transition: { minimum: 0, maximum: 1000 },
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

export function normalizeBackground(input?: Loose<BackgroundParams> | null): BackgroundParams {
  const partial = input ?? {};
  const number = (key: keyof typeof BACKGROUND_RANGES): number =>
    sanitizeNumber(partial[key], DEFAULT_BACKGROUND[key], BACKGROUND_RANGES[key]);
  return {
    opacity: number('opacity'),
    blur: number('blur'),
    mask: number('mask'),
    saturate: number('saturate'),
    luminosity: number('luminosity'),
    secondaryBlur: number('secondaryBlur'),
    size: sanitizeEnum(partial.size, BACKGROUND_SIZES, DEFAULT_BACKGROUND.size),
    position: sanitizeEnum(partial.position, BACKGROUND_POSITIONS, DEFAULT_BACKGROUND.position),
    transition: number('transition'),
    fill: sanitizeGradientStops(partial.fill, DEFAULT_BACKGROUND.fill),
  };
}
