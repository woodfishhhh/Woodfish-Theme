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
const LOCK_DIR = 'index.lock';
const VALID_ID = /^[a-f0-9]{16}$/;
const NAME_LIMIT = 80;
const LOCK_STALE_MS = 30_000;
const LOCK_ATTEMPTS = 100;

interface BackgroundIndex {
  entries: DshBackgroundEntry[];
}

export class BackgroundCapacityError extends Error {
  readonly status = 409;

  constructor() {
    super('背景图片最多保存 ' + BACKGROUND_IMAGE_LIMITS.maxStoredCount + ' 张');
    this.name = 'BackgroundCapacityError';
  }
}

export class BackgroundRequestTooLargeError extends Error {
  readonly status = 413;

  constructor() {
    super('请求体超过 40 MB 限制');
    this.name = 'BackgroundRequestTooLargeError';
  }
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

function hasCode(error: unknown, ...codes: string[]): boolean {
  return codes.includes((error as NodeJS.ErrnoException).code ?? '');
}

function staleOwner(pid: number, timestamp: number): boolean {
  if (Date.now() - timestamp <= LOCK_STALE_MS) return false;
  if (!Number.isSafeInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return hasCode(error, 'ESRCH');
  }
}

function removeEmptyLock(lock: string): void {
  try {
    fs.rmdirSync(lock);
  } catch (error) {
    if (!hasCode(error, 'ENOENT', 'ENOTEMPTY', 'EEXIST')) throw error;
  }
}

function waitForLock(milliseconds: number): void {
  if (milliseconds <= 0) {
    return;
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

/**
 * Persistent Host-side storage for custom dsh background pictures.
 * Images are validated by magic bytes (never file extension or MIME header), deduplicated by
 * content hash, and stored under the dsh home backgrounds directory with atomic index writes.
 */
export class HostBackgroundStore {
  private readonly directory: string;

  constructor(directory: string) {
    this.directory = directory;
  }

  private indexPath(): string {
    return path.join(this.directory, INDEX_FILE);
  }

  private lockPath(): string {
    return path.join(this.directory, LOCK_DIR);
  }

  private readRawIndexForWrite(): DshBackgroundEntry[] {
    try {
      const text = fs.readFileSync(this.indexPath(), 'utf8');
      const parsed = JSON.parse(text) as Partial<BackgroundIndex>;
      if (!Array.isArray(parsed.entries)) {
        throw new Error('背景索引格式无效');
      }
      if (
        !parsed.entries.every(
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
            typeof entry.height === 'number'
        )
      )
        throw new Error('背景索引条目无效');
      return parsed.entries;
    } catch (error) {
      if (hasCode(error, 'ENOENT')) return [];
      throw error;
    }
  }

  private writeIndex(entries: readonly DshBackgroundEntry[]): void {
    fs.mkdirSync(this.directory, { recursive: true });
    const temp = `${this.indexPath()}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temp, JSON.stringify({ entries }, null, 2) + '\n', 'utf8');
      fs.renameSync(temp, this.indexPath());
    } catch (error) {
      try {
        fs.unlinkSync(temp);
      } catch (cleanupError) {
        if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw cleanupError;
        }
      }
      throw error;
    }
  }

  private reapDeadWriter(gate: string, staging: string): void {
    try {
      const [owner] = fs.readdirSync(gate);
      if (owner) {
        const [pid, time] = owner.split('_').map(Number);
        if (!staleOwner(pid, time)) return;
        // A late contender can move only the generation it observed.
        const retired = path.join(staging, 'retired');
        fs.renameSync(path.join(gate, owner), retired);
        fs.rmdirSync(retired);
      }
      removeEmptyLock(gate);
    } catch (error) {
      if (!hasCode(error, 'ENOENT')) throw error;
    }
  }

  private withIndexLock<T>(operation: () => T): T {
    fs.mkdirSync(this.directory, { recursive: true });
    const lock = this.lockPath();
    const owner = [process.pid, Date.now(), crypto.randomUUID()].join('_');
    const staging = lock + '.staging.' + owner;
    fs.mkdirSync(staging);
    let held = false;
    try {
      fs.mkdirSync(path.join(staging, owner));
      for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
        try {
          // Publish a fully initialized nonempty directory in one operation.
          fs.renameSync(staging, lock);
          held = true;
          break;
        } catch (error) {
          if (!hasCode(error, 'ENOTEMPTY', 'EEXIST', 'EPERM', 'EACCES', 'ENOTDIR')) throw error;
          this.reapDeadWriter(lock, staging);
          waitForLock(Math.min(20, 2 + attempt));
        }
      }
      if (!held) throw new Error('背景索引暂时被其他进程占用，请稍后重试');
      return operation();
    } finally {
      if (held) {
        fs.rmdirSync(path.join(lock, owner));
        removeEmptyLock(lock);
      } else {
        fs.rmSync(staging, { recursive: true, force: true });
      }
    }
  }

  private reconcileEntries(entries: readonly DshBackgroundEntry[]): DshBackgroundEntry[] {
    const present = entries.filter((entry) => {
      try {
        fs.statSync(path.join(this.directory, fileNameFor(entry)));
        return true;
      } catch (error) {
        if (hasCode(error, 'ENOENT')) return false;
        throw error;
      }
    });
    if (present.length !== entries.length) {
      this.writeIndex(present);
    }
    const indexedIds = new Set(present.map((entry) => entry.id));
    for (const file of fs.readdirSync(this.directory, { withFileTypes: true })) {
      if (!file.isFile()) continue;
      const match = /^(?<id>[a-f0-9]{16})\.(?:jpg|png|webp)$/.exec(file.name);
      if (!match || indexedIds.has(match.groups?.id ?? '')) continue;
      try {
        fs.unlinkSync(path.join(this.directory, file.name));
      } catch (error) {
        if (!hasCode(error, 'ENOENT')) throw error;
      }
    }
    return present;
  }

  list(): DshBackgroundEntry[] {
    return this.readRawIndexForWrite().filter((entry) =>
      fs.existsSync(path.join(this.directory, fileNameFor(entry)))
    );
  }

  read(id: string): { entry: DshBackgroundEntry; bytes: Uint8Array } | null {
    if (!VALID_ID.test(id)) {
      return null;
    }
    const entry = this.readRawIndexForWrite().find((item) => item.id === id);
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

    return this.withIndexLock(() => {
      const existing = this.reconcileEntries(this.readRawIndexForWrite());
      const replacing = existing.some((item) => item.id === id);
      if (!replacing && existing.length >= BACKGROUND_IMAGE_LIMITS.maxStoredCount) {
        throw new BackgroundCapacityError();
      }
      const target = path.join(this.directory, fileNameFor(entry));
      const targetExists = fs.existsSync(target);
      const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
      let createdTarget = false;
      try {
        if (!targetExists) {
          fs.writeFileSync(temp, bytes);
          fs.renameSync(temp, target);
          createdTarget = true;
        }
        this.writeIndex([entry, ...existing.filter((item) => item.id !== id)]);
        return entry;
      } catch (error) {
        try {
          fs.unlinkSync(temp);
        } catch (cleanupError) {
          if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw cleanupError;
          }
        }
        if (createdTarget) {
          try {
            fs.unlinkSync(target);
          } catch (cleanupError) {
            if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
              throw cleanupError;
            }
          }
        }
        throw error;
      }
    });
  }

  remove(id: string): boolean {
    if (!VALID_ID.test(id)) {
      return false;
    }
    return this.withIndexLock(() => {
      const entries = this.readRawIndexForWrite();
      const target = entries.find((item) => item.id === id);
      if (!target) {
        return false;
      }
      try {
        fs.unlinkSync(path.join(this.directory, fileNameFor(target)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
      this.writeIndex(entries.filter((item) => item.id !== id));
      return true;
    });
  }
}

async function readLimitedBody(request: Request): Promise<Uint8Array> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (Number.isFinite(length) && length > BACKGROUND_IMAGE_LIMITS.maxInputBytes) {
      throw new BackgroundRequestTooLargeError();
    }
  }
  if (request.body === null) {
    return new Uint8Array();
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      const chunk = result.value;
      total += chunk.byteLength;
      if (total > BACKGROUND_IMAGE_LIMITS.maxInputBytes) {
        // The dsh bridge closes an unread upload after flushing the 413 response.
        throw new BackgroundRequestTooLargeError();
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Authenticated Fetch handler mounted at the background API path through
 * ctx.connection.fetch.register. It uses only GET and POST as required by dsh's
 * ConnectionFetchMethod contract.
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
      try {
        const body = await readLimitedBody(request);
        if (body.byteLength > 0) {
          const payload = JSON.parse(new TextDecoder().decode(body)) as { id?: unknown };
          if (!id && typeof payload.id === 'string') {
            id = payload.id;
          }
        }
      } catch (error) {
        if (error instanceof BackgroundRequestTooLargeError) {
          return jsonResponse({ ok: false, error: error.message }, error.status);
        }
        return jsonResponse({ ok: false, error: '无效的删除请求' }, 400);
      }
      const removed = store.remove(id);
      return jsonResponse({ ok: true, removed, id });
    }

    if (action === 'upload') {
      const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
      let name = url.searchParams.get('name') ?? '';
      let bytes: Uint8Array;
      try {
        const body = await readLimitedBody(request);
        if (contentType.includes('application/json')) {
          const payload = JSON.parse(new TextDecoder().decode(body)) as {
            name?: unknown;
            dataBase64?: unknown;
          };
          if (typeof payload.dataBase64 !== 'string' || payload.dataBase64.length === 0) {
            return jsonResponse({ ok: false, error: '缺少图片数据' }, 400);
          }
          if (typeof payload.name === 'string' && payload.name.trim() !== '') {
            name = payload.name;
          }
          const buffer = Buffer.from(payload.dataBase64, 'base64');
          bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        } else {
          bytes = body;
        }
      } catch (error) {
        if (error instanceof BackgroundRequestTooLargeError) {
          return jsonResponse({ ok: false, error: error.message }, error.status);
        }
        if (contentType.includes('application/json')) {
          return jsonResponse({ ok: false, error: '请求体不是有效的 JSON' }, 400);
        }
        throw error;
      }
      try {
        const entry = store.save(name, bytes);
        return jsonResponse({ ok: true, entry });
      } catch (error) {
        const status = error instanceof BackgroundCapacityError ? error.status : 400;
        return jsonResponse(
          { ok: false, error: error instanceof Error ? error.message : String(error) },
          status
        );
      }
    }

    return jsonResponse({ ok: false, error: '不支持的操作：' + action }, 400);
  }

  return new Response(null, { status: 405, headers: { allow: 'GET, POST' } });
}
