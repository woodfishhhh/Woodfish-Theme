import {
  ORIGINAL_PALETTES,
  WoodfishPalette,
  isValidCssColor,
  paletteContrast,
  paletteHueDistance,
  validatePalette,
} from '../index';

describe('original palettes', () => {
  it('ships Light, Black and Neon with unique slugs', () => {
    expect(ORIGINAL_PALETTES.map((palette) => palette.label)).toEqual([
      'Woodfish Light',
      'Woodfish Black',
      'Woodfish Neon',
    ]);
    expect(new Set(ORIGINAL_PALETTES.map((palette) => palette.slug)).size).toBe(3);
  });

  it('passes every readability rule', () => {
    for (const palette of ORIGINAL_PALETTES) {
      expect(validatePalette(palette)).toEqual([]);
    }
  });

  it('uses only valid colors and 16 ANSI entries', () => {
    for (const palette of ORIGINAL_PALETTES) {
      const colors = [...Object.values(palette.ui), ...Object.values(palette.tokens)];
      expect(colors.every(isValidCssColor)).toBe(true);
      expect(palette.ansi).toHaveLength(16);
    }
  });
});

describe('validatePalette', () => {
  const base = ORIGINAL_PALETTES[1];

  function withTokens(tokens: Partial<WoodfishPalette['tokens']>): WoodfishPalette {
    return { ...base, tokens: { ...base.tokens, ...tokens } };
  }

  it('reports tokens without enough contrast', () => {
    const problems = validatePalette(withTokens({ string: '#111111' }));
    expect(problems.some((problem) => problem.startsWith('string #111111 contrast'))).toBe(true);
  });

  it('reports keyword and variable hues that are too close', () => {
    const problems = validatePalette(withTokens({ keyword: '#EA618E', variable: '#F07AA0' }));
    expect(problems.some((problem) => problem.startsWith('keyword/variable hue distance'))).toBe(
      true
    );
  });

  it('measures contrast and hue distance on palette strings', () => {
    expect(paletteContrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(paletteHueDistance('#FF0000', '#FF0000')).toBe(0);
  });
});
