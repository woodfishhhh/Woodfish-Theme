/*
 * `vscode:uninstall` hook. VS Code runs it with plain Node after the extension
 * has been uninstalled and VS Code restarted, so it must not import `vscode`.
 * It restores every installation Woodfish touched; previously users had to
 * “先关掉效果再卸载”, otherwise the effects stayed after uninstalling (#11, #29).
 */
import * as path from 'path';
import { cleanInstallation } from './services/runtime/cleanup';
import { readInstallManifest } from './services/runtime/installManifest';
import { inferAppRootsFromExecutable } from './services/runtime/locator';

export function collectAppRoots(extensionRoot: string, executablePath: string): string[] {
  return [
    ...new Set([
      ...readInstallManifest(extensionRoot),
      ...inferAppRootsFromExecutable(executablePath),
    ]),
  ];
}

export function runUninstall(extensionRoot: string, executablePath: string): number {
  let failures = 0;
  for (const appRoot of collectAppRoots(extensionRoot, executablePath)) {
    const report = cleanInstallation(appRoot);
    failures += report.errors.length;
    console.log(`[Woodfish] cleaned ${appRoot}: ${JSON.stringify(report)}`);
  }
  return failures;
}

if (require.main === module) {
  const failures = runUninstall(path.resolve(__dirname, '..'), process.execPath);
  process.exitCode = failures > 0 ? 1 : 0;
}
