import {
  GRADIENT_PRESETS,
  WOODFISH_PALETTES,
  contrastRatio,
  detectGradientPreset,
  findGradientPreset,
  gamutCusp,
  maxChromaInGamut,
  parseCssColor,
} from '../index';

function contrastOn(cssColor: string, background: string): number {
  const color = parseCssColor(cssColor);
  const surface = parseCssColor(background);
  if (!color || !surface) {
    throw new Error(`${cssColor} on ${background}`);
  }
  return contrastRatio(color, surface);
}

describe('built-in gradient presets', () => {
  it('has one preset per Woodfish theme, recognised by its editor colors', () => {
    // The bundled popular themes have no hand tuning; their gradients are derived.
    const own = ['dark', 'dracula', 'light', 'black', 'neon'];
    expect(GRADIENT_PRESETS.map((preset) => preset.slug).sort()).toEqual([...own].sort());
    for (const palette of WOODFISH_PALETTES.filter((entry) => own.includes(entry.slug))) {
      const preset = findGradientPreset(palette.slug);
      expect(preset?.background).toBe(palette.ui.bg);
      expect(preset?.foreground).toBe(palette.ui.fg);
      expect(detectGradientPreset(palette.ui.bg.toLowerCase(), palette.ui.fg)).toBe(preset);
    }
  });

  it('recognises computed rgb() colors and ignores other themes', () => {
    expect(detectGradientPreset('rgb(28, 36, 51)', 'rgb(208, 215, 228)')?.slug).toBe('dark');
    expect(detectGradientPreset('#1E1E1E', '#D4D4D4')).toBeNull();
    expect(detectGradientPreset('', '')).toBeNull();
    expect(findGradientPreset(null)).toBeNull();
    expect(findGradientPreset('unknown')).toBeNull();
  });

  it('keeps the original Woodfish Dark tuning byte for byte', () => {
    const dark = findGradientPreset('dark');
    expect(dark?.tokens['#EACD61']).toEqual({ angle: 45, stops: ['#eacd61', '#ea618e'] });
    expect(dark?.tokens['#69C3FF'].stops).toEqual(['#00d4ff', '#1a94ff']);
    expect(dark?.tokens['#3CEC85'].stops).toEqual(['#00ff04', '#00ff99']);
    expect(dark?.tokens['#B78AFF'].stops).toEqual(['#b78aff', '#f644ff']);
    expect(dark?.tokens['#FF955C'].stops).toEqual(['#ff9900', '#eaff00']);
    expect(dark?.tokens['#22ECDB'].stops).toEqual(['#22ecdb', '#00bbff']);
    expect(dark?.tokens['#FF738A'].stops).toEqual(['#ff738a', '#ff7349']);
    expect(dark?.tokens['#D0D7E4']).toEqual({
      angle: 135,
      stops: [
        '#ffc1e0',
        '#ffd5c6',
        '#fff6c5',
        '#e0ffc1',
        '#bdffff',
        '#c3e1ff',
        '#d7c4ff',
        '#ffc0ff',
        '#ffc8e5',
      ],
    });
  });

  it('uses upper-case #RRGGBB keys and valid stops', () => {
    for (const preset of GRADIENT_PRESETS) {
      for (const [key, gradient] of Object.entries(preset.tokens)) {
        expect(key).toMatch(/^#[0-9A-F]{6}$/);
        expect(gradient.stops.length).toBeGreaterThanOrEqual(2);
        for (const stop of gradient.stops) {
          expect(parseCssColor(stop)).not.toBeNull();
        }
      }
    }
  });

  it('keeps every tuned stop at least as readable as its token, up to 4.5:1', () => {
    for (const preset of GRADIENT_PRESETS) {
      for (const [key, gradient] of Object.entries(preset.tokens)) {
        const required = Math.min(4.5, contrastOn(key, preset.background));
        for (const stop of gradient.stops) {
          expect({
            preset: preset.slug,
            key,
            stop,
            ok: contrastOn(stop, preset.background) >= required - 0.05,
          }).toEqual({
            preset: preset.slug,
            key,
            stop,
            ok: true,
          });
        }
      }
    }
  });
});

describe('sRGB gamut helpers', () => {
  it('finds the most vivid lightness of a hue', () => {
    const yellow = gamutCusp(110);
    const blue = gamutCusp(264);
    expect(yellow.l).toBeGreaterThan(0.9);
    expect(blue.l).toBeLessThan(0.55);
    expect(blue.c).toBeGreaterThan(0.25);
  });

  it('has no chroma at black and white', () => {
    expect(maxChromaInGamut(0, 120)).toBe(0);
    expect(maxChromaInGamut(1, 120)).toBe(0);
    expect(maxChromaInGamut(0.7, 150)).toBeGreaterThan(0.15);
  });
});
