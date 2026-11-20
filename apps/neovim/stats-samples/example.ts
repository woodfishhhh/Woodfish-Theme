// Statistics corpus: a small typed HTTP client with caching and retries.
import { EventEmitter } from 'node:events';
import type { IncomingHttpHeaders } from 'node:http';
import * as path from 'node:path';
import fs, { promises as fsp } from 'node:fs';

/** HTTP verbs supported by the client. */
export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions<TBody = unknown> {
  readonly url: string;
  method?: Method;
  headers?: Record<string, string>;
  body?: TBody;
  timeoutMs: number;
  retries?: number;
}

export interface Response<T> {
  status: number;
  headers: IncomingHttpHeaders;
  data: T | null;
}

export enum LogLevel {
  Debug = 10,
  Info,
  Warn = 0x1f,
  Error = 1e3,
}

const DEFAULT_TIMEOUT = 5_000;
const MAX_SAFE = 9007199254740991n;
const PATTERN = /^https?:\/\/[\w.-]+(:\d+)?(\/[^\s?#]*)?$/iu;
const defaults = { retries: 3, level: LogLevel.Info } as const;
const SEPARATOR = '\n--\n'; // escape sequences: \t, \u00e9 and \x41
const QUOTED = "say \"hello\"";

type Maybe<T> = T extends null | undefined ? never : T;
type Unwrap<T> = T extends Promise<infer U> ? U : T;
type Keys<T> = keyof T & string;

function isResponse(value: unknown): value is Response<unknown> {
  return typeof value === 'object' && value !== null && 'status' in value;
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    private readonly cause_?: Error,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  get retryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}

abstract class Cache<K, V> {
  protected store = new Map<K, { value: V; expires: number }>();
  static instances = 0;

  constructor(protected readonly ttl: number = 60_000) {
    Cache.instances++;
  }

  abstract key(input: string): K;

  get(input: string): V | undefined {
    const entry = this.store.get(this.key(input));
    if (!entry || entry.expires < Date.now()) {
      return undefined;
    }
    return entry.value;
  }

  set(input: string, value: V): this {
    this.store.set(this.key(input), { value, expires: Date.now() + this.ttl });
    return this;
  }
}

class StringCache extends Cache<string, unknown> {
  key(input: string): string {
    return input.trim().toLowerCase();
  }
}

export class Client extends EventEmitter {
  private readonly cache = new StringCache();
  #counter = 0;

  constructor(private readonly base: string, private level: LogLevel = LogLevel.Info) {
    super();
  }

  async request<T, B = undefined>(options: RequestOptions<B>): Promise<Response<T>> {
    const { url, method = 'GET', headers = {}, retries = defaults.retries } = options;
    if (!PATTERN.test(url)) {
      throw new TypeError(`Invalid URL: ${url}`);
    }
    const cacheKey = `${method}:${url}`;
    const cached = this.cache.get(cacheKey) as Response<T> | undefined;
    if (cached?.data !== undefined) {
      return cached;
    }

    let attempt = 0;
    while (true) {
      try {
        this.#counter += 1;
        const result = await this.send<T>(url, { method, headers });
        this.cache.set(cacheKey, result);
        this.emit('response', result.status, this.#counter);
        return result;
      } catch (error) {
        if (!(error instanceof HttpError) || !error.retryable || ++attempt > retries) {
          throw error;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 2 ** attempt * 100));
      } finally {
        this.log(LogLevel.Debug, 'attempt finished', { attempt });
      }
    }
  }

  private async send<T>(url: string, init: { method: Method; headers: Record<string, string> }): Promise<Response<T>> {
    const target = new URL(url, this.base);
    const res = await fetch(target, { ...init, signal: AbortSignal.timeout(DEFAULT_TIMEOUT) });
    if (!res.ok) {
      throw new HttpError(res.status, res.statusText);
    }
    const data = (await res.json()) as T;
    return { status: res.status, headers: {}, data };
  }

  private log(level: LogLevel, message: string, extra?: object): void {
    if (level < this.level) return;
    switch (level) {
      case LogLevel.Error:
        console.error(message, extra);
        break;
      case LogLevel.Warn:
        console.warn(message, extra);
        break;
      default:
        console.log(`[${LogLevel[level]}]`, message, extra ?? {});
    }
  }
}

export function pick<T extends object, K extends Keys<T>>(source: T, ...keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in source) result[key] = source[key];
  }
  return result;
}

export const readJson = async <T>(file: string): Promise<T> => {
  const raw = await fsp.readFile(path.resolve(file), 'utf8');
  return JSON.parse(raw) as T;
};

export function describe(values: ReadonlyArray<number | string | boolean | null>): string {
  const parts: string[] = [];
  for (const [index, value] of values.entries()) {
    parts.push(`${index}:${value === null ? 'null' : String(value)}`);
  }
  return parts.join(', ') || (fs.existsSync('.') ? 'empty' : 'missing');
}

const client = new Client('https://api.example.com', LogLevel.Warn);
client.on('response', (status: number) => console.log(status > 399 ? 'failed' : 'ok'));
void client.request<{ id: number; tags: string[] }>({ url: '/items/42', timeoutMs: 800, retries: 2 });
