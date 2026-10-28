import * as fs from 'fs';
import * as path from 'path';
import {
  CHROME_THEME_TABLES,
  ChromeThemeMode,
  CodexPaletteSlug,
  findCodexPalette,
  paletteMode,
  paletteToChromeTheme,
} from '@woodfish/adapter-codex';
import { WoodfishPaths } from '../paths';
import { readJson, sha256, writeFileAtomic, writeFileInPlace, writeJson } from '../store';
import { TomlEditError, TomlScalar, TomlSet, editToml, parseToml, readTomlValue } from './tomlEdit';

const MANIFEST_FILE = 'native-theme.json';

interface PreviousValue {
  table: string[];
  key: string;
  /** `null` when the key did not exist before. */
  value: TomlScalar | null;
}

/** Everything needed to undo one `theme apply`. */
export interface NativeThemeManifest {
  version: 1;
  configPath: string;
  palette: CodexPaletteSlug;
  mode: ChromeThemeMode;
  appliedAt: string;
  sha256Before: string;
  sha256After: string;
  backupFile: string;
  previous: PreviousValue[];
  createdTables: string[][];
  /** The file did not exist and was created by Woodfish. */
  createdFile: boolean;
}

function manifestPath(paths: WoodfishPaths): string {
  return path.join(paths.backupsDir, MANIFEST_FILE);
}

export function readNativeThemeManifest(paths: WoodfishPaths): NativeThemeManifest | undefined {
  return readJson<NativeThemeManifest>(manifestPath(paths));
}

function managedSets(slug: CodexPaletteSlug): { mode: ChromeThemeMode; sets: TomlSet[] } {
  const palette = findCodexPalette(slug);
  const mode = paletteMode(palette);
  const theme = paletteToChromeTheme(palette);
  const table = CHROME_THEME_TABLES[mode].split('.');
  const semantic = [...table, 'semanticColors'];
  return {
    mode,
    sets: [
      { table, key: 'accent', value: theme.accent },
      { table, key: 'accentSource', value: theme.accentSource },
      { table, key: 'contrast', value: theme.contrast },
      { table, key: 'ink', value: theme.ink },
      { table, key: 'opaqueWindows', value: theme.opaqueWindows },
      { table, key: 'surface', value: theme.surface },
      { table: semantic, key: 'diffAdded', value: theme.semanticColors.diffAdded },
      { table: semantic, key: 'diffRemoved', value: theme.semanticColors.diffRemoved },
      { table: semantic, key: 'skill', value: theme.semanticColors.skill },
    ],
  };
}

function scalarOrNull(value: unknown): TomlScalar | null {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : null;
}

export interface ApplyResult {
  mode: ChromeThemeMode;
  changed: boolean;
  manifest: NativeThemeManifest;
}

/**
 * Writes a Woodfish palette into Codex's official chrome theme. The original bytes are
 * backed up first; a second apply restores the first one before writing.
 */
export function applyNativeTheme(
  paths: WoodfishPaths,
  slug: CodexPaletteSlug,
  now: () => Date = () => new Date()
): ApplyResult {
  if (readNativeThemeManifest(paths)) {
    restoreNativeTheme(paths);
  }
  const configPath = paths.codexConfig;
  const createdFile = !fs.existsSync(configPath);
  const originalBytes = createdFile ? Buffer.alloc(0) : fs.readFileSync(configPath);
  const originalText = originalBytes.toString('utf8');
  if (Buffer.from(originalText, 'utf8').compare(originalBytes) !== 0) {
    throw new TomlEditError('config.toml 不是有效的 UTF-8，未做修改');
  }
  const parsed = parseToml(originalText);
  const { mode, sets } = managedSets(slug);
  const table = CHROME_THEME_TABLES[mode].split('.');
  const previous = sets.map((set) => ({
    table: [...set.table],
    key: set.key,
    value: scalarOrNull(readTomlValue(parsed, set.table, set.key)),
  }));
  const { text, createdTables } = editToml(originalText, {
    ensureTables: [table, [...table, 'fonts'], [...table, 'semanticColors']],
    sets,
  });

  const stamp = now().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(paths.backupsDir, `config.toml.${stamp}.bak`);
  writeFileAtomic(backupFile, originalBytes);
  const manifest: NativeThemeManifest = {
    version: 1,
    configPath,
    palette: slug,
    mode,
    appliedAt: now().toISOString(),
    sha256Before: sha256(originalBytes),
    sha256After: sha256(text),
    backupFile,
    previous,
    createdTables,
    createdFile,
  };
  writeJson(manifestPath(paths), manifest);

  // Codex may have written the file meanwhile; never overwrite its changes.
  const current = fs.existsSync(configPath) ? fs.readFileSync(configPath) : Buffer.alloc(0);
  if (sha256(current) !== manifest.sha256Before) {
    fs.rmSync(manifestPath(paths), { force: true });
    throw new TomlEditError('config.toml 在修改过程中被其他程序改动，已放弃写入，请重试');
  }
  writeFileInPlace(configPath, text);
  return { mode, changed: text !== originalText, manifest };
}

export type RestoreOutcome = 'nothing-to-restore' | 'restored-exact' | 'restored-keys';

/**
 * Undoes the last apply. If Codex has not touched the file since, the original bytes come
 * back exactly; otherwise only the managed keys are reverted and Codex's other changes stay.
 */
export function restoreNativeTheme(paths: WoodfishPaths): RestoreOutcome {
  const manifest = readNativeThemeManifest(paths);
  if (!manifest) {
    return 'nothing-to-restore';
  }
  const configPath = manifest.configPath;
  const current = fs.existsSync(configPath) ? fs.readFileSync(configPath) : null;
  let outcome: RestoreOutcome;
  if (current && sha256(current) === manifest.sha256After) {
    if (manifest.createdFile) {
      fs.rmSync(configPath, { force: true });
    } else {
      writeFileInPlace(configPath, fs.readFileSync(manifest.backupFile));
    }
    outcome = 'restored-exact';
  } else if (current) {
    const text = current.toString('utf8');
    const { text: reverted } = editToml(text, {
      sets: manifest.previous
        .filter((entry) => entry.value !== null)
        .map((entry) => ({ table: entry.table, key: entry.key, value: entry.value as TomlScalar })),
      removes: manifest.previous
        .filter((entry) => entry.value === null)
        .map((entry) => ({ table: entry.table, key: entry.key })),
      removeTablesIfEmpty: [...manifest.createdTables].reverse(),
    });
    writeFileInPlace(configPath, reverted);
    outcome = 'restored-keys';
  } else {
    outcome = 'restored-keys';
  }
  fs.rmSync(manifestPath(paths), { force: true });
  return outcome;
}
