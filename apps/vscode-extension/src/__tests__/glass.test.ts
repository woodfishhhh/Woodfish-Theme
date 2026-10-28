import { buildGlassCss, buildNativeWindowCss, GLASS_TARGETS } from '../services/runtime/glass';
import { buildRuntimeBootstrap, buildRuntimeCss } from '../services/runtime/payloadBuilder';
import {
  DEFAULT_RUNTIME_SETTINGS,
  GLASS_TARGET_KEYS,
  GlassSettings,
  normalizeRuntimeSettings,
} from '../types/features';

function glass(overrides: Partial<GlassSettings> = {}): GlassSettings {
  return { ...DEFAULT_RUNTIME_SETTINGS.glass, enabled: true, ...overrides };
}

const assets = {
  activityBar: '',
  tabBar: '',
  overlayBootstrap: '(() => {})();',
  nativeWindowHook: '',
  cursorCore: '',
  cursorGlow: '',
};

describe('glass layer', () => {
  it('emits nothing while disabled', () => {
    expect(buildGlassCss(DEFAULT_RUNTIME_SETTINGS.glass)).toBe('');
    expect(buildRuntimeCss(DEFAULT_RUNTIME_SETTINGS, assets)).not.toContain('backdrop-filter');
  });

  it('tints every target with the active theme color instead of hard-coded colors', () => {
    const css = buildGlassCss(glass());
    for (const key of GLASS_TARGET_KEYS) {
      const target = GLASS_TARGETS[key];
      expect(css).toContain(
        `color-mix(in srgb, var(${target.colorVariable}) var(--woodfish-glass-opacity), transparent)`
      );
    }
    expect(css).toContain('--woodfish-glass-filter: blur(30px) saturate(125%)');
    expect(css).toContain('--woodfish-glass-opacity: 70%');
    expect(css).toContain('-webkit-backdrop-filter: var(--woodfish-glass-filter) !important;');
  });

  it('keeps a plain theme-color fallback before color-mix for older Chromium', () => {
    const css = buildGlassCss(glass({ targets: ['menu'] }));
    const fallback = css.indexOf('background-color: var(--vscode-menu-background) !important;');
    const mixed = css.indexOf('color-mix(in srgb, var(--vscode-menu-background)');
    expect(fallback).toBeGreaterThan(-1);
    expect(fallback).toBeLessThan(mixed);
  });

  it('only styles the requested targets', () => {
    const css = buildGlassCss(glass({ targets: ['hover'] }));
    expect(css).toContain('.monaco-hover');
    expect(css).not.toContain('var(--vscode-quickInput-background)');
  });

  it('switches to the acrylic SVG filter in acrylic mode', () => {
    const css = buildGlassCss(glass({ mode: 'acrylic' }));
    expect(css).toContain('--woodfish-glass-filter: url(#woodfish-acrylic) saturate(125%)');
    expect(css).toContain('--woodfish-glass-mode: acrylic');
  });

  it('follows VS Code corner radius tokens unless a radius is configured', () => {
    expect(buildGlassCss(glass())).not.toContain('border-radius');
    expect(buildGlassCss(glass({ borderRadius: 10 }))).toContain('border-radius: 10px !important;');
  });

  it('embeds grain as a CSP-safe data URI and can turn it off', () => {
    expect(buildGlassCss(glass())).toMatch(/--woodfish-glass-noise: url\("data:image\/svg\+xml,/);
    expect(buildGlassCss(glass({ noise: 0 }))).toContain('--woodfish-glass-noise: none;');
  });

  it('honors both OS reduced motion and VS Code workbench.reduceMotion', () => {
    const css = buildGlassCss(glass());
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.monaco-workbench.monaco-reduce-motion .monaco-menu-container');
    expect(css).toContain(
      'animation: woodfishGlassDrop 200ms cubic-bezier(0.22, 1, 0.36, 1) backwards;'
    );
    expect(css).not.toContain('.notification-toast {\n  animation');
    expect(css).not.toContain('.quick-input-widget {\n  animation');
  });

  it('omits animations and reveal when switched off', () => {
    const css = buildGlassCss(glass({ animations: false, reveal: false }));
    expect(css).not.toContain('@keyframes');
    expect(css).not.toContain('data-woodfish-reveal');
  });

  it('installs the bootstrap for glass-only setups that need reveal or acrylic', () => {
    const glassOnly = normalizeRuntimeSettings({
      syntaxGradient: { enabled: false },
      glow: { enabled: false },
      glass: { enabled: true, reveal: true },
    });
    expect(buildRuntimeBootstrap(glassOnly, assets)).not.toBe('');

    const plainGlass = normalizeRuntimeSettings({
      syntaxGradient: { enabled: false },
      glow: { enabled: false },
      glass: { enabled: true, reveal: false, mode: 'blur' },
    });
    expect(buildRuntimeBootstrap(plainGlass, assets)).toBe('');
  });

  it('only makes the workbench translucent for native window material on macOS and Windows', () => {
    const settings = glass({
      nativeWindow: { ...DEFAULT_RUNTIME_SETTINGS.glass.nativeWindow, enabled: true },
    });
    expect(buildNativeWindowCss(settings, 'darwin')).toContain(
      'background: transparent !important;'
    );
    expect(buildNativeWindowCss(settings, 'win32')).toContain(
      'color-mix(in srgb, var(--vscode-editor-background) 78%, transparent)'
    );
    expect(buildNativeWindowCss(settings, 'linux')).toBe('');
    expect(buildNativeWindowCss({ ...settings, enabled: false }, 'darwin')).toBe('');
  });

  it('cooperates with VS Code 1.143+ native frosted glass instead of fighting it', () => {
    const css = buildGlassCss(glass());
    // Native surfaces: Woodfish paints them only while VS Code's own glass is off …
    expect(css).toContain(
      '.monaco-workbench:not(.hc-black):not(.hc-light):not(.modern-ui-frosted-glass) .quick-input-widget:not(.quick-input-widget-overlay) {'
    );
    // … and otherwise only strengthens the native ::before layer.
    expect(css).toContain(
      '.monaco-workbench:not(.hc-black):not(.hc-light).modern-ui-frosted-glass .quick-input-widget:not(.quick-input-widget-overlay)::before'
    );
    expect(css).toContain('--modern-ui-glass-opacity: var(--woodfish-glass-opacity) !important;');
    // Surfaces VS Code does not frost are always painted.
    expect(css).toContain(
      '.monaco-workbench:not(.hc-black):not(.hc-light) .monaco-editor .suggest-widget'
    );
  });

  it('follows the native guards: feature detection, reduced transparency and high contrast', () => {
    const css = buildGlassCss(glass());
    expect(css).toContain(
      '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))'
    );
    expect(css).toContain('@media not (prefers-reduced-transparency: reduce)');
    const surfaceRules = css
      .split('\n')
      .filter((line) => line.includes('.monaco-menu-container .monaco-scrollable-element'));
    expect(surfaceRules.every((line) => line.includes(':not(.hc-black):not(.hc-light)'))).toBe(
      true
    );
  });

  it('sanitizes glass settings', () => {
    const settings = normalizeRuntimeSettings({
      glass: {
        mode: 'liquid' as never,
        blur: 999,
        opacity: -1,
        targets: ['menu', 'nope' as never, 'menu'],
        nativeWindow: { windowsMaterial: 'glass' as never },
      },
    });
    expect(settings.glass.mode).toBe('blur');
    expect(settings.glass.blur).toBe(60);
    expect(settings.glass.opacity).toBe(0.15);
    expect(settings.glass.targets).toEqual(['menu']);
    expect(settings.glass.nativeWindow.windowsMaterial).toBe('acrylic');
  });
});
