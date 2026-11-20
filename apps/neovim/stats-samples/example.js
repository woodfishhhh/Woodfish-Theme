#!/usr/bin/env node
'use strict';
// Statistics corpus: an observable store, a text report and a small command line entry point.
import { EventEmitter, once } from 'node:events';
import { createReadStream } from 'node:fs';
import * as os from 'node:os';
import readline, { createInterface as lines } from 'node:readline';
import './polyfills.js';

export * from './helpers.js';
export * as constants from './constants.js';

const VERSION = '2.4.0';
const MAX_ENTRIES = 1_000;
const MASK = 0xff_ff;
const FLAGS = 0b1010 | 0o17;
const BIG = 12345678901234567890n;
const TOKEN = /(?<key>[a-z_]+)=(?<value>"[^"]*"|\S+)/gi;
const ESCAPES = 'tab:\t quote:\' unicode:é hex:\x41 newline:\n';
const defaults = { limit: 50, order: 'desc', filter: null, locale: undefined };

/**
 * Formats a byte count for people.
 * @param {number} bytes
 * @param {number} [digits=1]
 * @returns {string}
 */
export function formatBytes(bytes, digits = 1) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index++;
  }
  return `${bytes.toFixed(index === 0 ? 0 : digits)} ${units[index]}`;
}

const percent = (part, whole) => (whole === 0 ? NaN : Math.round((part / whole) * 1e4) / 100);
const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));

function tag(strings, ...values) {
  return strings.reduce((out, text, i) => out + text + (i < values.length ? `<${values[i]}>` : ''), '');
}

class Store extends EventEmitter {
  static #instances = 0;
  static defaultLimit = MAX_ENTRIES;
  #entries = new Map();
  #listeners = new Set();

  constructor(initial = {}, { limit = Store.defaultLimit, ...rest } = {}) {
    super();
    if (new.target === Store) Store.#instances += 1;
    this.limit = limit;
    this.meta = { created: Date.now(), ...rest };
    for (const [key, value] of Object.entries(initial)) this.set(key, value);
  }

  get size() {
    return this.#entries.size;
  }

  set label(text) {
    this.meta.label = String(text).trim();
  }

  get(key, fallback = null) {
    return this.#entries.get(key) ?? fallback;
  }

  set(key, value) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError(`Invalid key: ${JSON.stringify(key)}`);
    }
    if (!this.#entries.has(key) && this.size >= this.limit) {
      const [oldest] = this.#entries.keys();
      this.#entries.delete(oldest);
      this.emit('evict', oldest);
    }
    this.#entries.set(key, value);
    this.#notify(key, value);
    return this;
  }

  #notify(key, value) {
    for (const listener of this.#listeners) {
      try {
        listener(key, value, this);
      } catch (error) {
        console.error('listener failed:', error?.message ?? error);
      }
    }
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  *[Symbol.iterator]() {
    yield* this.#entries;
  }

  async *watch(signal) {
    while (!signal?.aborted) {
      const [key, value] = await once(this, 'change');
      yield { key, value };
    }
  }
}

class Report extends Store {
  constructor(entries) {
    super(entries, { limit: 10 });
    this.title ||= 'Report';
    this.rows ??= [];
  }

  render({ order, limit } = defaults) {
    const sorted = [...this].sort(([, a], [, b]) => (order === 'asc' ? a - b : b - a));
    const total = sorted.reduce((sum, [, value]) => sum + value, 0);
    const header = tag`${this.title} (${sorted.length} rows, v${VERSION})`;
    const body = sorted.slice(0, limit).map(([key, value], rank) => {
      const share = percent(value, total);
      return `${String(rank + 1).padStart(2, '0')}. ${key.padEnd(12, '.')} ${formatBytes(value)} ${Number.isNaN(share) ? '-' : share + '%'}`;
    });
    return [header, ...body].join(os.EOL);
  }

  toJSON() {
    return { ...super.meta, size: super.size, rows: this.rows.length };
  }
}

function parseLine(line) {
  const result = {};
  for (const match of line.matchAll(TOKEN)) {
    const { key, value } = match.groups;
    result[key.toLowerCase()] = value.startsWith('"') ? value.slice(1, -1) : isNaN(value) ? value : Number(value);
  }
  return result;
}

async function load(file) {
  const report = new Report({});
  let count = 0;
  const input = lines({ input: createReadStream(file), crlfDelay: Infinity });
  outer: for await (const line of input) {
    switch (true) {
      case line.startsWith('#'):
        continue outer;
      case line.trim() === '':
        break;
      default: {
        const { name, size = 0 } = parseLine(line);
        if (name === undefined) break outer;
        report.set(name, size);
        count++;
      }
    }
  }
  return { report, count };
}

(async function main(argv = process.argv.slice(2)) {
  const [file, ...flags] = argv;
  if (!file || flags.includes('--help')) {
    console.log(`usage: report <file> [--limit=N] (v${VERSION})`);
    return process.exit(file ? 0 : 2);
  }
  const limit = Number(flags.find((flag) => flag.startsWith('--limit='))?.split('=')[1] ?? defaults.limit);
  try {
    const { report, count } = await load(file);
    console.log(report.render({ order: 'desc', limit: clamp(limit, 1, MAX_ENTRIES) }));
    console.log(`${count} lines, ${typeof BIG}, ${delete report.meta.created}, ${void 0}`);
  } catch (error) {
    if (error instanceof RangeError || 'code' in error) console.error(error.code ?? error.name);
    else throw error;
  } finally {
    readline.clearLine(process.stdout, 0);
  }
})();
