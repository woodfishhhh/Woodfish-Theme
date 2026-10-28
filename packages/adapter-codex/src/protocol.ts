/** Version of the in-page overlay protocol; bump when the injected contract changes. */
export const CODEX_ADAPTER_VERSION = '0.1.0';

declare const __WOODFISH_CODEX_BUILD__: string | undefined;

/**
 * Identifies the exact bundle. A page already running a different build disposes it and
 * restarts, so upgrading Woodfish never leaves old code applying new settings.
 */
export const CODEX_BUILD_ID: string =
  typeof __WOODFISH_CODEX_BUILD__ === 'string' ? __WOODFISH_CODEX_BUILD__ : 'dev';

/** Global the in-page overlay publishes its controller under. */
export const CODEX_CONTROLLER_KEY = '__woodfishCodexController';

/** Global a CDP injection stores the settings under before the bundle runs. */
export const CODEX_CONFIG_KEY = '__woodfishCodexConfig';

/**
 * CDP binding (`Runtime.addBinding`) the watcher installs in each main window. The in-app
 * settings panel calls it with a JSON settings patch; the watcher validates and saves it.
 */
export const CODEX_SETTINGS_BINDING = '__woodfishCodexSaveSettings';

/** localStorage key where the Codex++ user script keeps changes made in the panel. */
export const CODEX_USERSCRIPT_STORAGE_KEY = 'woodfish.codex.settings';

/** Prefix for every `<style>` id the overlay mounts. */
export const CODEX_STYLE_ID_PREFIX = 'woodfish-codex-';

/** Style ids required by Codex++ for user-script owned nodes. */
export const CODEX_PLUS_STYLE_ID_PREFIX = 'codex-plus-ext-woodfish-';

/** Attribute Codex++ uses to recognise nodes inserted by user scripts. */
export const CODEX_PLUS_NODE_ATTRIBUTE = 'data-codex-plus-ext';

/** URL of the Codex main window renderer. Other windows (overlays, quick chat) are skipped. */
export const CODEX_MAIN_WINDOW_URL = 'app://-/index.html';

/** Who injected the overlay. A user script takes priority over a CDP injection. */
export type CodexOverlaySource = 'cdp' | 'userscript';

/**
 * Codex Store package versions the selectors were verified against. `doctor` warns on
 * other versions; the overlay still runs and degrades per feature.
 */
export const TESTED_CODEX_VERSIONS: readonly string[] = Object.freeze(['26.1013.3656.0']);

/** Root dataset keys (on `<html>`) the overlay writes; tooling reads them over CDP. */
export const CODEX_DATASET = {
  active: 'woodfishCodex',
  source: 'woodfishCodexSource',
  degraded: 'woodfishCodexDegraded',
} as const;
