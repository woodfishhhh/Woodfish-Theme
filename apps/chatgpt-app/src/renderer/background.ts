import {
  BACKGROUND_IMAGE_VARIABLE,
  BACKGROUND_SOFT_IMAGE_VARIABLE,
  StyleManager,
  base64ToBlob,
  blobToBase64,
} from '@woodfish/renderer-runtime';
import {
  CODEX_BACKGROUND_BINDING,
  CodexBackgroundEntry,
  CodexBackgroundRequest,
  CodexOverlaySource,
} from '../protocol';
import { CODEX_DEFAULT_BACKGROUND_ID } from '../settings';

/** The bundled 《彩云》 (base64 WebP), inlined only into the Codex++ user script. */
declare const __WOODFISH_CODEX_DEFAULT_BACKGROUND__: string | undefined;

const REPLY_TIMEOUT_MS = 20000;
/** After a reload the watcher adds the binding again on the load event, after we start. */
const BINDING_WAIT_MS = 10000;
const BINDING_POLL_MS = 200;

type Answer = { entries?: CodexBackgroundEntry[]; id?: string; type?: string; data?: string };
type Request = CodexBackgroundRequest extends infer R
  ? R extends { nonce: string }
    ? Omit<R, 'nonce'>
    : never
  : never;

export interface BackgroundStore {
  /** True when pictures can be saved (a watcher is listening behind the binding). */
  readonly canSave: boolean;
  get(id: string): Promise<Blob>;
  list(): Promise<CodexBackgroundEntry[]>;
  /** Saves a prepared picture; resolves with its id. */
  upload(name: string, picture: Blob): Promise<string>;
  remove(id: string): Promise<void>;
  /** The watcher's answer to a request (untrusted input). */
  reply(nonce: string, reply: unknown): void;
  dispose(): void;
}

function readAnswer(reply: unknown): Answer {
  if (reply === null || typeof reply !== 'object') {
    throw new Error('监视进程没有返回结果');
  }
  const value = reply as { ok?: unknown; error?: unknown };
  if (value.ok !== true) {
    throw new Error(typeof value.error === 'string' ? value.error : '监视进程没有完成操作');
  }
  return reply;
}

/**
 * Pictures for the background layer. With a CDP injection the watcher keeps them in
 * Woodfish's data folder and hands them over through their own binding, once per page
 * and picture; the injected script itself only carries the picture's id. A Codex++ user
 * script has no watcher and only knows the bundled default.
 */
