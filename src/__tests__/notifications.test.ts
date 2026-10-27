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
      '[Woodfish Theme] 请重新加载 VS Code。若重新加载后仍未生效，请完全退出 VS Code 后再打开。',
      '重新加载窗口',
      '稍后'
    );
    expect(executeCommandMock).not.toHaveBeenCalled();
  });

  it('explains the corrupt-installation notice after a checksum update', async () => {
    await showReloadPrompt('请重新加载 VS Code。', { checksumUpdated: true });

    const [message] = showInformationMessageMock.mock.calls[0] as [string];
    expect(message).toContain('安装似乎损坏');
    expect(message).toContain('完全退出 VS Code');
    expect(message).not.toContain('若重新加载后仍未生效');
  });

  it('reloads the window after the user clicks the reload action', async () => {
    await showReloadPrompt('请重新加载 VS Code。');

    pendingSelectionResolver?.('重新加载窗口');
    await new Promise((resolve) => setImmediate(resolve));

    expect(executeCommandMock).toHaveBeenCalledWith('workbench.action.reloadWindow');
  });
});
