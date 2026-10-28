import { formatRgba } from '../color/format';
import { gamutMapOklch, rgbToOklch } from '../color/oklch';
import { clamp, parseCssColor } from '../color/parse';

/** Below this OKLCH chroma a color is treated as neutral (white, grey) and borrows an anchor hue. */
export const NEUTRAL_CHROMA_THRESHOLD = 0.045;

/** Hue used when neither the token palette nor the host accent colors provide one. */
export const DEFAULT_ANCHOR_HUE = 300;

export interface TokenGradientOptions {
  /** Hue (degrees) given to neutral colors so they still get a visible gradient. */
  anchorHue: number;
  /** Hue offset at each end of the gradient, in degrees. */
  hueShift: number;
  /** OKLCH lightness change at each end of the gradient. */
  lightnessDelta: number;
  /** Minimum chroma added to neutral colors. */
  neutralChroma: number;
  /** Punctuation gets a weaker glow. */
  punctuation: boolean;
}

/** CSS color strings for a three-stop text gradient and its glow layers. */
export interface TokenGradientColors {
  light: string;
  base: string;
  dark: string;
  glowNear: string;
  glowMid: string;
  glowFar: string;
  punctuationNear: string;
  punctuationFar: string;
  neutral: boolean;
}

/** Moves lightness by `delta`, mirroring the step when it would leave [0, 1]. */
export function offsetLightness(lightness: number, delta: number): number {
  const shifted = lightness + delta;
  if (shifted >= 0 && shifted <= 1) {
    return shifted;
  }

  return clamp(lightness - delta);
}

/**
 * Derives the gradient around one text color: the original color sits in the middle,
 * both ends rotate hue and shift lightness in OKLCH and are gamut-mapped back to sRGB.
 * Returns `null` for colors that cannot be parsed.
 */
export function deriveTokenGradient(
  cssColor: string,
  options: TokenGradientOptions
): TokenGradientColors | null {
  const parsed = parseCssColor(cssColor);
  if (!parsed) {
    return null;
  }

  const base = rgbToOklch(parsed);
  const neutral = base.c < NEUTRAL_CHROMA_THRESHOLD;
  const hue = neutral ? options.anchorHue : base.h;
  const chroma = neutral ? Math.max(base.c, options.neutralChroma) : base.c;
  const light = gamutMapOklch({
    l: offsetLightness(base.l, options.lightnessDelta),
    c: chroma,
    h: hue - options.hueShift,
  });
  const dark = gamutMapOklch({
    l: offsetLightness(base.l, -options.lightnessDelta),
    c: chroma,
    h: hue + options.hueShift,
  });
  const nearOpacity = options.punctuation ? 0.28 : neutral ? 0.58 : 0.72;
  const midOpacity = options.punctuation ? 0.12 : neutral ? 0.28 : 0.42;
  const farOpacity = neutral ? 0.12 : 0.2;

  return {
    light: formatRgba(light, parsed.alpha),
    base: formatRgba(parsed, parsed.alpha),
    dark: formatRgba(dark, parsed.alpha),
    glowNear: formatRgba(parsed, parsed.alpha * nearOpacity),
    glowMid: formatRgba(parsed, parsed.alpha * midOpacity),
    glowFar: formatRgba(parsed, parsed.alpha * farOpacity),
    punctuationNear: formatRgba(parsed, parsed.alpha * 0.28),
    punctuationFar: formatRgba(parsed, parsed.alpha * 0.12),
    neutral,
  };
}
