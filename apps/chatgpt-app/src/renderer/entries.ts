import { readController } from '@woodfish/renderer-runtime';
import {
  CODEX_BUILD_ID,
  CODEX_CONFIG_KEY,
  CODEX_CONTROLLER_KEY,
  CODEX_EFFECTS_KEY,
  CODEX_EFFECTS_RELOAD_KEY,
  CODEX_MAIN_WINDOW_URL,
  CODEX_USER_CSS_KEY,
  CodexOverlaySource,
} from '../protocol';
import { applyCodexSettingsPatch, normalizeCodexSettings } from '../settings';
import {
  CodexOverlayController,
  applyStoredEffects,
  readStoredPatch,
  startCodexOverlay,
} from './overlay';

/** True only in the top-level Codex main window (not overlays, quick chat or iframes). */
export function isCodexMainWindow(): boolean {
  try {
    if (window.top !== window) {
      return false;
    }
  } catch {
    return false;
  }
  const url = new URL(location.href);
  return (
    `${url.protocol}//${url.host}${url.pathname}` === CODEX_MAIN_WINDOW_URL && url.search === ''
  );
}

function whenBodyReady(callback: () => void): void {
  if (document.body) {
    callback();
    return;
  }
  document.addEventListener('DOMContentLoaded', () => callback(), { once: true });
}

function currentController(): Partial<CodexOverlayController> | undefined {
  return readController<CodexOverlayController>(CODEX_CONTROLLER_KEY);
}

/**
 * Starts or updates the overlay for `source`.
 * - A user-script controller always wins: a CDP injection only updates nothing and yields.
 * - The same source and build re-running (settings or effects changed) updates in place.
 * - A different build (Woodfish upgraded) is disposed and restarted with the new code.
 * - A user script replacing a CDP controller disposes it first.
 */
export function bootCodexOverlay(
  settings: unknown,
  source: CodexOverlaySource,
  effects?: unknown,
  reload?: unknown,
  userCss?: unknown
): void {
  if (!isCodexMainWindow()) {
    return;
  }
  const existing = currentController();
  if (existing && existing.source === 'userscript' && source === 'cdp') {
    return;
  }
  if (
    existing &&
    existing.source === source &&
    existing.build === CODEX_BUILD_ID &&
    typeof existing.update === 'function'
  ) {
    existing.update(settings, effects, reload, userCss);
    return;
  }
  if (existing && typeof existing.dispose === 'function') {
    existing.dispose();
  }
  whenBodyReady(() => {
    if (currentController()?.source === 'userscript' && source === 'cdp') {
      return;
    }
    startCodexOverlay(settings, source, effects, reload, userCss);
  });
}

/** Entry used by the CDP injection: settings and effects were stored on `globalThis` just before. */
export function bootFromCdp(): void {
  const host = globalThis as unknown as Record<string, unknown>;
  bootCodexOverlay(
    host[CODEX_CONFIG_KEY],
    'cdp',
    host[CODEX_EFFECTS_KEY],
    host[CODEX_EFFECTS_RELOAD_KEY],
    host[CODEX_USER_CSS_KEY]
  );
}

interface CodexPlusApi {
  onCleanup?: (cleanup: () => void) => void;
}

/**
 * Entry used by the Codex++ user script, which bakes its settings and effects in at install
 * time; changes made in the in-app panel since then come from localStorage.
 */
export function bootFromUserScript(settings: unknown, effects?: unknown, userCss?: unknown): void {
  const stored = readStoredPatch();
  bootCodexOverlay(
    applyCodexSettingsPatch(normalizeCodexSettings(settings), stored),
    'userscript',
    applyStoredEffects(effects, stored),
    undefined,
    userCss
  );
  const api = (globalThis as unknown as { codexPlus?: CodexPlusApi }).codexPlus;
  if (api && typeof api.onCleanup === 'function') {
    api.onCleanup(() => {
      const controller = currentController();
      if (controller?.source === 'userscript' && typeof controller.dispose === 'function') {
        controller.dispose();
      }
    });
  }
}
