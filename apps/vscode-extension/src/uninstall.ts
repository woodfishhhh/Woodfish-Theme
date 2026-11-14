/*
 * `vscode:uninstall` hook. VS Code runs it with plain Node after the extension
 * has been uninstalled and VS Code restarted, so it must not import `vscode`.
 * It restores every installation Woodfish touched; previously users had to
 * “先关掉效果再卸载”, otherwise the effects stayed after uninstalling (#11, #29).
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { removeShippedEffects, woodfishDataDir, woodfishEffectsDir } from '@woodfish/effects';
import { codexRunsOnEditor, codexRuntimeDir, locateCodexCli } from './services/codexCli';
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

type RunCli = (cliPath: string, args: string[]) => void;

function runCli(cliPath: string, args: string[]): void {
  execFileSync(process.execPath, [cliPath, ...args], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'inherit',
    windowsHide: true,
    timeout: 180000,
  });
}

/**
 * The Codex part 「为 Codex 启用 Woodfish」 set up runs on this editor; with the extension gone
 * nothing could turn it off, so it is undone like 「从 Codex 卸载」. Then, when no other
 * Woodfish (the CLI's own copy) is left, the effects it shipped into %APPDATA%\Woodfish go too;
 * anything the user wrote or edited there stays.
 */
export function cleanSharedData(
  extensionRoot: string,
  executablePath: string,
  env: NodeJS.ProcessEnv = process.env,
  run: RunCli = runCli
): number {
  let failures = 0;
  const cliPath = locateCodexCli(extensionRoot);
  if (cliPath && codexRunsOnEditor(executablePath, env)) {
    try {
      run(cliPath, ['codex', 'uninstall', '--keep-settings']);
    } catch (error) {
      failures += 1;
      console.error(`[Woodfish] codex uninstall failed: ${String(error)}`);
    }
  }
  const runtimeDir = codexRuntimeDir(env);
  const cliLeft = ['woodfish.js', 'woodfish.exe'].some((file) =>
    fs.existsSync(path.join(runtimeDir, file))
  );
  if (!cliLeft) {
    const left = removeShippedEffects(woodfishEffectsDir(env));
    console.log(
      `[Woodfish] effects folder: ${left.length ? `kept ${left.join(', ')}` : 'removed'}`
    );
    const dataDir = woodfishDataDir(env);
    if (fs.existsSync(dataDir) && fs.readdirSync(dataDir).length === 0) {
      fs.rmdirSync(dataDir);
    }
  }
  return failures;
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
  const extensionRoot = path.resolve(__dirname, '..');
  const failures =
    runUninstall(extensionRoot, process.execPath) +
    cleanSharedData(extensionRoot, process.execPath);
  process.exitCode = failures > 0 ? 1 : 0;
}
