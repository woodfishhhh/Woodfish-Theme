import * as fs from 'fs';
import * as path from 'path';
import {
  DSH_USERSCRIPT_CONFIG_KEY,
  DshSettings,
  normalizeDshSettings,
} from '@woodfish/adapter-dsh';
import { readAsset, toScriptLiteral } from '../inject/payload';
import { WoodfishPaths } from '../paths';
import { readJson, writeFileAtomic, writeJson } from '../store';

declare const __WOODFISH_DSH_USERSCRIPT__: string | undefined;

/** File name of the committed user script and of the generated copy. */
export const DSH_USERSCRIPT_FILE = 'woodfish-dsh.user.js';
/** Managers only install files whose name ends like this. */
export const USERSCRIPT_SUFFIX = '.user.js';
const METADATA_END = '// ==/UserScript==\n';

/** What `woodfish dsh` keeps between runs (`%APPDATA%\Woodfish\dsh.json`). */
export interface DshState {
  version: 1;
  dsh: DshSettings;
  /** Last generated user script, so `uninstall` can find it. */
  userScriptFile?: string;
}

export function dshStateFile(paths: WoodfishPaths): string {
  return path.join(paths.dataDir, 'dsh.json');
}

export function defaultUserScriptFile(paths: WoodfishPaths): string {
  return path.join(paths.dataDir, DSH_USERSCRIPT_FILE);
}

export function loadDshState(paths: WoodfishPaths): DshState {
  const stored = readJson<Partial<DshState>>(dshStateFile(paths));
  return {
    version: 1,
    dsh: normalizeDshSettings(stored?.dsh),
    ...(typeof stored?.userScriptFile === 'string'
      ? { userScriptFile: stored.userScriptFile }
      : {}),
  };
}

export function saveDshState(paths: WoodfishPaths, state: DshState): void {
  writeJson(dshStateFile(paths), { ...state, dsh: normalizeDshSettings(state.dsh) });
}

/** The committed user script with default settings (inlined in release builds). */
export function loadDshUserScriptBundle(): string {
  return typeof __WOODFISH_DSH_USERSCRIPT__ === 'string'
    ? __WOODFISH_DSH_USERSCRIPT__
    : readAsset(DSH_USERSCRIPT_FILE);
}

/**
 * The user script with `settings` baked in. The settings line goes right after the
 * metadata block, which managers only read at the very top of the file.
 */
export function buildDshUserScript(settings: DshSettings, bundle: string): string {
  const end = bundle.indexOf(METADATA_END);
  if (!bundle.startsWith('// ==UserScript==') || end === -1) {
    throw new Error('dsh 用户脚本缺少元数据块，请运行 pnpm dsh:build 重新生成');
  }
  const at = end + METADATA_END.length;
  const config = `globalThis[${toScriptLiteral(DSH_USERSCRIPT_CONFIG_KEY)}] = ${toScriptLiteral(
    normalizeDshSettings(settings)
  )};\n`;
  return `${bundle.slice(0, at)}${config}${bundle.slice(at)}`;
}

/** Writes the user script to `file` and returns its absolute path. */
export function writeDshUserScript(file: string, settings: DshSettings, bundle: string): string {
  const target = path.resolve(file);
  if (!target.toLowerCase().endsWith(USERSCRIPT_SUFFIX)) {
    throw new Error(`文件名需以 ${USERSCRIPT_SUFFIX} 结尾，油猴才会把它识别为用户脚本`);
  }
  writeFileAtomic(target, buildDshUserScript(settings, bundle));
  return target;
}

/** Deletes the generated user script(s) and the saved settings; returns what was removed. */
export function removeDshFiles(paths: WoodfishPaths): string[] {
  const state = readJson<Partial<DshState>>(dshStateFile(paths));
  const candidates = new Set([defaultUserScriptFile(paths), dshStateFile(paths)]);
  // Only a file Woodfish wrote itself, recognisable by its name.
  if (
    typeof state?.userScriptFile === 'string' &&
    state.userScriptFile.toLowerCase().endsWith(USERSCRIPT_SUFFIX)
  ) {
    candidates.add(state.userScriptFile);
  }
  const removed: string[] = [];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
      removed.push(file);
    }
  }
  return removed;
}
