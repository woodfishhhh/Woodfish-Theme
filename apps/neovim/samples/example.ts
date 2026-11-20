// Comparison sample: a typed task store with validation and a reducer.
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import * as os from 'node:os';
import { readFile, writeFile } from 'node:fs/promises';

/** Priority levels, ordered from least to most urgent. */
export type Priority = 'low' | 'normal' | 'high';

export interface Task {
  readonly id: string;
  title: string;
  done: boolean;
  priority: Priority;
  due?: Date;
  tags: ReadonlyArray<string>;
}

export interface State {
  tasks: Task[];
  filter: { query: string; onlyOpen: boolean };
  revision: number;
}

export enum Action {
  Add = 'add',
  Toggle = 'toggle',
  Remove = 'remove',
  Clear = 0,
}

const STORAGE_KEY = 'tasks.v2';
const MAX_TITLE = 0xff;
const EPOCH = 0n;
const TITLE_RULE = /^[\p{L}\d][\p{L}\d\s'-]*$/u;
const initial: State = { tasks: [], filter: { query: '', onlyOpen: false }, revision: 0 };

type Payload<A extends Action> = A extends Action.Add
  ? { title: string; priority?: Priority }
  : A extends Action.Toggle | Action.Remove
    ? { id: string }
    : never;

type Awaited2<T> = T extends Promise<infer R> ? R : T;
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

class ValidationError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(`${field}: ${message}`);
    this.name = new.target.name;
  }
}

export function validateTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('title', 'must not be empty');
  }
  if (trimmed.length > MAX_TITLE || !TITLE_RULE.test(trimmed)) {
    throw new ValidationError('title', `invalid characters or longer than ${MAX_TITLE}`);
  }
  return trimmed;
}

export function createTask(title: string, priority: Priority = 'normal'): Task {
  return { id: randomUUID(), title: validateTitle(title), done: false, priority, tags: [] };
}

export function reduce<A extends Action>(state: State, action: A, payload: Payload<A>): State {
  switch (action) {
    case Action.Add: {
      const { title, priority } = payload as Payload<Action.Add>;
      return { ...state, tasks: [...state.tasks, createTask(title, priority)], revision: state.revision + 1 };
    }
    case Action.Toggle:
    case Action.Remove: {
      const { id } = payload as Payload<Action.Toggle>;
      const tasks =
        action === Action.Remove
          ? state.tasks.filter((task) => task.id !== id)
          : state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
      return { ...state, tasks, revision: state.revision + 1 };
    }
    default:
      return structuredClone(initial);
  }
}

const rank: Record<Priority, number> = { low: 0, normal: 1, high: 2 };

export function visible(state: State): Task[] {
  const { query, onlyOpen } = state.filter;
  const needle = query.toLowerCase();
  return state.tasks
    .filter((task) => (!onlyOpen || !task.done) && task.title.toLowerCase().includes(needle))
    .sort((a, b) => rank[b.priority] - rank[a.priority] || a.title.localeCompare(b.title));
}

export class Store {
  private state: State = initial;
  private listeners = new Set<(state: State) => void>();

  constructor(private readonly file: string = `${os.tmpdir()}/${STORAGE_KEY}.json`) {}

  get snapshot(): Readonly<State> {
    return this.state;
  }

  subscribe(listener: (state: State) => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  dispatch<A extends Action>(action: A, payload: Payload<A>): void {
    this.state = reduce(this.state, action, payload);
    this.listeners.forEach((listener) => listener(this.state));
  }

  async load(): Promise<void> {
    try {
      const text = await readFile(this.file, { encoding: 'utf8' });
      const data = JSON.parse(text, (key, value) => (key === 'due' && value ? new Date(value) : value));
      this.state = { ...initial, ...data };
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async save(): Promise<number> {
    const text = JSON.stringify(this.state, null, 2);
    await writeFile(this.file, text);
    return Buffer.byteLength(text);
  }
}

export async function drain(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

const store = new Store();
store.subscribe(({ revision }) => console.log(`revision ${revision}`));
store.dispatch(Action.Add, { title: 'Write the report', priority: 'high' });
console.log(visible(store.snapshot).map(({ title, done }) => `${done ? '[x]' : '[ ]'} ${title}`).join('\n'));
