import { readController } from '@woodfish/renderer-runtime';
import { DSH_BUILD_ID, DSH_CONTROLLER_KEY, DSH_STORAGE_KEY } from '../protocol';
import { DSH_SELECTORS } from '../selectors';
import {
  DSH_FEATURE_KEYS,
  DshFeatureKey,
  DshMode,
  DshSettings,
  DshSettingsPatch,
  applyDshSettingsPatch,
  findDshPalette,
  nextDshPalette,
  normalizeDshSettings,
} from '../settings';
import { DshOverlayController, startDshOverlay } from './overlay';

// Granted by the user script manager (Tampermonkey, Violentmonkey) when the header asks
// for them; absent when the bundle runs any other way.
declare const GM_registerMenuCommand:
  ((caption: string, onClick: () => void) => unknown) | undefined;
declare const GM_unregisterMenuCommand: ((id: unknown) => void) | undefined;
declare const GM_getValue: ((key: string, fallback?: unknown) => unknown) | undefined;
declare const GM_setValue: ((key: string, value: unknown) => void) | undefined;

/** True only in a top-level dsh Web UI page (not iframes, not other local servers). */
export function isDshPage(): boolean {
  try {
    if (window.top !== window) {
      return false;
    }
  } catch {
    return false;
  }
  return document.querySelector(DSH_SELECTORS.page.selectors.join(', ')) !== null;
}

function currentController(): Partial<DshOverlayController> | undefined {
  return readController<DshOverlayController>(DSH_CONTROLLER_KEY);
}

function whenBodyReady(callback: () => void): void {
  if (document.body) {
    callback();
    return;
  }
  document.addEventListener('DOMContentLoaded', () => callback(), { once: true });
}

/**
 * Starts or updates the overlay. The same build re-running updates in place; a different
 * build (the user script was upgraded) is disposed and restarted with the new code.
 */
export function bootDshOverlay(settings: unknown): void {
  if (!isDshPage()) {
    return;
  }
  const existing = currentController();
  if (existing?.build === DSH_BUILD_ID && typeof existing.update === 'function') {
    existing.update(settings);
    return;
  }
  if (existing && typeof existing.dispose === 'function') {
    existing.dispose();
  }
  whenBodyReady(() => {
    startDshOverlay(settings);
  });
}

/**
 * Menu changes are kept by the user script manager (shared by every port dsh runs on);
 * without one, in the page's localStorage.
 */
function readStoredPatch(): unknown {
  try {
    if (typeof GM_getValue === 'function') {
      return GM_getValue(DSH_STORAGE_KEY, null);
    }
    const raw = globalThis.localStorage?.getItem(DSH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeStoredPatch(patch: DshSettingsPatch | null): void {
  try {
    if (typeof GM_setValue === 'function') {
      GM_setValue(DSH_STORAGE_KEY, patch);
    } else if (patch === null) {
      globalThis.localStorage?.removeItem(DSH_STORAGE_KEY);
    } else {
      globalThis.localStorage?.setItem(DSH_STORAGE_KEY, JSON.stringify(patch));
    }
  } catch {
    // Storage unavailable: the change still applies until the page reloads.
  }
}

/** Merges `patch` into the stored one, section by section. */
function rememberPatch(patch: DshSettingsPatch): void {
  const stored = readStoredPatch();
  const merged: Record<string, unknown> =
    stored !== null && typeof stored === 'object' ? { ...stored } : {};
  for (const [key, value] of Object.entries(patch)) {
    const previous = merged[key];
    merged[key] =
      previous !== null && typeof previous === 'object' ? { ...previous, ...value } : value;
  }
  writeStoredPatch(merged);
}

const MODE_LABELS: Readonly<Record<DshMode, string>> = { dark: '深色主题', light: '浅色主题' };
const FEATURE_LABELS: Readonly<Record<DshFeatureKey, string>> = {
  codeGradient: '代码渐变',
  codeGlow: '代码发光',
  glass: '毛玻璃浮层',
  accent: '强调色点缀',
  caret: '彩色光标',
  bodyText: '回复正文渐变',
};

function paletteLabel(slug: string | null): string {
  return (slug && findDshPalette(slug)?.label) || 'dsh 自带配色';
}

/** Menu entries for the current settings: label and the patch a click applies. */
function menuEntries(settings: DshSettings): Array<[string, DshSettingsPatch | null]> {
  const entries: Array<[string, DshSettingsPatch | null]> = (['dark', 'light'] as const).map(
    (mode) => [
      `${MODE_LABELS[mode]}：${paletteLabel(settings.palette[mode])}（点击切换）`,
      { palette: { [mode]: nextDshPalette(mode, settings.palette[mode]) } },
    ]
  );
  for (const key of DSH_FEATURE_KEYS) {
    const enabled = settings[key].enabled;
    entries.push([
      `${FEATURE_LABELS[key]}：${enabled ? '开' : '关'}`,
      { [key]: { enabled: !enabled } },
    ]);
  }
  entries.push(['恢复默认设置', null]);
  return entries;
}

/**
 * Theme and feature switches in the user script manager's menu. Labels show the current
 * value; managers without `GM_unregisterMenuCommand` refresh them on the next page load.
 */
function startMenu(baked: DshSettings): void {
  if (typeof GM_registerMenuCommand !== 'function') {
    return;
  }
  const register = GM_registerMenuCommand;
  let ids: unknown[] = [];
  const render = (): void => {
    if (ids.length > 0) {
      if (typeof GM_unregisterMenuCommand !== 'function') {
        return;
      }
      for (const id of ids) {
        GM_unregisterMenuCommand(id);
      }
    }
    const settings = applyDshSettingsPatch(baked, readStoredPatch());
    ids = menuEntries(settings).map(([label, patch]) =>
      register(label, () => {
        if (patch === null) {
          writeStoredPatch(null);
        } else {
          rememberPatch(patch);
        }
        bootDshOverlay(applyDshSettingsPatch(baked, readStoredPatch()));
        render();
      })
    );
  };
  render();
}

/**
 * Entry of the user script. `woodfish dsh userscript` bakes the settings in; changes made
 * in the manager's menu since then are layered on top.
 */
export function bootFromUserScript(settings: unknown): void {
  if (!isDshPage()) {
    return;
  }
  const baked = normalizeDshSettings(settings);
  bootDshOverlay(applyDshSettingsPatch(baked, readStoredPatch()));
  startMenu(baked);
}
