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
  }),
  { virtual: true }
);

import * as vscode from 'vscode';
import { registerShowFeatureMenuCommand } from '../commands/showFeatureMenu';
import { COMMANDS } from '../constants/commands';
import type { CommandDeps } from '../commands/types';
import type { RuntimeStatusSnapshot } from '../types/features';

type MenuItem = {
  label: string;
  description?: string;
  command: string;
};

describe('showFeatureMenu command', () => {
  const showQuickPickMock = vscode.window.showQuickPick as jest.Mock;
  const executeCommandMock = vscode.commands.executeCommand as jest.Mock;

  const deps = {
    featureState: {
      current: () => ({
        syntaxGradient: true,
        glow: false,
        cursor: true,
      }),
    },
    runtimeService: {
      getRuntimeStatus: () =>
        ({
          state: 'on',
          activeTheme: 'Woodfish Dark',
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

    const items = showQuickPickMock.mock.calls[0]?.[0] as MenuItem[];
    expect(items).toBeDefined();
    expect(items.map((item) => item.command)).toEqual([
      COMMANDS.enable,
      COMMANDS.disable,
      COMMANDS.toggleSyntaxGradient,
      COMMANDS.toggleGlow,
      COMMANDS.autoConfigureRainbowCursor,
      COMMANDS.toggleRainbowCursor,
      COMMANDS.repairWorkbench,
      COMMANDS.completeUninstall,
      COMMANDS.reloadWindow,
    ]);
    expect(items.map((item) => item.label)).toEqual([
      expect.stringContaining('开启 Woodfish 主题'),
      expect.stringContaining('关闭 Woodfish 主题'),
      expect.stringContaining('开启/关闭 Woodfish 彩色字体'),
      expect.stringContaining('开启/关闭 Woodfish 发光字体'),
      expect.stringContaining('开启 Woodfish 彩色光标'),
      expect.stringContaining('开启/关闭彩色光标'),
      expect.stringContaining('修复 Woodfish 注入'),
      expect.stringContaining('彻底停用 Woodfish 主题'),
      expect.stringContaining('Reload Window'),
    ]);
    expect(items[0]?.description).toContain('Woodfish Dark');
    expect(items[1]?.description).toContain('移除当前 Woodfish 注入');
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
