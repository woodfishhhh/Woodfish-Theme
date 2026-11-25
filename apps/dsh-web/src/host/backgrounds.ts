import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  BACKGROUND_IMAGE_LIMITS,
  backgroundImageExtension,
  readBackgroundImageInfo,
} from '@woodfish/theme-core';
import { DshBackgroundEntry } from '../protocol';

const INDEX_FILE = 'index.json';
const VALID_ID = /^[a-f0-9]{16}$/;
const NAME_LIMIT = 80;

interface BackgroundIndex {
  entries: DshBackgroundEntry[];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function sanitizeName(raw: string | null): string {
  const cleaned = (raw ?? '')
    .replace(/[\r\n\t\0]/g, ' ')
    .trim()
    .slice(0, NAME_LIMIT);
  return cleaned || '背景图片';
}

function fileNameFor(entry: Pick<DshBackgroundEntry, 'id' | 'type'>): string {
  return `${entry.id}.${backgroundImageExtension(entry.type)}`;
}

/**
 * Persistent Host-side storage for custom dsh background pictures.
 * Images are validated by magic bytes (never file extension or MIME header), deduplicated by
 * content hash, and stored under `<DSH_HOME>/woodfish/backgrounds/` with atomic index writes.
 */
export class HostBackgroundStore {
  private readonly directory: string;

  constructor(directory: string) {
    this.directory = directory;
  }

  private indexPath(): string {
    return path.join(this.directory, INDEX_FILE);
  }

  private readIndex(): DshBackgroundEntry[] {
    try {
      const text = fs.readFileSync(this.indexPath(), 'utf8');
      const parsed = JSON.parse(text) as Partial<BackgroundIndex>;
      if (!Array.isArray(parsed.entries)) {
        return [];
      }
      return parsed.entries.filter(
        (entry): entry is DshBackgroundEntry =>
          entry !== null &&
          typeof entry === 'object' &&
          typeof entry.id === 'string' &&
          VALID_ID.test(entry.id) &&
          typeof entry.name === 'string' &&
          (entry.type === 'image/jpeg' ||
            entry.type === 'image/png' ||
            entry.type === 'image/webp') &&
          typeof entry.width === 'number' &&
          typeof entry.height === 'number' &&
          fs.existsSync(path.join(this.directory, fileNameFor(entry)))
      );
    } catch {
      return [];
    }
  }

  private writeIndex(entries: readonly DshBackgroundEntry[]): void {
    fs.mkdirSync(this.directory, { recursive: true });
    const temp = `${this.indexPath()}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify({ entries }, null, 2)}\n`, 'utf8');
    fs.renameSync(temp, this.indexPath());
  }

  list(): DshBackgroundEntry[] {
    return this.readIndex();
  }

  read(id: string): { entry: DshBackgroundEntry; bytes: Uint8Array } | null {
    if (!VALID_ID.test(id)) {
      return null;
    }
    const entry = this.readIndex().find((item) => item.id === id);
    if (!entry) {
      return null;
    }
    try {
      const bytes = fs.readFileSync(path.join(this.directory, fileNameFor(entry)));
      return { entry, bytes: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) };
    } catch {
      return null;
    }
  }

  save(name: string, bytes: Uint8Array): DshBackgroundEntry {
    if (bytes.byteLength === 0) {
      throw new Error('图片内容为空');
    }
    if (bytes.byteLength > BACKGROUND_IMAGE_LIMITS.maxStoredBytes) {
      throw new Error('压缩后的图片超过 6 MB 限制');
    }
    const info = readBackgroundImageInfo(bytes);
    if (!info) {
      throw new Error('只支持有效的 JPG、PNG 或 WebP 图片');
    }
    const id = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const entry: DshBackgroundEntry = {
      id,
      name: sanitizeName(name),
      type: info.type,
      width: info.width,
      height: info.height,
      bytes: bytes.byteLength,
      addedAt: Date.now(),
    };
    fs.mkdirSync(this.directory, { recursive: true });
    const target = path.join(this.directory, fileNameFor(entry));
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, bytes);
    fs.renameSync(temp, target);

    const existing = this.readIndex().filter((item) => item.id !== id);
    this.writeIndex([entry, ...existing]);
    return entry;
  }

  remove(id: string): boolean {
    if (!VALID_ID.test(id)) {
      return false;
    }
    const entries = this.readIndex();
    const target = entries.find((item) => item.id === id);
    if (!target) {
      return false;
    }
    try {
      fs.unlinkSync(path.join(this.directory, fileNameFor(target)));
    } catch {
      // Ignore already-deleted files while pruning the index.
    }
    this.writeIndex(entries.filter((item) => item.id !== id));
    return true;
  }
}

/**
 * Authenticated Fetch handler mounted at `/api/woodfish-backgrounds` via
 * `ctx.connection.fetch.register`. Uses only `GET` and `POST` as required by dsh's
 * `ConnectionFetchMethod` contract.
 */
export async function handleBackgroundsRequest(
  store: HostBackgroundStore,
  request: Request
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const id = url.searchParams.get('id');
    if (id !== null && id !== '') {
      const found = store.read(id);
      if (!found) {
        return jsonResponse({ ok: false, error: '图片不存在' }, 404);
      }
      const body = new Uint8Array(found.bytes.byteLength);
      body.set(found.bytes);
      return new Response(body.buffer, {
        status: 200,
        headers: {
          'content-type': found.entry.type,
          'cache-control': 'private, max-age=31536000, immutable',
        },
      });
    }
    return jsonResponse({ ok: true, entries: store.list() });
  }

  if (request.method === 'POST') {
    const action = url.searchParams.get('action') ?? 'upload';
    if (action === 'delete') {
      let id = url.searchParams.get('id') ?? '';
      if (!id) {
        try {
          const payload = (await request.json()) as { id?: unknown };
          if (typeof payload.id === 'string') {
            id = payload.id;
          }
        } catch {
          return jsonResponse({ ok: false, error: '无效的删除请求' }, 400);
        }
      }
      const removed = store.remove(id);
      return jsonResponse({ ok: true, removed, id });
    }

    if (action === 'upload') {
      const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
      let name = url.searchParams.get('name') ?? '';
      let bytes: Uint8Array;
      if (contentType.includes('application/json')) {
        let payload: { name?: unknown; dataBase64?: unknown };
        try {
          payload = (await request.json()) as { name?: unknown; dataBase64?: unknown };
        } catch {
          return jsonResponse({ ok: false, error: '请求体不是有效的 JSON' }, 400);
        }
        if (typeof payload.dataBase64 !== 'string' || payload.dataBase64.length === 0) {
          return jsonResponse({ ok: false, error: '缺少图片数据' }, 400);
        }
        if (typeof payload.name === 'string' && payload.name.trim() !== '') {
          name = payload.name;
        }
        const buffer = Buffer.from(payload.dataBase64, 'base64');
        bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      } else {
        bytes = new Uint8Array(await request.arrayBuffer());
      }
      try {
        const entry = store.save(name, bytes);
        return jsonResponse({ ok: true, entry });
      } catch (error) {
        return jsonResponse(
          { ok: false, error: error instanceof Error ? error.message : String(error) },
          400
        );
      }
    }

    return jsonResponse({ ok: false, error: `不支持的操作：${action}` }, 400);
  }

  return new Response(null, { status: 405, headers: { allow: 'GET, POST' } });
}
