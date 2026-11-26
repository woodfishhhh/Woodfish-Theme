import * as fs from 'fs';
import * as path from 'path';
import {
  EffectValues,
  ORIGINAL_PALETTES,
  WOODFISH_PALETTES,
  validatePalette,
} from '@woodfish/theme-core';
import {
  BODY_TEXT_SELECTOR,
  CHROME_THEME_COLOR,
  CODEX_ADAPTER_VERSION,
  CODEX_PALETTE_SLUGS,
  CODEX_SELECTORS,
  CODEX_STYLE_NAMES,
  DEFAULT_CODEX_SETTINGS,
  applyCodexSettingsPatch,
  buildCodexCss,
  buildDotCss,
  buildPaletteVariables,
  composeCodexCoreView,
  findCodexPalette,
  legacyEffectValues,
  normalizeCodexSettings,
  paletteMode,
  paletteToChromeTheme,
  selectorOf,
} from '../index';
import { CODEX_EFFECT_SELECTORS } from '../renderer/effects';

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
    { 'squircle-corners': { enabled: true }, 'code-gradient': CODE_ON, background: BACKGROUND_ON }
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
    for (const exception of [
      '.rounded-full',
      '[role="switch"]',
      '[data-slot="avatar"]',
      '[data-slot="badge"]',
      'input[type="radio"]',
    ])
      expect(css.corners).toContain(exception);
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
        selector.startsWith('[style*="border-radius:') ||
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

describe('Codex floating layer selectors', () => {
  const sheet = document.createElement('style');
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const glass = require('../../../../packages/effects/builtin/glass/effect.js') as (
      ctx: Record<string, unknown>
    ) => unknown;
    glass({
      params: { mode: 'acrylic', saturate: 150, blur: 24, opacity: 0.4, animations: true },
      selectors: {
        floatingLayer: CODEX_SELECTORS.floatingLayer.selectors.join(', '),
        composerMenuHeader: '.header',
      },
      lib: { acrylicFilterId: 'woodfish-acrylic', mountAcrylicFilter: jest.fn() },
      style: (css: string) => {
        sheet.textContent = css;
      },
    });
    document.head.append(sheet);
  });
  afterAll(() => sheet.remove());

  it.each([
    ['native', 'popover role="dialog"', 'data-anchor-positioning="native"', 'zoom'],
    [
      'Radix',
      'data-radix-popper-content-wrapper data-slot="popover-content"',
      'role="menu" data-state="open"',
      'drop',
    ],
  ])('applies glass and entry transforms only to the direct %s card', (_, wrapper, card, entry) => {
    const root = document.createElement('div');
    root.innerHTML = `<div ${wrapper} data-state="open"><div ${card}><button></button></div></div>`;
    const rules = Array.from(sheet.sheet!.cssRules).flatMap((rule) =>
      rule.type === CSSRule.SUPPORTS_RULE ? Array.from((rule as CSSSupportsRule).cssRules) : [rule]
    );
    const applied = (node: Element) =>
      rules
        .filter(
          (rule): rule is CSSStyleRule =>
            rule.type === CSSRule.STYLE_RULE && node.matches((rule as CSSStyleRule).selectorText)
        )
        .map((rule) => rule.style.cssText)
        .join(' ');
    const outer = root.firstElementChild!;
    expect(applied(outer)).not.toMatch(/filter:|transform:|animation:|contain:|will-change:/);
    const surface = applied(outer.firstElementChild!);
    expect(surface).toContain('backdrop-filter: url(#woodfish-acrylic) saturate(150%)');
    expect(surface).toContain(`animation: woodfish-glass-${entry}`);
    expect(applied(root.querySelector('button')!)).not.toContain('backdrop-filter:');
  });
});

