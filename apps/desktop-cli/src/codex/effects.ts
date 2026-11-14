import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CODEX_EFFECTS_KEY, CODEX_USER_CSS_KEY, legacyEffectValues } from '@woodfish/adapter-codex';
import {
  EFFECTS_LEDGER_FILE,
  EFFECTS_RELOAD_FILE,
  LoadedEffect,
  SyncResult,
  USER_CSS_FILE,
  buildEffectsScript,
  readUserCss,
  readUserEffects,
  resetEffectValues,
  restoreBuiltinEffect,
  seedEffectValues,
  toScriptLiteral,
  syncUserEffects,
  writeEffectValues,
} from '@woodfish/effects';
import { isEffectId } from '@woodfish/theme-core';
import { WoodfishPaths } from '../paths';

/*
 * The effect plugins on disk for Codex: the user's effects folder, seeded from the shipped
 * effects, with values in each folder's params.json.
 */

/** Keys an older `codex.json` had that are effect plugins now. */
const LEGACY_KEYS = ['codeGradient', 'codeGlow', 'glass', 'accent', 'caret', 'bodyText'];

/** True when a raw `codex.json` section still holds settings that belong to effects now. */
export function hasLegacyEffectSettings(codex: unknown): boolean {
  if (codex === null || typeof codex !== 'object') {
    return false;
  }
  const raw = codex as Record<string, unknown>;
  const background = raw.background;
  return (
    LEGACY_KEYS.some((key) => key in raw) ||
    (background !== null && typeof background === 'object' && 'enabled' in background)
  );
}

/**
 * Makes sure the effects folder exists and is up to date, and carries values from an older
 * `codex.json` over into the effect folders (only where an effect has no params.json yet).
 */
export function ensureEffects(paths: WoodfishPaths, legacyCodex?: unknown): SyncResult {
  const result = syncUserEffects(paths.effectsDir);
  if (legacyCodex !== undefined) {
    for (const [id, values] of Object.entries(legacyEffectValues(legacyCodex))) {
      try {
        seedEffectValues(paths.effectsDir, id, values);
      } catch {
        // A broken effect folder keeps its defaults; the error shows when it loads.
      }
    }
  }
  return result;
}

export function loadCodexEffects(paths: WoodfishPaths): LoadedEffect[] {
  return readUserEffects(paths.effectsDir);
}

/** The page script that hands the effects and `user.css` to the overlay. */
export function codexEffectsScript(
  paths: WoodfishPaths,
  globalKey = CODEX_EFFECTS_KEY,
  userCssKey = CODEX_USER_CSS_KEY
): string {
  return [
    buildEffectsScript(loadCodexEffects(paths), 'codex', globalKey),
    `globalThis[${toScriptLiteral(userCssKey)}] = ${toScriptLiteral(readUserCss(paths.effectsDir))};`,
  ].join('\n');
}

/** `user.css` in the effects folder. */
export function userCssPath(paths: WoodfishPaths): string {
  return path.join(paths.effectsDir, USER_CSS_FILE);
}

/** Puts the shipped `user.css` template back; an edited one is kept as `user.css.bak`. */
export function resetUserCss(paths: WoodfishPaths): void {
  restoreBuiltinEffect(paths.effectsDir, USER_CSS_FILE);
}

/** Opens `user.css` in the default editor, putting the template back first if it is gone. */
export function openUserCss(paths: WoodfishPaths): void {
  const file = userCssPath(paths);
  if (!fs.existsSync(file)) {
    resetUserCss(paths);
  }
  const command =
    process.platform === 'win32'
      ? 'explorer.exe'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';
  spawn(command, [file], { detached: true, stdio: 'ignore' })
    .on('error', () => undefined)
    .unref();
}

/**
 * Writes the effect part of a settings patch (from the settings page or the CLI): values
 * per effect folder (validated against its effect.json) and folders to reset.
 */
export function applyEffectsPatch(paths: WoodfishPaths, patch: unknown): string[] {
  const changed: string[] = [];
  if (patch === null || typeof patch !== 'object') {
    return changed;
  }
  const { effects, reset } = patch as { effects?: unknown; reset?: unknown };
  if (Array.isArray(reset)) {
    for (const id of reset) {
      if (isEffectId(id)) {
        resetEffectValues(paths.effectsDir, id);
        changed.push(id);
      }
    }
  }
  if (effects !== null && typeof effects === 'object') {
    for (const [id, values] of Object.entries(effects as Record<string, unknown>)) {
      if (isEffectId(id)) {
        writeEffectValues(paths.effectsDir, id, values);
        changed.push(id);
      }
    }
  }
  return changed;
}

/**
 * Watches the effects folder (any file in any effect) and calls back once things settle;
 * `reload` is true when someone asked for a reload (`woodfish reload` touches `.reload`).
 * Atomic writes show up as temp files and renames; the ledger is Woodfish's own.
 */
export function watchEffectsDir(dir: string): (onChange: (reload: boolean) => void) => () => void {
  return (onChange) => {
    fs.mkdirSync(dir, { recursive: true });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let reload = false;
    const watcher = fs.watch(dir, { recursive: true }, (_event, file) => {
      const name = file ? path.basename(String(file)) : '';
      if (name === EFFECTS_LEDGER_FILE || name.endsWith('.tmp')) {
        return;
      }
      reload ||= name === EFFECTS_RELOAD_FILE;
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        const asked = reload;
        reload = false;
        onChange(asked);
      }, 250);
    });
    watcher.on('error', () => undefined);
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      watcher.close();
    };
  };
}

/** `mouseTrail` → `mouse-trail`. */
export function kebabCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** Older setting names that are effect folders now (for `woodfish codex settings --set`). */
const SETTING_ALIASES: Readonly<Record<string, { id: string; rename?: Record<string, string> }>> = {
  bodyText: { id: 'rainbow-text' },
  codeGradient: { id: 'code-gradient' },
  codeGlow: { id: 'code-gradient', rename: { enabled: 'glow', intensity: 'glowIntensity' } },
};

/**
 * Splits a `--set` patch (`{ palette: {…}, glass: { blur: 12 }, mouseTrail: {…} }`) into the
 * `codex.json` part and per-effect values. `background.image` is the picture (the file).
 */
export function splitSettingsPatch(
  patch: Record<string, unknown>,
  knownEffects: readonly string[]
): { file: Record<string, unknown>; effects: Record<string, Record<string, unknown>> } {
  const file: Record<string, unknown> = {};
  const effects: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'palette' || key === 'customCss' || key === 'backgroundImage') {
      file[key] = value;
      continue;
    }
    const alias = SETTING_ALIASES[key];
    const id = alias?.id ?? (knownEffects.includes(key) ? key : kebabCase(key));
    if (!knownEffects.includes(id) || value === null || typeof value !== 'object') {
      throw new Error(`没有名为 ${key} 的设置或效果（效果见 woodfish codex effects）`);
    }
    const values: Record<string, unknown> = {};
    for (const [param, raw] of Object.entries(value as Record<string, unknown>)) {
      if (id === 'background' && param === 'image') {
        file.backgroundImage = raw;
        continue;
      }
      values[alias?.rename?.[param] ?? param] = raw;
    }
    if (Object.keys(values).length > 0) {
      effects[id] = { ...effects[id], ...values };
    }
  }
  return { file, effects };
}
