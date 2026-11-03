import {
  DEFAULT_ANCHOR_HUE,
  DEFAULT_TEXT_GRADIENT,
  GradientPreset,
  TokenGradientOptions,
  contrastRatio,
  deriveTokenGradient,
  hueDistance,
  isPunctuationOnly,
  normalizeHue,
  offsetLightness,
  parseCssColor,
  pickAccentHue,
  rankPaletteAnchorHue,
  rgbToOklch,
} from '../index';
import { OklchColor } from '../color/types';

const DARK_BACKGROUND = '#1C2433';
const LIGHT_BACKGROUND = '#FBFAF7';

const baseOptions: TokenGradientOptions = {
  anchorHue: DEFAULT_ANCHOR_HUE,
  hueShift: DEFAULT_TEXT_GRADIENT.hueShift,
  lightnessDelta: DEFAULT_TEXT_GRADIENT.lightnessDelta,
  neutralChroma: DEFAULT_TEXT_GRADIENT.neutralChroma,
  punctuation: false,
};

function oklchOf(cssColor: string): OklchColor {
  const parsed = parseCssColor(cssColor);
  if (!parsed) {
    throw new Error(cssColor);
  }
  return rgbToOklch(parsed);
}

function contrastOn(cssColor: string, background: string): number {
  const color = parseCssColor(cssColor);
  const surface = parseCssColor(background);
  if (!color || !surface) {
    throw new Error(`${cssColor} on ${background}`);
  }
  return contrastRatio(color, surface);
}

function signedHueTurn(from: string, to: string): number {
  const turn = normalizeHue(oklchOf(to).h - oklchOf(from).h);
  return turn > 180 ? turn - 360 : turn;
}

function derive(cssColor: string, options: Partial<TokenGradientOptions> = {}) {
  const colors = deriveTokenGradient(cssColor, { ...baseOptions, ...options });
  if (!colors) {
    throw new Error(`no gradient for ${cssColor}`);
  }
  return colors;
}

