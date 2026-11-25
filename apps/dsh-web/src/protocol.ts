/** Native dsh plugin package name published and installed via `dsh plugin add`. */
export const DSH_PLUGIN_NAME = 'woodfish-dsh-plugin';

/** Cordis entry id and `@deepseek-ai/dsh-settings` namespace declared in `cordis.patch.yml`. */
export const DSH_SETTINGS_NAMESPACE = 'woodfish-theme';

/** Authenticated Host fetch route for listing, reading, uploading and deleting background images. */
export const DSH_BACKGROUNDS_API_PATH = '/api/woodfish-backgrounds';

/** Pre-paint boot payload injected by the Host via `webserver/index-inject`. */
export const DSH_BOOT_GLOBAL = '__WOODFISH_DSH_BOOT__';

/** Version of the in-page overlay protocol; bump when the injected contract changes. */
export const DSH_ADAPTER_VERSION = '1.0.0';

declare const __WOODFISH_DSH_BUILD__: string | undefined;

/** Identifies the exact client bundle build. */
export const DSH_BUILD_ID: string =
  typeof __WOODFISH_DSH_BUILD__ === 'string' ? __WOODFISH_DSH_BUILD__ : 'dev';

/** Global the in-page overlay publishes its controller under. */
export const DSH_CONTROLLER_KEY = '__woodfishDshController';

/** Prefix for every `<style>` id the overlay mounts. */
export const DSH_STYLE_ID_PREFIX = 'woodfish-dsh-';

/** dsh releases the plugin contract, selectors and tokens were verified against. */
export const TESTED_DSH_VERSIONS: readonly string[] = Object.freeze(['0.2.2-rc.5']);

/** Root dataset keys (on `<html>`) the overlay writes. */
export const DSH_DATASET = {
  active: 'woodfishDsh',
  degraded: 'woodfishDshDegraded',
} as const;

/** One custom background picture stored by the dsh Host plugin. */
export interface DshBackgroundEntry {
  id: string;
  name: string;
  type: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
  bytes: number;
  addedAt: number;
}

/**
 * Persisted Host configuration shape stored through `@deepseek-ai/dsh-settings`.
 * Every field is a flat top-level volatile string so Cordis settings mutation and
 * schema rehydration stay reliable across web and desktop profiles.
 */
export interface DshPersistedConfig {
  /** Dark Woodfish palette slug, or empty string `''` to keep dsh's built-in dark colors. */
  paletteDark: string;
  /** Light Woodfish palette slug, or empty string `''` to keep dsh's built-in light colors. */
  paletteLight: string;
  /** Selected background id: `'caiyun'`, `'gradient'`, or an uploaded image id. */
  backgroundImage: string;
  /** Sanitized extra CSS rules appended after core styles. */
  customCss: string;
  /** Highest-priority custom CSS (`user.css`), mounted in `<body>` to override effect CSS variables. */
  userCss: string;
  /** JSON object mapping effect id -> `{ enabled, ...paramOverrides }`. */
  effectsJson: string;
}
