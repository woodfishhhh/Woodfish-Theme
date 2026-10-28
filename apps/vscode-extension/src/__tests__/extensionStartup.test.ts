const mockInitializeOnStartup = jest.fn();
const mockRefreshFromConfig = jest.fn();
const mockShowErrorMessage = jest.fn();
const mockAppendLine = jest.fn();

jest.mock(
  'vscode',
  () => ({
    ExtensionMode: {
      Development: 2,
      Production: 1,
    },
  }),
  { virtual: true }
);

jest.mock('../config/featureState', () => ({
  FeatureStateController: jest.fn().mockImplementation(() => ({
    setRuntimeStatusResolver: jest.fn(),
    registerConfigListener: jest.fn(),
    refreshFromConfig: mockRefreshFromConfig,
  })),
}));

jest.mock('../commands/register', () => ({
  registerCommands: jest.fn(),
}));

jest.mock('../services/runtime/service', () => ({
  IntegratedThemeService: jest.fn().mockImplementation(() => ({
    getRuntimeStatus: jest.fn(),
    registerLifecycle: jest.fn(),
    initializeOnStartup: mockInitializeOnStartup,
  })),
}));

jest.mock('../ui/notifications', () => ({
  showErrorMessage: (...args: unknown[]) => mockShowErrorMessage(...args),
  showInfoMessage: jest.fn(),
}));

jest.mock('../ui/output', () => ({
  getOutputChannel: jest.fn(() => ({
    appendLine: mockAppendLine,
  })),
}));

jest.mock('../ui/statusBar', () => ({
  ThemeStatusBar: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
  })),
}));

import { activate } from '../extension';

describe('extension startup synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports an asynchronous startup failure instead of leaving an unhandled rejection', async () => {
    mockInitializeOnStartup.mockRejectedValueOnce(new Error('workbench unavailable'));

    activate({
      extensionMode: 1,
      subscriptions: [],
    } as unknown as import('vscode').ExtensionContext);

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(mockAppendLine).toHaveBeenCalledWith(
      'Startup runtime sync failed: workbench unavailable'
    );
    expect(mockShowErrorMessage).toHaveBeenCalledWith(
      '启动同步失败: workbench unavailable。可运行“修复 Woodfish 注入”重试。'
    );
    expect(mockRefreshFromConfig).toHaveBeenCalledTimes(1);
  });
});
