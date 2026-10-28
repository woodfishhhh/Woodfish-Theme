import * as fs from 'fs';
import * as path from 'path';
import { ORIGINAL_PALETTES, WOODFISH_PALETTES, validatePalette } from '@woodfish/theme-core';
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
  findCodexPalette,
  normalizeCodexSettings,
  paletteMode,
  paletteToChromeTheme,
} from '../index';

describe('normalizeCodexSettings', () => {
  it('enables every effect except the body gradient by default and keeps Codex colors', () => {
    expect(DEFAULT_CODEX_SETTINGS.palette).toEqual({ dark: null, light: null });
    expect(DEFAULT_CODEX_SETTINGS.codeGradient.enabled).toBe(true);
    expect(DEFAULT_CODEX_SETTINGS.codeGlow.enabled).toBe(true);
    expect(DEFAULT_CODEX_SETTINGS.glass.enabled).toBe(true);
    expect(DEFAULT_CODEX_SETTINGS.accent.enabled).toBe(true);
    expect(DEFAULT_CODEX_SETTINGS.caret.enabled).toBe(true);
    expect(DEFAULT_CODEX_SETTINGS.bodyText.enabled).toBe(false);
    expect(DEFAULT_CODEX_SETTINGS.customCss).toEqual([]);
  });

  it('rejects unknown palettes, clamps numbers and drops unsafe CSS', () => {
    const settings = normalizeCodexSettings({
      palette: { dark: 'neon', light: 'solarized' },
      codeGradient: { hueShift: 500, angle: -1 },
      codeGlow: { intensity: 9 },
      glass: { blur: 'big', opacity: 0 },
      caret: { gradientStops: ['#fff', 'url(x)', 'red'], animationDuration: 0 },
      bodyText: { enabled: true },
      customCss: ['a { color: red }', 'b { background: url(evil) }'],
    });
    expect(settings.palette).toEqual({ dark: 'neon', light: null });
    expect(settings.codeGradient.hueShift).toBe(180);
    expect(settings.codeGradient.angle).toBe(0);
    expect(settings.codeGlow.intensity).toBe(3);
    expect(settings.glass.blur).toBe(30);
    expect(settings.glass.opacity).toBe(0.15);
    expect(settings.caret.gradientStops).toEqual(['#fff', 'red']);
    expect(settings.caret.animationDuration).toBe(1);
    expect(settings.bodyText.enabled).toBe(true);
    expect(settings.customCss).toEqual(['a { color: red }']);
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

describe('applyCodexSettingsPatch', () => {
  const base = normalizeCodexSettings({
    palette: { dark: 'neon' },
    glass: { blur: 24 },
    customCss: ['a { color: red }'],
  });

  it('changes themes and switches only', () => {
    const next = applyCodexSettingsPatch(base, {
      palette: { dark: 'dracula', light: 'light' },
      glass: { enabled: false, blur: 2 },
      bodyText: { enabled: true },
      codeGradient: { hueShift: 90 },
      customCss: ['b { color: blue }'],
    });
    expect(next.palette).toEqual({ dark: 'dracula', light: 'light' });
    expect(next.glass.enabled).toBe(false);
    expect(next.glass.blur).toBe(24);
    expect(next.bodyText.enabled).toBe(true);
    expect(next.codeGradient.hueShift).toBe(base.codeGradient.hueShift);
    expect(next.customCss).toEqual(['a { color: red }']);
    expect(base.palette.dark).toBe('neon');
  });

  it('clears a theme with null and ignores themes for the other mode or unknown ones', () => {
    expect(applyCodexSettingsPatch(base, { palette: { dark: null } }).palette.dark).toBeNull();
    for (const dark of ['light', 'solarized', 42, {}]) {
      expect(applyCodexSettingsPatch(base, { palette: { dark } }).palette.dark).toBe('neon');
    }
  });

  it('ignores garbage', () => {
    for (const patch of [null, 'x', 42, [], { glass: { enabled: 'yes' } }]) {
      expect(applyCodexSettingsPatch(base, patch)).toEqual(base);
    }
  });
});

describe('buildCodexCss', () => {
  const all = normalizeCodexSettings({
    palette: { dark: 'neon', light: 'light' },
    bodyText: { enabled: true },
    customCss: ['.x { color: red }'],
  });

  it('builds one stylesheet per feature', () => {
    const css = buildCodexCss(all);
    expect(Object.keys(css).sort()).toEqual([...CODEX_STYLE_NAMES].sort());
    for (const name of CODEX_STYLE_NAMES) {
      expect(css[name].length).toBeGreaterThan(0);
    }
    expect(css.custom).toBe('.x { color: red }');
  });

  it('emits nothing for disabled features and no palette by default', () => {
    const css = buildCodexCss(
      normalizeCodexSettings({
        codeGradient: { enabled: false },
        codeGlow: { enabled: false },
        glass: { enabled: false },
        accent: { enabled: false },
        caret: { enabled: false },
      })
    );
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

  it('uses relative OKLCH only as an accent fallback and never raw oklch() colors', () => {
    const css = Object.values(buildCodexCss(all)).join('\n');
    const usages = css.match(/oklch\([^)]*/g) ?? [];
    expect(usages.length).toBeGreaterThan(0);
    for (const usage of usages) {
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
    expect(
      buildCodexCss(normalizeCodexSettings({ palette: { dark: 'black' } })).palette
    ).not.toContain('data-theme="light"');
  });

  it('gives the finer highlight.js classes their own palette role inside code blocks', () => {
    const neon = findCodexPalette('neon');
    const css = buildCodexCss(normalizeCodexSettings({ palette: { dark: 'neon' } })).palette;
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
    const css = buildCodexCss(normalizeCodexSettings({ palette: { dark: 'dracula' } })).palette;
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

  it('cycles the caret through every stop and respects reduced motion', () => {
    const css = buildCodexCss(
      normalizeCodexSettings({ caret: { gradientStops: ['#111111', '#222222', '#333333'] } })
    ).caret;
    expect(css).toContain('0% { caret-color: #111111; }');
    expect(css).toContain('33.3333% { caret-color: #222222; }');
    expect(css).toContain('100% { caret-color: #111111; }');
    expect(css).toContain(':root[data-reduced-motion="true"]');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps glass behind feature queries and off for reduced transparency', () => {
    const css = buildCodexCss(normalizeCodexSettings({ glass: { noise: 0.05 } })).glass;
    expect(css).toContain('@supports ((backdrop-filter: blur(1px))');
    expect(css).toContain('@media (prefers-reduced-transparency: reduce)');
    expect(css).toContain('data:image/svg+xml');
    expect(css).not.toContain('[data-app-shell-main-surface]');
  });
});

describe('paletteToChromeTheme', () => {
  it('offers every Woodfish theme the VS Code extension ships', () => {
    expect(CODEX_PALETTE_SLUGS).toEqual(['dark', 'dracula', 'black', 'neon', 'light']);
    expect(WOODFISH_PALETTES.map((palette) => palette.slug).sort()).toEqual(
      [...CODEX_PALETTE_SLUGS].sort()
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
