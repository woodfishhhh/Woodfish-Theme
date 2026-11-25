import { EffectSource } from '@woodfish/renderer-runtime';
import { DSH_PLUGIN_NAME } from '../protocol';
import { createDshBackgroundClient } from './backgrounds';
import { DshClientContext } from './dshClientTypes';
import { WoodfishClientRuntime } from './runtime';
import { WOODFISH_SETTINGS_UI_CSS, WOODFISH_SETTINGS_UI_STYLE_ID } from './settingsCss';
import { WoodfishNavIcon, createWoodfishSettingsSection } from './settingsPanel';

declare const __WOODFISH_DSH_EFFECTS_FACTORY__: (() => EffectSource[]) | undefined;
declare const __WOODFISH_DSH_ASSET_REF__: string | undefined;
declare const __WOODFISH_DSH_RESOLVE_ASSET__: ((reference: string) => string) | undefined;

/** Services required from the dsh client Cordis container. */
export const inject = ['slots', 'locale', 'remote', 'configForms', 'theme'];

function resolveDefaultBackgroundUrl(): string {
  const ref =
    typeof __WOODFISH_DSH_ASSET_REF__ === 'string'
      ? __WOODFISH_DSH_ASSET_REF__
      : `plugins/${DSH_PLUGIN_NAME}/assets/caiyun.webp`;
  if (typeof __WOODFISH_DSH_RESOLVE_ASSET__ === 'function') {
    return __WOODFISH_DSH_RESOLVE_ASSET__(ref);
  }
  return ref;
}

function loadBuiltinEffects(): EffectSource[] {
  return typeof __WOODFISH_DSH_EFFECTS_FACTORY__ === 'function'
    ? __WOODFISH_DSH_EFFECTS_FACTORY__()
    : [];
}

function mountSettingsUiStyle(): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }
  const existing = document.getElementById(WOODFISH_SETTINGS_UI_STYLE_ID);
  const tag = existing instanceof HTMLStyleElement ? existing : document.createElement('style');
  tag.id = WOODFISH_SETTINGS_UI_STYLE_ID;
  tag.setAttribute('data-woodfish-theme', '');
  tag.textContent = WOODFISH_SETTINGS_UI_CSS;
  if (!tag.isConnected) {
    (document.head ?? document.documentElement).append(tag);
  }
  return () => {
    tag.remove();
  };
}

/**
 * Client plugin entry for `woodfish-dsh-plugin` (runs in both `dsh web` and `dsh desktop`).
 * Starts the intrusive Woodfish overlay, binds live settings to `ctx.configForms`, syncs
 * xterm & theme-color via `ctx.theme`, and mounts the native Woodfish Settings tab.
 */
export function apply(ctx: DshClientContext): void {
  const backgrounds = createDshBackgroundClient(resolveDefaultBackgroundUrl());
  const runtime = new WoodfishClientRuntime(ctx, loadBuiltinEffects(), backgrounds);

  ctx.effect(() => {
    const removeUiStyle = mountSettingsUiStyle();
    return (): void => {
      removeUiStyle();
      runtime.dispose();
    };
  }, 'woodfish-theme: overlay and settings styles');

  const WoodfishSettingsSection = createWoodfishSettingsSection(runtime, backgrounds);

  ctx.slots.inject('settings.section.icon', () =>
    ctx.slots.register(
      {
        name: 'settings.section.icon',
        id: 'woodfish',
      },
      WoodfishNavIcon
    )
  );

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'woodfish',
        order: 12,
        label: () => 'Woodfish',
      },
      WoodfishSettingsSection
    )
  );

  ctx.slots.inject('plugins.bundle.config', () =>
    ctx.slots.register(
      {
        name: 'plugins.bundle.config',
        key: DSH_PLUGIN_NAME,
      },
      WoodfishSettingsSection
    )
  );
}
