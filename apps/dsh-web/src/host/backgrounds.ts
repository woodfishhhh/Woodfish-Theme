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
const MANAGED_IMAGE = /^([a-f0-9]{16})\.(?:jpg|png|webp)$/;
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

function contentId(bytes: Uint8Array): string {
  return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
}

function hasCode(error: unknown, ...codes: string[]): boolean {
  return codes.includes((error as NodeJS.ErrnoException).code ?? '');
}

const LOCK_OBSERVATION_RACE_CODES = ['ENOENT', 'EPERM', 'EACCES', 'EBUSY'];

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

function removeEmptyLock(lock: string, ignoreWindowsBusy = false): void {
  try {
    fs.rmdirSync(lock);
  } catch (error) {
    if (
      !hasCode(
        error,
        'ENOENT',
        'ENOTEMPTY',
        'EEXIST',
        ...(ignoreWindowsBusy && process.platform === 'win32' ? ['EPERM', 'EACCES', 'EBUSY'] : [])
      )
    )
      throw error;
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

  private readIndex(): DshBackgroundEntry[] | undefined {
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
      if (hasCode(error, 'ENOENT')) return undefined;
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

  /** Only the generation we observed can be retired; another writer may already own the gate. */
  private clearStaleLock(gate: string, finalAttempt: boolean): boolean {
    let stat: fs.Stats | undefined;
    try {
      stat = fs.lstatSync(gate, { throwIfNoEntry: false });
    } catch (error) {
      if (!hasCode(error, ...LOCK_OBSERVATION_RACE_CODES)) throw error;
      return false;
    }
    if (!stat) return true;
    let ownerPath = gate;
    try {
      if (stat.isFile()) {
        const [pid, time] = fs.readFileSync(gate, 'utf8').trim().split(/\s+/).map(Number);
        if (!staleOwner(pid, time || stat.mtimeMs)) return false;
        // unlink cannot move or remove a replacement directory generation.
        fs.unlinkSync(gate);
      } else if (stat.isDirectory()) {
        const [owner] = fs.readdirSync(gate);
        if (owner) {
          ownerPath = path.join(gate, owner);
          const [pid, time] = owner.split('_').map(Number);
          if (!staleOwner(pid, time || stat.mtimeMs)) return false;
          fs.rmdirSync(ownerPath);
        }
        removeEmptyLock(gate);
      } else {
        throw new Error('背景索引锁类型无效：' + gate);
      }
      return !fs.lstatSync(gate, { throwIfNoEntry: false });
    } catch (error) {
      if (hasCode(error, 'ENOENT')) return false;
      if (!hasCode(error, 'EPERM', 'EACCES', 'EBUSY', 'EISDIR', 'ENOTDIR')) throw error;
      let current: fs.Stats | undefined;
      try {
        current = fs.lstatSync(gate, { throwIfNoEntry: false });
      } catch (observationError) {
        if (!hasCode(observationError, ...LOCK_OBSERVATION_RACE_CODES)) throw observationError;
        return false;
      }
      if (!current || current.ino !== stat.ino || current.isFile() !== stat.isFile()) return false;
      if (ownerPath !== gate) {
        let currentOwner: fs.Stats | undefined;
        try {
          currentOwner = fs.lstatSync(ownerPath, { throwIfNoEntry: false });
        } catch (observationError) {
          if (!hasCode(observationError, ...LOCK_OBSERVATION_RACE_CODES)) throw observationError;
          return false;
        }
        if (!currentOwner) return false;
      }
      if (finalAttempt) throw error;
      return false;
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
        const finalAttempt = attempt === LOCK_ATTEMPTS - 1;
        if (this.clearStaleLock(lock, finalAttempt)) {
          try {
            // Publish a fully initialized nonempty directory in one operation.
            fs.renameSync(staging, lock);
            held = true;
            break;
          } catch (error) {
            if (!hasCode(error, 'ENOTEMPTY', 'EEXIST', 'EPERM', 'EACCES', 'EBUSY', 'ENOTDIR'))
              throw error;
            if (finalAttempt && !fs.existsSync(lock)) throw error;
          }
        }
        waitForLock(Math.min(20, 2 + attempt));
      }
      if (!held) throw new Error('背景索引暂时被其他进程占用，请稍后重试');
      for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
        if (this.clearStaleLock(lock + '.d', attempt === LOCK_ATTEMPTS - 1)) return operation();
        waitForLock(Math.min(20, 2 + attempt));
      }
      throw new Error('背景索引暂时被其他进程占用，请稍后重试');
    } finally {
      if (held) {
        fs.rmdirSync(path.join(lock, owner));
        removeEmptyLock(lock, true);
      } else {
        fs.rmSync(staging, { recursive: true, force: true });
      }
    }
  }

  private recoverIndex(): DshBackgroundEntry[] {
    const entries: DshBackgroundEntry[] = [];
    for (const file of fs.readdirSync(this.directory)) {
      const match = MANAGED_IMAGE.exec(file);
      if (!match) continue;
      try {
        const target = path.join(this.directory, file);
        const stat = fs.lstatSync(target);
        if (!stat.isFile() || stat.size > BACKGROUND_IMAGE_LIMITS.maxStoredBytes)
          throw new Error('无效的图片文件');
        const bytes = fs.readFileSync(target);
        const info = readBackgroundImageInfo(bytes);
        const id = match[1];
        if (!info || fileNameFor({ id, type: info.type }) !== file || contentId(bytes) !== id) {
          throw new Error('文件名与图片内容不符');
        }
        entries.push({ id, name: file, ...info, bytes: bytes.length, addedAt: stat.mtimeMs });
      } catch (error) {
        throw new Error('无法从原图恢复背景索引：' + file + '：' + String(error));
      }
    }
    if (entries.length) this.writeIndex(entries.sort((a, b) => b.addedAt - a.addedAt));
    return entries;
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
    const indexedFiles = new Set(present.map(fileNameFor));
    for (const file of fs.readdirSync(this.directory, { withFileTypes: true })) {
      if (!file.isFile()) continue;
      if (!MANAGED_IMAGE.test(file.name) || indexedFiles.has(file.name)) continue;
      try {
        fs.unlinkSync(path.join(this.directory, file.name));
      } catch (error) {
        if (!hasCode(error, 'ENOENT')) throw error;
      }
    }
    return present;
  }

  list(): DshBackgroundEntry[] {
    return (this.readIndex() ?? []).filter((entry) =>
      fs.existsSync(path.join(this.directory, fileNameFor(entry)))
    );
  }

  read(id: string): { entry: DshBackgroundEntry; bytes: Uint8Array } | null {
    if (!VALID_ID.test(id)) {
      return null;
    }
    const entry = this.readIndex()?.find((item) => item.id === id);
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
    const id = contentId(bytes);
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
      const index = this.readIndex();
      const existing = index ? this.reconcileEntries(index) : this.recoverIndex();
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
      const entries = this.readIndex() ?? this.recoverIndex();
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
