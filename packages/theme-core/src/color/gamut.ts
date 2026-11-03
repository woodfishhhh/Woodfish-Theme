import { isInSrgbGamut, normalizeHue, oklchToRgb } from './oklch';
import { OklchColor } from './types';

/** Upper bound for the chroma search; no sRGB color exceeds it. */
const CHROMA_CEILING = 0.4;
const BISECTION_STEPS = 18;
const CUSP_LIGHTNESS_SAMPLES = 48;

/** Highest OKLCH chroma that still fits in sRGB at this lightness and hue. */
export function maxChromaInGamut(lightness: number, hue: number): number {
  if (lightness <= 0 || lightness >= 1) {
    return 0;
  }

  let minimum = 0;
  let maximum = CHROMA_CEILING;
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const candidate = (minimum + maximum) / 2;
    if (isInSrgbGamut(oklchToRgb({ l: lightness, c: candidate, h: hue }))) {
      minimum = candidate;
    } else {
      maximum = candidate;
    }
  }
  return minimum;
}

const cuspCache = new Map<number, OklchColor>();

/**
 * The most saturated sRGB color of a hue (the gamut "cusp"): the lightness at which the
 * hue reaches its highest chroma. Yellow peaks near white, blue far below it.
 */
export function gamutCusp(hue: number): OklchColor {
  const key = Math.round(normalizeHue(hue) * 2) / 2;
  const cached = cuspCache.get(key);
  if (cached) {
    return cached;
  }

  let best: OklchColor = { l: 0.5, c: 0, h: key };
  for (let sample = 1; sample < CUSP_LIGHTNESS_SAMPLES; sample += 1) {
    const lightness = sample / CUSP_LIGHTNESS_SAMPLES;
    const chroma = maxChromaInGamut(lightness, key);
    if (chroma > best.c) {
      best = { l: lightness, c: chroma, h: key };
    }
  }
  cuspCache.set(key, best);
  return best;
}
