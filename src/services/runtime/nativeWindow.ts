import * as fs from 'fs';
import * as path from 'path';
import { NativeWindowSettings } from '../../types/features';
import { writeValidatedFileAtomic } from './atomicFile';

/**
 * Experimental OS window material (macOS vibrancy, Windows 11 acrylic/mica).
 *
 * Electron only exposes these on the BrowserWindow, i.e. in VS Code's main
 * process, so the hook has to be loaded from `out/main.js`. Woodfish prepends a
 * single marked line that dynamically imports its hook and swallows any error:
 * if the hook file is missing or broken VS Code still starts normally. Removing
 * the line restores `main.js` byte for byte. The hook re-reads its JSON config
 * on every start, so changing material or turning it off never touches main.js.
 */
export const NATIVE_HOOK_FILE_NAME = 'woodfish-native-window.mjs';
export const NATIVE_CONFIG_FILE_NAME = 'woodfish-native-window.json';
export const NATIVE_HOOK_HEADER = '/* WOODFISH_NATIVE_WINDOW - managed file */';
export const MAIN_HOOK_MARKER = '/*WOODFISH_NATIVE_WINDOW*/';
export const MAIN_HOOK_LINE = `import("./${NATIVE_HOOK_FILE_NAME}").catch(()=>{});${MAIN_HOOK_MARKER}\n`;

const MAIN_HOOK_PATTERN =
  /^import\("\.\/woodfish-native-window\.mjs"\)\.catch\(\(\)=>\{\}\);\/\*WOODFISH_NATIVE_WINDOW\*\/\r?\n/gm;

export function hasMainHook(mainJs: string): boolean {
  return mainJs.includes(MAIN_HOOK_MARKER);
}

export function removeMainHook(mainJs: string): string {
  MAIN_HOOK_PATTERN.lastIndex = 0;
  return mainJs.replace(MAIN_HOOK_PATTERN, '');
}

export function injectMainHook(mainJs: string): string {
  return `${MAIN_HOOK_LINE}${removeMainHook(mainJs)}`;
}

export type NativeWindowPaths = {
  mainPath: string;
  hookPath: string;
  configPath: string;
};

export function getNativeWindowPaths(appRoot: string): NativeWindowPaths {
  const outDirectory = path.join(appRoot, 'out');
  return {
    mainPath: path.join(outDirectory, 'main.js'),
    hookPath: path.join(outDirectory, NATIVE_HOOK_FILE_NAME),
    configPath: path.join(outDirectory, NATIVE_CONFIG_FILE_NAME),
  };
}

function isEsmApp(appRoot: string): boolean {
  // VS Code moved its main process to ESM in 1.94 (`"type": "module"`); the hook
  // line relies on that so it is never prepended to a CommonJS main.js.
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf-8')) as {
      type?: unknown;
    };
    return manifest.type === 'module';
  } catch {
    return false;
  }
}

function readManagedFile(filePath: string, header: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.startsWith(header) ? content : null;
}

export type NativeWindowChange = {
  changed: boolean;
  requiresRestart: boolean;
};

export function installNativeWindow(
  appRoot: string,
  hookSource: string,
  settings: NativeWindowSettings
): NativeWindowChange {
  const paths = getNativeWindowPaths(appRoot);
  if (!fs.existsSync(paths.mainPath)) {
    throw new Error(`未找到编辑器主进程入口 ${paths.mainPath}，无法启用系统级窗口材质。`);
  }

  let changed = false;
  let requiresRestart = false;
  const hookContent = hookSource.trim().startsWith(NATIVE_HOOK_HEADER)
    ? `${hookSource.trim()}\n`
    : `${NATIVE_HOOK_HEADER}\n${hookSource.trim()}\n`;
  const configContent = `${JSON.stringify(
    {
      enabled: true,
      windowsMaterial: settings.windowsMaterial,
      macVibrancy: settings.macVibrancy,
    },
    null,
    2
  )}\n`;

  if (fs.existsSync(paths.hookPath) && !readManagedFile(paths.hookPath, NATIVE_HOOK_HEADER)) {
    throw new Error(`Woodfish refused to replace an unmanaged file: ${paths.hookPath}`);
  }
  if (readManagedFile(paths.hookPath, NATIVE_HOOK_HEADER) !== hookContent) {
    writeValidatedFileAtomic(paths.hookPath, hookContent, (content) => content === hookContent);
    changed = true;
    requiresRestart = true;
  }

  const currentConfig = fs.existsSync(paths.configPath)
    ? fs.readFileSync(paths.configPath, 'utf-8')
    : null;
  if (currentConfig !== configContent) {
    writeValidatedFileAtomic(paths.configPath, configContent, (content) => {
      try {
        return (JSON.parse(content) as { enabled?: unknown }).enabled === true;
      } catch {
        return false;
      }
    });
    changed = true;
    requiresRestart = true;
  }

  const mainJs = fs.readFileSync(paths.mainPath, 'utf-8');
  if (!hasMainHook(mainJs)) {
    if (!isEsmApp(appRoot)) {
      throw new Error(
        '当前编辑器的主进程不是 ESM，系统级窗口材质需要基于 VS Code 1.94 或更新版本。'
      );
    }
    const nextMain = injectMainHook(mainJs);
    writeValidatedFileAtomic(
      paths.mainPath,
      nextMain,
      (content) => hasMainHook(content) && removeMainHook(content) === mainJs
    );
    changed = true;
    requiresRestart = true;
  }

  return { changed, requiresRestart };
}

export function uninstallNativeWindow(appRoot: string): NativeWindowChange {
  const paths = getNativeWindowPaths(appRoot);
  let changed = false;

  if (fs.existsSync(paths.mainPath)) {
    const mainJs = fs.readFileSync(paths.mainPath, 'utf-8');
    if (hasMainHook(mainJs)) {
      const restored = removeMainHook(mainJs);
      writeValidatedFileAtomic(paths.mainPath, restored, (content) => !hasMainHook(content));
      changed = true;
    }
  }

  if (readManagedFile(paths.hookPath, NATIVE_HOOK_HEADER) !== null) {
    fs.unlinkSync(paths.hookPath);
    changed = true;
  }

  if (fs.existsSync(paths.configPath)) {
    fs.unlinkSync(paths.configPath);
    changed = true;
  }

  return { changed, requiresRestart: changed };
}

export function isNativeWindowInstalled(appRoot: string): boolean {
  const paths = getNativeWindowPaths(appRoot);
  return fs.existsSync(paths.mainPath) && hasMainHook(fs.readFileSync(paths.mainPath, 'utf-8'));
}

/**
 * The `main.js` line swallows a missing hook, so VS Code keeps starting fine but
 * the window silently loses its material. Treat that as “needs repair”.
 */
export function isNativeWindowComplete(appRoot: string): boolean {
  const paths = getNativeWindowPaths(appRoot);
  return (
    isNativeWindowInstalled(appRoot) &&
    readManagedFile(paths.hookPath, NATIVE_HOOK_HEADER) !== null &&
    fs.existsSync(paths.configPath)
  );
}
