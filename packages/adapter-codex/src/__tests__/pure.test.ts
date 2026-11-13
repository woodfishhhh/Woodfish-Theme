import * as fs from 'fs';
import * as path from 'path';
import {
  EffectValues,
  ORIGINAL_PALETTES,
  WOODFISH_PALETTES,
  validatePalette,
} from '@woodfish/theme-core';
import {
  CHROME_THEME_COLOR,
  CODEX_ADAPTER_VERSION,
  CODEX_PALETTE_SLUGS,
  CODEX_SELECTORS,
  CODEX_STYLE_NAMES,
  DEFAULT_CODEX_SETTINGS,
  applyCodexSettingsPatch,
  buildCodexCss,
  buildPaletteVariables,
  composeCodexCoreView,
  findCodexPalette,
  legacyEffectValues,
  normalizeCodexSettings,
  paletteMode,
  paletteToChromeTheme,
} from '../index';

const CODE_ON = { enabled: true, angle: 45, glow: true, glowIntensity: 2 } as EffectValues;
const BACKGROUND_ON = { enabled: true, opacity: 0.2 } as EffectValues;

describe('normalizeCodexSettings', () => {
  it('keeps Codex colors, the default picture and no custom CSS by default', () => {
    expect(DEFAULT_CODEX_SETTINGS).toEqual({
      palette: { dark: null, light: null },
      backgroundImage: 'caiyun',
      customCss: [],
    });
  });

  it('rejects unknown palettes and pictures and drops unsafe CSS', () => {
    const settings = normalizeCodexSettings({
      palette: { dark: 'neon', light: 'solarized' },
      backgroundImage: '../../etc/passwd',
      customCss: ['a { color: red }', 'b { background: url(evil) }'],
    });
    expect(settings).toEqual({
      palette: { dark: 'neon', light: null },
      backgroundImage: 'caiyun',
      customCss: ['a { color: red }'],
    });
  });

  it('reads the picture from an older file', () => {
    expect(normalizeCodexSettings({ background: { image: 'a1b2c3d4e5f6' } }).backgroundImage).toBe(
      'a1b2c3d4e5f6'
    );
  });

  it('only puts a theme in the appearance mode it was made for', () => {
    expect(normalizeCodexSettings({ palette: { dark: 'light', light: 'neon' } }).palette).toEqual({
      dark: null,
      light: null,
    });
    expect(
      normalizeCodexSettings({ palette: { dark: 'dracula', light: 'light' } }).palette
    ).toEqual({ dark: 'dracula', light: 'light' });
  });

  it('treats garbage input as defaults', () => {
    for (const input of [null, 42, 'x', [], { palette: 'neon', glass: null }]) {
      expect(normalizeCodexSettings(input)).toEqual(normalizeCodexSettings());
    }
  });
});

describe('legacyEffectValues', () => {
  it('carries the sections of an older codex.json over to the effect folders', () => {
    expect(
      legacyEffectValues({
        codeGradient: { enabled: true, hueShift: 90 },
        codeGlow: { enabled: true, intensity: 2 },
        glass: { blur: 12, unknown: 1 },
        accent: { enabled: false },
        caret: { enabled: false, glow: true },
        bodyText: { enabled: true },
        background: { enabled: true, image: 'caiyun', opacity: 0.3 },
      })
    ).toEqual({
      'code-gradient': { enabled: true, hueShift: 90, glow: true, glowIntensity: 2 },
      glass: { blur: 12 },
      accent: { enabled: false },
      'thread-ring': { enabled: false },
      caret: { enabled: false },
      'rainbow-text': { enabled: true },
      background: { enabled: true, opacity: 0.3 },
    });
    expect(legacyEffectValues({ palette: { dark: 'neon' } })).toEqual({});
    expect(legacyEffectValues(null)).toEqual({});
  });
});

describe('applyCodexSettingsPatch', () => {
  const base = normalizeCodexSettings({
    palette: { dark: 'neon' },
    customCss: ['a { color: red }'],
  });

  it('changes themes and the picture only', () => {
    const next = applyCodexSettingsPatch(base, {
      palette: { dark: 'dracula', light: 'light' },
      backgroundImage: 'gradient',
      customCss: ['b { color: blue }'],
      effects: { glass: { enabled: false } },
    });
    expect(next).toEqual({
      palette: { dark: 'dracula', light: 'light' },
      backgroundImage: 'gradient',
      customCss: ['a { color: red }'],
    });
    expect(base.palette.dark).toBe('neon');
  });

  it('clears a theme with null and ignores themes for the other mode or unknown ones', () => {
    expect(applyCodexSettingsPatch(base, { palette: { dark: null } }).palette.dark).toBeNull();
    for (const dark of ['light', 'solarized', 42, {}]) {
      expect(applyCodexSettingsPatch(base, { palette: { dark } }).palette.dark).toBe('neon');
    }
  });

  it('ignores garbage', () => {
    for (const patch of [null, 'x', 42, [], { backgroundImage: 'nope' }]) {
      expect(applyCodexSettingsPatch(base, patch)).toEqual(base);
    }
  });
});

