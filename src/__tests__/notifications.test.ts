let pendingSelectionResolver: ((value: string | undefined) => void) | undefined;

jest.mock(
  'vscode',
  () => ({
    commands: {
      executeCommand: jest.fn().mockResolvedValue(undefined),
    },
    window: {
      showInformationMessage: jest.fn(
        () =>
          new Promise<string | undefined>((resolve) => {
            pendingSelectionResolver = resolve;
          })
      ),
    },
  }),
  { virtual: true }
);

import * as vscode from 'vscode';
import { showReloadPrompt } from '../ui/notifications';

describe('reload prompt behavior', () => {
  const showInformationMessageMock = vscode.window.showInformationMessage as jest.Mock;
  const executeCommandMock = vscode.commands.executeCommand as jest.Mock;

  beforeEach(() => {
    pendingSelectionResolver = undefined;
    jest.clearAllMocks();
  });

  it('does not block callers while the reload prompt is still visible', async () => {
    let settled = false;
    void showReloadPrompt('请重新加载 VS Code。').then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(settled).toBe(true);
    expect(showInformationMessageMock).toHaveBeenCalledWith(
      '[Woodfish Theme] 请重新加载 VS Code。',
      '重新加载窗口',
      '稍后'
    );
    expect(executeCommandMock).not.toHaveBeenCalled();
  });

  it('reloads the window after the user clicks the reload action', async () => {
    await showReloadPrompt('请重新加载 VS Code。');

    pendingSelectionResolver?.('重新加载窗口');
    await new Promise((resolve) => setImmediate(resolve));

    expect(executeCommandMock).toHaveBeenCalledWith('workbench.action.reloadWindow');
  });
});
