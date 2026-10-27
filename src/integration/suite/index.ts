import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { COMMANDS } from '../../constants/commands';
import { computeVsCodeChecksum } from '../../services/runtime/checksums';
import { BOOTSTRAP_FILE_NAME, cleanInstallation } from '../../services/runtime/cleanup';
import { locateWorkbench } from '../../services/runtime/locator';
import { MAIN_HOOK_LINE, getNativeWindowPaths } from '../../services/runtime/nativeWindow';
import { hasWoodfishPayload } from '../../services/runtime/workbenchPatcher';
import { runUninstall } from '../../uninstall';

const EXTENSION_ID = 'zhongjun.woodfish-theme';

function settle(): Promise<void> {
  // Configuration changes trigger a coalesced background sync; give it time to finish.
  return new Promise((resolve) => setTimeout(resolve, 1500));
}

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function productChecksum(appRoot: string, relativePath: string): string | undefined {
  const product = JSON.parse(fs.readFileSync(path.join(appRoot, 'product.json'), 'utf-8')) as {
    checksums?: Record<string, string>;
  };
  return product.checksums?.[relativePath];
}

function assertChecksumMatches(appRoot: string, relativePath: string, workbenchPath: string): void {
  const recorded = productChecksum(appRoot, relativePath);
  if (recorded !== undefined) {
    assert.strictEqual(
      recorded,
      computeVsCodeChecksum(fs.readFileSync(workbenchPath)),
      'product.json checksum does not match the workbench on disk'
    );
  }
}

export async function run(): Promise<void> {
  assert.strictEqual(process.env.WOODFISH_INTEGRATION_TEST, '1');

  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `Extension ${EXTENSION_ID} was not loaded`);
  assert.deepStrictEqual((extension.packageJSON as { extensionKind?: string[] }).extensionKind, [
    'ui',
  ]);

  await extension.activate();

  const location = locateWorkbench(vscode.env.appRoot);
  assert.ok(location, `Unable to locate the workbench under ${vscode.env.appRoot}`);
  console.log(`[woodfish] VS Code ${vscode.version}, workbench ${location.relativePath}`);

  const { appRoot, workbenchPath, relativePath } = location;
  const nativePaths = getNativeWindowPaths(appRoot);
  const productPath = path.join(appRoot, 'product.json');
  const bootstrapPath = path.join(path.dirname(workbenchPath), BOOTSTRAP_FILE_NAME);
  const workbenchConfig = vscode.workspace.getConfiguration('workbench');
  const config = vscode.workspace.getConfiguration('woodfishTheme');
  const touchedKeys = ['glass.enabled', 'glass.nativeWindow.enabled'];
  const originalValues = touchedKeys.map((key) => config.inspect(key)?.globalValue);
  const activeThemeBeforeEnable = workbenchConfig.get<string>('colorTheme', '');

  // The overlay is on by default, so activation may already have injected it.
  // A complete uninstall gives the pristine baseline every later step is compared to.
  await settle();
  await vscode.commands.executeCommand(COMMANDS.completeUninstall, { skipConfirmation: true });
  const baseline = {
    workbench: read(workbenchPath),
    main: read(nativePaths.mainPath),
    product: read(productPath),
  };
  assert.ok(!hasWoodfishPayload(baseline.workbench), 'Baseline still contains a payload');
  assert.ok(!baseline.main.includes('WOODFISH'), 'Baseline main.js still contains a hook');

  function assertPristine(step: string): void {
    assert.strictEqual(read(workbenchPath), baseline.workbench, `${step}: workbench.html differs`);
    assert.strictEqual(read(nativePaths.mainPath), baseline.main, `${step}: main.js differs`);
    assert.strictEqual(read(productPath), baseline.product, `${step}: product.json differs`);
    assert.ok(!fs.existsSync(bootstrapPath), `${step}: bootstrap file left behind`);
    assert.ok(!fs.existsSync(nativePaths.hookPath), `${step}: native hook left behind`);
    assert.ok(!fs.existsSync(`${workbenchPath}.woodfish-backup`), `${step}: backup left behind`);
  }

  try {
    await vscode.commands.executeCommand(COMMANDS.enable);

    let patched = read(workbenchPath);
    assert.ok(hasWoodfishPayload(patched), 'Enable command did not write its payload');
    assert.ok(patched.includes('data-woodfish-theme="bootstrap"'), 'Bootstrap script tag missing');
    assert.ok(fs.existsSync(bootstrapPath), 'Bootstrap file missing next to workbench.html');
    assert.ok(
      patched.indexOf('WOODFISH_THEME_START') > patched.lastIndexOf('workbench.js'),
      'Payload must load after VS Code’s own workbench script'
    );
    assert.strictEqual(
      workbenchConfig.get<string>('colorTheme', ''),
      activeThemeBeforeEnable,
      'Enable command replaced the active color theme'
    );
    assertChecksumMatches(appRoot, relativePath, workbenchPath);

    await config.update('glass.enabled', true, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand(COMMANDS.repairWorkbench);
    patched = read(workbenchPath);
    assert.ok(
      patched.includes('backdrop-filter: var(--woodfish-glass-filter)'),
      'Glass CSS missing'
    );
    assertChecksumMatches(appRoot, relativePath, workbenchPath);

    if (process.platform === 'darwin' || process.platform === 'win32') {
      await config.update('glass.nativeWindow.enabled', true, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand(COMMANDS.repairWorkbench);
      const main = read(nativePaths.mainPath);
      assert.ok(main.startsWith(MAIN_HOOK_LINE), 'Native window hook line missing from main.js');
      assert.strictEqual(main.slice(MAIN_HOOK_LINE.length), baseline.main);
      assert.ok(fs.existsSync(nativePaths.hookPath), 'Native window hook module missing');
    }

    await settle();
    await vscode.commands.executeCommand(COMMANDS.completeUninstall, { skipConfirmation: true });
    assertPristine('Complete uninstall');

    // The vscode:uninstall hook must restore an installation on its own.
    await vscode.commands.executeCommand(COMMANDS.enable);
    await settle();
    assert.ok(hasWoodfishPayload(read(workbenchPath)));
    const failures = runUninstall(extension.extensionPath, process.execPath);
    assert.strictEqual(failures, 0, 'Uninstall hook reported failures');
    assertPristine('Uninstall hook');
  } finally {
    await config.update('overlay.enabled', false, vscode.ConfigurationTarget.Global);
    for (const [index, key] of touchedKeys.entries()) {
      await config.update(key, originalValues[index], vscode.ConfigurationTarget.Global);
    }
    await settle();
    const report = cleanInstallation(appRoot);
    console.log(
      `[woodfish] final cleanup: overlay=${String(config.get('overlay.enabled'))} ${JSON.stringify(report)}`
    );
  }
}