describe('composeCodexCoreView', () => {
  it('turns core effects off when their values are missing', () => {
    const view = composeCodexCoreView(DEFAULT_CODEX_SETTINGS, {});
    expect(view.codeGradient.enabled).toBe(false);
    expect(view.codeGlow.enabled).toBe(false);
    expect(view.background.enabled).toBe(false);
  });

  it('maps the effect values onto the engines', () => {
    const view = composeCodexCoreView(normalizeCodexSettings({ backgroundImage: 'gradient' }), {
      'code-gradient': CODE_ON,
      background: BACKGROUND_ON,
    });
    expect(view.codeGradient).toMatchObject({ enabled: true, angle: 45 });
    expect(view.codeGlow).toEqual({ enabled: true, intensity: 2 });
    expect(view.background).toMatchObject({
      enabled: true,
      image: 'gradient',
      opacity: 0.2,
      blur: 10,
    });
  });
});

describe('buildCodexCss', () => {
  const all = composeCodexCoreView(
    normalizeCodexSettings({
      palette: { dark: 'neon', light: 'light' },
      customCss: ['.x { color: red }'],
    }),
    { 'code-gradient': CODE_ON, background: BACKGROUND_ON }
  );
  const viewOf = (input: unknown): ReturnType<typeof composeCodexCoreView> =>
    composeCodexCoreView(normalizeCodexSettings(input), {});

  it('builds one stylesheet per core feature', () => {
    const css = buildCodexCss(all);
    expect(Object.keys(css).sort()).toEqual([...CODEX_STYLE_NAMES].sort());
    for (const name of CODEX_STYLE_NAMES) {
      expect(css[name].length).toBeGreaterThan(0);
    }
    expect(css.custom).toBe('.x { color: red }');
  });

  it('emits nothing for features that are off and no palette by default', () => {
    const css = buildCodexCss(viewOf({}));
    for (const name of CODEX_STYLE_NAMES) {
      expect({ name, css: css[name] }).toEqual({ name, css: '' });
    }
  });

  it('only targets Codex through registered selectors and Woodfish markers', () => {
    const css = Object.values(buildCodexCss(all)).join('\n');
    const attributeSelectors = new Set(css.match(/\[[a-z-]+(?:[~|^$*]?="[^"]*")?\]/g) ?? []);
    const registered = Object.values(CODEX_SELECTORS)
      .flatMap((group) => group.selectors)
      .join(' ');
    for (const selector of attributeSelectors) {
      const allowed =
        registered.includes(selector) ||
        selector.startsWith('[data-woodfish') ||
        selector.startsWith('[data-theme') ||
        selector === '[data-reduced-motion="true"]' ||
        selector === '[data-code-block]';
      expect({ selector, allowed }).toEqual({ selector, allowed: true });
    }
    expect(css).not.toMatch(/\._[A-Z][A-Za-z]+_[a-z0-9]+_/);
  });

  it('never writes raw oklch() colors', () => {
    const css = Object.values(buildCodexCss(all)).join('\n');
    for (const usage of css.match(/oklch\([^)]*/g) ?? []) {
      expect(usage.startsWith('oklch(from ')).toBe(true);
    }
  });

  it('maps palettes per appearance mode', () => {
    const css = buildCodexCss(all).palette;
    expect(css).toContain('[data-theme="dark"] {');
    expect(css).toContain('[data-theme="light"] {');
    const neon = findCodexPalette('neon');
    expect(css).toContain(`--color-codex-syntax-keyword: ${neon.tokens.keyword};`);
    expect(css).toContain(`--app-color-accent-blue: ${neon.ui.accent};`);
    expect(buildCodexCss(viewOf({ palette: { dark: 'black' } })).palette).not.toContain(
      'data-theme="light"'
    );
  });

  it('gives the finer highlight.js classes their own palette role inside code blocks', () => {
    const neon = findCodexPalette('neon');
    const css = buildCodexCss(viewOf({ palette: { dark: 'neon' } })).palette;
    expect(css).toContain(
      `[data-theme="dark"] [data-code-block-source="true"] .hljs-title.function_ {
  color: ${neon.tokens.function};`
    );
    expect(css).toContain(`[data-theme="dark"] [data-code-block-source="true"] .hljs-params {`);
    expect(css).not.toContain('[data-theme="light"] [data-code-block-source');
  });

  it('covers the runtime theme variables Codex derives from its accent', () => {
    const neon = findCodexPalette('neon');
    const variables = buildPaletteVariables(neon);
    for (const name of [
      '--color-background-user-message',
      '--color-text-user-message',
      '--color-background-text-selection',
      '--color-background-control-opaque',
      '--color-background-panel',
      '--color-background-composer-action-bar',
      '--color-text-composer-primary',
      '--codex-base-accent',
      '--color-codex-terminal-ansi-bright-magenta',
    ]) {
      expect(variables[name]).toBeDefined();
    }
    expect(variables['--color-background-user-message']).toContain(neon.ui.accent);
    expect(variables['--color-codex-terminal-ansi-red']).toBe(neon.ansi[1]);
    expect(variables['--color-codex-terminal-ansi-bright-white']).toBe(neon.ansi[15]);
    // Diff line backgrounds stay translucent, like Codex's own.
    expect(variables['--app-color-editor-added']).toBe(
      `color-mix(in oklab, ${neon.ui.success} 20%, transparent)`
    );
  });

  it('tints the translucent window chrome only for modes with a palette', () => {
    const css = buildCodexCss(viewOf({ palette: { dark: 'dracula' } })).palette;
    expect(css).toContain('[data-theme="dark"] body {');
    expect(css).not.toContain('[data-theme="light"] body');
  });

  it('maps every Codex syntax slot from the palette', () => {
    const variables = buildPaletteVariables(findCodexPalette('black'));
    for (const slot of [
      'keyword',
      'string',
      'comment',
      'variable',
      'name',
      'literal',
      'attribute',
      'error',
    ]) {
      expect(variables[`--color-codex-syntax-${slot}`]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("publishes the theme's tab gradient for the accent effect", () => {
    const palette = buildCodexCss(viewOf({ palette: { dark: 'nord' } })).palette;
    expect(palette).toContain(
      `--woodfish-codex-tab-gradient: ${findCodexPalette('nord').meta.tabBorderGradient};`
    );
  });

  it('draws code glow only when the code-gradient effect asks for it', () => {
    expect(buildCodexCss(all).code).toContain('text-shadow');
    const noGlow = composeCodexCoreView(DEFAULT_CODEX_SETTINGS, {
      'code-gradient': { enabled: true } as EffectValues,
    });
    expect(buildCodexCss(noGlow).code).not.toContain('text-shadow');
  });
});

describe('paletteToChromeTheme', () => {
  it('offers every Woodfish theme the VS Code extension ships', () => {
    expect(CODEX_PALETTE_SLUGS).toEqual(WOODFISH_PALETTES.map((palette) => palette.slug));
    expect(CODEX_PALETTE_SLUGS).toEqual(
      expect.arrayContaining(['dark', 'dracula', 'onedark', 'catppuccin-latte', 'gruvbox-dark'])
    );
  });

  it('produces values Codex accepts for every Woodfish palette', () => {
    for (const palette of ORIGINAL_PALETTES) {
      expect(validatePalette(palette)).toEqual([]);
    }
    for (const palette of WOODFISH_PALETTES) {
      const theme = paletteToChromeTheme(palette);
      for (const value of [
        theme.accent,
        theme.ink,
        theme.surface,
        theme.semanticColors.diffAdded,
        theme.semanticColors.diffRemoved,
        theme.semanticColors.skill,
      ]) {
        expect(value).toMatch(CHROME_THEME_COLOR);
        expect(value).toBe(value.toLowerCase());
      }
      expect(theme.accentSource).toBe('custom');
      expect(Number.isInteger(theme.contrast)).toBe(true);
      expect(theme.opaqueWindows).toBe(false);
    }
  });

  it('assigns palettes to the matching appearance mode', () => {
    expect(paletteMode(findCodexPalette('light'))).toBe('light');
    expect(paletteMode(findCodexPalette('neon'))).toBe('dark');
    expect(paletteToChromeTheme(findCodexPalette('neon')).contrast).toBe(60);
    expect(paletteToChromeTheme(findCodexPalette('light')).contrast).toBe(45);
  });

  it('rejects colors Codex would refuse', () => {
    const broken = {
      ...findCodexPalette('black'),
      ui: { ...findCodexPalette('black').ui, bg: '#000' },
    };
    expect(() => paletteToChromeTheme(broken)).toThrow('surface must be #rrggbb');
  });
});

describe('package metadata', () => {
  it('keeps the adapter version in sync with package.json', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
    ) as { version: string };
    expect(CODEX_ADAPTER_VERSION).toBe(pkg.version);
  });
});
