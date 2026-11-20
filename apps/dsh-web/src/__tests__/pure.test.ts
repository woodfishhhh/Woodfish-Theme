import { GLASS_RANGES, WOODFISH_PALETTES } from '@woodfish/theme-core';
import {
  CODE_ROOT_SELECTOR,
  CODE_TOKEN_SELECTOR,
  DEFAULT_DSH_SETTINGS,
  DSH_SELECTORS,
  DSH_STYLE_NAMES,
  applyDshSettingsPatch,
  buildAccentCss,
  buildCaretCss,
  buildCodeCss,
  buildDshCss,
  buildGlassCss,
  buildPaletteCss,
  buildPaletteVariables,
  buildShikiVariables,
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

  it('defaults to the first Woodfish palette of each mode and every effect but body text', () => {
    expect(DEFAULT_DSH_SETTINGS.palette).toEqual({ dark: firstDark, light: firstLight });
    expect(DEFAULT_DSH_SETTINGS.codeGradient.enabled).toBe(true);
    expect(DEFAULT_DSH_SETTINGS.glass.enabled).toBe(true);
    expect(DEFAULT_DSH_SETTINGS.bodyText.enabled).toBe(false);
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

  it('clamps tunables and drops unsafe custom CSS', () => {
    const settings = normalizeDshSettings({
      glass: { blur: 9999, enabled: 'yes' },
      codeGlow: { enabled: false },
      customCss: ['body { color: red; }', '@import url(https://evil.example/x.css);', 7],
    });
    expect(settings.glass.blur).toBe(GLASS_RANGES.blur.maximum);
    expect(settings.glass.enabled).toBe(true);
    expect(settings.codeGlow.enabled).toBe(false);
    expect(settings.customCss).toEqual(['body { color: red; }']);
  });

  it('survives garbage input', () => {
    for (const input of [null, undefined, 'x', 3, [], { palette: 'dark', glass: [] }]) {
      expect(normalizeDshSettings(input)).toEqual(DEFAULT_DSH_SETTINGS);
    }
  });

  it('lets a page patch change only themes and switches', () => {
    const base = normalizeDshSettings({ glass: { blur: 12 }, customCss: ['a { color: red; }'] });
    const next = applyDshSettingsPatch(base, {
      palette: { dark: null, light: 'no-such-theme' },
      glass: { enabled: false, blur: 50 },
      bodyText: { enabled: true },
      customCss: ['b { color: blue; }'],
    });
    expect(next.palette).toEqual({ dark: null, light: base.palette.light });
    expect(next.glass).toEqual({ ...base.glass, enabled: false });
    expect(next.bodyText.enabled).toBe(true);
    expect(next.customCss).toEqual(base.customCss);
    expect(applyDshSettingsPatch(base, 'nonsense')).toEqual(base);
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

describe('effect CSS', () => {
  it('builds one well-formed sheet per feature', () => {
    const css = buildDshCss(normalizeDshSettings({ bodyText: { enabled: true } }));
    expect(Object.keys(css)).toEqual([...DSH_STYLE_NAMES]);
    for (const name of DSH_STYLE_NAMES.filter((style) => style !== 'custom')) {
      expect(css[name].length).toBeGreaterThan(0);
      expectWellFormed(css[name]);
    }
  });

  it('removes a feature entirely when it is switched off', () => {
    const off = normalizeDshSettings({
      codeGradient: { enabled: false },
      codeGlow: { enabled: false },
      glass: { enabled: false },
      accent: { enabled: false },
      caret: { enabled: false },
    });
    expect(buildCodeCss(off)).toBe('');
    expect(buildGlassCss(off)).toBe('');
    expect(buildAccentCss(off)).toBe('');
    expect(buildCaretCss(off)).toBe('');
  });

  it('reads the accent where dsh declares it (body), not on :root where it is undefined', () => {
    const css = buildAccentCss(DEFAULT_DSH_SETTINGS);
    expect(css).toMatch(
      /^body \{\n {2}--woodfish-dsh-accent: var\(--dsw-alias-state-business-primary/m
    );
    expect(css).not.toMatch(/^:root \{\n {2}--woodfish-dsh-accent/m);
  });

  it('frosts menus by overriding dsh variables, not elements', () => {
    const css = buildGlassCss(normalizeDshSettings({ glass: { blur: 18, saturate: 140 } }));
    expect(css).toContain('--dsw-menu-backdrop-filter: blur(18px) saturate(140%);');
    expect(css).toContain('--dsw-specific-menu:');
    expect(css).not.toContain('!important');
    expect(css).toContain('prefers-reduced-transparency');
  });

  it('paints only tokens the engine marked, with a light-mode glow', () => {
    const css = buildCodeCss(DEFAULT_DSH_SETTINGS);
    expect(css).toContain(`${CODE_ROOT_SELECTOR} [data-woodfish-overlay-token="true"]`);
    expect(css).toContain('body:not([data-ds-dark-theme])');
    const glowOnly = buildCodeCss(normalizeDshSettings({ codeGradient: { enabled: false } }));
    expect(glowOnly).not.toContain('background-clip');
  });

  it('cycles the caret through the configured stops', () => {
    const css = buildCaretCss(
      normalizeDshSettings({ caret: { gradientStops: ['#ff0000', '#00ff00', '#0000ff'] } })
    );
    expect(css).toContain('0% { caret-color: #ff0000; }');
    expect(css).toContain('100% { caret-color: #ff0000; }');
    expect(css).toContain(selectorOf('composerEditor'));
  });
});
