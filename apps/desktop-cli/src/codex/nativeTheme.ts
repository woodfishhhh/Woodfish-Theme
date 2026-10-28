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

/**
 * One independently reversible change to Codex's config.toml: the chrome theme of one
 * appearance mode, or the appearance mode itself. Dark and light can be applied together.
 */
export type ManagedChangeId = ChromeThemeMode | 'appearance';
export const MANAGED_CHANGE_IDS: readonly ManagedChangeId[] = ['dark', 'light', 'appearance'];

export type CodexAppearance = 'system' | 'light' | 'dark';
export const CODEX_APPEARANCES: readonly CodexAppearance[] = ['system', 'light', 'dark'];

interface PreviousValue {
  table: string[];
  key: string;
  /** `null` when the key did not exist before. */
  value: TomlScalar | null;
}

/** Everything needed to undo one managed change. */
export interface NativeThemeManifest {
  version: 2;
  id: ManagedChangeId;
  configPath: string;
  /** Palette slug for theme changes, appearance value for `appearance`. */
  value: string;
  appliedAt: string;
  /** Application order across all managed changes; restore goes from highest to lowest. */
  sequence: number;
  sha256Before: string;
  sha256After: string;
  backupFile: string;
  previous: PreviousValue[];
  createdTables: string[][];
  /** The file did not exist and was created by Woodfish. */
  createdFile: boolean;
}

function manifestPath(paths: WoodfishPaths, id: ManagedChangeId): string {
  return path.join(paths.backupsDir, `native-${id}.json`);
}

export function readNativeThemeManifest(
  paths: WoodfishPaths,
  id: ManagedChangeId
): NativeThemeManifest | undefined {
  return readJson<NativeThemeManifest>(manifestPath(paths, id));
}

/** Every applied change, most recent first. */
export function listNativeThemeManifests(paths: WoodfishPaths): NativeThemeManifest[] {
  return MANAGED_CHANGE_IDS.map((id) => readNativeThemeManifest(paths, id))
    .filter((manifest): manifest is NativeThemeManifest => manifest !== undefined)
    .sort((left, right) => right.sequence - left.sequence);
}

function scalarOrNull(value: unknown): TomlScalar | null {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : null;
}

interface ManagedChange {
  id: ManagedChangeId;
  value: string;
  sets: TomlSet[];
  ensureTables: string[][];
}

export interface ApplyResult {
  id: ManagedChangeId;
  changed: boolean;
  manifest: NativeThemeManifest;
}

function applyManagedChange(
  paths: WoodfishPaths,
  change: ManagedChange,
  now: () => Date
): ApplyResult {
  if (readNativeThemeManifest(paths, change.id)) {
    restoreManagedChange(paths, change.id);
  }
  const configPath = paths.codexConfig;
  const createdFile = !fs.existsSync(configPath);
  const originalBytes = createdFile ? Buffer.alloc(0) : fs.readFileSync(configPath);
  const originalText = originalBytes.toString('utf8');
  if (Buffer.from(originalText, 'utf8').compare(originalBytes) !== 0) {
    throw new TomlEditError('config.toml 不是有效的 UTF-8，未做修改');
  }
  const parsed = parseToml(originalText);
  const previous = change.sets.map((set) => ({
    table: [...set.table],
    key: set.key,
    value: scalarOrNull(readTomlValue(parsed, set.table, set.key)),
  }));
  const { text, createdTables } = editToml(originalText, {
    ensureTables: change.ensureTables,
    sets: change.sets,
  });

  const sequence =
    listNativeThemeManifests(paths).reduce((max, entry) => Math.max(max, entry.sequence), 0) + 1;
  const stamp = now().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(paths.backupsDir, `config.toml.${change.id}.${stamp}.bak`);
  writeFileAtomic(backupFile, originalBytes);
  const manifest: NativeThemeManifest = {
    version: 2,
    id: change.id,
    configPath,
    value: change.value,
    appliedAt: now().toISOString(),
    sequence,
    sha256Before: sha256(originalBytes),
    sha256After: sha256(text),
    backupFile,
    previous,
    createdTables,
    createdFile,
  };
  writeJson(manifestPath(paths, change.id), manifest);

  // Codex may have written the file meanwhile; never overwrite its changes.
  const current = fs.existsSync(configPath) ? fs.readFileSync(configPath) : Buffer.alloc(0);
  if (sha256(current) !== manifest.sha256Before) {
    fs.rmSync(manifestPath(paths, change.id), { force: true });
    throw new TomlEditError('config.toml 在修改过程中被其他程序改动，已放弃写入，请重试');
  }
  writeFileInPlace(configPath, text);
  return { id: change.id, changed: text !== originalText, manifest };
}

