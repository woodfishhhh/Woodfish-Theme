import * as path from 'path';
import { DEFAULT_RUNTIME_SETTINGS, buildRuntimeCss } from '../services/runtime/payloadBuilder';

jest.mock('vscode', () => ({}), { virtual: true });

const { readRuntimeAssets } = require('../services/runtime/assets') as {
  readRuntimeAssets: (
    context: import('vscode').ExtensionContext,
    themeLabel?: string
  ) => {
    themeVariables?: string;
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
    expect(assets.syntaxGradient).toContain('#bd93f9');
    expect(assets.cursorGlow).toContain('filter: none !important;');

    const css = buildRuntimeCss(DEFAULT_RUNTIME_SETTINGS, assets);

    expect(css).toContain('--woodfish-tab-border-gradient');
    expect(css).toContain('filter: none !important;');
    expect(css).toContain('opacity: 0.7 !important;');
    expect(css).not.toContain('brightness(180%)');
  });
});
