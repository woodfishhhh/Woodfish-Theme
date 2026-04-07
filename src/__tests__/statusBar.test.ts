const statusBarItem = {
  text: '',
  tooltip: '',
  command: '',
  show: jest.fn(),
  dispose: jest.fn(),
};

jest.mock(
  'vscode',
  () => ({
    window: {
      createStatusBarItem: jest.fn(() => statusBarItem),
    },
    StatusBarAlignment: {
      Right: 2,
    },
  }),
  { virtual: true }
);

import { ThemeStatusBar } from '../ui/statusBar';

describe('status bar runtime snapshot rendering', () => {
  beforeEach(() => {
    statusBarItem.text = '';
    statusBarItem.tooltip = '';
    jest.clearAllMocks();
  });

  it('renders the on state with enabled feature badges and runtime details', () => {
    const context = {
      subscriptions: [],
    } as unknown as { subscriptions: { push: (...items: unknown[]) => number } };
    const statusBar = new ThemeStatusBar(context as never);

    statusBar.update(
      {
        syntaxGradient: true,
        glow: true,
        cursor: true,
      },
      {
        state: 'on',
        activeTheme: 'Woodfish Dark',
        isWoodfishTheme: true,
        hasPayload: true,
      }
    );

    expect(statusBarItem.text).toBe('Woodfish on A G C');
    expect(String(statusBarItem.tooltip)).toContain('Woodfish Dark');
    expect(String(statusBarItem.tooltip)).toContain('on');
    expect(String(statusBarItem.tooltip)).toContain('payload');
  });

  it('renders paused when effects are enabled but runtime is not currently active', () => {
    const context = {
      subscriptions: [],
    } as unknown as { subscriptions: { push: (...items: unknown[]) => number } };
    const statusBar = new ThemeStatusBar(context as never);

    statusBar.update(
      {
        syntaxGradient: true,
        glow: true,
        cursor: false,
      },
      {
        state: 'paused',
        activeTheme: 'One Dark Pro',
        isWoodfishTheme: false,
        hasPayload: false,
      }
    );

    expect(statusBarItem.text).toBe('Woodfish paused A G');
  });

  it('renders off after payload removal even if Woodfish Dark is still selected', () => {
    const context = {
      subscriptions: [],
    } as unknown as { subscriptions: { push: (...items: unknown[]) => number } };
    const statusBar = new ThemeStatusBar(context as never);

    statusBar.update(
      {
        syntaxGradient: true,
        glow: true,
        cursor: true,
      },
      {
        state: 'off',
        activeTheme: 'Woodfish Dark',
        isWoodfishTheme: true,
        hasPayload: false,
      }
    );

    expect(statusBarItem.text).toBe('Woodfish off A G C');
    expect(String(statusBarItem.tooltip)).toContain('payload: absent');
  });
});
