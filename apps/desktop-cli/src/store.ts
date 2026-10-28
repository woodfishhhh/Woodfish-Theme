import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { CodexSettings, normalizeCodexSettings } from '@woodfish/adapter-codex';
import { WoodfishPaths } from './paths';

export function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Writes via a temp file and rename, so readers never see a half-written file. */
export function writeFileAtomic(file: string, data: Buffer | string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temp, data);
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

/**
 * Overwrites a file in place (same file, not a rename). Codex's long-running app-server
 * watches `config.toml`; replacing the file by rename leaves it serving a stale copy.
 * Callers keep a backup first, because an in-place write is not atomic.
 */
export function writeFileInPlace(file: string, data: Buffer | string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data, { flag: fs.existsSync(file) ? 'r+' : 'w' });
  fs.truncateSync(file, Buffer.byteLength(data));
}

export function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw new Error(`${file} 不是有效的 JSON：${(error as Error).message}`);
  }
}

export function writeJson(file: string, value: unknown): void {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Recorded consent to opening a debugging port; tied to the exact risk text. */
export interface ConsentRecord {
  riskTextSha256: string;
  acceptedAt: string;
}

export interface StoredSettings {
  version: 1;
  codex: CodexSettings;
  consent?: ConsentRecord;
}

export function loadSettings(paths: WoodfishPaths): StoredSettings {
  const stored = readJson<Partial<StoredSettings>>(paths.settingsFile);
  return {
    version: 1,
    codex: normalizeCodexSettings(stored?.codex),
    ...(stored?.consent ? { consent: stored.consent } : {}),
  };
}

export function saveSettings(paths: WoodfishPaths, settings: StoredSettings): void {
  writeJson(paths.settingsFile, {
    ...settings,
    codex: normalizeCodexSettings(settings.codex),
  });
}

/** Watcher bookkeeping, so later commands can find and stop it. */
export interface WatcherState {
  pid: number;
  port: number;
  startedAt: string;
  /** sha256 of the overlay bundle the watcher injects; a new CLI build restarts it. */
  bundleSha256?: string;
}

export function loadWatcherState(paths: WoodfishPaths): WatcherState | undefined {
  return readJson<WatcherState>(paths.stateFile);
}

export function saveWatcherState(paths: WoodfishPaths, state: WatcherState | undefined): void {
  if (state) {
    writeJson(paths.stateFile, state);
  } else {
    fs.rmSync(paths.stateFile, { force: true });
  }
}
