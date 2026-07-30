import * as crypto from 'crypto';

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockCopyFileSync = jest.fn();
const mockRenameSync = jest.fn();
const mockUnlinkSync = jest.fn();
const mockFiles = new Map<string, string>();
const mockOnDidChangeConfiguration = jest.fn();

jest.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  copyFileSync: (...args: unknown[]) => mockCopyFileSync(...args),
  renameSync: (...args: unknown[]) => mockRenameSync(...args),
  unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
}));

jest.mock(
  'vscode',
  () => ({
    version: '1.100.0',
    workspace: {
      onDidChangeConfiguration: (...args: unknown[]) => mockOnDidChangeConfiguration(...args),
    },
  }),
  { virtual: true }
);

jest.mock('../config/featureFlags', () => ({
  readCurrentColorTheme: jest.fn(() => 'Woodfish Dark'),
  readFeatureFlags: jest.fn(),
  readRuntimeSettings: jest.fn(() => ({
    overlay: {
      enabled: true,
      hueShift: 24,
      lightnessDelta: 0.06,
      neutralChroma: 0.06,
      angle: 90,
    },
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
  setOverlayEnabled: jest.fn(),
}));

const mockWriteRuntimeInstallState = jest.fn().mockResolvedValue(undefined);
const mockReadLastSelectedThemeLabel = jest.fn<string | undefined, []>(() => undefined);
const mockClearRuntimeInstallState = jest.fn().mockResolvedValue(undefined);
let mockRuntimeState: Record<string, unknown> = {};

jest.mock('../services/runtime/state', () => ({
  clearRuntimeInstallState: (...args: unknown[]) => mockClearRuntimeInstallState(...args),
  readLastSelectedThemeLabel: () => mockReadLastSelectedThemeLabel(),
  readRuntimeInstallState: jest.fn(() => mockRuntimeState),
  writeLastSelectedThemeLabel: jest.fn(),
  writeRuntimeInstallState: (...args: unknown[]) => mockWriteRuntimeInstallState(...args),
}));

jest.mock('../services/runtime/assets', () => ({
  readRuntimeAssets: jest.fn(() => ({
    activityBar: '.activity {}',
    tabBar: '.tab {}',
    overlayBootstrap: 'globalThis.woodfishOverlay = true;',
    cursorCore: '.cursor {}',
    cursorGlow: '.glow-cursor {}',
  })),
}));

jest.mock('../services/runtime/locator', () => ({
  getWorkbenchHtmlPath: jest.fn(() => 'C:/current-version/workbench.html'),
}));

jest.mock('../services/runtime/payloadBuilder', () => ({
  buildRuntimePayload: jest.fn(() => ({
    css: '.woodfish { color: red; }',
    bootstrap: 'globalThis.woodfishOverlay = true;',
  })),
}));

jest.mock('../services/runtime/status', () => ({
  deriveRuntimeStatus: jest.fn(),
}));

jest.mock('../ui/notifications', () => ({
  showErrorMessage: jest.fn(),
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

import {
  readCurrentColorTheme,
  readRuntimeSettings,
  setOverlayEnabled,
} from '../config/featureFlags';
import { buildRuntimePayload } from '../services/runtime/payloadBuilder';
import { IntegratedThemeService } from '../services/runtime/service';

describe('IntegratedThemeService', () => {
  const currentWorkbenchPath = 'C:/current-version/workbench.html';
  const currentBackupPath = `${currentWorkbenchPath}.woodfish-backup`;
  const context = {
    asAbsolutePath: jest.fn((value: string) => value),
    subscriptions: [],
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFiles.clear();
    mockFiles.set(currentWorkbenchPath, '<html><body>workbench</body></html>');
    mockRuntimeState = {
      backupPath: 'C:/old-version/workbench.html.woodfish-backup',
    };
    mockExistsSync.mockImplementation((targetPath: string) => mockFiles.has(targetPath));
    mockReadFileSync.mockImplementation((targetPath: string) => {
      const content = mockFiles.get(targetPath);
      if (content === undefined) {
        throw new Error(`ENOENT: ${targetPath}`);
      }
      return content;
    });
    mockWriteFileSync.mockImplementation((targetPath: string, content: string) => {
      mockFiles.set(targetPath, content);
    });
    mockCopyFileSync.mockImplementation((sourcePath: string, targetPath: string) => {
      const content = mockFiles.get(sourcePath);
      if (content === undefined) {
        throw new Error(`ENOENT: ${sourcePath}`);
      }
      mockFiles.set(targetPath, content);
    });
    mockRenameSync.mockImplementation((sourcePath: string, targetPath: string) => {
      const content = mockFiles.get(sourcePath);
      if (content === undefined) {
        throw new Error(`ENOENT: ${sourcePath}`);
      }
      mockFiles.delete(sourcePath);
      mockFiles.set(targetPath, content);
    });
    mockUnlinkSync.mockImplementation((targetPath: string) => {
      mockFiles.delete(targetPath);
    });
    mockWriteRuntimeInstallState.mockImplementation(async (_context, state) => {
      mockRuntimeState = state;
    });
    mockReadLastSelectedThemeLabel.mockReturnValue(undefined);
    context.subscriptions.length = 0;
  });

  it('resyncs when workbench token color ids may have changed', () => {
    mockOnDidChangeConfiguration.mockReturnValue({ dispose: jest.fn() });
    const service = new IntegratedThemeService(context);
    const sync = jest.spyOn(service, 'syncWithCurrentSettings').mockResolvedValue();

    service.registerLifecycle(context);
    const listener = mockOnDidChangeConfiguration.mock.calls[0]?.[0] as (event: {
      affectsConfiguration: (section: string) => boolean;
    }) => void;
    listener({
      affectsConfiguration: (section: string) => section === 'workbench.colorCustomizations',
    });

    expect(sync).toHaveBeenCalledWith({ showPrompt: true });
  });

  it('falls back to the current workbench backup path when stored backupPath is stale', async () => {
    const service = new IntegratedThemeService(context);

    await service.syncWithCurrentSettings();

    expect(mockFiles.get(currentBackupPath)).toBe('<html><body>workbench</body></html>');
    expect(mockFiles.has('C:/old-version/workbench.html.woodfish-backup')).toBe(false);
    expect(mockRuntimeState).toMatchObject({
      stateVersion: 2,
      backupPath: currentBackupPath,
      backupWorkbenchPath: currentWorkbenchPath,
      backupVscodeVersion: '1.100.0',
    });
  });

  it('repairs from a validated backup baseline', async () => {
    const backupHtml = '<html><body>validated baseline</body></html>';
    mockFiles.set(currentBackupPath, backupHtml);
    mockFiles.set(
      currentWorkbenchPath,
      '<html><body>damaged current file</body><!-- WOODFISH_THEME_START -->bad<!-- WOODFISH_THEME_END --></html>'
    );
    mockRuntimeState = validBackupState(backupHtml);

    const service = new IntegratedThemeService(context);
    await service.repairWorkbench();

    const repaired = mockFiles.get(currentWorkbenchPath);
    expect(repaired).toContain('validated baseline');
    expect(repaired).not.toContain('damaged current file');
    expect(repaired).toContain('data-woodfish-theme="runtime"');
  });

  it('rejects a backup whose content no longer matches its recorded hash', async () => {
    const recordedBackup = '<html><body>recorded baseline</body></html>';
    mockFiles.set(currentBackupPath, '<html><body>tampered backup</body></html>');
    mockFiles.set(currentWorkbenchPath, '<html><body>current baseline</body></html>');
    mockRuntimeState = validBackupState(recordedBackup);

    const service = new IntegratedThemeService(context);
    await service.repairWorkbench();

    const repaired = mockFiles.get(currentWorkbenchPath);
    expect(repaired).toContain('current baseline');
    expect(repaired).not.toContain('tampered backup');
    expect(mockFiles.get(currentBackupPath)).toBe('<html><body>current baseline</body></html>');
  });

  it('complete uninstall restores a backup but removes current and legacy payloads', async () => {
    const legacy =
      '<style>@import url("file:///extensions/woodfish-theme/themes/Bearded Theme/glow-effects.css");</style>';
    const backupHtml = `<html><head>${legacy}</head><body>baseline</body></html>`;
    mockFiles.set(currentBackupPath, backupHtml);
    mockFiles.set(
      currentWorkbenchPath,
      `<html><head>${legacy}</head><body>current</body><!-- WOODFISH_THEME_START -->payload<!-- WOODFISH_THEME_END --></html>`
    );
    mockRuntimeState = validBackupState(backupHtml);

    const service = new IntegratedThemeService(context);
    await service.completeUninstall();

    const uninstalled = mockFiles.get(currentWorkbenchPath);
    expect(uninstalled).toContain('baseline');
    expect(uninstalled).not.toContain('WOODFISH_THEME_START');
    expect(uninstalled).not.toContain('glow-effects.css');
    expect(mockClearRuntimeInstallState).toHaveBeenCalledWith(context);
  });

  it('rolls back the workbench when replacement validation fails', async () => {
    const originalHtml = '<html><body>original workbench</body></html>';
    mockFiles.set(currentWorkbenchPath, originalHtml);
    mockRenameSync.mockImplementation((sourcePath: string, targetPath: string) => {
      const content = mockFiles.get(sourcePath);
      if (content === undefined) {
        throw new Error(`ENOENT: ${sourcePath}`);
      }
      mockFiles.delete(sourcePath);
      mockFiles.set(
        targetPath,
        targetPath === currentWorkbenchPath && sourcePath.includes('.woodfish-tmp-')
          ? 'truncated'
          : content
      );
    });

    const service = new IntegratedThemeService(context);

    await expect(service.syncWithCurrentSettings()).rejects.toThrow(
      'could not validate the replaced file'
    );
    expect(mockFiles.get(currentWorkbenchPath)).toBe(originalHtml);
    expect([...mockFiles.keys()].some((filePath) => filePath.includes('.woodfish-rollback-'))).toBe(
      false
    );
  });

  it('restores the original workbench when the replacement rename fails', async () => {
    const originalHtml = '<html><body>original before write failure</body></html>';
    mockFiles.set(currentWorkbenchPath, originalHtml);
    mockRenameSync.mockImplementation((sourcePath: string, targetPath: string) => {
      if (targetPath === currentWorkbenchPath && sourcePath.includes('.woodfish-tmp-')) {
        expect(mockFiles.get(currentWorkbenchPath)).toBe(originalHtml);
        throw new Error('simulated Windows rename failure');
      }

      const content = mockFiles.get(sourcePath);
      if (content === undefined) {
        throw new Error(`ENOENT: ${sourcePath}`);
      }
      mockFiles.delete(sourcePath);
      mockFiles.set(targetPath, content);
    });

    const service = new IntegratedThemeService(context);

    await expect(service.syncWithCurrentSettings()).rejects.toThrow(
      'simulated Windows rename failure'
    );
    expect(mockFiles.get(currentWorkbenchPath)).toBe(originalHtml);
  });

  it('waits for a queued sync before resolving concurrent callers', async () => {
    let finishFirstWrite!: () => void;
    let finishSecondWrite!: () => void;
    let markSecondWriteStarted!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      finishFirstWrite = resolve;
    });
    const secondWrite = new Promise<void>((resolve) => {
      finishSecondWrite = resolve;
    });
    const secondWriteStarted = new Promise<void>((resolve) => {
      markSecondWriteStarted = resolve;
    });

    mockWriteRuntimeInstallState
      .mockImplementationOnce(async (_context, state) => {
        mockRuntimeState = state;
        await firstWrite;
      })
      .mockImplementationOnce(async (_context, state) => {
        mockRuntimeState = state;
        markSecondWriteStarted();
        await secondWrite;
      });

    const service = new IntegratedThemeService(context);
    const startupSync = service.syncWithCurrentSettings({ showPrompt: false });
    const commandSync = service.syncWithCurrentSettings({ showPrompt: true });
    let commandSettled = false;
    void commandSync.then(() => {
      commandSettled = true;
    });

    finishFirstWrite();
    await secondWriteStarted;

    expect(commandSettled).toBe(false);
    expect(mockWriteRuntimeInstallState).toHaveBeenCalledTimes(2);

    finishSecondWrite();
    await Promise.all([startupSync, commandSync]);
    expect(commandSettled).toBe(true);
  });

  it('preserves a queued repair when a later background sync is coalesced', async () => {
    const backupHtml = '<html><body>validated repair baseline</body></html>';
    mockFiles.set(currentBackupPath, backupHtml);
    mockFiles.set(currentWorkbenchPath, '<html><body>current baseline</body></html>');
    mockRuntimeState = validBackupState(backupHtml);

    let finishFirstWrite!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      finishFirstWrite = resolve;
    });
    mockWriteRuntimeInstallState.mockImplementationOnce(async (_context, state) => {
      mockRuntimeState = state;
      await firstWrite;
    });

    const service = new IntegratedThemeService(context);
    const activeSync = service.syncWithCurrentSettings({ showPrompt: false });
    const repairSync = service.syncWithCurrentSettings({
      showPrompt: true,
      restoreBackup: true,
    });
    const backgroundSync = service.syncWithCurrentSettings({ showPrompt: false });

    finishFirstWrite();
    await Promise.all([activeSync, repairSync, backgroundSync]);

    const repaired = mockFiles.get(currentWorkbenchPath);
    expect(repaired).toContain('validated repair baseline');
    expect(repaired).not.toContain('current baseline');
    expect(mockWriteRuntimeInstallState).toHaveBeenCalledTimes(2);
  });

  it('enables the overlay without replacing the active external theme', async () => {
    (readCurrentColorTheme as jest.Mock).mockReturnValueOnce('One Dark Pro');
    const service = new IntegratedThemeService(context);

    await service.enableTheme();

    expect(setOverlayEnabled).toHaveBeenCalledWith(true);
    expect(mockFiles.get(currentWorkbenchPath)).toContain('data-woodfish-theme="bootstrap"');
  });

  it('persists overlay disable intent and removes the installed payload', async () => {
    const service = new IntegratedThemeService(context);
    await service.syncWithCurrentSettings();

    await service.disableTheme();

    expect(setOverlayEnabled).toHaveBeenCalledWith(false);
    expect(mockFiles.get(currentWorkbenchPath)).not.toContain('WOODFISH_THEME_START');
  });

  it('removes a stale payload at startup when the overlay master switch is off', async () => {
    mockFiles.set(
      currentWorkbenchPath,
      '<html><body>workbench</body><!-- WOODFISH_THEME_START -->payload<!-- WOODFISH_THEME_END --></html>'
    );
    (readRuntimeSettings as jest.Mock).mockReturnValueOnce({
      overlay: {
        enabled: false,
        hueShift: 24,
        lightnessDelta: 0.06,
        neutralChroma: 0.06,
        angle: 90,
      },
      syntaxGradient: { enabled: true, customRules: [] },
      glow: { enabled: true, intensity: 1, customRules: [] },
      cursor: {
        enabled: true,
        animationDuration: 8,
        gradientStops: ['#fff', '#000'],
        borderRadius: 2,
        glow: true,
        glowBlur: 4,
        glowOpacity: 0.7,
        customRules: [],
      },
    });

    const service = new IntegratedThemeService(context);
    await service.initializeOnStartup();

    expect(mockFiles.get(currentWorkbenchPath)).not.toContain('WOODFISH_THEME_START');
  });

  it('replaces the payload when only the bootstrap implementation changes', async () => {
    (buildRuntimePayload as jest.Mock)
      .mockReturnValueOnce({
        css: '.woodfish { color: red; }',
        bootstrap: 'globalThis.woodfishOverlayVersion = "a";',
      })
      .mockReturnValueOnce({
        css: '.woodfish { color: red; }',
        bootstrap: 'globalThis.woodfishOverlayVersion = "b";',
      });
    const service = new IntegratedThemeService(context);

    await service.syncWithCurrentSettings();
    const firstHtml = mockFiles.get(currentWorkbenchPath) ?? '';
    await service.syncWithCurrentSettings();
    const secondHtml = mockFiles.get(currentWorkbenchPath) ?? '';

    expect(firstHtml).toContain('woodfishOverlayVersion = "a"');
    expect(secondHtml).toContain('woodfishOverlayVersion = "b"');
    expect(secondHtml).not.toBe(firstHtml);
    expect(firstHtml.match(/data-woodfish-hash="([^"]+)"/)?.[1]).not.toBe(
      secondHtml.match(/data-woodfish-hash="([^"]+)"/)?.[1]
    );
  });

  it('repairs bootstrap content even when the recorded payload hash was left intact', async () => {
    const service = new IntegratedThemeService(context);
    await service.syncWithCurrentSettings();
    const installedHtml = mockFiles.get(currentWorkbenchPath) ?? '';
    mockFiles.set(
      currentWorkbenchPath,
      installedHtml.replace(
        'globalThis.woodfishOverlay = true;',
        'globalThis.woodfishOverlay = false;'
      )
    );

    await service.initializeOnStartup();

    const repairedHtml = mockFiles.get(currentWorkbenchPath) ?? '';
    expect(repairedHtml).toContain('globalThis.woodfishOverlay = true;');
    expect(repairedHtml).not.toContain('globalThis.woodfishOverlay = false;');
  });

  function validBackupState(backupHtml: string): Record<string, unknown> {
    return {
      stateVersion: 2,
      workbenchPath: currentWorkbenchPath,
      backupPath: currentBackupPath,
      backupHash: crypto.createHash('sha256').update(backupHtml).digest('hex'),
      backupWorkbenchPath: currentWorkbenchPath,
      backupVscodeVersion: '1.100.0',
      backupCreatedAt: '2026-07-30T00:00:00.000Z',
    };
  }
});
