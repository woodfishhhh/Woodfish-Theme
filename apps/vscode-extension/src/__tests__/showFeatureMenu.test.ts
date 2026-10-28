let registeredHandler: (() => Promise<void>) | undefined;

jest.mock(
  'vscode',
  () => ({
    commands: {
      registerCommand: jest.fn((_command: string, callback: () => Promise<void>) => {
        registeredHandler = callback;
        return { dispose: jest.fn() };
      }),
      executeCommand: jest.fn().mockResolvedValue(undefined),
    },
    window: {
      showQuickPick: jest.fn().mockResolvedValue(undefined),
      showErrorMessage: jest.fn(),
    },
    QuickPickItemKind: {
      Separator: -1,
      Default: 0,
    },
  }),
  { virtual: true }
);

jest.mock('../config/featureFlags', () => {
  const { DEFAULT_RUNTIME_SETTINGS } = jest.requireActual('../types/features');
  return { readRuntimeSettings: jest.fn(() => DEFAULT_RUNTIME_SETTINGS) };
});

import * as vscode from 'vscode';
import { registerShowFeatureMenuCommand } from '../commands/showFeatureMenu';
import { COMMANDS } from '../constants/commands';
import type { CommandDeps } from '../commands/types';
import type { RuntimeStatusSnapshot } from '../types/features';

type MenuItem = {
  label: string;
  description?: string;
  command?: string;
  kind?: number;
};

function actionable(items: MenuItem[]): MenuItem[] {
  return items.filter((item) => item.kind !== -1);
}

describe('showFeatureMenu command', () => {
  const showQuickPickMock = vscode.window.showQuickPick as jest.Mock;
  const executeCommandMock = vscode.commands.executeCommand as jest.Mock;

  const deps = {
    featureState: {
      current: () => ({
        syntaxGradient: true,
        glow: false,
        cursor: true,
        glass: false,
      }),
    },
    runtimeService: {
      getRuntimeStatus: () =>
        ({
          state: 'on',
          activeTheme: 'Woodfish Dracula',
          isWoodfishTheme: true,
          hasPayload: true,
        }) satisfies RuntimeStatusSnapshot,
    },
  } as unknown as CommandDeps;

  beforeEach(() => {
    registeredHandler = undefined;
    jest.clearAllMocks();
  });

  it('shows every Woodfish command plus reload window in the status bar menu', async () => {
    registerShowFeatureMenuCommand(deps);

    await registeredHandler?.();

    const items = actionable(showQuickPickMock.mock.calls[0]?.[0] as MenuItem[]);
    expect(items.length).toBeGreaterThan(0);
    const nativeSupported = process.platform === 'darwin' || process.platform === 'win32';
    expect(items.map((item) => item.command)).toEqual([
      COMMANDS.enable,
      COMMANDS.disable,
      COMMANDS.toggleSyntaxGradient,
      COMMANDS.toggleGlow,
      COMMANDS.toggleRainbowCursor,
      COMMANDS.pickCursorPalette,
      COMMANDS.toggleGlass,
      ...(nativeSupported ? [COMMANDS.toggleNativeWindow] : []),
      COMMANDS.applyPreset,
      COMMANDS.openSettings,
      COMMANDS.repairWorkbench,
      COMMANDS.showDiagnostics,
      COMMANDS.completeUninstall,
      COMMANDS.reloadWindow,
    ]);
    expect(items.find((item) => item.command === COMMANDS.completeUninstall)?.label).toContain(
      '彻底停用 Woodfish 叠层'
    );
    expect(items[0]?.description).toContain('Woodfish Dracula');
    expect(items[1]?.description).toContain('移除叠层但保留各项参数');
  });

  it('keeps the active external theme when runtime is currently off', async () => {
    registerShowFeatureMenuCommand({
      ...deps,
      runtimeService: {
        getRuntimeStatus: () =>
          ({
            state: 'off',
            activeTheme: 'One Dark Pro',
            isWoodfishTheme: false,
            hasPayload: false,
          }) satisfies RuntimeStatusSnapshot,
      },
    } as unknown as CommandDeps);

    await registeredHandler?.();

    const items = actionable(showQuickPickMock.mock.calls[0]?.[0] as MenuItem[]);
    expect(items[0]?.description).toContain('在当前主题 One Dark Pro 上启用叠层');
  });

  it('executes the selected command from the menu', async () => {
    registerShowFeatureMenuCommand(deps);
    showQuickPickMock.mockResolvedValueOnce({
      label: '$(sync) Reload Window',
      command: COMMANDS.reloadWindow,
    });

    await registeredHandler?.();

    expect(executeCommandMock).toHaveBeenCalledWith(COMMANDS.reloadWindow);
  });
});