describe('deriveTokenGradient: colored tokens', () => {
  it('starts at the source color and turns forward along the hue circle', () => {
    const colors = derive('#B78AFF');
    expect(colors.stops).toHaveLength(2);
    expect(colors.stops[0]).toBe('rgba(183, 138, 255, 1)');
    expect(colors.base).toBe('rgba(183, 138, 255, 1)');
    expect(colors.angle).toBeNull();
    expect(colors.preset).toBe(false);
    expect(colors.neutral).toBe(false);
    expect(signedHueTurn('#B78AFF', colors.stops[1])).toBeCloseTo(
      DEFAULT_TEXT_GRADIENT.hueShift,
      0
    );
  });

  it('ends more vivid, like the hand-tuned Woodfish Dark gradients', () => {
    for (const source of ['#B78AFF', '#69C3FF', '#FF955C', '#FF738A']) {
      const colors = derive(source, { background: DARK_BACKGROUND });
      expect(oklchOf(colors.stops[1]).c).toBeGreaterThan(oklchOf(source).c);
    }
    // Woodfish Dark tuned #B78AFF → #f644ff; the derived end lands next to it.
    const purple = derive('#B78AFF', { background: DARK_BACKGROUND });
    expect(hueDistance(oklchOf(purple.stops[1]).h, oklchOf('#f644ff').h)).toBeLessThan(10);
  });

  it('drifts the end toward the lightness where its hue is most vivid', () => {
    // Blue darkens toward its cusp, orange brightens toward yellow.
    expect(oklchOf(derive('#69C3FF').stops[1]).l).toBeLessThan(oklchOf('#69C3FF').l);
    expect(oklchOf(derive('#FF9E3D', { hueShift: 60 }).stops[1]).l).toBeGreaterThan(
      oklchOf('#FF9E3D').l
    );
  });

  it('never changes lightness by more than lightnessDelta', () => {
    const colors = derive('#69C3FF', { lightnessDelta: 0.02 });
    expect(Math.abs(oklchOf(colors.stops[1]).l - oklchOf('#69C3FF').l)).toBeLessThan(0.021);
  });

  it('keeps hue and lightness when shift and lightness change are zero', () => {
    const colors = derive('#ff79c6', { hueShift: 0, lightnessDelta: 0 });
    const end = oklchOf(colors.stops[1]);
    expect(hueDistance(end.h, oklchOf('#ff79c6').h)).toBeLessThan(1);
    expect(end.l).toBeCloseTo(oklchOf('#ff79c6').l, 2);
  });

  it('keeps dim colors such as comments calm', () => {
    const comment = '#4A5E84';
    const colors = derive(comment, { background: DARK_BACKGROUND });
    const end = oklchOf(colors.stops[1]);
    expect(end.l).toBeCloseTo(oklchOf(comment).l, 1);
    expect(end.c).toBeLessThan(0.15);
    expect(signedHueTurn(comment, colors.stops[1])).toBeCloseTo(
      DEFAULT_TEXT_GRADIENT.hueShift / 2,
      0
    );
  });

  it('turns punctuation half as far, dims its glow and keeps the source alpha', () => {
    const colors = derive('rgba(255, 215, 0, 0.5)', { punctuation: true });
    expect(signedHueTurn('#ffd700', colors.stops[1])).toBeCloseTo(
      DEFAULT_TEXT_GRADIENT.hueShift / 2,
      0
    );
    expect(colors.stops.every((stop) => stop.endsWith(', 0.5)'))).toBe(true);
    expect(colors.glowNear).toBe('rgba(255, 215, 0, 0.14)');
    expect(colors.glowMid).toBe('rgba(255, 215, 0, 0.06)');
    expect(colors.punctuationNear).toBe('rgba(255, 215, 0, 0.14)');
    expect(colors.punctuationFar).toBe('rgba(255, 215, 0, 0.06)');
  });

  it('glows in a bright tint of the hue on light backgrounds, never a dark halo', () => {
    for (const source of ['#1F5FBF', '#B4235A', '#24292F']) {
      const colors = derive(source, { background: LIGHT_BACKGROUND, anchorHue: 250 });
      const glow = oklchOf(colors.glowNear);
      expect(glow.l).toBeGreaterThan(oklchOf(source).l + 0.2);
      if (!colors.neutral) {
        expect(hueDistance(glow.h, oklchOf(source).h)).toBeLessThan(8);
        expect(glow.c).toBeGreaterThanOrEqual(0.1);
      }
    }
    // Hand-tuned stops do not change the glow rule.
    const preset: GradientPreset = {
      slug: 'test',
      background: LIGHT_BACKGROUND,
      foreground: '#24292F',
      tokens: { '#1F5FBF': { angle: 45, stops: ['#1f5fbf', '#5b3fd6'] } },
    };
    expect(
      oklchOf(derive('#1F5FBF', { background: LIGHT_BACKGROUND, preset }).glowNear).l
    ).toBeGreaterThan(0.7);
    // On a dark background the text is already brighter than what it shines on.
    expect(derive('#69C3FF', { background: DARK_BACKGROUND }).glowNear).toBe(
      'rgba(105, 195, 255, 0.72)'
    );
  });

  it('keeps every stop at least as readable as the source, up to 4.5:1', () => {
    const cases: Array<[string, string]> = [
      ['#1F5FBF', LIGHT_BACKGROUND],
      ['#0B7568', LIGHT_BACKGROUND],
      ['#8A6200', LIGHT_BACKGROUND],
      ['#69C3FF', DARK_BACKGROUND],
      ['#E35535', DARK_BACKGROUND],
      ['#6272A4', '#282A36'],
    ];
    for (const [source, background] of cases) {
      const required = Math.min(4.5, contrastOn(source, background));
      for (const stop of derive(source, { background }).stops) {
        expect(contrastOn(stop, background)).toBeGreaterThanOrEqual(required - 0.01);
      }
    }
  });
});

