import * as path from 'path';
import { DEFAULT_RUNTIME_SETTINGS, buildRuntimeCss } from '../services/runtime/payloadBuilder';

let mockWorkbenchColorCustomizations: Record<string, unknown> | undefined;

jest.mock(
  'vscode',
  () => ({
    workspace: {
      getConfiguration: jest.fn(() => ({
        get: jest.fn(() => mockWorkbenchColorCustomizations),
      })),
    },
  }),
  { virtual: true }
);

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

  beforeEach(() => {
    mockWorkbenchColorCustomizations = undefined;
  });

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
    expect(assets.syntaxGradient).toContain(
      '.monaco-editor .view-lines span.mtk1:not(.cursor):not(.colorpicker-color-decoration)'
    );
    expect(assets.syntaxGradient).toContain(
      '.monaco-editor .view-lines span.mtk10:not(.cursor):not(.colorpicker-color-decoration)'
    );
    expect(assets.syntaxGradient).toContain(
      'linear-gradient(\n    90deg,\n    #F996FF 0%,\n    #FF79C6 50%,\n    #F76381 100%'
    );
    expect(assets.syntaxGradient).not.toContain('#ff79c6, #bd93f9');
    expect(assets.syntaxGradient).not.toContain('#8be9fd, #50fa7b');
    expect(assets.syntaxGradient).not.toContain('#ffb86c, #f1fa8c');
    expect(assets.syntaxGradient).not.toContain('#8be9fd, #bd93f9');
    expect(assets.syntaxGradient).not.toContain('__WOODFISH_TOKEN_');
    expect(assets.syntaxGradient).not.toContain('__WOODFISH_AUTO_TOKEN_GRADIENTS__');
    expect(assets.syntaxGradient).not.toContain('span.mtk2:not(.cursor)');
    expect(assets.syntaxGradient.match(/background-image: linear-gradient/g)).toHaveLength(11);
    expect(assets.glow).toContain('Woodfish Dracula glow profile');
    expect(assets.glow).toContain('.monaco-editor .view-lines span.mtk10');
    expect(assets.glow).not.toContain('__WOODFISH_TOKEN_');
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
    expect(css).toContain('#BD93F9 50%');
    expect(css).toContain('#50FA7B 50%');
    expect(css).toContain('#FFB86C 50%');
    expect(css).toContain('#F1FA8C 50%');
    expect(css).toContain('#8BE9FD 50%');
    expect(css).toContain('#FF79C6 50%');
    expect(css).not.toContain('brightness(180%)');
  });

  it('compiles the Bearded syntax template from its theme color table', () => {
    const assets = readRuntimeAssets(context, 'Woodfish Dark');

    expect(assets.syntaxGradient).toContain(':not(.cursor).mtk9');
    expect(assets.syntaxGradient).toContain(
      '.mtk1:not(.cursor):not(.dyn-rule-2-34):not(.colorpicker-color-decoration)'
    );
    expect(assets.syntaxGradient).not.toContain('__WOODFISH_TOKEN_');
    expect(assets.glow).toContain('Woodfish Dark glow profile');
    expect(assets.glow).toContain('span.mtk3');
    expect(assets.glow).toContain('span.mtk12');
    expect(assets.glow).not.toContain('__WOODFISH_TOKEN_');
  });

  it('recompiles selectors when editor color customization shifts the color table', () => {
    mockWorkbenchColorCustomizations = {
      'editor.foreground': '#123456',
    };
    const isolatedContext = {
      asAbsolutePath: jest.fn((value: string) => path.resolve(extensionRoot, value)),
    } as unknown as import('vscode').ExtensionContext;
    const assets = readRuntimeAssets(isolatedContext, 'Woodfish Dracula');

    expect(assets.syntaxGradient).toContain(
      '.monaco-editor .view-lines span.mtk11:not(.cursor):not(.colorpicker-color-decoration)'
    );
    expect(assets.syntaxGradient).toContain('#FF79C6 50%');
    expect(assets.syntaxGradient).not.toContain(
      '.monaco-editor .view-lines span.mtk10:not(.cursor):not(.colorpicker-color-decoration) {\n' +
        '  background-image: linear-gradient(\n' +
        '    90deg,\n' +
        '    #F996FF 0%,\n' +
        '    #FF79C6 50%'
    );
    expect(assets.syntaxGradient).not.toContain('__WOODFISH_TOKEN_');
    expect(assets.glow).toContain(
      '.monaco-editor .view-lines span.mtk11,\n.monaco-editor .view-lines span.mtk5'
    );
    expect(assets.glow).not.toContain('__WOODFISH_TOKEN_');

    const beardedAssets = readRuntimeAssets(isolatedContext, 'Woodfish Dark');
    expect(beardedAssets.syntaxGradient).toContain(
      '.mtk1:not(.cursor):not(.dyn-rule-2-34):not(.colorpicker-color-decoration)'
    );
    expect(beardedAssets.glow).toContain('span.mtk1 {');
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

  it('caches immutable extension assets for repeated runtime syncs', () => {
    const isolatedContext = {
      asAbsolutePath: jest.fn((value: string) => path.resolve(extensionRoot, value)),
    } as unknown as import('vscode').ExtensionContext;
    const firstLoad = readRuntimeAssets(isolatedContext, 'Woodfish Dracula');
    const secondLoad = readRuntimeAssets(isolatedContext, 'Woodfish Dracula');

    expect(secondLoad).toBe(firstLoad);
  });

  it('rejects unknown theme labels instead of silently loading another theme', () => {
    expect(() => readRuntimeAssets(context, 'Unknown Woodfish Theme')).toThrow(
      'Unknown Woodfish runtime theme'
    );
  });
});
