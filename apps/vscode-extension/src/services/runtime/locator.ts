import * as fs from 'fs';
import * as path from 'path';

declare global {
  var _VSCODE_FILE_ROOT: string | undefined;
}

/**
 * Workbench documents relative to `<appRoot>/out`, newest layout first.
 * VS Code 1.10x+ ships only `vs/code/electron-browser/workbench/workbench.html`;
 * the sandbox/esm variants cover older stable builds and VS Code forks such as Cursor.
 */
export const WORKBENCH_RELATIVE_CANDIDATES = [
  'vs/code/electron-browser/workbench/workbench.html',
  'vs/code/electron-sandbox/workbench/workbench.html',
  'vs/code/electron-sandbox/workbench/workbench.esm.html',
  'vs/code/electron-browser/workbench/workbench.esm.html',
  'vs/code/electron-sandbox/workbench/workbench-apc-extension.html',
] as const;

export type WorkbenchLocation = {
  appRoot: string;
  workbenchPath: string;
  /** Path relative to `<appRoot>/out`, as used by product.json checksums. */
  relativePath: string;
};

function isDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function isFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

export function findWorkbenchInAppRoot(appRoot: string): WorkbenchLocation | null {
  const outDirectory = path.join(appRoot, 'out');
  for (const relativePath of WORKBENCH_RELATIVE_CANDIDATES) {
    const workbenchPath = path.join(outDirectory, ...relativePath.split('/'));
    if (isFile(workbenchPath)) {
      return { appRoot, workbenchPath, relativePath };
    }
  }

  return null;
}

/**
 * Best-effort app root discovery for code that cannot use `vscode.env.appRoot`
 * (the uninstall hook runs in a plain Node/Electron process).
 */
export function inferAppRootsFromExecutable(executablePath: string): string[] {
  const roots: string[] = [];
  let current = path.dirname(path.resolve(executablePath));

  for (let depth = 0; depth < 8; depth += 1) {
    const direct = [path.join(current, 'Resources', 'app'), path.join(current, 'resources', 'app')];
    for (const candidate of direct) {
      if (isDirectory(path.join(candidate, 'out'))) {
        roots.push(candidate);
      }
    }

    // Windows user/system installs since 1.10x keep resources in a commit-named folder.
    try {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^[0-9a-f]{6,40}$/i.test(entry.name)) {
          continue;
        }
        const nested = path.join(current, entry.name, 'resources', 'app');
        if (isDirectory(path.join(nested, 'out'))) {
          roots.push(nested);
        }
      }
    } catch {
      // Unreadable directories are skipped.
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return [...new Set(roots)];
}

export function resolveLegacyAppDirectory(): string | undefined {
  const outDirectory =
    globalThis._VSCODE_FILE_ROOT ??
    (require.main?.filename ? path.dirname(require.main.filename) : undefined) ??
    (process.argv[1] ? path.dirname(process.argv[1]) : undefined);

  return outDirectory ? path.dirname(outDirectory) : undefined;
}

export function locateWorkbench(appRoot?: string): WorkbenchLocation | null {
  const roots = [appRoot, resolveLegacyAppDirectory()].filter(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0
  );

  for (const root of roots) {
    const location = findWorkbenchInAppRoot(root);
    if (location) {
      return location;
    }
  }

  return null;
}

export function getWorkbenchHtmlPath(appRoot?: string): string | null {
  return locateWorkbench(appRoot)?.workbenchPath ?? null;
}
