import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';
import {
  EffectHost,
  EffectManifest,
  EffectManifestError,
  EffectValues,
  defaultEffectValues,
  isEffectId,
  normalizeEffectManifest,
  normalizeEffectValues,
  patchEffectValues,
} from '@woodfish/theme-core';

/*
 * The user's effects folder (`%APPDATA%\Woodfish\effects` on Windows). Every effect is a
 * folder: `effect.json` (what it is, its parameters), `params.json` (the values, written
 * by the settings page and by hand), `effect.js` (the code), optional `effect.css` and a
 * `README.md`. Woodfish ships its effects into this folder and upgrades the files the
 * user never edited; edited files and `params.json` are never overwritten.
 */

declare const __WOODFISH_BUILTIN_EFFECTS__: Record<string, string> | undefined;

/** Records which shipped files (and versions) are in the folder, to tell user edits apart. */
export const EFFECTS_LEDGER_FILE = '.woodfish-shipped.json';
export const EFFECT_MANIFEST_FILE = 'effect.json';
export const EFFECT_VALUES_FILE = 'params.json';
export const EFFECT_SCRIPT_FILE = 'effect.js';
export const EFFECT_STYLE_FILE = 'effect.css';
/** Touching this file in the effects folder asks every running host to reload effects. */
export const EFFECTS_RELOAD_FILE = '.reload';
/**
 * The user's own CSS, loaded after everything else in Codex and VS Code. Its
 * `--woodfish-<effect>-<param>` variables override effect parameters. Woodfish ships a
 * commented template; once edited, upgrades leave it alone.
 */
export const USER_CSS_FILE = 'user.css';

const MAX_SCRIPT_BYTES = 512 * 1024;
const MAX_STYLE_BYTES = 128 * 1024;
const MAX_JSON_BYTES = 64 * 1024;

/**
 * Woodfish's data folder, shared by the CLI and the VS Code extension:
 * `%APPDATA%\Woodfish` on Windows, `~/Library/Application Support/Woodfish` on macOS and
 * `$XDG_CONFIG_HOME/Woodfish` elsewhere. `WOODFISH_DATA_DIR` overrides it.
 */
export function woodfishDataDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = os.homedir()
): string {
  if (env.WOODFISH_DATA_DIR) {
    return env.WOODFISH_DATA_DIR;
  }
  if (platform === 'win32') {
    return path.join(env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'Woodfish');
  }
  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Woodfish');
  }
  return path.join(env.XDG_CONFIG_HOME ?? path.join(home, '.config'), 'Woodfish');
}

/** The effects folder (`WOODFISH_EFFECTS_DIR` overrides it). */
export function woodfishEffectsDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = os.homedir()
): string {
  return env.WOODFISH_EFFECTS_DIR ?? path.join(woodfishDataDir(env, platform, home), 'effects');
}

export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function writeFileAtomic(file: string, data: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temp, data);
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

/** The shipped effect files: relative path → content. */
export function builtinEffectFiles(): Record<string, string> {
  if (typeof __WOODFISH_BUILTIN_EFFECTS__ === 'object' && __WOODFISH_BUILTIN_EFFECTS__) {
    return __WOODFISH_BUILTIN_EFFECTS__;
  }
  // Repository and tests: read the folder next to the sources.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readBuiltinEffectFiles } = require('../scripts/files.js') as {
    readBuiltinEffectFiles: () => Record<string, string>;
  };
  return readBuiltinEffectFiles();
}

interface LedgerEntry {
  sha256: string;
  version: number;
}

interface Ledger {
  files: Record<string, LedgerEntry>;
}

function readLedger(dir: string): Ledger {
  try {
    const parsed = JSON.parse(
      fs.readFileSync(path.join(dir, EFFECTS_LEDGER_FILE), 'utf8')
    ) as Ledger;
    return parsed && typeof parsed.files === 'object' && parsed.files ? parsed : { files: {} };
  } catch {
    return { files: {} };
  }
}

