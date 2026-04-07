const registeredHandlers = new Map<string, () => Promise<void>>();

jest.mock(
  'vscode',
  () => ({
    commands: {
      registerCommand: jest.fn((command: string, callback: () => Promise<void>) => {
        registeredHandlers.set(command, callback);
        return { dispose: jest.fn() };
      }),
    },
    window: {
      showWarningMessage: jest.fn().mockResolvedValue('继续移除'),
      showErrorMessage: jest.fn(),
    },
  }),
  { virtual: true }
);

import * as vscode from 'vscode';
import { registerAutoConfigureRainbowCursorCommand } from '../commands/autoConfigureRainbowCursor';
import { registerCompleteUninstallCommand } from '../commands/completeUninstall';
import { registerDisableThemeCommand } from '../commands/disableTheme';
import { registerEnableThemeCommand } from '../commands/enableTheme';
import { COMMANDS } from '../constants/commands';
import type { CommandDeps } from '../commands/types';

describe('theme command runtime flow', () => {
  const deps = {
    featureState: {
      set: jest.fn().mockResolvedValue(undefined),
      refreshFromConfig: jest.fn(),
    },
    runtimeService: {
      enableTheme: jest.fn().mockResolvedValue(undefined),
      disableTheme: jest.fn().mockResolvedValue(undefined),
      completeUninstall: jest.fn().mockResolvedValue(undefined),
    },
  } as unknown as CommandDeps;

  beforeEach(() => {
    registeredHandlers.clear();
    jest.clearAllMocks();
  });

  it('enables the integrated theme without writing runtime.enabled', async () => {
    registerEnableThemeCommand(deps);

    await registeredHandlers.get(COMMANDS.enable)?.();

    expect(deps.runtimeService.enableTheme).toHaveBeenCalledTimes(1);
    expect(deps.featureState.refreshFromConfig).toHaveBeenCalledTimes(1);
  });

  it('disables the integrated theme without writing runtime.enabled', async () => {
    registerDisableThemeCommand(deps);

    await registeredHandlers.get(COMMANDS.disable)?.();

    expect(deps.runtimeService.disableTheme).toHaveBeenCalledTimes(1);
    expect(deps.featureState.refreshFromConfig).toHaveBeenCalledTimes(1);
  });

  it('auto-configures the rainbow cursor by enabling the cursor feature and reusing theme enable', async () => {
    registerAutoConfigureRainbowCursorCommand(deps);

    await registeredHandlers.get(COMMANDS.autoConfigureRainbowCursor)?.();

    expect(deps.featureState.set).toHaveBeenCalledWith('cursor', true);
    expect(deps.runtimeService.enableTheme).toHaveBeenCalledTimes(1);
    expect(deps.featureState.refreshFromConfig).toHaveBeenCalledTimes(1);
  });

  it('completes uninstall after confirmation without touching runtime.enabled', async () => {
    registerCompleteUninstallCommand(deps);

    await registeredHandlers.get(COMMANDS.completeUninstall)?.();

    expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    expect(deps.runtimeService.completeUninstall).toHaveBeenCalledTimes(1);
    expect(deps.featureState.refreshFromConfig).toHaveBeenCalledTimes(1);
  });
});
