import {
  DEFAULT_ANCHOR_HUE,
  DEFAULT_TEXT_GRADIENT,
  deriveTokenGradient,
  isPunctuationOnly,
  offsetLightness,
  pickAccentHue,
  rankPaletteAnchorHue,
  rgbToOklch,
  parseCssColor,
} from '../index';

const baseOptions = {
  anchorHue: DEFAULT_ANCHOR_HUE,
  hueShift: DEFAULT_TEXT_GRADIENT.hueShift,
  lightnessDelta: DEFAULT_TEXT_GRADIENT.lightnessDelta,
  neutralChroma: DEFAULT_TEXT_GRADIENT.neutralChroma,
  punctuation: false,
};

function hueOf(cssColor: string): number {
  const parsed = parseCssColor(cssColor);
  if (!parsed) {
    throw new Error(cssColor);
  }
  return rgbToOklch(parsed).h;
}

describe('deriveTokenGradient', () => {
  it('keeps the original color in the middle and rotates hue at both ends', () => {
    const colors = deriveTokenGradient('rgb(97, 175, 234)', baseOptions);
    expect(colors).not.toBeNull();
    if (!colors) {
      return;
    }
    expect(colors.base).toBe('rgba(97, 175, 234, 1)');
    expect(colors.neutral).toBe(false);
    const baseHue = hueOf('rgb(97, 175, 234)');
    expect(hueOf(colors.light)).toBeLessThan(baseHue);
    expect(hueOf(colors.dark)).toBeGreaterThan(baseHue);
    expect(colors.glowNear).toBe('rgba(97, 175, 234, 0.72)');
    expect(colors.glowMid).toBe('rgba(97, 175, 234, 0.42)');
    expect(colors.glowFar).toBe('rgba(97, 175, 234, 0.2)');
  });

  it('gives neutral text the anchor hue and a softer glow', () => {
    const colors = deriveTokenGradient('rgb(255, 255, 255)', { ...baseOptions, anchorHue: 200 });
    expect(colors?.neutral).toBe(true);
    expect(colors?.base).toBe('rgba(255, 255, 255, 1)');
    expect(colors?.light).not.toBe(colors?.base);
    expect(colors?.dark).not.toBe(colors?.base);
    expect(colors?.glowNear).toBe('rgba(255, 255, 255, 0.58)');
    expect(colors?.glowFar).toBe('rgba(255, 255, 255, 0.12)');
  });

  it('dims punctuation glow and keeps the source alpha', () => {
    const colors = deriveTokenGradient('rgba(255, 215, 0, 0.5)', {
      ...baseOptions,
      punctuation: true,
    });
    expect(colors?.glowNear).toBe('rgba(255, 215, 0, 0.14)');
    expect(colors?.glowMid).toBe('rgba(255, 215, 0, 0.06)');
    expect(colors?.punctuationNear).toBe('rgba(255, 215, 0, 0.14)');
    expect(colors?.punctuationFar).toBe('rgba(255, 215, 0, 0.06)');
  });

  it('collapses to the base color when shift and lightness change are zero', () => {
    const colors = deriveTokenGradient('#ff79c6', {
      ...baseOptions,
      hueShift: 0,
      lightnessDelta: 0,
    });
    expect(colors?.light).toBe(colors?.base);
    expect(colors?.dark).toBe(colors?.base);
  });

  it('returns null for unreadable colors', () => {
    expect(deriveTokenGradient('inherit', baseOptions)).toBeNull();
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
    expect(isPunctuationOnly(' => ')).toBe(true);
    expect(isPunctuationOnly('foo')).toBe(false);
    expect(isPunctuationOnly('   ')).toBe(false);
  });

  it('ranks palette colors by occurrences times chroma and ignores dull colors', () => {
    const pink = 'rgb(255, 121, 198)';
    const cyan = 'rgb(139, 233, 253)';
    expect(rankPaletteAnchorHue([cyan, pink, pink, pink])).toBeCloseTo(hueOf(pink), 6);
    expect(rankPaletteAnchorHue(['rgb(200, 200, 200)', 'rgb(20, 20, 60)', 'bad'])).toBeNull();
  });

  it('picks the most saturated accent and skips neutral ones', () => {
    expect(pickAccentHue(['#f8f8f2', '#bd93f9', '#ff79c6', ''])).toBeCloseTo(hueOf('#ff79c6'), 6);
    expect(pickAccentHue(['#888888', ''])).toBeNull();
  });
});
