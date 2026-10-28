import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  computeVsCodeChecksum,
  replaceChecksumEntry,
  syncWorkbenchChecksum,
} from '../services/runtime/checksums';
import {
  BOOTSTRAP_FILE_HEADER,
  BOOTSTRAP_FILE_NAME,
  cleanInstallation,
} from '../services/runtime/cleanup';
import { recordInstallation, readInstallManifest } from '../services/runtime/installManifest';
import {
  findWorkbenchInAppRoot,
  inferAppRootsFromExecutable,
  locateWorkbench,
} from '../services/runtime/locator';
import {
  MAIN_HOOK_LINE,
  NATIVE_HOOK_HEADER,
  getNativeWindowPaths,
  hasMainHook,
  installNativeWindow,
  isNativeWindowComplete,
  isNativeWindowInstalled,
  removeMainHook,
  uninstallNativeWindow,
} from '../services/runtime/nativeWindow';
import { injectWorkbenchPayload } from '../services/runtime/workbenchPatcher';
import { collectAppRoots } from '../uninstall';

const RELATIVE = 'vs/code/electron-browser/workbench/workbench.html';
const ORIGINAL_HTML = '<!DOCTYPE html>\n<html>\n<head></head>\n<body></body>\n</html>\n';
const ORIGINAL_MAIN = '/*!-- Copyright --*/\nvar D=1;await import("./mainImpl.js");\n';
const NATIVE_SETTINGS = {
  enabled: true,
  windowsMaterial: 'mica',
  macVibrancy: 'sidebar',
  opacity: 0.8,
} as const;

function makeAppRoot(options: { esm?: boolean } = {}): string {
  const appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-app-'));
  const workbench = path.join(appRoot, 'out', ...RELATIVE.split('/'));
  fs.mkdirSync(path.dirname(workbench), { recursive: true });
  fs.writeFileSync(workbench, ORIGINAL_HTML);
  fs.writeFileSync(path.join(appRoot, 'out', 'main.js'), ORIGINAL_MAIN);
  fs.writeFileSync(
    path.join(appRoot, 'package.json'),
    JSON.stringify({ main: './out/main.js', ...(options.esm === false ? {} : { type: 'module' }) })
  );
  fs.writeFileSync(
    path.join(appRoot, 'product.json'),
    `{\n\t"nameShort": "Code",\n\t"checksums": {\n\t\t"${RELATIVE}": "${computeVsCodeChecksum(ORIGINAL_HTML)}",\n\t\t"vs/other.js": "keep"\n\t}\n}\n`
  );
  return appRoot;
}

function productChecksum(appRoot: string): string {
  return (
    JSON.parse(fs.readFileSync(path.join(appRoot, 'product.json'), 'utf-8')) as {
      checksums: Record<string, string>;
    }
  ).checksums[RELATIVE];
}

describe('workbench locator', () => {
  it('prefers the current electron-browser workbench from vscode.env.appRoot', () => {
    const appRoot = makeAppRoot();
    expect(locateWorkbench(appRoot)).toEqual({
      appRoot,
      workbenchPath: path.join(appRoot, 'out', ...RELATIVE.split('/')),
      relativePath: RELATIVE,
    });
  });

  it('falls back to the sandbox layout used by older builds and forks', () => {
    const appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-fork-'));
    const sandbox = path.join(appRoot, 'out', 'vs', 'code', 'electron-sandbox', 'workbench');
    fs.mkdirSync(sandbox, { recursive: true });
    fs.writeFileSync(path.join(sandbox, 'workbench.html'), ORIGINAL_HTML);
    expect(findWorkbenchInAppRoot(appRoot)?.relativePath).toBe(
      'vs/code/electron-sandbox/workbench/workbench.html'
    );
  });

  it('infers app roots from macOS, Linux and Windows commit-folder layouts', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-exec-'));
    const mac = path.join(root, 'Code.app', 'Contents');
    fs.mkdirSync(path.join(mac, 'Resources', 'app', 'out'), { recursive: true });
    fs.mkdirSync(path.join(mac, 'MacOS'), { recursive: true });
    expect(inferAppRootsFromExecutable(path.join(mac, 'MacOS', 'Electron'))).toContain(
      path.join(mac, 'Resources', 'app')
    );

    const win = path.join(root, 'Microsoft VS Code');
    fs.mkdirSync(path.join(win, '072586267e', 'resources', 'app', 'out'), { recursive: true });
    expect(inferAppRootsFromExecutable(path.join(win, 'Code.exe'))).toContain(
      path.join(win, '072586267e', 'resources', 'app')
    );
  });
});