export function createBackgroundStore(source: CodexOverlaySource): BackgroundStore {
  const blobs = new Map<string, Blob>();
  const pending = new Map<
    string,
    {
      resolve: (answer: Answer) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof globalThis.setTimeout>;
    }
  >();
  const embedded =
    typeof __WOODFISH_CODEX_DEFAULT_BACKGROUND__ === 'string'
      ? __WOODFISH_CODEX_DEFAULT_BACKGROUND__
      : null;
  let counter = 0;

  function binding(): ((payload: string) => void) | null {
    const candidate = (globalThis as unknown as Record<string, unknown>)[CODEX_BACKGROUND_BINDING];
    return source === 'cdp' && typeof candidate === 'function'
      ? (candidate as (payload: string) => void)
      : null;
  }

  async function waitForBinding(): Promise<((payload: string) => void) | null> {
    for (let waited = 0; source === 'cdp' && waited < BINDING_WAIT_MS; waited += BINDING_POLL_MS) {
      const call = binding();
      if (call) {
        return call;
      }
      await new Promise((resolve) => globalThis.setTimeout(resolve, BINDING_POLL_MS));
    }
    return binding();
  }

  async function send(request: Request): Promise<Answer> {
    const call = await waitForBinding();
    if (!call) {
      throw new Error(
        source === 'cdp' ? '监视进程没有响应' : 'Codex++ 用户脚本模式只能使用默认背景'
      );
    }
    counter += 1;
    const nonce = `${Date.now().toString(36)}-${counter}`;
    return new Promise<Answer>((resolve, reject) => {
      const timer = globalThis.setTimeout(() => {
        pending.delete(nonce);
        reject(new Error('监视进程没有响应'));
      }, REPLY_TIMEOUT_MS);
      pending.set(nonce, { resolve, reject, timer });
      call(JSON.stringify({ ...request, nonce }));
    });
  }

  return {
    canSave: source === 'cdp',
    async get(id: string): Promise<Blob> {
      const cached = blobs.get(id);
      if (cached) {
        return cached;
      }
      let blob: Blob;
      if (source !== 'cdp' && id === CODEX_DEFAULT_BACKGROUND_ID && embedded) {
        blob = base64ToBlob(embedded, 'image/webp');
      } else {
        const answer = await send({ type: 'get', id });
        if (typeof answer.data !== 'string' || typeof answer.type !== 'string') {
          throw new Error('监视进程返回的图片无效');
        }
        blob = base64ToBlob(answer.data, answer.type);
      }
      blobs.set(id, blob);
      return blob;
    },
    async list(): Promise<CodexBackgroundEntry[]> {
      if (source !== 'cdp') {
        return [];
      }
      const answer = await send({ type: 'list' });
      return Array.isArray(answer.entries) ? answer.entries : [];
    },
    async upload(name: string, picture: Blob): Promise<string> {
      const answer = await send({ type: 'upload', name, data: await blobToBase64(picture) });
      if (typeof answer.id !== 'string') {
        throw new Error('监视进程没有返回图片编号');
      }
      blobs.set(answer.id, picture);
      return answer.id;
    },
    async remove(id: string): Promise<void> {
      await send({ type: 'remove', id });
      blobs.delete(id);
    },
    reply(nonce: string, reply: unknown): void {
      const entry = pending.get(nonce);
      if (!entry) {
        return;
      }
      pending.delete(nonce);
      globalThis.clearTimeout(entry.timer);
      try {
        entry.resolve(readAnswer(reply));
      } catch (error) {
        entry.reject(error as Error);
      }
    },
    dispose(): void {
      for (const entry of pending.values()) {
        globalThis.clearTimeout(entry.timer);
      }
      pending.clear();
      blobs.clear();
    },
  };
}

/**
 * Puts one picture on the layer through the CSS variables: the picture itself and the
 * blurred copy frosted panels show (`soften`). Only the latest request wins, and the
 * previous object URLs are released once the new ones are in place. A copy that cannot be
 * made falls back to the sharp picture.
 */
export function createBackgroundLayer(styles: StyleManager): {
  show: (
    key: string | null,
    load: () => Promise<Blob>,
    soften: (picture: Blob) => Promise<Blob>
  ) => Promise<void>;
  dispose: () => void;
} {
  let current: { key: string; urls: string[] } | null = null;
  let wanted: string | null = null;

  function release(entry: { urls: string[] } | null): void {
    for (const url of entry?.urls ?? []) {
      URL.revokeObjectURL(url);
    }
  }

  function clear(): void {
    styles.remove('background-image');
    release(current);
    current = null;
  }

  return {
    async show(
      key: string | null,
      load: () => Promise<Blob>,
      soften: (picture: Blob) => Promise<Blob>
    ): Promise<void> {
      wanted = key;
      if (key === null) {
        clear();
        return;
      }
      if (current?.key === key) {
        return;
      }
      const picture = await load();
      const soft = await soften(picture).catch(() => null);
      if (wanted !== key) {
        return;
      }
      const previous = current;
      const url = URL.createObjectURL(picture);
      const softUrl = soft ? URL.createObjectURL(soft) : url;
      current = { key, urls: soft ? [url, softUrl] : [url] };
      styles.upsert(
        'background-image',
        `:root { ${BACKGROUND_IMAGE_VARIABLE}: url("${url}"); ${BACKGROUND_SOFT_IMAGE_VARIABLE}: url("${softUrl}"); }`
      );
      release(previous);
    },
    dispose(): void {
      wanted = null;
      clear();
    },
  };
}