/** The `version` of the effect a shipped file belongs to (root files count as 1). */
function versionOf(files: Record<string, string>, relative: string): number {
  const folder = relative.split('/')[0];
  const manifest = files[`${folder}/${EFFECT_MANIFEST_FILE}`];
  if (!relative.includes('/') || !manifest) {
    return 1;
  }
  try {
    const version = (JSON.parse(manifest) as { version?: unknown }).version;
    return typeof version === 'number' && version >= 1 ? Math.floor(version) : 1;
  } catch {
    return 1;
  }
}

export interface SyncResult {
  created: string[];
  updated: string[];
  /** Shipped files the user edited; a newer version exists but was not written. */
  kept: string[];
}

/**
 * Seeds and upgrades the user's effects folder from the shipped files. A file is only
 * (re)written when it is missing and was never shipped before, or when it still has the
 * exact content Woodfish shipped last time and the new version is not older. Files the
 * user edited or deleted stay as they are; `params.json` is never shipped.
 */
export function syncUserEffects(
  dir: string,
  files: Record<string, string> = builtinEffectFiles()
): SyncResult {
  const result: SyncResult = { created: [], updated: [], kept: [] };
  const ledger = readLedger(dir);
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(dir, ...relative.split('/'));
    const shipped = sha256(content);
    const version = versionOf(files, relative);
    const known = ledger.files[relative];
    let current: string | null = null;
    try {
      current = sha256(fs.readFileSync(target));
    } catch {
      current = null;
    }
    if (current === shipped) {
      ledger.files[relative] = { sha256: shipped, version };
    } else if (current === null) {
      if (!known) {
        writeFileAtomic(target, content);
        ledger.files[relative] = { sha256: shipped, version };
        result.created.push(relative);
      }
    } else if (known && current === known.sha256) {
      if (version >= known.version) {
        writeFileAtomic(target, content);
        ledger.files[relative] = { sha256: shipped, version };
        result.updated.push(relative);
      }
    } else {
      result.kept.push(relative);
    }
  }
  writeFileAtomic(path.join(dir, EFFECTS_LEDGER_FILE), `${JSON.stringify(ledger, null, 2)}\n`);
  return result;
}

/**
 * Puts the shipped files of one effect (or one root file such as `user.css`) back, after the
 * user broke or deleted it. Edited files are kept next to it as `<name>.bak`.
 */
export function restoreBuiltinEffect(
  dir: string,
  id: string,
  files: Record<string, string> = builtinEffectFiles()
): string[] {
  const restored: string[] = [];
  const ledger = readLedger(dir);
  for (const [relative, content] of Object.entries(files)) {
    if (!relative.startsWith(`${id}/`) && relative !== id) {
      continue;
    }
    const target = path.join(dir, ...relative.split('/'));
    if (fs.existsSync(target) && sha256(fs.readFileSync(target)) !== sha256(content)) {
      fs.copyFileSync(target, `${target}.bak`);
    }
    writeFileAtomic(target, content);
    ledger.files[relative] = { sha256: sha256(content), version: versionOf(files, relative) };
    restored.push(relative);
  }
  if (restored.length === 0) {
    throw new Error(`Woodfish 没有自带名为 ${id} 的效果`);
  }
  writeFileAtomic(path.join(dir, EFFECTS_LEDGER_FILE), `${JSON.stringify(ledger, null, 2)}\n`);
  return restored;
}

export interface LoadedEffect {
  id: string;
  dir: string;
  /** Null when `effect.json` could not be used (see `error`). */
  manifest: EffectManifest | null;
  values: EffectValues | null;
  /** `effect.js`, already checked for syntax errors. */
  script: string | null;
  css: string | null;
  /** Identity of manifest + code; values are not part of it. */
  hash: string;
  error?: string;
}

function readOptional(file: string, limit: number, label: string): string | null {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return null;
  }
  if (stat.size > limit) {
    throw new EffectManifestError(`${label} 太大（超过 ${Math.round(limit / 1024)} KB）`);
  }
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new EffectManifestError(`${label} 不是有效的 JSON：${(error as Error).message}`);
  }
}

/** The function an `effect.js` becomes in the page. */
export function wrapEffectScript(script: string): string {
  return `function (module, exports) {\n${script}\n}`;
}