describe('product.json checksums', () => {
  it('matches VS Code’s sha256/base64 format without padding', () => {
    const expected = crypto.createHash('sha256').update('abc').digest('base64').replace(/=+$/, '');
    expect(computeVsCodeChecksum('abc')).toBe(expected);
  });

  it('rewrites only the patched entry and keeps the original formatting', () => {
    const appRoot = makeAppRoot();
    const workbench = path.join(appRoot, 'out', ...RELATIVE.split('/'));
    fs.writeFileSync(workbench, injectWorkbenchPayload(ORIGINAL_HTML, '<style></style>'));

    expect(syncWorkbenchChecksum(appRoot, RELATIVE, workbench)).toBe('updated');
    const product = fs.readFileSync(path.join(appRoot, 'product.json'), 'utf-8');
    expect(product).toContain('\t"nameShort": "Code",');
    expect(product).toContain('"vs/other.js": "keep"');
    expect(productChecksum(appRoot)).toBe(computeVsCodeChecksum(fs.readFileSync(workbench)));
    expect(syncWorkbenchChecksum(appRoot, RELATIVE, workbench)).toBe('unchanged');
  });

  it('reports a missing entry instead of inventing one', () => {
    expect(replaceChecksumEntry('{"checksums":{}}', RELATIVE, 'x')).toBeNull();
  });
});

describe('native window hook', () => {
  it('prepends one guarded line and removes it byte for byte', () => {
    const appRoot = makeAppRoot();
    const paths = getNativeWindowPaths(appRoot);
    const result = installNativeWindow(appRoot, 'export {};', NATIVE_SETTINGS);

    expect(result).toEqual({ changed: true, requiresRestart: true });
    const main = fs.readFileSync(paths.mainPath, 'utf-8');
    expect(main.startsWith(MAIN_HOOK_LINE)).toBe(true);
    expect(main).toContain('.catch(()=>{})');
    expect(fs.readFileSync(paths.hookPath, 'utf-8').startsWith(NATIVE_HOOK_HEADER)).toBe(true);
    expect(JSON.parse(fs.readFileSync(paths.configPath, 'utf-8'))).toEqual({
      enabled: true,
      windowsMaterial: 'mica',
      macVibrancy: 'sidebar',
    });
    expect(isNativeWindowInstalled(appRoot)).toBe(true);

    expect(installNativeWindow(appRoot, 'export {};', NATIVE_SETTINGS).changed).toBe(false);

    expect(uninstallNativeWindow(appRoot).changed).toBe(true);
    expect(fs.readFileSync(paths.mainPath, 'utf-8')).toBe(ORIGINAL_MAIN);
    expect(fs.existsSync(paths.hookPath)).toBe(false);
    expect(fs.existsSync(paths.configPath)).toBe(false);
  });

  it('reports a hook whose module file was deleted as incomplete', () => {
    const appRoot = makeAppRoot();
    installNativeWindow(appRoot, 'export {};', NATIVE_SETTINGS);
    expect(isNativeWindowComplete(appRoot)).toBe(true);

    fs.rmSync(getNativeWindowPaths(appRoot).hookPath);

    expect(isNativeWindowInstalled(appRoot)).toBe(true);
    expect(isNativeWindowComplete(appRoot)).toBe(false);
    expect(installNativeWindow(appRoot, 'export {};', NATIVE_SETTINGS).requiresRestart).toBe(true);
    expect(isNativeWindowComplete(appRoot)).toBe(true);
  });

  it('never stacks duplicate hook lines', () => {
    expect(removeMainHook(`${MAIN_HOOK_LINE}${MAIN_HOOK_LINE}${ORIGINAL_MAIN}`)).toBe(
      ORIGINAL_MAIN
    );
    expect(hasMainHook(ORIGINAL_MAIN)).toBe(false);
  });

  it('refuses CommonJS main processes and unmanaged hook files', () => {
    const commonJs = makeAppRoot({ esm: false });
    expect(() => installNativeWindow(commonJs, 'export {};', NATIVE_SETTINGS)).toThrow('ESM');
    expect(fs.readFileSync(path.join(commonJs, 'out', 'main.js'), 'utf-8')).toBe(ORIGINAL_MAIN);

    const foreign = makeAppRoot();
    fs.writeFileSync(getNativeWindowPaths(foreign).hookPath, 'someone else');
    expect(() => installNativeWindow(foreign, 'export {};', NATIVE_SETTINGS)).toThrow('unmanaged');
  });

  it('ships a hook asset that guards every Electron call', () => {
    const hook = fs.readFileSync(
      path.resolve(__dirname, '../../themes/shared/native-window-main.mjs'),
      'utf-8'
    );
    expect(hook.startsWith(NATIVE_HOOK_HEADER)).toBe(true);
    expect(hook).toContain("import('electron')");
    expect(hook).toContain('.catch(() => undefined)');
    expect(hook).toContain('setBackgroundMaterial');
    expect(hook).toContain('setVibrancy');
  });
});

