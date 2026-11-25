import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import * as os from 'os';
import * as path from 'path';
import { BACKGROUND_IMAGE_LIMITS } from '@woodfish/theme-core';
import z from '@deepseek-ai/schemastery';
import {
  DSH_BACKGROUNDS_API_PATH,
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

interface HostWebRoute {
  readonly kind: 'exact';
  readonly path: string;
  readonly handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;
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
    requestRejection?(request: unknown): number | undefined;
  };
  readonly webServer?: {
    register(route: HostWebRoute): () => void;
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

const nodeReadable = Readable as unknown as { toWeb(stream: IncomingMessage): ReadableStream };

function requestFromNode(request: IncomingMessage): Request {
  const headers: Array<[string, string]> = [];
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') {
      headers.push([name, value]);
    } else if (Array.isArray(value)) {
      headers.push([name, value.join(', ')]);
    }
  }
  const url = new URL(request.url ?? '/', 'http://dsh.internal');
  const method = request.method ?? 'GET';
  const init: RequestInit & { duplex?: 'half' } = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = nodeReadable.toWeb(request);
    init.duplex = 'half';
  }
  return new Request(url, init);
}

async function writeNodeResponse(response: ServerResponse, result: Response): Promise<void> {
  response.writeHead(result.status, Object.fromEntries(result.headers.entries()));
  response.end(Buffer.from(await result.arrayBuffer()));
}

function declaredBodyTooLarge(request: IncomingMessage): boolean {
  const value = request.headers['content-length'];
  const length = typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(length) && length > BACKGROUND_IMAGE_LIMITS.maxInputBytes;
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
  ctx.inject(['connection', 'webServer'], (child) => {
    child.effect(() => {
      const dispose = child.webServer?.register({
        kind: 'exact',
        path: DSH_BACKGROUNDS_API_PATH,
        handler: async (request, response) => {
          const rejection = child.connection?.requestRejection?.(request);
          if (rejection !== undefined) {
            response.writeHead(rejection);
            response.end();
            return;
          }
          if (declaredBodyTooLarge(request)) {
            response.writeHead(413, { connection: 'close' });
            response.end();
            return;
          }
          try {
            await writeNodeResponse(
              response,
              await handleBackgroundsRequest(store, requestFromNode(request))
            );
          } catch {
            if (!response.headersSent) {
              response.writeHead(500);
            }
            response.end();
          }
        },
      });
      return (): void => {
        dispose?.();
      };
    }, 'woodfish-theme: backgrounds route');
  });
}
