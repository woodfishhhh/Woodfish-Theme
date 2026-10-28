import * as fs from 'fs';
import * as path from 'path';
import { CODEX_CONFIG_KEY, CodexSettings, normalizeCodexSettings } from '@woodfish/adapter-codex';

declare const __WOODFISH_CODEX_OVERLAY__: string | undefined;
declare const __WOODFISH_CODEX_USERSCRIPT__: string | undefined;

/** Global the Codex++ user script reads its baked-in settings from. */
export const USERSCRIPT_CONFIG_KEY = '__woodfishCodexUserScriptConfig';

function readAsset(name: string): string {
  const candidates = [
    path.resolve(__dirname, '..', 'assets', name),
    path.resolve(__dirname, '..', '..', 'assets', name),
    path.resolve(__dirname, '..', '..', '..', 'assets', name),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, 'utf8');
    }
  }
  throw new Error(`找不到渲染端脚本 ${name}，请先运行 npm run codex:build`);
}

/** The in-page overlay for CDP injection (inlined in release builds). */
export function loadOverlayBundle(): string {
  return typeof __WOODFISH_CODEX_OVERLAY__ === 'string'
    ? __WOODFISH_CODEX_OVERLAY__
    : readAsset('codex-overlay.js');
}

/** The in-page overlay built for Codex++ (inlined in release builds). */
export function loadUserScriptBundle(): string {
  return typeof __WOODFISH_CODEX_USERSCRIPT__ === 'string'
    ? __WOODFISH_CODEX_USERSCRIPT__
    : readAsset('codex-userscript.js');
}

/**
 * JSON that is safe to embed in a JavaScript source: line/paragraph separators and `<`
 * are escaped, so the literal cannot end early or be mistaken for markup.
 */
export function toScriptLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/</g, '\\u003c');
}

/** Script evaluated in the Codex page: settings first, then the overlay bundle. */
export function buildInjectionScript(settings: CodexSettings, bundle: string): string {
  const safe = normalizeCodexSettings(settings);
  return [
    `globalThis[${toScriptLiteral(CODEX_CONFIG_KEY)}] = ${toScriptLiteral(safe)};`,
    bundle,
    '//# sourceURL=woodfish-codex-overlay.js',
  ].join('\n');
}

/** Expression returning the overlay state of a page, for verification and `doctor`. */
export const OVERLAY_STATE_EXPRESSION = `(() => {
  const controller = globalThis.__woodfishCodexController;
  const root = document.documentElement;
  const style = getComputedStyle(root);
  return {
    url: location.href,
    controller: controller ? { version: controller.version, build: controller.build, source: controller.source } : null,
    active: root.dataset.woodfishCodex || null,
    degraded: controller && typeof controller.degraded === 'function' ? controller.degraded() : [],
    probe: controller && typeof controller.probe === 'function' ? controller.probe() : null,
    theme: root.getAttribute('data-theme'),
    accent: style.getPropertyValue('--app-color-text-accent').trim(),
    surface: style.getPropertyValue('--app-color-background-surface').trim(),
    styles: document.querySelectorAll('style[id^="woodfish-codex-"], style[id^="codex-plus-ext-woodfish-"]').length,
    painted: document.querySelectorAll('[data-woodfish-overlay-token]').length,
  };
})()`;

/** Expression that disposes the CDP overlay (never a user-script one). */
export const DISPOSE_EXPRESSION = `(() => {
  const controller = globalThis.__woodfishCodexController;
  if (controller && controller.source === 'cdp' && typeof controller.dispose === 'function') {
    controller.dispose();
    return true;
  }
  return false;
})()`;