describe('offline cleanup used by uninstall', () => {
  it('restores workbench, removes managed files and re-syncs the checksum', () => {
    const appRoot = makeAppRoot();
    const workbench = path.join(appRoot, 'out', ...RELATIVE.split('/'));
    const directory = path.dirname(workbench);
    fs.writeFileSync(workbench, injectWorkbenchPayload(ORIGINAL_HTML, '<style>.x{}</style>'));
    fs.writeFileSync(path.join(directory, BOOTSTRAP_FILE_NAME), `${BOOTSTRAP_FILE_HEADER}\n1`);
    fs.writeFileSync(`${workbench}.woodfish-backup`, ORIGINAL_HTML);
    installNativeWindow(appRoot, 'export {};', NATIVE_SETTINGS);
    syncWorkbenchChecksum(appRoot, RELATIVE, workbench);

    const report = cleanInstallation(appRoot);

    expect(report.errors).toEqual([]);
    expect(report).toMatchObject({
      workbenchCleaned: true,
      bootstrapRemoved: true,
      nativeWindowRemoved: true,
      backupRemoved: true,
    });
    expect(fs.readFileSync(workbench, 'utf-8')).not.toContain('WOODFISH');
    expect(fs.existsSync(path.join(directory, BOOTSTRAP_FILE_NAME))).toBe(false);
    expect(fs.readFileSync(path.join(appRoot, 'out', 'main.js'), 'utf-8')).toBe(ORIGINAL_MAIN);
    expect(productChecksum(appRoot)).toBe(computeVsCodeChecksum(fs.readFileSync(workbench)));
  });

  it('leaves files it does not own untouched', () => {
    const appRoot = makeAppRoot();
    const workbench = path.join(appRoot, 'out', ...RELATIVE.split('/'));
    const foreignBootstrap = path.join(path.dirname(workbench), BOOTSTRAP_FILE_NAME);
    fs.writeFileSync(foreignBootstrap, 'not ours');

    const report = cleanInstallation(appRoot);
    expect(report.workbenchCleaned).toBe(false);
    expect(fs.readFileSync(foreignBootstrap, 'utf-8')).toBe('not ours');
    expect(fs.readFileSync(workbench, 'utf-8')).toBe(ORIGINAL_HTML);
  });

  it('collects app roots from the manifest and the running executable', () => {
    const extensionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-ext-'));
    recordInstallation(extensionRoot, '/apps/code-a');
    recordInstallation(extensionRoot, '/apps/code-a');
    recordInstallation(extensionRoot, '/apps/code-b');
    expect(readInstallManifest(extensionRoot)).toEqual(['/apps/code-a', '/apps/code-b']);

    const appRoot = makeAppRoot();
    const roots = collectAppRoots(extensionRoot, path.join(path.dirname(appRoot), 'Code'));
    expect(roots.slice(0, 2)).toEqual(['/apps/code-a', '/apps/code-b']);
  });
});