/** Throws with the line number when `effect.js` cannot be parsed (it is never run here). */
export function checkEffectScript(script: string, filename = EFFECT_SCRIPT_FILE): void {
  try {
    // Parsing only: compile the wrapper, never run it.
    new vm.Script(`(${wrapEffectScript(script)})`, { filename });
  } catch (error) {
    const stack = String((error as Error).stack ?? '');
    const line = /:(\d+)\s*$/m.exec(stack.split('\n')[0] ?? '')?.[1];
    const lineNumber = line ? Number(line) - 1 : null;
    throw new EffectManifestError(
      `${filename}${lineNumber ? ` 第 ${lineNumber} 行` : ''}有语法错误：${(error as Error).message}`
    );
  }
}

/** Loads one effect folder; problems are reported in `error`, never thrown. */
export function readEffect(dir: string, id: string): LoadedEffect | null {
  const folder = path.join(dir, id);
  const manifestFile = path.join(folder, EFFECT_MANIFEST_FILE);
  if (!fs.existsSync(manifestFile)) {
    return null;
  }
  const loaded: LoadedEffect = {
    id,
    dir: folder,
    manifest: null,
    values: null,
    script: null,
    css: null,
    hash: '',
  };
  try {
    const manifestText = readOptional(manifestFile, MAX_JSON_BYTES, EFFECT_MANIFEST_FILE) ?? '';
    const script = readOptional(
      path.join(folder, EFFECT_SCRIPT_FILE),
      MAX_SCRIPT_BYTES,
      EFFECT_SCRIPT_FILE
    );
    const css = readOptional(
      path.join(folder, EFFECT_STYLE_FILE),
      MAX_STYLE_BYTES,
      EFFECT_STYLE_FILE
    );
    loaded.hash = sha256([manifestText, script ?? '', css ?? ''].join('\0')).slice(0, 16);
    loaded.manifest = normalizeEffectManifest(parseJson(manifestText, EFFECT_MANIFEST_FILE));
    const valuesText = readOptional(
      path.join(folder, EFFECT_VALUES_FILE),
      MAX_JSON_BYTES,
      EFFECT_VALUES_FILE
    );
    loaded.values = normalizeEffectValues(
      loaded.manifest,
      valuesText === null ? {} : parseJson(valuesText, EFFECT_VALUES_FILE)
    );
    if (script !== null) {
      checkEffectScript(script);
    } else if (!loaded.manifest.core && css === null) {
      throw new EffectManifestError('缺少 effect.js（或 effect.css）');
    }
    if (css !== null && /<\/style/i.test(css)) {
      throw new EffectManifestError('effect.css 里不能出现 </style');
    }
    loaded.script = script;
    loaded.css = css;
  } catch (error) {
    loaded.error = (error as Error).message;
  }
  return loaded;
}

/** The user's `user.css` ('' when there is none). */
export function readUserCss(dir: string): string {
  return readOptional(path.join(dir, USER_CSS_FILE), MAX_STYLE_BYTES, USER_CSS_FILE) ?? '';
}

/** Every effect folder in `dir`, sorted by name. A missing folder means no effects. */
export function readUserEffects(dir: string): LoadedEffect[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && isEffectId(entry.name))
    .map((entry) => entry.name)
    .sort()
    .map((id) => readEffect(dir, id))
    .filter((effect): effect is LoadedEffect => effect !== null);
}

/** Reads one effect's manifest and values, throwing when it cannot be used. */
function requireEffect(
  dir: string,
  id: string
): { manifest: EffectManifest; values: EffectValues } {
  if (!isEffectId(id)) {
    throw new Error(`效果名无效：${String(id)}`);
  }
  const effect = readEffect(dir, id);
  if (!effect) {
    throw new Error(`没有名为 ${id} 的效果（${path.join(dir, id)}）`);
  }
  if (!effect.manifest) {
    throw new Error(`${id}：${effect.error ?? 'effect.json 无法使用'}`);
  }
  return {
    manifest: effect.manifest,
    values: effect.values ?? defaultEffectValues(effect.manifest),
  };
}

function writeValues(dir: string, id: string, values: EffectValues): void {
  writeFileAtomic(path.join(dir, id, EFFECT_VALUES_FILE), `${JSON.stringify(values, null, 2)}\n`);
}

