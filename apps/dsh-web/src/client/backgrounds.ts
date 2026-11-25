import { resizeBackgroundImage } from '@woodfish/renderer-runtime';
import {
  DSH_BACKGROUNDS_WRITE_PATH,
  DSH_BACKGROUNDS_API_PATH,
  DshBackgroundEntry,
} from '../protocol';
import { DSH_DEFAULT_BACKGROUND_ID } from '../settings';
import { DshBrowserGlobals } from './dshClientTypes';

const NAME_LIMIT = 80;

/**
 * Relative API path resolved against `document.baseURI` (works on loopback HTTP, reverse
 * proxies under subpaths, and Electron custom transports).
 */
const API_RELATIVE = DSH_BACKGROUNDS_API_PATH.replace(/^\/+/, '');
const WRITE_RELATIVE = DSH_BACKGROUNDS_WRITE_PATH.slice(1);

function apiFetch(pathWithQuery: string, init: RequestInit = {}): Promise<Response> {
  const transport = (globalThis as unknown as DshBrowserGlobals).__DSH_TRANSPORT__;
  if (typeof transport?.fetch === 'function') {
    return transport.fetch(pathWithQuery, init);
  }
  const url =
    typeof document !== 'undefined' && document.baseURI
      ? new URL(pathWithQuery, document.baseURI).href
      : `/${pathWithQuery}`;
  return globalThis.fetch(url, { credentials: 'include', ...init });
}

interface ListResponse {
  ok?: boolean;
  entries?: DshBackgroundEntry[];
  error?: string;
}

interface UploadResponse {
  ok?: boolean;
  entry?: DshBackgroundEntry;
  error?: string;
}

interface DeleteResponse {
  ok?: boolean;
  error?: string;
}

export interface DshBackgroundClient {
  /** Loads a picture Blob (`'caiyun'` bundled asset or uploaded custom image id). */
  load(id: string): Promise<Blob>;
  /** Lists all custom uploaded pictures persisted in the active `DSH_HOME`. */
  list(): Promise<DshBackgroundEntry[]>;
  /** Resizes/compresses in browser, uploads to dsh Host, and caches the stored Blob. */
  upload(file: File): Promise<DshBackgroundEntry>;
  /** Deletes one persisted custom picture by id. */
  remove(id: string): Promise<void>;
}

export function createDshBackgroundClient(defaultAssetUrl: string): DshBackgroundClient {
  const cache = new Map<string, Promise<Blob>>();

  function fetchBlob(url: string, useApiTransport: boolean): Promise<Blob> {
    const request = useApiTransport
      ? apiFetch(url, { method: 'GET' })
      : globalThis.fetch(url, { credentials: 'same-origin' });
    return request.then(async (response) => {
      if (!response.ok) {
        throw new Error(`加载背景图片失败（HTTP ${String(response.status)}）`);
      }
      return response.blob();
    });
  }

  return {
    load(id: string): Promise<Blob> {
      let pending = cache.get(id);
      if (!pending) {
        const task =
          id === DSH_DEFAULT_BACKGROUND_ID
            ? fetchBlob(defaultAssetUrl, false)
            : fetchBlob(`${API_RELATIVE}?id=${encodeURIComponent(id)}`, true);
        pending = task.catch((error: unknown) => {
          cache.delete(id);
          throw error;
        });
        cache.set(id, pending);
      }
      return pending;
    },

    async list(): Promise<DshBackgroundEntry[]> {
      const response = await apiFetch(API_RELATIVE, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`读取背景列表失败（HTTP ${String(response.status)}）`);
      }
      const data = (await response.json()) as ListResponse;
      if (!data.ok || !Array.isArray(data.entries)) {
        throw new Error(data.error || '读取背景列表失败');
      }
      return data.entries;
    },

    async upload(file: File): Promise<DshBackgroundEntry> {
      const compressed = await resizeBackgroundImage(file);
      const name = (file.name || '背景图片').slice(0, NAME_LIMIT);
      const bytes = await compressed.arrayBuffer();
      const response = await apiFetch(
        `${WRITE_RELATIVE}?action=upload&name=${encodeURIComponent(name)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body: bytes,
        }
      );
      const data = (await response.json()) as UploadResponse;
      if (!response.ok || !data.ok || !data.entry) {
        throw new Error(data.error || `上传背景图片失败（HTTP ${String(response.status)}）`);
      }
      cache.set(data.entry.id, Promise.resolve(compressed));
      return data.entry;
    },

    async remove(id: string): Promise<void> {
      const response = await apiFetch(
        `${WRITE_RELATIVE}?action=delete&id=${encodeURIComponent(id)}`,
        { method: 'POST' }
      );
      const data = (await response.json()) as DeleteResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `删除背景图片失败（HTTP ${String(response.status)}）`);
      }
      cache.delete(id);
    },
  };
}
