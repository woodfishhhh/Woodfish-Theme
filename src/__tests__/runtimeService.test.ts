const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
}));

jest.mock(
  'vscode',
  () => ({
    version: '1.100.0',
  }),
  { virtual: true }
);

jest.mock('../config/featureFlags', () => ({
  readCurrentColorTheme: jest.fn(() => 'Woodfish Dark'),
  readFeatureFlags: jest.fn(),
  readRuntimeSettings: jest.fn(() => ({
    syntaxGradient: {
      enabled: true,
      customRules: [],
    },
    glow: {
      enabled: true,
      intensity: 1,
      customRules: [],
    },
    cursor: {
      enabled: true,
      animationDuration: 8,
      gradientStops: ['#fff'],
      borderRadius: 2,
      glow: true,
      glowBlur: 4,
      glowOpacity: 0.7,
      customRules: [],
    },
  })),
  setColorTheme: jest.fn(),
}));

const mockWriteRuntimeInstallState = jest.fn().mockResolvedValue(undefined);

jest.mock('../services/runtime/state', () => ({
  clearRuntimeInstallState: jest.fn(),
  readRuntimeInstallState: jest.fn(() => ({
    backupPath: 'C:/old-version/workbench.html.woodfish-backup',
  })),
  writeRuntimeInstallState: (...args: unknown[]) => mockWriteRuntimeInstallState(...args),
}));

jest.mock('../services/runtime/assets', () => ({
  readRuntimeAssets: jest.fn(() => ({
    activityBar: '.activity {}',
    tabBar: '.tab {}',
    syntaxGradient: '.syntax {}',
    glow: '.glow {}',
    cursorCore: '.cursor {}',
    cursorGlow: '.glow-cursor {}',
  })),
}));

jest.mock('../services/runtime/locator', () => ({
  getWorkbenchHtmlPath: jest.fn(() => 'C:/current-version/workbench.html'),
}));

jest.mock('../services/runtime/payloadBuilder', () => ({
  buildRuntimeCss: jest.fn(() => '.woodfish { color: red; }'),
}));

jest.mock('../services/runtime/status', () => ({
  deriveRuntimeStatus: jest.fn(),
}));

jest.mock('../services/runtime/workbenchPatcher', () => ({
  hasWoodfishPayload: jest.fn(() => false),
  injectWorkbenchPayload: jest.fn((html: string, payload: string) => `${html}\n${payload}`),
  removeKnownLegacyWoodfishPayloads: jest.fn((html: string) => ({
    html,
    removed: [],
  })),
  removeWorkbenchPayload: jest.fn((html: string) => html),
}));

jest.mock('../ui/notifications', () => ({
  showInfoMessage: jest.fn(),
  showReloadPrompt: jest.fn().mockResolvedValue(undefined),
}));

const mockAppendLine = jest.fn();

jest.mock('../ui/output', () => ({
  getOutputChannel: jest.fn(() => ({
    appendLine: mockAppendLine,
  })),
}));

jest.mock('../ui/progress', () => ({
  withProgressNotification: jest.fn(async (_title: string, task: () => Promise<void>) => task()),
}));

import { IntegratedThemeService } from '../services/runtime/service';

describe('IntegratedThemeService', () => {
  const currentWorkbenchPath = 'C:/current-version/workbench.html';
  const currentBackupPath = `${currentWorkbenchPath}.woodfish-backup`;
  const context = {
    asAbsolutePath: jest.fn((value: string) => value),
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockImplementation((targetPath: string) => targetPath === currentWorkbenchPath);
    mockReadFileSync.mockReturnValue('<html><body>workbench</body></html>');
  });

  it('falls back to the current workbench backup path when stored backupPath is stale', async () => {
    const service = new IntegratedThemeService(context);

    await service.syncWithCurrentSettings();

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      currentBackupPath,
      '<html><body>workbench</body></html>',
      'utf-8'
    );
    expect(mockWriteFileSync).not.toHaveBeenCalledWith(
      'C:/old-version/workbench.html.woodfish-backup',
      '<html><body>workbench</body></html>',
      'utf-8'
    );
  });
});