/** Applies an untrusted patch to an effect's `params.json`; returns the saved values. */
export function writeEffectValues(dir: string, id: string, patch: unknown): EffectValues {
  const { manifest, values } = requireEffect(dir, id);
  const next = patchEffectValues(manifest, values, patch);
  writeValues(dir, id, next);
  return next;
}

/** Writes the defaults from `effect.json` into `params.json`. */
export function resetEffectValues(dir: string, id: string): EffectValues {
  const { manifest } = requireEffect(dir, id);
  const values = defaultEffectValues(manifest);
  writeValues(dir, id, values);
  return values;
}

/** Writes `params.json` only if there is none yet (used to carry over older settings). */
export function seedEffectValues(dir: string, id: string, raw: unknown): boolean {
  const file = path.join(dir, id, EFFECT_VALUES_FILE);
  if (fs.existsSync(file) || !fs.existsSync(path.join(dir, id, EFFECT_MANIFEST_FILE))) {
    return false;
  }
  const { manifest } = requireEffect(dir, id);
  writeValues(dir, id, normalizeEffectValues(manifest, raw));
  return true;
}

/** Asks running hosts to reload every effect (they watch this file). */
export function requestEffectsReload(dir: string): void {
  writeFileAtomic(path.join(dir, EFFECTS_RELOAD_FILE), `${new Date().toISOString()}\n`);
}

/**
 * JSON safe to embed in JavaScript source: line/paragraph separators and `<` escaped.
 */
export function toScriptLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/</g, '\\u003c');
}

/** Values the page uses for an effect, e.g. from VS Code settings instead of `params.json`. */
export type EffectValuesOverride = (effect: LoadedEffect & { manifest: EffectManifest }) => unknown;

/**
 * The array literal of effects for a host page: data as JSON, each `effect.js` as a function
 * (already syntax-checked). Effects for other hosts are left out; broken folders are kept
 * with their error so the page can list them.
 */
export function buildEffectsList(
  effects: readonly LoadedEffect[],
  host: EffectHost,
  override?: EffectValuesOverride
): string {
  const entries = effects
    .filter((effect) => !effect.manifest || effect.manifest.hosts.includes(host))
    .map((effect) => {
      if (!effect.manifest || effect.error) {
        const manifest =
          effect.manifest ?? normalizeEffectManifest({ name: effect.id, hosts: [host] });
        return `{ id: ${toScriptLiteral(effect.id)}, hash: ${toScriptLiteral(effect.hash)}, manifest: ${toScriptLiteral(manifest)}, values: ${toScriptLiteral(effect.values ?? defaultEffectValues(manifest))}, error: ${toScriptLiteral(effect.error ?? 'effect.json 无法使用')} }`;
      }
      const values = override
        ? normalizeEffectValues(effect.manifest, override({ ...effect, manifest: effect.manifest }))
        : (effect.values ?? defaultEffectValues(effect.manifest));
      const parts = [
        `id: ${toScriptLiteral(effect.id)}`,
        `hash: ${toScriptLiteral(effect.hash)}`,
        `manifest: ${toScriptLiteral(effect.manifest)}`,
        `values: ${toScriptLiteral(values)}`,
      ];
      if (effect.css !== null) {
        parts.push(`css: ${toScriptLiteral(effect.css)}`);
      }
      if (effect.script !== null) {
        parts.push(`factory: ${wrapEffectScript(effect.script)}`);
      }
      return `{\n${parts.join(',\n')}\n}`;
    });
  return `[\n${entries.join(',\n')}\n]`;
}

/** Script for a page: stores the effects list under `globalKey` before the overlay starts. */
export function buildEffectsScript(
  effects: readonly LoadedEffect[],
  host: EffectHost,
  globalKey: string,
  override?: EffectValuesOverride
): string {
  return `globalThis[${toScriptLiteral(globalKey)}] = ${buildEffectsList(effects, host, override)};`;
}

/** The same list as an ES module (VS Code imports it from global storage), plus `user.css`. */
export function buildEffectsModule(
  effects: readonly LoadedEffect[],
  host: EffectHost,
  override?: EffectValuesOverride,
  userCss = ''
): string {
  return `export default ${buildEffectsList(effects, host, override)};\nexport const userCss = ${toScriptLiteral(userCss)};\n`;
}
