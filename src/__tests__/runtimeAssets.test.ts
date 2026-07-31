import * as path from 'path';
import { DEFAULT_RUNTIME_SETTINGS, buildRuntimeCss } from '../services/runtime/payloadBuilder';
import { readRuntimeAssets } from '../services/runtime/assets';

describe('runtime overlay assets', () => {
  const extensionRoot = path.resolve(__dirname, '../..');
  const context = {
    asAbsolutePath: jest.fn((value: string) => path.resolve(extensionRoot, value)),
  } as unknown as import('vscode').ExtensionContext;

  it('loads bundled Dracula only as a base theme plus shared overlay assets', () => {
    const assets = readRuntimeAssets(context, 'Woodfish Dracula');
    const css = buildRuntimeCss(DEFAULT_RUNTIME_SETTINGS, assets);

    expect(assets.themeVariables).toContain(
      '--woodfish-activity-badge-gradient: linear-gradient(45deg, #ff79c6, #bd93f9)'
    );
    expect(assets.activityBar).toContain('--woodfish-activity-badge-gradient');
    expect(assets.tabBar).toContain('.tabs-container > .tab.active::after');
    expect(assets.overlayBootstrap).toContain("const VERSION = '6.0.0-beta.1'");
    expect(assets.overlayBootstrap).toContain('MAX_TOKENS_PER_FRAME = 600');
    expect(assets.overlayBootstrap).toContain('requestAnimationFrame(flushTokens)');
    expect(assets.cursorDefaults).toEqual({
      animationDuration: 12,
      gradientStops: ['#ff79c6', '#bd93f9', '#8be9fd', '#50fa7b', '#8be9fd', '#bd93f9', '#ff79c6'],
      borderRadius: 1,
      glowBlur: 0,
      glowOpacity: 0.45,
    });

    expect(css).toContain('[data-woodfish-overlay-token="true"]');
    expect(css).toContain('--woodfish-overlay-hue-shift: 24');
    expect(css).toContain('--woodfish-overlay-lightness-delta: 0.06');
    expect(css).toContain('--woodfish-overlay-neutral-chroma: 0.06');
    expect(css).not.toMatch(/span\.mtk\d+/);
    expect(css).not.toContain('oklch(');
  });

  it('keeps third-party themes free from bundled-theme UI styling', () => {
    const assets = readRuntimeAssets(context, 'One Dark Pro');
    const css = buildRuntimeCss(DEFAULT_RUNTIME_SETTINGS, assets);

    expect(assets.themeVariables).toBeUndefined();
    expect(assets.cursorDefaults).toBeUndefined();
    expect(assets.activityBar).toBe('');
    expect(assets.tabBar).toBe('');
    expect(assets.overlayBootstrap).toContain('resolveAnchorHue');
    expect(css).toContain('[data-woodfish-overlay-token="true"]');
    expect(css).toContain('div.cursor');
    expect(css).not.toContain('.activitybar');
    expect(css).not.toContain('.tabs-container');
  });

  it('keeps the bundled JSON files as readable upstream bases without injected palettes', () => {
    const bearded = require('../../themes/bearded/Woodfish Dark.json') as {
      name: string;
      colors: Record<string, string>;
    };
    const dracula = require('../../themes/dracula/Woodfish Dracula.json') as {
      name: string;
      colors: Record<string, string>;
    };

    expect(bearded.name).toBe('BeardedTheme Arc');
    expect(bearded.colors['editor.foreground']).toBe('#d0d7e4');
    expect(bearded.colors['editorCursor.foreground']).toBe('#EACD61');
    expect(dracula.name).toBe('Dracula');
    expect(dracula.colors['editor.foreground']).toBe('#F8F8F2');
    expect(dracula.colors['activityBarBadge.foreground']).toBe('#F8F8F2');
    expect(dracula.colors['tab.inactiveForeground']).toBe('#6272A4');
  });

  it('caches assets independently for built-in and external theme labels', () => {
    const isolatedContext = {
      asAbsolutePath: jest.fn((value: string) => path.resolve(extensionRoot, value)),
    } as unknown as import('vscode').ExtensionContext;

    const firstExternal = readRuntimeAssets(isolatedContext, 'One Dark Pro');
    const secondExternal = readRuntimeAssets(isolatedContext, 'One Dark Pro');
    const anotherExternal = readRuntimeAssets(isolatedContext, 'GitHub Dark');
    const builtIn = readRuntimeAssets(isolatedContext, 'Woodfish Dracula');

    expect(secondExternal).toBe(firstExternal);
    expect(anotherExternal).toBe(firstExternal);
    expect(builtIn).not.toBe(firstExternal);
    expect(builtIn.activityBar).not.toBe('');
  });
});
