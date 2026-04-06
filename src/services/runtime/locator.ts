import * as fs from 'fs';
import * as path from 'path';

declare global {
  var _VSCODE_FILE_ROOT: string | undefined;
}

export function getWorkbenchHtmlPath(): string | null {
  const appDirectory =
    globalThis._VSCODE_FILE_ROOT ??
    (require.main?.filename ? path.dirname(require.main.filename) : undefined) ??
    (process.argv[1] ? path.dirname(process.argv[1]) : undefined);

  if (!appDirectory) {
    return null;
  }

  const baseDirectory = path.join(appDirectory, 'vs', 'code');
  const candidates = [
    path.join(baseDirectory, 'electron-sandbox', 'workbench', 'workbench.html'),
    path.join(baseDirectory, 'electron-sandbox', 'workbench', 'workbench-apc-extension.html'),
    path.join(baseDirectory, 'electron-sandbox', 'workbench', 'workbench.esm.html'),
    path.join(baseDirectory, 'electron-browser', 'workbench', 'workbench.esm.html'),
    path.join(baseDirectory, 'electron-browser', 'workbench', 'workbench.html'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}
