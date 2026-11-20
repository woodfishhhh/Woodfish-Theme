// Comparison sample (reuses the TypeScript statistics): a tiny job queue with retries.
import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import * as path from 'node:path';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 250;
const NAME_PATTERN = /^[a-z][\w-]{1,30}$/i;
const defaults = { concurrency: 2, label: 'default', verbose: false };

/**
 * A unit of work with a name and a payload.
 * @typedef {{ name: string, run: () => Promise<unknown>, attempts?: number }} Job
 */

class QueueError extends Error {
  constructor(message, { job = null, cause } = {}) {
    super(message, { cause });
    this.name = 'QueueError';
    this.job = job;
  }

  get fatal() {
    return this.cause instanceof TypeError || this.job === null;
  }
}

export class Queue extends EventEmitter {
  #pending = [];
  #running = 0;
  static created = 0;

  constructor(options = {}) {
    super();
    this.options = { ...defaults, ...options };
    Queue.created += 1;
  }

  /** @param {Job} job */
  add(job) {
    if (!NAME_PATTERN.test(job.name)) {
      throw new QueueError(`Invalid job name: ${job.name}`);
    }
    this.#pending.push({ ...job, attempts: 0 });
    queueMicrotask(() => this.#drain());
    return this;
  }

  async #drain() {
    while (this.#running < this.options.concurrency && this.#pending.length > 0) {
      const job = this.#pending.shift();
      this.#running++;
      this.#execute(job).finally(() => {
        this.#running--;
        this.#drain();
      });
    }
    if (this.#running === 0 && this.#pending.length === 0) this.emit('idle');
  }

  async #execute(job) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const started = Date.now();
        const result = await job.run();
        this.emit('done', { name: job.name, result, took: Date.now() - started });
        return;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) {
          this.emit('failed', new QueueError(`${job.name} failed`, { job, cause: error }));
          return;
        }
        await sleep(BACKOFF_MS * 2 ** (attempt - 1));
      }
    }
  }
}

export function* chunk(items, size = 10) {
  for (let index = 0; index < items.length; index += size) {
    yield items.slice(index, index + size);
  }
}

export const slug = (text) =>
  text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const queue = new Queue({ concurrency: 4, verbose: true });
queue.on('done', ({ name, took }) => console.log(`${name} finished in ${took}ms`));
queue.on('failed', (error) => console.error(error.message, error.fatal ? '(fatal)' : ''));
queue.on('idle', () => process.exit(Queue.created > 1 ? 1 : 0));

for (const [index, file] of ['a.txt', 'b.txt', 'c.txt'].entries()) {
  queue.add({ name: `copy-${index}`, run: async () => path.basename(file, '.txt').toUpperCase() });
}
