import {
  CURSOR_RANGES,
  DEFAULT_CURSOR,
  DEFAULT_GLASS,
  DEFAULT_NATIVE_WINDOW,
  DEFAULT_TEXT_GRADIENT,
  EFFECT_INPUT_LIMITS,
  GLASS_RANGES,
  GLOW_RANGES,
  NATIVE_WINDOW_RANGES,
  TEXT_GRADIENT_RANGES,
  containsUnsafeCss,
  normalizeCursor,
  normalizeGlass,
  normalizeGlow,
  normalizeNativeWindow,
  normalizeTextGradient,
  sanitizeCustomCssRules,
  sanitizeEnum,
  sanitizeGradientStops,
  sanitizeNumber,
} from '../index';

describe('effect defaults', () => {
  it('keeps every default inside its declared range', () => {
    const pairs: Array<
      [Record<string, unknown>, Record<string, { minimum: number; maximum: number }>]
    > = [
      [DEFAULT_TEXT_GRADIENT as unknown as Record<string, unknown>, TEXT_GRADIENT_RANGES],
      [{ intensity: 1 }, GLOW_RANGES],
      [DEFAULT_CURSOR as unknown as Record<string, unknown>, CURSOR_RANGES],
      [DEFAULT_GLASS as unknown as Record<string, unknown>, GLASS_RANGES],
      [DEFAULT_NATIVE_WINDOW as unknown as Record<string, unknown>, NATIVE_WINDOW_RANGES],
    ];
    for (const [defaults, ranges] of pairs) {
      for (const [key, range] of Object.entries(ranges)) {
        const value = defaults[key] as number;
        expect(value).toBeGreaterThanOrEqual(range.minimum);
        expect(value).toBeLessThanOrEqual(range.maximum);
      }
    }
  });

  it('freezes shared defaults so hosts cannot mutate them', () => {
    expect(Object.isFrozen(DEFAULT_TEXT_GRADIENT)).toBe(true);
    expect(Object.isFrozen(DEFAULT_CURSOR.gradientStops)).toBe(true);
    for (const ranges of [
      TEXT_GRADIENT_RANGES,
      GLOW_RANGES,
      CURSOR_RANGES,
      GLASS_RANGES,
      NATIVE_WINDOW_RANGES,
    ]) {
      expect(Object.isFrozen(ranges)).toBe(true);
      expect(Object.values(ranges).every((range) => Object.isFrozen(range))).toBe(true);
    }
  });
});

describe('normalizers', () => {
  it('fills defaults for missing or invalid values', () => {
    expect(normalizeTextGradient()).toEqual(DEFAULT_TEXT_GRADIENT);
    expect(normalizeTextGradient({ hueShift: 'big', angle: Number.NaN })).toEqual(
      DEFAULT_TEXT_GRADIENT
    );
    expect(normalizeGlow({ intensity: null })).toEqual({ intensity: 1 });
    expect(normalizeGlass({ mode: 'frosted' }).mode).toBe('blur');
    expect(normalizeNativeWindow({ windowsMaterial: 'glass' })).toEqual(DEFAULT_NATIVE_WINDOW);
  });

  it('treats null input like missing input', () => {
    expect(normalizeTextGradient(null)).toEqual(DEFAULT_TEXT_GRADIENT);
    expect(normalizeGlow(null)).toEqual({ intensity: 1 });
    expect(normalizeCursor(null).gradientStops).toEqual([...DEFAULT_CURSOR.gradientStops]);
    expect(normalizeGlass(null)).toEqual(DEFAULT_GLASS);
    expect(normalizeNativeWindow(null)).toEqual(DEFAULT_NATIVE_WINDOW);
  });

  it('clamps numbers into range', () => {
    expect(normalizeTextGradient({ hueShift: 999, lightnessDelta: -1 })).toMatchObject({
      hueShift: 180,
      lightnessDelta: 0,
    });
    expect(normalizeCursor({ animationDuration: 0, glowOpacity: 5 })).toMatchObject({
      animationDuration: 1,
      glowOpacity: 1,
    });
    expect(normalizeGlass({ blur: 100, saturate: 50, mode: 'acrylic' })).toMatchObject({
      blur: 60,
      saturate: 100,
      mode: 'acrylic',
    });
  });

  it('returns a fresh gradient stop array each time', () => {
    const first = normalizeCursor();
    first.gradientStops.push('#000');
    expect(normalizeCursor().gradientStops).toEqual([...DEFAULT_CURSOR.gradientStops]);
  });
});

describe('sanitizers', () => {
  it('sanitizes numbers and enums', () => {
    expect(sanitizeNumber(5, 1, { minimum: 0, maximum: 3 })).toBe(3);
    expect(sanitizeNumber(Infinity, 1, { minimum: 0, maximum: 3 })).toBe(1);
    expect(sanitizeEnum('b', ['a', 'b'] as const, 'a')).toBe('b');
    expect(sanitizeEnum(2, ['a', 'b'] as const, 'a')).toBe('a');
  });

  it('detects unsafe CSS even when it is escaped or commented', () => {
    expect(containsUnsafeCss('a { background: url(x) }')).toBe(true);
    expect(containsUnsafeCss('@im/**/port "x";')).toBe(true);
    expect(containsUnsafeCss('@\\69mport "x";')).toBe(true);
    expect(containsUnsafeCss('</style><script>')).toBe(true);
    expect(containsUnsafeCss('a { color: red }')).toBe(false);
  });

  it('keeps safe custom rules within count and size limits', () => {
    const rules = sanitizeCustomCssRules([
      ' a { color: red } ',
      '',
      42,
      'b { background: url(evil) }',
      'x'.repeat(EFFECT_INPUT_LIMITS.customRuleLength + 1),
    ]);
    expect(rules).toEqual(['a { color: red }']);
    expect(sanitizeCustomCssRules('a {}')).toEqual([]);
    expect(
      sanitizeCustomCssRules(Array.from({ length: 40 }, (_, index) => `.r${index} {}`))
    ).toHaveLength(EFFECT_INPUT_LIMITS.customRuleCount);
  });

  it('keeps valid gradient stops and falls back below two', () => {
    expect(sanitizeGradientStops(['#fff', 'url(x)', ' red '], ['#000', '#111'])).toEqual([
      '#fff',
      'red',
    ]);
    expect(sanitizeGradientStops(['#fff'], ['#000', '#111'])).toEqual(['#000', '#111']);
    expect(sanitizeGradientStops('nope', ['#000', '#111'])).toEqual(['#000', '#111']);
  });
});
