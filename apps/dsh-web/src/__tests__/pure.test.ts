import { WOODFISH_PALETTES, normalizeEffectManifest } from '@woodfish/theme-core';
import {
  BODY_TEXT_SELECTOR,
  CODE_ROOT_SELECTOR,
  CODE_TOKEN_SELECTOR,
  DEFAULT_DSH_SETTINGS,
  DSH_SELECTORS,
  DSH_STYLE_NAMES,
  applyDshSettingsPatch,
  applyStoredEffects,
  SQUIRCLE_K,
  buildBackgroundCss,
  buildCodeCss,
  buildCornerCss,
  buildDshCss,
  buildPaletteCss,
  buildPaletteVariables,
  buildShikiVariables,
  composeDshCoreView,
  dshPalettes,
  modeScope,
  nextDshPalette,
  normalizeDshSettings,
  selectorOf,
} from '../index';

/** Braces balance and no value was left unresolved. */
function expectWellFormed(css: string): void {
  expect(css.split('{').length).toBe(css.split('}').length);
  expect(css).not.toMatch(/undefined|NaN|null|\[object/);
}

describe('selectors', () => {
  const all = Object.values(DSH_SELECTORS).flatMap((group) => group.selectors);

  it('never use hashed CSS-module classes', () => {
    // dsh's module classes look like `uV2eYG_card` or `_block_7gxqk_4`; only library
    // classes (Shiki's `shiki` and `line`) are allowed.
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

  it('paint only Shiki tokens inside code blocks', () => {
    expect(CODE_ROOT_SELECTOR).toBe('[data-code-block-content]');
    expect(CODE_TOKEN_SELECTOR.startsWith(CODE_ROOT_SELECTOR)).toBe(true);
  });

  it('scope modes above dsh variable blocks', () => {
    expect(modeScope('dark')).toBe(':root:root body[data-ds-dark-theme]');
    expect(modeScope('light')).toBe(':root:root body:not([data-ds-dark-theme])');
  });
});

describe('settings', () => {
  const firstDark = WOODFISH_PALETTES.find((palette) => palette.type === 'dark')?.slug;
  const firstLight = WOODFISH_PALETTES.find((palette) => palette.type === 'light')?.slug;

  it('defaults to the first Woodfish palette of each mode', () => {
    expect(DEFAULT_DSH_SETTINGS.palette).toEqual({ dark: firstDark, light: firstLight });
    expect(DEFAULT_DSH_SETTINGS.customCss).toEqual([]);
  });

  it('accepts every theme-core palette for its own mode, so new themes need no change', () => {
    for (const palette of WOODFISH_PALETTES) {
      const settings = normalizeDshSettings({ palette: { [palette.type]: palette.slug } });
      expect(settings.palette[palette.type]).toBe(palette.slug);
    }
    expect(dshPalettes('dark').length + dshPalettes('light').length).toBe(WOODFISH_PALETTES.length);
  });

  it('keeps null (dsh colors) and replaces unknown or wrong-mode slugs with the default', () => {
    expect(normalizeDshSettings({ palette: { dark: null, light: null } }).palette).toEqual({
      dark: null,
      light: null,
    });
    expect(
      normalizeDshSettings({ palette: { dark: firstLight, light: 'no-such-theme' } }).palette
    ).toEqual({ dark: firstDark, light: firstLight });
    expect(normalizeDshSettings({ palette: { dark: 42 } }).palette.dark).toBe(firstDark);
  });

  it('drops unsafe custom CSS and the switches of the older format', () => {
    const settings = normalizeDshSettings({
      glass: { blur: 12, enabled: false },
      caret: { enabled: false },
      customCss: ['body { color: red; }', '@import url(https://evil.example/x.css);', 7],
    });
    expect(Object.keys(settings).sort()).toEqual(['customCss', 'palette']);
    expect(settings.customCss).toEqual(['body { color: red; }']);
  });

  it('survives garbage input', () => {
    for (const input of [null, undefined, 'x', 3, [], { palette: 'dark', glass: [] }]) {
      expect(normalizeDshSettings(input)).toEqual(DEFAULT_DSH_SETTINGS);
    }
  });

  it('lets a page patch change only the themes', () => {
    const base = normalizeDshSettings({ customCss: ['a { color: red; }'] });
    const next = applyDshSettingsPatch(base, {
      palette: { dark: null, light: 'no-such-theme' },
      customCss: ['b { color: blue; }'],
    });
    expect(next.palette).toEqual({ dark: null, light: base.palette.light });
    expect(next.customCss).toEqual(base.customCss);
    expect(applyDshSettingsPatch(base, 'nonsense')).toEqual(base);
  });

  it('lets the menu switch baked-in effects on and off, nothing else', () => {
    const manifest = normalizeEffectManifest({
      name: '光标',
      hosts: ['dsh'],
      params: { width: { type: 'number', default: 6, min: 1, max: 16 } },
    });
    const caret = { id: 'caret', hash: 'a', manifest, values: { enabled: true, width: 6 } };
    const effects = [
      caret,
      { id: 'other', hash: 'b', manifest, values: { enabled: true, width: 6 } },
      'not an effect',
    ];
    const next = applyStoredEffects(effects, {
      effects: { caret: { enabled: false, width: 99 }, other: { enabled: 'no' } },
    }) as typeof effects;
    expect(next[0]).toEqual({ ...caret, values: { enabled: false, width: 6 } });
    expect(next[1]).toBe(effects[1]);
    expect(next[2]).toBe('not an effect');
    expect(applyStoredEffects('nonsense', {})).toBe('nonsense');
  });

  it('cycles the menu through every palette of a mode, then dsh colors', () => {
    for (const mode of ['dark', 'light'] as const) {
      const slugs = dshPalettes(mode).map((palette) => palette.slug);
      const seen: Array<string | null> = [];
      let current: string | null = slugs[0];
      for (let step = 0; step <= slugs.length; step += 1) {
        seen.push(current);
        current = nextDshPalette(mode, current);
      }
      expect(seen).toEqual([...slugs, null]);
      expect(current).toBe(slugs[0]);
    }
  });
});

describe('palette CSS', () => {
  it.each(WOODFISH_PALETTES.map((palette) => [palette.slug, palette] as const))(
    '%s maps onto dsh tokens and Shiki slots',
    (_slug, palette) => {
      const variables = buildPaletteVariables(palette);
      expect(variables['--dsw-alias-bg-base']).toBe(palette.ui.bg);
      expect(variables['--dsw-alias-label-primary']).toBe(palette.ui.fg);
      expect(variables['--dsw-alias-state-business-primary']).toBe(palette.ui.accent);
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

  it('turns a core feature off when its effect is off or missing', () => {
    const off = composeDshCoreView(DEFAULT_DSH_SETTINGS, {});
    expect(off.codeGradient.enabled).toBe(false);
    expect(off.codeGlow.enabled).toBe(false);
    expect(buildCodeCss(off)).toBe('');
    expect(buildBackgroundCss(off)).toBe('');
    const noGlow = composeDshCoreView(DEFAULT_DSH_SETTINGS, {
      'code-gradient': { enabled: true, glow: false },
    });
    expect(noGlow.codeGlow.enabled).toBe(false);
  });

  it('paints only tokens the engine marked, with a light-mode glow', () => {
    const css = buildCodeCss(view);
    expect(css).toContain(`${CODE_ROOT_SELECTOR} [data-woodfish-overlay-token="true"]`);
    expect(css).toContain('body:not([data-ds-dark-theme])');
    const glowOnly = buildCodeCss({
      ...view,
      codeGradient: { ...view.codeGradient, enabled: false },
    });
    expect(glowOnly).not.toContain('background-clip');
  });

  it('lays the background under the window and frosts the sidebar and composer', () => {
    const css = buildBackgroundCss(view);
    // dsh's base color is captured on <body> before the frame clears it.
    expect(css).toContain('--woodfish-dsh-surface: var(--dsw-alias-bg-base);');
    expect(css).toContain('body::before {');
    expect(css).toContain(`${selectorOf('sidebar')} {`);
    expect(css).toContain(`${selectorOf('composer')} {`);
    expect(css).toContain(`${selectorOf('composerSeat')}::before {`);
    expect(css).toContain('background-attachment: fixed !important;');
    expect(css).not.toContain('backdrop-filter');
    expect(css.startsWith('@media not (prefers-reduced-transparency: reduce)')).toBe(true);
  });

  it('switches dsh to continuous corners through its own shape and radius tokens', () => {
    const css = buildCornerCss();
    expect(css.startsWith('@supports (corner-shape: squircle) {')).toBe(true);
    expect(css).toContain(`--squircle-k: ${SQUIRCLE_K};`);
    expect(css).toContain('--dsw-corner-shape: squircle;');
    // Read on <body>, replaced below it: a custom property cannot refer to itself.
    expect(css).toContain('--woodfish-dsh-radius-md: var(--dsw-radius-md);');
    expect(css).toContain(
      '--dsw-radius-md: calc(var(--woodfish-dsh-radius-md) * var(--squircle-k));'
    );
    expect(css).not.toMatch(/--dsw-radius-(\w+): calc\(var\(--dsw-radius-\1\)/);
    expectWellFormed(css);
  });

  it('paints reply text while it streams and after', () => {
    expect(BODY_TEXT_SELECTOR).toContain('[data-chat-flow-kind="assistant-step"] p');
    expect(BODY_TEXT_SELECTOR).not.toContain('data-text-interaction-source');
  });
});
