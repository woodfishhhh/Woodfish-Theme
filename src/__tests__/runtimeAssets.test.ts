import * as path from 'path';
import { DEFAULT_RUNTIME_SETTINGS, buildRuntimeCss } from '../services/runtime/payloadBuilder';

jest.mock('vscode', () => ({}), { virtual: true });

const { readRuntimeAssets } = require('../services/runtime/assets') as {
  readRuntimeAssets: (
    context: import('vscode').ExtensionContext,
    themeLabel?: string
  ) => {
    themeVariables?: string;
    cursorDefaults?: {
      animationDuration?: number;
      gradientStops?: string[];
      borderRadius?: number;
      glowBlur?: number;
      glowOpacity?: number;
    };
    activityBar: string;
    tabBar: string;
    syntaxGradient: string;
    glow: string;
    cursorCore: string;
    cursorGlow: string;
  };
};

describe('runtime theme assets', () => {
  const extensionRoot = path.resolve(__dirname, '../..');
  const context = {
    asAbsolutePath: jest.fn((value: string) => path.resolve(extensionRoot, value)),
  } as unknown as import('vscode').ExtensionContext;

  it('loads Dracula metadata and syntax together with shared runtime CSS', () => {
    const assets = readRuntimeAssets(context, 'Woodfish Dracula');

    expect(assets.themeVariables).toContain(
      '--woodfish-activity-badge-gradient: linear-gradient(45deg, #ff79c6, #bd93f9)'
    );
    expect(assets.activityBar).toContain('--woodfish-activity-badge-gradient');
    expect(assets.tabBar).toContain('.tabs-container > .tab.active::after');
    expect(assets.tabBar).toContain('@media (prefers-reduced-motion: reduce)');
    expect(assets.tabBar).toContain('background-position: 0% 50%;');
    expect(assets.tabBar).toContain('background-position: 100% 50%;');
    expect(assets.tabBar).not.toMatch(/background-position\s*:\s*(?:0%|100%)\s+50%\s*!important\b/);
    expect(assets.syntaxGradient).toContain('#bd93f9');
    expect(assets.syntaxGradient).not.toMatch(/\.mtk(?:6|12|13|14|15|16)\b/);
    expect(assets.glow).toContain('Woodfish Dracula glow profile');
    expect(assets.cursorGlow).toContain(
      'filter: var(--woodfish-cursor-glow-filter, none) !important;'
    );
    expect(assets.cursorCore).toContain('@media (prefers-reduced-motion: reduce)');
    expect(assets.cursorGlow).toContain('@media (prefers-reduced-motion: reduce)');
    expect(assets.cursorDefaults).toEqual({
      animationDuration: 12,
      gradientStops: ['#ff79c6', '#bd93f9', '#8be9fd', '#50fa7b', '#8be9fd', '#bd93f9', '#ff79c6'],
      borderRadius: 1,
      glowBlur: 0,
      glowOpacity: 0.45,
    });

    const css = buildRuntimeCss(DEFAULT_RUNTIME_SETTINGS, assets);

    expect(css).toContain('--woodfish-tab-border-gradient');
    expect(css).toContain('--woodfish-tab-border-animation-duration: 7s');
    expect(css).toContain('filter: var(--woodfish-cursor-glow-filter, none) !important;');
    expect(css).toContain('--woodfish-cursor-glow-filter: none;');
    expect(css).toContain('--woodfish-cursor-glow-opacity: 0.45;');
    expect(css).toContain('opacity: var(--woodfish-cursor-glow-opacity');
    expect(css).toContain('text-shadow: 0 0 6px currentColor !important;');
    expect(css).not.toContain('brightness(180%)');
  });

  it('keeps the Dracula base theme readable without runtime injection', () => {
    const theme = require('../../themes/dracula/Woodfish Dracula.json') as {
      colors: Record<string, string>;
    };

    expect(theme.colors['activityBarBadge.foreground']).toBe('#282A36');
    expect(theme.colors['editorCursor.foreground']).toBe('#FF79C6');
    expect(theme.colors['editorLineNumber.activeForeground']).toBe('#F8F8F2');
    expect(theme.colors['tab.inactiveForeground']).toBe('#8391C2');
  });
});
