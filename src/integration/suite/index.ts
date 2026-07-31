import * as assert from 'assert';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { COMMANDS } from '../../constants/commands';
import { getWorkbenchHtmlPath } from '../../services/runtime/locator';
import { hasWoodfishPayload } from '../../services/runtime/workbenchPatcher';

const EXTENSION_ID = 'zhongjun.woodfish-theme';

type BackupSnapshot =
  | {
      existed: true;
      content: string;
    }
  | {
      existed: false;
    };

function readBackupSnapshot(backupPath: string): BackupSnapshot {
  if (!fs.existsSync(backupPath)) {
    return { existed: false };
  }

  return {
    existed: true,
    content: fs.readFileSync(backupPath, 'utf-8'),
  };
}

function restoreBackupSnapshot(backupPath: string, snapshot: BackupSnapshot): void {
  if (snapshot.existed) {
    fs.writeFileSync(backupPath, snapshot.content, 'utf-8');
    return;
  }

  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
}

export async function run(): Promise<void> {
  assert.strictEqual(process.env.WOODFISH_INTEGRATION_TEST, '1');

  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `Extension ${EXTENSION_ID} was not loaded`);

  await extension.activate();

  const workbenchPath = getWorkbenchHtmlPath();
  assert.ok(workbenchPath, 'Unable to locate the isolated VS Code workbench');

  const originalWorkbench = fs.readFileSync(workbenchPath, 'utf-8');
  const backupPath = `${workbenchPath}.woodfish-backup`;
  const backupSnapshot = readBackupSnapshot(backupPath);
  const workbenchConfig = vscode.workspace.getConfiguration('workbench');
  const overlayConfig = vscode.workspace.getConfiguration('woodfishTheme');
  const originalGlobalTheme = workbenchConfig.inspect<string>('colorTheme')?.globalValue;
  const originalGlobalOverlayEnabled =
    overlayConfig.inspect<boolean>('overlay.enabled')?.globalValue;
  const activeThemeBeforeEnable = workbenchConfig.get<string>('colorTheme', '');

  try {
    await vscode.commands.executeCommand(COMMANDS.enable);

    const patchedWorkbench = fs.readFileSync(workbenchPath, 'utf-8');
    assert.ok(hasWoodfishPayload(patchedWorkbench), 'Enable command did not write its payload');
    assert.ok(
      patchedWorkbench.includes('data-woodfish-theme="bootstrap"'),
      'Enable command did not install the universal overlay bootstrap'
    );
    assert.strictEqual(
      workbenchConfig.get<string>('colorTheme', ''),
      activeThemeBeforeEnable,
      'Enable command replaced the active color theme'
    );

    await vscode.commands.executeCommand(COMMANDS.disable);

    const cleanedWorkbench = fs.readFileSync(workbenchPath, 'utf-8');
    assert.ok(
      !hasWoodfishPayload(cleanedWorkbench),
      'Disable command left a Woodfish payload behind'
    );
  } finally {
    try {
      await overlayConfig.update(
        'overlay.enabled',
        originalGlobalOverlayEnabled,
        vscode.ConfigurationTarget.Global
      );
    } finally {
      try {
        await workbenchConfig.update(
          'colorTheme',
          originalGlobalTheme,
          vscode.ConfigurationTarget.Global
        );
      } finally {
        try {
          fs.writeFileSync(workbenchPath, originalWorkbench, 'utf-8');
        } finally {
          restoreBackupSnapshot(backupPath, backupSnapshot);
        }
      }
    }
  }
}
