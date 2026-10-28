import { readController } from '@woodfish/renderer-runtime';
import {
  CODEX_BUILD_ID,
  CODEX_CONFIG_KEY,
  CODEX_CONTROLLER_KEY,
  CODEX_MAIN_WINDOW_URL,
  CodexOverlaySource,
} from '../protocol';
import { CodexOverlayController, startCodexOverlay } from './overlay';

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
 * - The same source and build re-running (settings change) updates in place.
 * - A different build (Woodfish upgraded) is disposed and restarted with the new code.
 * - A user script replacing a CDP controller disposes it first.
 */
export function bootCodexOverlay(settings: unknown, source: CodexOverlaySource): void {
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
    existing.update(settings);
    return;
  }
  if (existing && typeof existing.dispose === 'function') {
    existing.dispose();
  }
  whenBodyReady(() => {
    if (currentController()?.source === 'userscript' && source === 'cdp') {
      return;
    }
    startCodexOverlay(settings, source);
  });
}

/** Entry used by the CDP injection: settings were stored on `globalThis` just before. */
export function bootFromCdp(): void {
  const host = globalThis as unknown as Record<string, unknown>;
  bootCodexOverlay(host[CODEX_CONFIG_KEY], 'cdp');
}

interface CodexPlusApi {
  onCleanup?: (cleanup: () => void) => void;
}

/** Entry used by the Codex++ user script, which bakes its settings in at install time. */
export function bootFromUserScript(settings: unknown): void {
  bootCodexOverlay(settings, 'userscript');
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
