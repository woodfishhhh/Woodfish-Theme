import * as fs from 'fs';
import * as path from 'path';

/**
 * Records which VS Code installations Woodfish has modified, inside the
 * extension's own folder. The `vscode:uninstall` hook runs from that folder in a
 * plain Node process without `vscode.env.appRoot`, so this list is how it knows
 * what to restore. Losing it is harmless: the hook also infers the app root
 * from the running executable.
 */
export const INSTALL_MANIFEST_FILE_NAME = '.woodfish-installations.json';

type InstallManifest = {
  version: 1;
  appRoots: string[];
};

export function getInstallManifestPath(extensionRoot: string): string {
  return path.join(extensionRoot, INSTALL_MANIFEST_FILE_NAME);
}

export function readInstallManifest(extensionRoot: string): string[] {
  try {
    const parsed = JSON.parse(
      fs.readFileSync(getInstallManifestPath(extensionRoot), 'utf-8')
    ) as Partial<InstallManifest>;
    return Array.isArray(parsed.appRoots)
      ? parsed.appRoots.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

export function recordInstallation(extensionRoot: string, appRoot: string): void {
  const appRoots = readInstallManifest(extensionRoot);
  if (appRoots.includes(appRoot)) {
    return;
  }

  const manifest: InstallManifest = { version: 1, appRoots: [...appRoots, appRoot] };
  try {
    fs.writeFileSync(
      getInstallManifestPath(extensionRoot),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf-8'
    );
  } catch {
    // A read-only extension folder only disables the manifest fallback.
  }
}