describe('dsh glass floating surfaces', () => {
  it('applies dsh glass radius and entry animation to menu, listbox, and dialog surfaces', () => {
    const glass = require('../../../../packages/effects/builtin/glass/effect.js') as (
      ctx: Record<string, unknown>
    ) => unknown;
    let css = '';
    glass({
      host: 'dsh',
      params: {
        mode: 'blur',
        saturate: 150,
        blur: 24,
        opacity: 0.4,
        borderRadius: 12,
        animations: true,
        reveal: false,
      },
      selectors: {
        floatingLayer: '[data-menu-material], [role="menu"], [role="listbox"], [role="dialog"]',
        composerMenuHeader: '.header',
      },
      lib: { acrylicFilterId: 'woodfish-acrylic' },
      style: (next: string) => {
        css = next;
      },
    });
    const sheet = document.createElement('style');
    sheet.textContent = css;
    document.head.append(sheet);
    try {
      const rules = Array.from(sheet.sheet!.cssRules).filter(
        (rule): rule is CSSStyleRule => rule.type === CSSRule.STYLE_RULE
      );
      for (const role of ['menu', 'listbox', 'dialog']) {
        const surface = document.createElement('div');
        surface.setAttribute('role', role);
        const applied = rules
          .filter((rule) => surface.matches(rule.selectorText))
          .map((rule) => rule.style.cssText)
          .join(' ');
        expect(applied).toContain('border-radius: calc(12px * var(--squircle-k, 1)) !important;');
        expect(applied).toContain('animation: woodfish-dsh-glass-pop 180ms');
      }
    } finally {
      sheet.remove();
    }
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

describe('Codex Dot user bubbles and inline code (#45)', () => {
  function mountDotAndChatDom(mode: 'dark' | 'light', active = true): HTMLDivElement {
    document.documentElement.setAttribute('data-theme', mode);
    if (active) {
      document.documentElement.setAttribute('data-woodfish-codex', CODEX_ADAPTER_VERSION);
    } else {
      document.documentElement.removeAttribute('data-woodfish-codex');
    }
    const host = document.createElement('div');
    host.innerHTML = `
      <div id="regular-chat" data-app-action-timeline-scroll>
        <div id="regular-user-bubble" data-user-message-bubble>Regular user</div>
        <div id="regular-assistant" data-markdown-text-style="assistant-message">
          <p id="regular-p">Regular reply <span id="regular-ic" class="InlineCode-Cddi3Y InlineMarkdownIsolate-QWDV4W" data-markdown-copy="inline-code">norm()</span></p>
          <ul><li id="regular-li">Item</li></ul>
        </div>
      </div>
      <div class="messaging-root messaging-embedded" style="--messaging-outgoing-background: #0285ff; --messaging-outgoing-foreground: #ffffff;">
        <div class="message-list">
          <article class="message-row self" data-message-id="u1">
            <div class="message-meta"><time id="dot-user-time">14:20</time></div>
            <div class="message-surface message-bubble-surface">
              <div id="dot-user-bubble" class="message-bubble">
                <div class="message-text">
                  <div id="dot-user-md" class="MarkdownRoot-rZKhxa" data-markdown-text-style="assistant-message" data-markdown-text-tone="inherit">
                    <p id="dot-user-p">User msg <a id="dot-user-link" class="ExternalMarkdownLink-WWBYg9" href="https://example.com">link</a> <span id="dot-user-ic" class="InlineCode-Cddi3Y InlineMarkdownIsolate-QWDV4W" data-markdown-copy="inline-code">userCode</span></p>
                    <ul><li id="dot-user-li">User item</li></ul>
                    <blockquote id="dot-user-quote"><p id="dot-user-quote-p">Quote</p></blockquote>
                    <h3 id="dot-user-h3">Heading</h3>
                    <table><tr><th id="dot-user-th">H</th><td id="dot-user-td">D</td></tr></table>
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article class="message-row self" data-message-id="u2">
            <div class="message-surface message-bubble-surface">
              <div id="dot-user-split-outer" class="message-bubble">
                <div class="message-text">
                  <div data-orbit-message-parts="true">
                    <div id="dot-user-split-inner" class="MarkdownRoot-rZKhxa message-bubble" data-orbit-message-text-part="true" data-markdown-text-style="assistant-message" data-markdown-text-tone="inherit">
                      <p id="dot-user-split-p">Split user text</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article class="message-row" data-dot-message="true" data-message-id="d1">
            <div class="message-surface message-bubble-surface">
              <div id="dot-reply-bubble" class="message-bubble">
                <div class="message-text">
                  <div id="dot-reply-md" class="MarkdownRoot-rZKhxa" data-markdown-text-style="assistant-message" data-markdown-text-tone="inherit">
                    <p id="dot-reply-p">Dot reply <span id="dot-reply-ic" class="InlineCode-Cddi3Y InlineMarkdownIsolate-QWDV4W" data-markdown-copy="inline-code">dotCode()</span> <span id="dot-reply-ic-attr" data-markdown-copy="inline-code">attrCode()</span></p>
                    <ul><li id="dot-reply-li">Dot item</li></ul>
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article class="message-row assistant" data-message-id="a1">
            <div class="message-surface message-bubble-surface">
              <div id="dot-asst-bubble" class="message-bubble assistant-bubble">
                <div class="message-text">
                  <div id="dot-asst-md" class="MarkdownRoot-rZKhxa" data-markdown-text-style="assistant-message" data-markdown-text-tone="inherit">
                    <p id="dot-asst-p">Assistant reply <span id="dot-asst-ic" class="InlineCode-Cddi3Y" data-markdown-copy="inline-code">asstCode()</span></p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>`;
    document.body.append(host);
    return host;
  }

  function matchedRules(css: string, element: Element): string {
    const sheet = document.createElement('style');
    sheet.textContent = css;
    document.head.append(sheet);
    try {
      return Array.from(sheet.sheet!.cssRules)
        .filter(
          (rule): rule is CSSStyleRule =>
            rule.type === CSSRule.STYLE_RULE && element.matches((rule as CSSStyleRule).selectorText)
        )
        .map((rule) => rule.style.cssText)
        .join(' ');
    } finally {
      sheet.remove();
    }
  }

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-woodfish-codex');
  });

  it.each(['dark', 'light'] as const)(
    'themes Dot user bubbles and Dot inline code in %s mode while keeping split wrappers and regular chat untouched',
    (mode) => {
      mountDotAndChatDom(mode, true);
      const css = buildCodexCss(
        composeCodexCoreView(
          normalizeCodexSettings({ palette: { dark: 'neon', light: 'light' } }),
          {}
        )
      ).palette;

      const userBubble = matchedRules(css, document.getElementById('dot-user-bubble')!);
      expect(userBubble).toContain('background: var(--color-background-user-message)');
      expect(userBubble).toContain('color: var(--color-text-user-message)');

      const splitInner = matchedRules(css, document.getElementById('dot-user-split-inner')!);
      expect(splitInner).toContain('background: var(--color-background-user-message)');
      expect(splitInner).toContain('color: var(--color-text-user-message)');

      // Outer split-parts wrapper stays transparent as Codex expects.
      expect(matchedRules(css, document.getElementById('dot-user-split-outer')!)).toBe('');
      // Dot reply and assistant bubbles are not styled as outgoing user bubbles.
      expect(matchedRules(css, document.getElementById('dot-reply-bubble')!)).toBe('');
      expect(matchedRules(css, document.getElementById('dot-asst-bubble')!)).toBe('');
      // Regular chat user bubble and inline code are unaffected by Dot rules.
      expect(matchedRules(css, document.getElementById('regular-user-bubble')!)).toBe('');
      expect(matchedRules(css, document.getElementById('regular-ic')!)).toBe('');

      // Dot inline code (with rainbow-text off) uses regular chat's translucent pill and inherits text color.
      for (const id of ['dot-reply-ic', 'dot-reply-ic-attr', 'dot-asst-ic', 'dot-user-ic']) {
        const applied = matchedRules(css, document.getElementById(id)!);
        expect(applied).toContain(
          'color-mix(in srgb, var(--color-background-secondary-ghost-hover) 60%, var(--color-text) 6%)'
        );
        expect(applied).toContain('color: inherit');
        expect(applied).toContain('-webkit-text-fill-color: inherit');
      }
    }
  );

  it('scopes Dot palette overrides to Woodfish active state and matching appearance mode', () => {
    mountDotAndChatDom('dark', false);
    const darkOnlyCss = buildDotCss('dark');
    expect(matchedRules(darkOnlyCss, document.getElementById('dot-user-bubble')!)).toBe('');
    expect(matchedRules(darkOnlyCss, document.getElementById('dot-reply-ic')!)).toBe('');

    document.documentElement.setAttribute('data-woodfish-codex', CODEX_ADAPTER_VERSION);
    document.documentElement.setAttribute('data-theme', 'light');
    expect(matchedRules(darkOnlyCss, document.getElementById('dot-user-bubble')!)).toBe('');
  });

  it('excludes Dot user messages from assistant rainbow-text while keeping Dot replies and regular chat painted', () => {
    mountDotAndChatDom('dark', true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rainbowText = require('../../../../packages/effects/builtin/rainbow-text/effect.js') as (
      ctx: Record<string, unknown>
    ) => unknown;
    let css = '';
    rainbowText({
      params: { colors: 'theme', strength: 42, angle: 135 },
      rainbow: ['#ff2d95', '#00ffff'],
      theme: () => ({
        mode: 'dark',
        stops: ['#ff2d95', '#00ffff'],
        foreground: '#fafafa',
        reply: 'linear-gradient(135deg, #f38ba8, #89b4fa)',
      }),
      selectors: CODEX_EFFECT_SELECTORS,
      onTheme: jest.fn(),
      style: (next: string) => {
        css = next;
      },
    });

    // Dot user message blocks and inline code must not inherit assistant rainbow gradient or transparent fill.
    for (const id of [
      'dot-user-p',
      'dot-user-li',
      'dot-user-quote',
      'dot-user-quote-p',
      'dot-user-h3',
      'dot-user-th',
      'dot-user-td',
      'dot-user-ic',
      'dot-user-split-p',
    ]) {
      const applied = matchedRules(css, document.getElementById(id)!);
      expect({ id, applied }).toEqual({ id, applied: '' });
    }

    // Dot assistant / Dot reply text and regular chat assistant text keep the rainbow gradient.
    for (const id of ['regular-p', 'regular-li', 'dot-reply-p', 'dot-reply-li', 'dot-asst-p']) {
      const applied = matchedRules(css, document.getElementById(id)!);
      expect(applied).toContain('background-clip: text');
      expect(applied).toContain('-webkit-text-fill-color: transparent');
    }

    // Dot assistant inline code overrides Codex's opaque tone="inherit" pill even when no Woodfish palette is active.
    for (const id of ['dot-reply-ic', 'dot-reply-ic-attr', 'dot-asst-ic']) {
      const applied = matchedRules(css, document.getElementById(id)!);
      expect(applied).toContain(
        'color-mix(in srgb, var(--color-background-secondary-ghost-hover) 60%, var(--color-text) 6%)'
      );
      expect(applied).toContain('-webkit-text-fill-color: inherit');
    }

    // Regular chat inline code is untouched by Dot inline-code rules.
    expect(matchedRules(css, document.getElementById('regular-ic')!)).toBe('');

    // assistantMarkdown selector excludes Dot user bubbles while matching regular chat and Dot replies.
    const matchedRoots = [...document.querySelectorAll(selectorOf('assistantMarkdown'))].map(
      (node) => node.id
    );
    expect(matchedRoots).toEqual(['regular-assistant', 'dot-reply-md', 'dot-asst-md']);
    expect(BODY_TEXT_SELECTOR).not.toContain('[data-markdown-text-style="assistant-message"] p');
    expect(BODY_TEXT_SELECTOR).toContain('.messaging-root.messaging-embedded');
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
