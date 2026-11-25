import * as os from 'os';
import * as path from 'path';
import z from '@deepseek-ai/schemastery';
import {
  DSH_BACKGROUNDS_API_PATH,
  DSH_BACKGROUNDS_WRITE_PATH,
  DSH_BOOT_GLOBAL,
  DSH_SETTINGS_NAMESPACE,
  DshPersistedConfig,
} from '../protocol';
import { DEFAULT_DSH_PERSISTED_CONFIG } from '../settings';
import { HostBackgroundStore, handleBackgroundsRequest } from './backgrounds';

/** Stable Cordis plugin name matching `cordis.patch.yml`. */
export const name = DSH_SETTINGS_NAMESPACE;

export interface VolatileValue<T> {
  get(): T;
}

/** Live persisted Woodfish configuration projected to the browser and desktop renderers. */
export interface WoodfishHostConfig {
  paletteDark: VolatileValue<string>;
  paletteLight: VolatileValue<string>;
  backgroundImage: VolatileValue<string>;
  customCss: VolatileValue<string>;
  userCss: VolatileValue<string>;
  effectsJson: VolatileValue<string>;
}

/** Live schemastery schema registered with `@deepseek-ai/dsh-settings`. */
export const Config: unknown = z.object({
  paletteDark: z.string().default(DEFAULT_DSH_PERSISTED_CONFIG.paletteDark).volatile(),
  paletteLight: z.string().default(DEFAULT_DSH_PERSISTED_CONFIG.paletteLight).volatile(),
  backgroundImage: z.string().default(DEFAULT_DSH_PERSISTED_CONFIG.backgroundImage).volatile(),
  customCss: z.string().default(DEFAULT_DSH_PERSISTED_CONFIG.customCss).volatile(),
  userCss: z.string().default(DEFAULT_DSH_PERSISTED_CONFIG.userCss).volatile(),
  effectsJson: z.string().default(DEFAULT_DSH_PERSISTED_CONFIG.effectsJson).volatile(),
});

interface IndexInjection {
  kind: 'global';
  name: string;
  value: unknown;
}

interface HostFetchRoute {
  path: string;
  methods: readonly ('GET' | 'POST')[];
  requestBody: 'buffered' | 'streaming';
  fetch(request: Request): Promise<Response>;
}

interface HostContext {
  readonly fiber?: unknown;
  get(key: string): unknown;
  inject(services: readonly string[], callback: (child: HostContext) => void): void;
  effect(callback: () => (() => void) | void, label?: string): void;
  on(event: 'webserver/index-inject', listener: (table: IndexInjection[]) => void): void;
  readonly settings?: {
    configure(presentation: { auto?: boolean }, owner?: unknown): () => void;
  };
  readonly connection?: {
    fetch: { register(route: HostFetchRoute): () => Promise<void> };
  };
}

function readSnapshot(config?: WoodfishHostConfig): DshPersistedConfig {
  return {
    paletteDark: config?.paletteDark?.get() ?? DEFAULT_DSH_PERSISTED_CONFIG.paletteDark,
    paletteLight: config?.paletteLight?.get() ?? DEFAULT_DSH_PERSISTED_CONFIG.paletteLight,
    backgroundImage: config?.backgroundImage?.get() ?? DEFAULT_DSH_PERSISTED_CONFIG.backgroundImage,
    customCss: config?.customCss?.get() ?? DEFAULT_DSH_PERSISTED_CONFIG.customCss,
    userCss: config?.userCss?.get() ?? DEFAULT_DSH_PERSISTED_CONFIG.userCss,
    effectsJson: config?.effectsJson?.get() ?? DEFAULT_DSH_PERSISTED_CONFIG.effectsJson,
  };
}

function resolveBackgroundsDir(ctx: HostContext): string {
  const profileContext = ctx.get('profileContext') as { home?: unknown } | undefined;
  const home =
    typeof profileContext?.home === 'string' && profileContext.home.trim() !== ''
      ? profileContext.home
      : process.env.DSH_HOME?.trim() || path.join(os.homedir(), '.dsh');
  return path.join(home, 'woodfish', 'backgrounds');
}

/**
 * Host plugin entry for `woodfish-dsh-plugin`.
 * - Suppresses the auto-generated generic settings form (Woodfish mounts its own rich Settings tab).
 * - Injects the current live config snapshot into initial HTML so reload has no unstyled flash.
 * - Exposes the authenticated `/api/woodfish-backgrounds` route for custom background storage.
 */
export function apply(ctx: HostContext, config?: WoodfishHostConfig): void {
  ctx.inject(['settings'], (child) => {
    child.effect(
      () => child.settings?.configure({ auto: false }, ctx.fiber),
      'woodfish-theme: disable auto settings form'
    );
  });

  ctx.on('webserver/index-inject', (table) => {
    table.push({
      kind: 'global',
      name: DSH_BOOT_GLOBAL,
      value: readSnapshot(config),
    });
  });

  const store = new HostBackgroundStore(resolveBackgroundsDir(ctx));
  ctx.inject(['connection'], (child) => {
    const fetch = (request: Request): Promise<Response> => handleBackgroundsRequest(store, request);
    // rc.5 selects body mode by path. GET cannot carry the bridge's streaming body.
    child.connection?.fetch.register({
      path: DSH_BACKGROUNDS_API_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch,
    });
    child.connection?.fetch.register({
      path: DSH_BACKGROUNDS_WRITE_PATH,
      methods: ['POST'],
      requestBody: 'streaming',
      fetch,
    });
  });
}
