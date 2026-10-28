import {
  contrastRatio,
  formatRgba,
  gamutMapOklch,
  hueDistance,
  isInSrgbGamut,
  isValidCssColor,
  normalizeHue,
  oklchToRgb,
  parseCssColor,
  requireCssColor,
  rgbToOklch,
  withHexAlpha,
} from '../index';

describe('parseCssColor', () => {
  it('reads short and long hex with optional alpha', () => {
    expect(parseCssColor('#fff')).toEqual({ r: 255, g: 255, b: 255, alpha: 1 });
    expect(parseCssColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, alpha: 128 / 255 });
    expect(parseCssColor('  #1F5FBF ')).toEqual({ r: 31, g: 95, b: 191, alpha: 1 });
  });

  it('reads computed rgb()/rgba() channels and clamps them', () => {
    expect(parseCssColor('rgb(255, 85, 85)')).toEqual({ r: 255, g: 85, b: 85, alpha: 1 });
    expect(parseCssColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30, alpha: 0.5 });
    expect(parseCssColor('rgb(300, -4, 12)')).toEqual({ r: 255, g: 0, b: 12, alpha: 1 });
  });

  it('returns null when no color can be read, and requireCssColor throws', () => {
    expect(parseCssColor('')).toBeNull();
    expect(parseCssColor('transparent')).toBeNull();
    expect(() => requireCssColor('nope')).toThrow('Invalid color: nope');
  });
});

describe('OKLCH conversion', () => {
  it('matches reference OKLCH values for sRGB primaries', () => {
    const white = rgbToOklch({ r: 255, g: 255, b: 255 });
    expect(white.l).toBeCloseTo(1, 4);
    expect(white.c).toBeLessThan(1e-4);

    const red = rgbToOklch({ r: 255, g: 0, b: 0 });
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
  });

  it('round-trips in-gamut colors', () => {
    for (const color of [
      { r: 31, g: 95, b: 191 },
      { r: 234, g: 205, b: 97 },
      { r: 1, g: 255, b: 195 },
    ]) {
      const back = oklchToRgb(rgbToOklch(color));
      expect(back.r).toBeCloseTo(color.r, 3);
      expect(back.g).toBeCloseTo(color.g, 3);
      expect(back.b).toBeCloseTo(color.b, 3);
    }
  });

  it('gamut-maps by reducing chroma while keeping the result displayable', () => {
    const outOfGamut = { l: 0.7, c: 0.4, h: 150 };
    expect(isInSrgbGamut(oklchToRgb(outOfGamut))).toBe(false);
    const mapped = gamutMapOklch(outOfGamut);
    expect(isInSrgbGamut(mapped)).toBe(true);
    expect(rgbToOklch(mapped).l).toBeCloseTo(0.7, 2);

    const inGamut = { l: 0.6, c: 0.05, h: 40 };
    expect(gamutMapOklch(inGamut)).toEqual(oklchToRgb(inGamut));
  });

  it('normalizes hues and measures the shortest angular distance', () => {
    expect(normalizeHue(-30)).toBe(330);
    expect(normalizeHue(725)).toBe(5);
    expect(hueDistance(-170, 170)).toBe(20);
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
  });
});

describe('formatting and contrast', () => {
  it('formats clamped rgba strings', () => {
    expect(formatRgba({ r: 300.4, g: -2, b: 127.5 }, 0.123456)).toBe('rgba(255, 0, 128, 0.1235)');
    expect(withHexAlpha('#1F5FBF', 0.35)).toBe('#1F5FBF59');
  });

  it('computes WCAG contrast symmetrically', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, white)).toBe(1);
  });
});

describe('isValidCssColor', () => {
  it('accepts hex, named and numeric functional colors', () => {
    for (const color of [
      '#abc',
      '#AABBCCDD',
      'rebeccapurple',
      'rgb(1, 2, 3)',
      'rgba(1 2 3 / 50%)',
      'hsl(120, 50%, 50%)',
    ]) {
      expect(isValidCssColor(color)).toBe(true);
    }
  });

  it('rejects variables, functions and out-of-range channels', () => {
    for (const color of [
      'var(--x)',
      'color-mix(in srgb, red, blue)',
      'rgb(256, 0, 0)',
      'rgba(1, 2, 3)',
      'hsl(120, 50, 50%)',
      '#abcde',
      'notacolor',
    ]) {
      expect(isValidCssColor(color)).toBe(false);
    }
  });
});
