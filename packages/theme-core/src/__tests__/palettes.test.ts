import {
  ORIGINAL_PALETTES,
  PORTED_PALETTES,
  WOODFISH_PALETTES,
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

describe('ported palettes', () => {
  it('carries Woodfish Dark and Dracula over from the VS Code themes', () => {
    expect(PORTED_PALETTES.map((palette) => [palette.slug, palette.label, palette.type])).toEqual([
      ['dark', 'Woodfish Dark', 'dark'],
      ['dracula', 'Woodfish Dracula', 'dark'],
    ]);
    const dracula = PORTED_PALETTES[1];
    // The official Dracula colors, read from the shipped theme file.
    expect(dracula.ui.bg).toBe('#282A36');
    expect(dracula.tokens.keyword).toBe('#FF79C6');
    expect(dracula.tokens.string).toBe('#F1FA8C');
    expect(dracula.tokens.comment).toBe('#6272A4');
  });

  it('uses opaque colors where hosts need them and 16 ANSI entries', () => {
    const opaque = /^#[0-9A-F]{6}$/;
    for (const palette of PORTED_PALETTES) {
      const { ui } = palette;
      for (const color of [
        ui.bg,
        ui.bgDeep,
        ui.bgWidget,
        ui.fg,
        ui.accent,
        ui.accent2,
        ui.success,
        ui.error,
      ]) {
        expect(color).toMatch(opaque);
      }
      expect(Object.values(palette.tokens).every((color) => opaque.test(color))).toBe(true);
      expect(palette.ansi.every((color) => opaque.test(color))).toBe(true);
      expect(palette.ansi).toHaveLength(16);
      // Elevated surfaces sit above the editor in these dark themes.
      expect(paletteContrast(ui.bgWidget, '#000000')).toBeGreaterThan(
        paletteContrast(ui.bg, '#000000')
      );
    }
  });

  it('lists every palette once', () => {
    const slugs = WOODFISH_PALETTES.map((palette) => palette.slug);
    expect(slugs).toEqual(['dark', 'dracula', 'light', 'black', 'neon']);
    expect(new Set(slugs).size).toBe(slugs.length);
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
