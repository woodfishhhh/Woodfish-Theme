import * as os from 'os';
import * as path from 'path';

export interface WoodfishPaths {
  /** `%APPDATA%\Woodfish`: settings, consent, backups. */
  dataDir: string;
  /** `%LOCALAPPDATA%\Woodfish`: transient files (launch wrappers, watcher lock and log). */
  runtimeDir: string;
  settingsFile: string;
  stateFile: string;
  backupsDir: string;
  watcherLog: string;
  /** Codex home: `CODEX_HOME` or `~/.codex`. */
  codexHome: string;
  codexConfig: string;
  /** Codex++ user scripts (`%APPDATA%\Codex++`). */
  codexPlusDir: string;
}

export function resolvePaths(env: NodeJS.ProcessEnv = process.env): WoodfishPaths {
  const home = os.homedir();
  const appData = env.APPDATA ?? path.join(home, 'AppData', 'Roaming');
  const localAppData = env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
  const dataDir = env.WOODFISH_DATA_DIR ?? path.join(appData, 'Woodfish');
  const runtimeDir = env.WOODFISH_RUNTIME_DIR ?? path.join(localAppData, 'Woodfish');
  const codexHome = env.CODEX_HOME ?? path.join(home, '.codex');
  return {
    dataDir,
    runtimeDir,
    settingsFile: path.join(dataDir, 'codex.json'),
    stateFile: path.join(runtimeDir, 'codex-state.json'),
    backupsDir: path.join(dataDir, 'backups'),
    watcherLog: path.join(runtimeDir, 'codex-watcher.log'),
    codexHome,
    codexConfig: path.join(codexHome, 'config.toml'),
    codexPlusDir: env.WOODFISH_CODEX_PLUS_DIR ?? path.join(appData, 'Codex++'),
  };
}
