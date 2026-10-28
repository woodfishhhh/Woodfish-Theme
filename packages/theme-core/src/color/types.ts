/** sRGB color with 0-255 channels. Channels may be fractional or out of gamut mid-computation. */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/** sRGB color with a 0-1 alpha channel. */
export interface RgbaColor extends RgbColor {
  alpha: number;
}

/** OKLCH color: lightness 0-1, chroma 0-~0.4, hue in degrees. */
export interface OklchColor {
  l: number;
  c: number;
  h: number;
}
