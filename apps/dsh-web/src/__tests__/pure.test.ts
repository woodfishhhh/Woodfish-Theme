import { WOODFISH_PALETTES, normalizeEffectManifest } from '@woodfish/theme-core';
import {
  BODY_TEXT_SELECTOR,
  CODE_ROOT_SELECTOR,
  CODE_TOKEN_SELECTOR,
  DEFAULT_DSH_PERSISTED_CONFIG,
  DEFAULT_DSH_SETTINGS,
  DSH_DEFAULT_BACKGROUND_ID,
  DSH_GRADIENT_BACKGROUND_ID,
  DSH_SELECTORS,
  DSH_STYLE_NAMES,
  SQUIRCLE_K,
  applyDshEffectOverrides,
  buildBackgroundCss,
  buildCodeCss,
  buildCornerCss,
  buildDshCss,
  buildPaletteCss,
  buildPaletteVariables,
  buildShikiVariables,
  composeDshCoreView,
  dshPalettes,
  fromPersistedConfig,
  modeScope,
  normalizeBackgroundId,
  normalizeDshSettings,
  selectorOf,
  toPersistedConfig,
} from '../index';

/** Braces balance and no value was left unresolved. */
function expectWellFormed(css: string): void {
  expect(css.split('{').length).toBe(css.split('}').length);
  expect(css).not.toMatch(/undefined|NaN|null|\[object/);
}

describe('selectors', () => {
  const all = Object.values(DSH_SELECTORS).flatMap((group) => group.selectors);

  it('never hardcode hashed CSS-module classes', () => {
    for (const selector of all) {
      const classes = [...selector.matchAll(/\.([A-Za-z_-][\w-]*)/g)].map((match) => match[1]);
      expect({
        selector,
        classes: classes.filter((name) => !['shiki', 'line'].includes(name)),
      }).toEqual({ selector, classes: [] });
    }
  });

  it('are parseable and keep a description', () => {
    for (const [group, definition] of Object.entries(DSH_SELECTORS)) {
      expect(definition.selectors.length).toBeGreaterThan(0);
      expect(definition.description.length).toBeGreaterThan(0);
      expect(() => document.querySelectorAll(definition.selectors.join(', '))).not.toThrow();
      expect(selectorOf(group as keyof typeof DSH_SELECTORS)).toBe(definition.selectors.join(', '));
    }
  });

  it('cover both Shiki code blocks and file diffs', () => {
    expect(CODE_ROOT_SELECTOR).toContain('[data-code-block-content]');
    expect(CODE_ROOT_SELECTOR).toContain('[data-diff]');
    expect(CODE_TOKEN_SELECTOR).toContain('[data-code-block-content] pre.shiki .line > span');
    expect(CODE_TOKEN_SELECTOR).toContain('[data-diff-code] > span');
  });

  it('scope modes above dsh variable blocks', () => {
    expect(modeScope('dark')).toBe(':root:root body[data-ds-dark-theme]');
    expect(modeScope('light')).toBe(':root:root body:not([data-ds-dark-theme])');
  });
});

describe('settings and persistence', () => {
  const firstDark = WOODFISH_PALETTES.find((palette) => palette.type === 'dark')?.slug;
  const firstLight = WOODFISH_PALETTES.find((palette) => palette.type === 'light')?.slug;

  it('defaults to the first Woodfish palette of each mode and 《彩云》 background', () => {
    expect(DEFAULT_DSH_SETTINGS.palette).toEqual({ dark: firstDark, light: firstLight });
    expect(DEFAULT_DSH_SETTINGS.backgroundImage).toBe(DSH_DEFAULT_BACKGROUND_ID);
    expect(DEFAULT_DSH_SETTINGS.customCss).toEqual([]);
    expect(DEFAULT_DSH_SETTINGS.userCss).toBe('');
    expect(DEFAULT_DSH_SETTINGS.effects).toEqual({});
  });

  it('accepts every theme-core palette for its own mode', () => {
    for (const palette of WOODFISH_PALETTES) {
      const settings = normalizeDshSettings({ palette: { [palette.type]: palette.slug } });
      expect(settings.palette[palette.type]).toBe(palette.slug);
    }
    expect(dshPalettes('dark').length + dshPalettes('light').length).toBe(WOODFISH_PALETTES.length);
  });

  it('keeps null (dsh colors) and rejects wrong-mode or unknown slugs', () => {
    expect(normalizeDshSettings({ palette: { dark: null, light: null } }).palette).toEqual({
      dark: null,
      light: null,
    });
    expect(
      normalizeDshSettings({ palette: { dark: firstLight, light: 'no-such-theme' } }).palette
    ).toEqual({ dark: firstDark, light: firstLight });
    expect(normalizeDshSettings({ palette: { dark: 42 } }).palette.dark).toBe(firstDark);
  });

  it('validates background ids (caiyun, gradient, 16-hex uploaded id)', () => {
    expect(normalizeBackgroundId('caiyun')).toBe(DSH_DEFAULT_BACKGROUND_ID);
    expect(normalizeBackgroundId('gradient')).toBe(DSH_GRADIENT_BACKGROUND_ID);
    expect(normalizeBackgroundId('0123456789abcdef')).toBe('0123456789abcdef');
    expect(normalizeBackgroundId('../etc/passwd')).toBe(DSH_DEFAULT_BACKGROUND_ID);
    expect(normalizeBackgroundId(123)).toBe(DSH_DEFAULT_BACKGROUND_ID);
  });

  it('round-trips flat Host persisted config including per-effect parameter overrides', () => {
    const rich = normalizeDshSettings({
      palette: { dark: null, light: firstLight },
      backgroundImage: 'abcdef0123456789',
      customCss: ['body { opacity: 1; }'],
      userCss: ':root { --woodfish-caret-width: 8px; }',
      effects: {
        caret: { enabled: true, width: 10, blinking: 'smooth' },
        'squircle-corners': { enabled: true, scale: 2.1, shape: 'strong', scanHardcoded: false },
      },
    });
    const flat = toPersistedConfig(rich);
    expect(flat.paletteDark).toBe('');
    expect(flat.paletteLight).toBe(firstLight);
    expect(flat.backgroundImage).toBe('abcdef0123456789');
    expect(fromPersistedConfig(flat)).toEqual(rich);
    expect(
      fromPersistedConfig({ ...DEFAULT_DSH_PERSISTED_CONFIG, effectsJson: '{bad' }).effects
    ).toEqual({});
  });

  it('applies full per-effect parameter overrides (not just enabled) and clamps out-of-range values', () => {
    const manifest = normalizeEffectManifest({
      name: '光标',
      hosts: ['dsh'],
      params: {
        width: { type: 'number', default: 6, min: 1, max: 16 },
        blinking: {
          type: 'select',
          default: 'solid',
          options: [
            { value: 'solid', label: '不闪烁' },
            { value: 'smooth', label: '柔和' },
          ],
        },
      },
    });
    const base = [
      { id: 'caret', hash: 'a', manifest, values: { enabled: true, width: 6, blinking: 'solid' } },
    ];
    const applied = applyDshEffectOverrides(base, {
      caret: { enabled: false, width: 99, blinking: 'smooth', unknown: 1 },
    });
    expect(applied[0].values).toEqual({ enabled: false, width: 16, blinking: 'smooth' });
  });

  it('drops unsafe custom CSS and survives garbage input', () => {
    const settings = normalizeDshSettings({
      customCss: ['body { color: red; }', '@import url(https://evil.example/x.css);', 7],
    });
    expect(settings.customCss).toEqual(['body { color: red; }']);
    for (const input of [null, undefined, 'x', 3, [], { palette: 'dark', effects: [] }]) {
      expect(normalizeDshSettings(input)).toEqual(DEFAULT_DSH_SETTINGS);
    }
  });
});

describe('palette CSS', () => {
  it.each(WOODFISH_PALETTES.map((palette) => [palette.slug, palette] as const))(
    '%s maps onto full dsh tokens, onboarding/diff tokens and Shiki slots',
    (_slug, palette) => {
      const variables = buildPaletteVariables(palette);
      expect(variables['--dsw-alias-bg-base']).toBe(palette.ui.bg);
      expect(variables['--dsw-alias-label-primary']).toBe(palette.ui.fg);
      expect(variables['--dsw-alias-state-business-primary']).toBe(palette.ui.accent);
      expect(variables['--dsw-alias-settings-card-fill']).toBeDefined();
      expect(variables['--dsw-gradient-onboarding-bg']).toBeDefined();
      expect(variables['--dsw-alias-file-diff-hunk-bg']).toBeDefined();
      expect(Object.keys(variables).every((name) => name.startsWith('--'))).toBe(true);

      const shiki = buildShikiVariables(palette);
      expect(shiki['--shiki-token-keyword']).toBe(palette.tokens.keyword);
      expect(shiki['--shiki-token-string-expression']).toBe(palette.tokens.string);
      expect(shiki['--shiki-token-comment']).toBe(palette.tokens.comment);

      const css = buildPaletteCss({
        dark: palette.type === 'dark' ? palette.slug : null,
        light: palette.type === 'light' ? palette.slug : null,
      });
      expect(css).toContain(`${modeScope(palette.type)} {`);
      expect(css).toContain('::selection');
      expect(css).toContain('[data-shortcut-modal="settings"]');
      expect(css).not.toContain(modeScope(palette.type === 'dark' ? 'light' : 'dark'));
      expectWellFormed(css);
    }
  );

  it('mounts nothing when both modes keep dsh colors', () => {
    expect(buildPaletteCss({ dark: null, light: null })).toBe('');
  });
});

describe('core CSS', () => {
  const view = composeDshCoreView(DEFAULT_DSH_SETTINGS, {
    'squircle-corners': { enabled: true, scale: 1.9, shape: 'strong', scanHardcoded: true },
    'code-gradient': { enabled: true, angle: 45, glow: true, glowIntensity: 1 },
    background: { enabled: true, opacity: 0.2 },
  });

  it('builds one well-formed sheet per core feature', () => {
    const css = buildDshCss(view);
    expect(Object.keys(css)).toEqual([...DSH_STYLE_NAMES]);
    for (const name of DSH_STYLE_NAMES.filter((style) => style !== 'custom')) {
      expect(css[name].length).toBeGreaterThan(0);
      expectWellFormed(css[name]);
    }
  });

  it('turns core features off when their effect is off or missing', () => {
    const off = composeDshCoreView(DEFAULT_DSH_SETTINGS, {});
    expect(off.squircleCorners.enabled).toBe(false);
    expect(buildDshCss(off).corners).toBe('');
    expect(off.codeGradient.enabled).toBe(false);
    expect(off.codeGlow.enabled).toBe(false);
    expect(buildCodeCss(off)).toBe('');
    expect(buildBackgroundCss(off)).toBe('');
  });

  it('paints tokens inside both code blocks and file diffs with a light-mode glow', () => {
    const css = buildCodeCss(view);
    expect(css).toContain('[data-code-block-content] [data-woodfish-overlay-token="true"]');
    expect(css).toContain('[data-diff] [data-woodfish-overlay-token="true"]');
    expect(css).toContain('body:not([data-ds-dark-theme])');
    const glowOnly = buildCodeCss({
      ...view,
      codeGradient: { ...view.codeGradient, enabled: false },
    });
    expect(glowOnly).not.toContain('background-clip');
  });

  it('lays the background under the window, supports gradient mode, and avoids live backdrop-filter', () => {
    const css = buildBackgroundCss(view);
    expect(css).toContain('--woodfish-dsh-surface: var(--dsw-alias-bg-base);');
    expect(css).toContain('body::before {');
    expect(css).toContain(`${selectorOf('sidebar')} {`);
    expect(css).toContain(`${selectorOf('composer')} {`);
    expect(css).toContain('background-attachment: fixed !important;');
    expect(css).not.toContain('backdrop-filter');
    expect(css.startsWith('@media not (prefers-reduced-transparency: reduce)')).toBe(true);

    const gradientView = composeDshCoreView(
      normalizeDshSettings({ backgroundImage: DSH_GRADIENT_BACKGROUND_ID }),
      { background: { enabled: true } }
    );
    expect(buildBackgroundCss(gradientView)).toContain('linear-gradient(180deg,');
  });

  it('parameterizes continuous corners (scale and curvature shape) while preserving circles and pills', () => {
    const defaultCss = buildCornerCss();
    expect(defaultCss.startsWith('@supports (corner-shape: squircle) {')).toBe(true);
    expect(defaultCss).toContain(`--squircle-k: ${SQUIRCLE_K};`);
    expect(defaultCss).toContain('--dsw-corner-shape: squircle;');
    expect(defaultCss).toContain('[role="switch"]');
    expect(defaultCss).not.toContain('--dsw-radius-xs:');
    expectWellFormed(defaultCss);

    const customCss = buildCornerCss({ scale: 2.1, shape: 'strong' });
    expect(customCss).toContain('--squircle-k: 2.1;');
    expect(customCss).toContain('--squircle-shape: superellipse(2.4);');
    expect(customCss).toContain('--dsw-corner-shape: superellipse(2.4);');
    expectWellFormed(customCss);
  });

  it('paints reply text while it streams and after', () => {
    expect(BODY_TEXT_SELECTOR).toContain('[data-chat-flow-kind="assistant-step"] p');
  });
});