export type RestoreOutcome = 'nothing-to-restore' | 'restored-exact' | 'restored-keys';

function restoreManagedChange(paths: WoodfishPaths, id: ManagedChangeId): RestoreOutcome {
  const manifest = readNativeThemeManifest(paths, id);
  if (!manifest) {
    return 'nothing-to-restore';
  }
  const configPath = manifest.configPath;
  const current = fs.existsSync(configPath) ? fs.readFileSync(configPath) : null;
  let outcome: RestoreOutcome = 'restored-keys';
  if (current && sha256(current) === manifest.sha256After) {
    if (manifest.createdFile) {
      fs.rmSync(configPath, { force: true });
    } else {
      writeFileInPlace(configPath, fs.readFileSync(manifest.backupFile));
    }
    outcome = 'restored-exact';
  } else if (current) {
    const { text: reverted } = editToml(current.toString('utf8'), {
      sets: manifest.previous
        .filter((entry) => entry.value !== null)
        .map((entry) => ({ table: entry.table, key: entry.key, value: entry.value as TomlScalar })),
      removes: manifest.previous
        .filter((entry) => entry.value === null)
        .map((entry) => ({ table: entry.table, key: entry.key })),
      removeTablesIfEmpty: [...manifest.createdTables].reverse(),
    });
    writeFileInPlace(configPath, reverted);
  }
  fs.rmSync(manifestPath(paths, id), { force: true });
  return outcome;
}

function paletteChange(slug: CodexPaletteSlug, mode: ChromeThemeMode): ManagedChange {
  const theme = paletteToChromeTheme(findCodexPalette(slug));
  const table = CHROME_THEME_TABLES[mode].split('.');
  const semantic = [...table, 'semanticColors'];
  return {
    id: mode,
    value: slug,
    ensureTables: [table, [...table, 'fonts'], semantic],
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

/**
 * Writes a Woodfish palette into Codex's official chrome theme for its own mode (Light →
 * light, Black/Neon → dark). Each mode is tracked separately, so a dark and a light palette
 * can be active together; re-applying a mode first undoes that mode's previous apply.
 */
export function applyNativeTheme(
  paths: WoodfishPaths,
  slug: CodexPaletteSlug,
  now: () => Date = () => new Date()
): ApplyResult {
  return applyManagedChange(paths, paletteChange(slug, paletteMode(findCodexPalette(slug))), now);
}

/** Sets Codex's appearance mode (`desktop.appearanceTheme`), reversibly. */
export function applyAppearance(
  paths: WoodfishPaths,
  appearance: CodexAppearance,
  now: () => Date = () => new Date()
): ApplyResult {
  return applyManagedChange(
    paths,
    {
      id: 'appearance',
      value: appearance,
      ensureTables: [['desktop']],
      sets: [{ table: ['desktop'], key: 'appearanceTheme', value: appearance }],
    },
    now
  );
}

export interface RestoreSummary {
  /** Changes that were undone, most recent first. */
  restored: Array<{ id: ManagedChangeId; outcome: Exclude<RestoreOutcome, 'nothing-to-restore'> }>;
}

/**
 * Undoes managed changes (all by default) in reverse order of application. When Codex has
 * not touched the file since, each step writes back exact bytes, so undoing everything
 * returns the original file byte for byte; otherwise only the managed keys are reverted.
 */
export function restoreNativeTheme(
  paths: WoodfishPaths,
  ids: readonly ManagedChangeId[] = MANAGED_CHANGE_IDS
): RestoreSummary {
  const restored: RestoreSummary['restored'] = [];
  for (const manifest of listNativeThemeManifests(paths)) {
    if (!ids.includes(manifest.id)) {
      continue;
    }
    const outcome = restoreManagedChange(paths, manifest.id);
    if (outcome !== 'nothing-to-restore') {
      restored.push({ id: manifest.id, outcome });
    }
  }
  return { restored };
}
