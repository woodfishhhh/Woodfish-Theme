/** Version of the in-page overlay protocol; bump when the injected contract changes. */
export const DSH_ADAPTER_VERSION = '0.1.0';

declare const __WOODFISH_DSH_BUILD__: string | undefined;

/**
 * Identifies the exact bundle. A page already running a different build disposes it and
 * restarts, so upgrading the user script never leaves old code applying new settings.
 */
export const DSH_BUILD_ID: string =
  typeof __WOODFISH_DSH_BUILD__ === 'string' ? __WOODFISH_DSH_BUILD__ : 'dev';

/** Global the in-page overlay publishes its controller under. */
export const DSH_CONTROLLER_KEY = '__woodfishDshController';

/** Global the generated user script stores its baked-in settings under. */
export const DSH_USERSCRIPT_CONFIG_KEY = '__woodfishDshUserScriptConfig';

/** Key (user script storage, or localStorage without it) for changes made in the menu. */
export const DSH_STORAGE_KEY = 'woodfish.dsh.settings';

/** Prefix for every `<style>` id the overlay mounts. */
export const DSH_STYLE_ID_PREFIX = 'woodfish-dsh-';

/**
 * dsh releases the selectors and variables were verified against (see docs/hosts/dsh.md).
 * The overlay still runs on others and degrades per feature.
 */
export const TESTED_DSH_VERSIONS: readonly string[] = Object.freeze(['0.2.2-rc.1']);

/** Root dataset keys (on `<html>`) the overlay writes. */
export const DSH_DATASET = {
  active: 'woodfishDsh',
  degraded: 'woodfishDshDegraded',
} as const;