describe('deriveTokenGradient: neutral text', () => {
  it('gives the foreground a soft rainbow that is never dimmer than the text', () => {
    const colors = derive('#D0D7E4', {
      background: DARK_BACKGROUND,
      foreground: '#D0D7E4',
      anchorHue: 347,
    });
    expect(colors.neutral).toBe(true);
    expect(colors.stops).toHaveLength(9);
    expect(colors.stops[0]).toBe(colors.stops[8]);
    const source = oklchOf('#D0D7E4');
    const hues = colors.stops.slice(0, 8).map((stop) => oklchOf(stop).h);
    for (let index = 1; index < hues.length; index += 1) {
      expect(hueDistance(hues[index], hues[index - 1])).toBeGreaterThan(25);
    }
    const lightness = colors.stops.map((stop) => oklchOf(stop).l);
    // Hues without room for color at this lightness (violet) dip slightly, as the hand-tuned
    // #d7c4ff does; the rainbow as a whole is not dimmer than the text.
    expect(Math.min(...lightness)).toBeGreaterThanOrEqual(source.l - 0.04);
    expect(lightness.reduce((sum, value) => sum + value, 0) / lightness.length).toBeGreaterThan(
      source.l
    );
    for (const stop of colors.stops) {
      expect(oklchOf(stop).c).toBeGreaterThan(0.04);
      expect(oklchOf(stop).c).toBeLessThan(0.11);
    }
  });

  it('makes room for color on near-white text', () => {
    const colors = derive('#F8F8F2', { background: '#282A36', foreground: '#F8F8F2' });
    for (const stop of colors.stops) {
      expect(oklchOf(stop).c).toBeGreaterThan(0.05);
    }
  });

  it('gives a readable dark rainbow on a light background', () => {
    const colors = derive('#24292F', { background: LIGHT_BACKGROUND, foreground: '#24292F' });
    expect(colors.stops).toHaveLength(9);
    for (const stop of colors.stops) {
      expect(contrastOn(stop, LIGHT_BACKGROUND)).toBeGreaterThanOrEqual(4.5);
      // Near-black text steps toward the background to make room for color, within lightnessDelta.
      expect(Math.abs(oklchOf(stop).l - oklchOf('#24292F').l)).toBeLessThanOrEqual(
        DEFAULT_TEXT_GRADIENT.lightnessDelta + 0.003
      );
    }
  });

  it('only drifts other neutrals gently toward the anchor hue', () => {
    const colors = derive('#AFBBD2', {
      background: DARK_BACKGROUND,
      foreground: '#D0D7E4',
      anchorHue: 200,
    });
    expect(colors.stops).toHaveLength(2);
    expect(colors.stops[0]).toBe('rgba(175, 187, 210, 1)');
    expect(oklchOf(colors.stops[1]).c).toBeLessThan(0.06);
  });

  it('treats readable neutrals as body text when the host gives no foreground', () => {
    expect(derive('rgb(255, 255, 255)').stops).toHaveLength(9);
    expect(derive('#646C7A', { background: DARK_BACKGROUND }).stops).toHaveLength(2);
    const white = derive('rgb(255, 255, 255)');
    expect(white.glowNear).toBe('rgba(255, 255, 255, 0.58)');
    expect(white.glowFar).toBe('rgba(255, 255, 255, 0.12)');
  });

  it('returns null for unreadable colors', () => {
    expect(deriveTokenGradient('inherit', baseOptions)).toBeNull();
  });
});

describe('deriveTokenGradient: hand-tuned presets', () => {
  const preset: GradientPreset = {
    slug: 'test',
    background: '#000000',
    foreground: '#EEEEEE',
    tokens: { '#B78AFF': { angle: 45, stops: ['#b78aff', '#f644ff'] } },
  };

  it('uses the preset gradient and angle for a matching color', () => {
    const colors = derive('rgb(183, 138, 255)', { preset });
    expect(colors.stops).toEqual(['#b78aff', '#f644ff']);
    expect(colors.angle).toBe(45);
    expect(colors.preset).toBe(true);
    expect(colors.glowNear).toBe('rgba(183, 138, 255, 0.72)');
  });

  it('derives colors the preset does not cover, and translucent variants', () => {
    expect(derive('#69C3FF', { preset }).preset).toBe(false);
    const translucent = derive('rgba(183, 138, 255, 0.6)', { preset });
    expect(translucent.preset).toBe(false);
    expect(translucent.angle).toBeNull();
  });
});

describe('offsetLightness', () => {
  it('mirrors the step when it would leave [0, 1]', () => {
    expect(offsetLightness(0.5, 0.1)).toBeCloseTo(0.6);
    expect(offsetLightness(0.97, 0.06)).toBeCloseTo(0.91);
    expect(offsetLightness(0.02, -0.06)).toBeCloseTo(0.08);
  });
});

describe('anchor hue selection', () => {
  it('detects punctuation-only text, including non-breaking spaces', () => {
    expect(isPunctuationOnly('{')).toBe(true);
    expect(isPunctuationOnly(' => ')).toBe(true);
    expect(isPunctuationOnly('foo')).toBe(false);
    expect(isPunctuationOnly('   ')).toBe(false);
  });

  it('ranks palette colors by occurrences times chroma and ignores dull colors', () => {
    const pink = 'rgb(255, 121, 198)';
    const cyan = 'rgb(139, 233, 253)';
    expect(rankPaletteAnchorHue([cyan, pink, pink, pink])).toBeCloseTo(oklchOf(pink).h, 6);
    expect(rankPaletteAnchorHue(['rgb(200, 200, 200)', 'rgb(20, 20, 60)', 'bad'])).toBeNull();
  });

  it('picks the most saturated accent and skips neutral ones', () => {
    expect(pickAccentHue(['#f8f8f2', '#bd93f9', '#ff79c6', ''])).toBeCloseTo(
      oklchOf('#ff79c6').h,
      6
    );
    expect(pickAccentHue(['#888888', ''])).toBeNull();
  });
});
