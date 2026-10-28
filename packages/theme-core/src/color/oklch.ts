import { OklchColor, RgbColor } from './types';

export function srgbToLinear(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(value: number): number {
  const channel = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return channel * 255;
}

/** Converts sRGB to OKLCH. The hue is the raw `atan2` angle in (-180, 180]. */
export function rgbToOklch(color: RgbColor): OklchColor {
  const red = srgbToLinear(color.r);
  const green = srgbToLinear(color.g);
  const blue = srgbToLinear(color.b);
  const lightRoot = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const mediumRoot = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const shortRoot = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  const lightness = 0.2104542553 * lightRoot + 0.793617785 * mediumRoot - 0.0040720468 * shortRoot;
  const a = 1.9779984951 * lightRoot - 2.428592205 * mediumRoot + 0.4505937099 * shortRoot;
  const b = 0.0259040371 * lightRoot + 0.7827717662 * mediumRoot - 0.808675766 * shortRoot;

  return {
    l: lightness,
    c: Math.hypot(a, b),
    h: (Math.atan2(b, a) * 180) / Math.PI,
  };
}

/** Converts OKLCH to sRGB without clamping; check {@link isInSrgbGamut} or use {@link gamutMapOklch}. */
export function oklchToRgb(color: OklchColor): RgbColor {
  const hue = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hue);
  const b = color.c * Math.sin(hue);
  const lightRoot = color.l + 0.3963377774 * a + 0.2158037573 * b;
  const mediumRoot = color.l - 0.1055613458 * a - 0.0638541728 * b;
  const shortRoot = color.l - 0.0894841775 * a - 1.291485548 * b;
  const light = lightRoot ** 3;
  const medium = mediumRoot ** 3;
  const short = shortRoot ** 3;

  return {
    r: linearToSrgb(4.0767416621 * light - 3.3077115913 * medium + 0.2309699292 * short),
    g: linearToSrgb(-1.2684380046 * light + 2.6097574011 * medium - 0.3413193965 * short),
    b: linearToSrgb(-0.0041960863 * light - 0.7034186147 * medium + 1.707614701 * short),
  };
}

export function isInSrgbGamut(color: RgbColor): boolean {
  return [color.r, color.g, color.b].every(
    (channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255
  );
}

/** Keeps lightness and hue, and bisects chroma down until the color fits in sRGB. */
export function gamutMapOklch(color: OklchColor): RgbColor {
  const direct = oklchToRgb(color);
  if (isInSrgbGamut(direct)) {
    return direct;
  }

  let minimumChroma = 0;
  let maximumChroma = color.c;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const candidateChroma = (minimumChroma + maximumChroma) / 2;
    const candidate = oklchToRgb({ ...color, c: candidateChroma });
    if (isInSrgbGamut(candidate)) {
      minimumChroma = candidateChroma;
    } else {
      maximumChroma = candidateChroma;
    }
  }

  return oklchToRgb({ ...color, c: minimumChroma });
}

/** Maps any hue angle to [0, 360). */
export function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/** Shortest angular distance between two hues, in degrees (0-180). */
export function hueDistance(left: number, right: number): number {
  const distance = Math.abs(left - right) % 360;
  return distance > 180 ? 360 - distance : distance;
}
