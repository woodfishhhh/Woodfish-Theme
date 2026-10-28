import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

/*
 * Equivalence gate for the renderer-runtime extraction: the frozen 7.0.0 bootstrap and
 * the current build run the same seeded scenarios in identical fake DOMs, and every
 * observable effect (token datasets and CSS variables, root datasets, observer and timer
 * bookkeeping) must match after each step.
 */

const FROZEN = fs.readFileSync(
  path.resolve(__dirname, 'fixtures', 'overlay-bootstrap.7.0.0.frozen.js'),
  'utf-8'
);
const CURRENT = fs.readFileSync(
  path.resolve(__dirname, '../../themes/shared/overlay-bootstrap.js'),
  'utf-8'
);

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

class FakeStyle {
  public readonly values = new Map<string, string>();

  public setProperty(name: string, value: string): void {
    this.values.set(name, value);
  }

  public getPropertyValue(name: string): string {
    return this.values.get(name) ?? '';
  }

  public removeProperty(name: string): void {
    this.values.delete(name);
  }
}

class FakeElement {
  public readonly dataset: Record<string, string> = {};
  public readonly style = new FakeStyle();
  public readonly attributes = new Map<string, string>();
  public className = '';
  public isConnected = true;
  public textContent = '';
  public readonly nodeType = 1;
  public parentElement: FakeElement | null = null;

  public matches(_selector: string): boolean {
    return false;
  }

  public querySelectorAll(_selector: string): FakeElement[] {
    return [];
  }

  public closest(selector: string): FakeElement | null {
    let node: FakeElement | null = this;
    while (node) {
      if (node.matches(selector)) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
    if (name.startsWith('data-')) {
      const key = name
        .slice(5)
        .replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
      delete this.dataset[key];
    }
  }

  public getBoundingClientRect(): { left: number; top: number } {
    return { left: 0, top: 0 };
  }

  public append(): void {}

  public remove(): void {}

  public addEventListener(): void {}

  public removeEventListener(): void {}
}

class FakeToken extends FakeElement {
  public constructor(
    public cssColor: string,
    text: string,
    className: string
  ) {
    super();
    this.textContent = text;
    this.className = className;
  }

  public override matches(selector: string): boolean {
    return selector.includes('[class*="mtk"]');
  }
}

class FakeViewLines extends FakeElement {
  public readonly tokens: FakeToken[] = [];

  public override matches(selector: string): boolean {
    return selector.includes('.view-lines') && !selector.includes('[class*="mtk"]');
  }

  public override querySelectorAll(selector: string): FakeElement[] {
    return selector.includes('[class*="mtk"]') ? this.tokens.filter((t) => t.isConnected) : [];
  }

  public add(token: FakeToken): void {
    token.parentElement = this;
    this.tokens.push(token);
  }
}

type ObserverRecord = {
  callback: (records: unknown[]) => void;
  targets: unknown[];
  disconnected: boolean;
};

const COLORS = [
  'rgb(255, 121, 198)',
  'rgb(139, 233, 253)',
  'rgb(80, 250, 123)',
  'rgb(241, 250, 140)',
  'rgb(248, 248, 242)',
  'rgb(98, 114, 164)',
  'rgba(255, 85, 85, 0.6)',
  '#bd93f9',
  'rgb(128, 128, 128)',
  'inherit',
];
const TEXTS = ['const', '{', 'value', ' ', '=>', 'foo bar', ' ', '()', 'return'];
const CLASSES = ['mtk1', 'mtk4', 'mtk12 mtki', 'mtk3 bracket-highlighting-0', 'mtk5 ced-1-3'];
const ACCENT_SETS: Array<Record<string, string>> = [
  { '--vscode-activityBarBadge-background': '#ff79c6', '--vscode-focusBorder': '#bd93f9' },
  { '--vscode-focusBorder': '#888888' },
  { '--vscode-textLink-foreground': '#3794ff', '--vscode-editorCursor-foreground': '#aeafad' },
];

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

class World {
  public readonly documentElement = new FakeElement();
  public readonly body = new FakeElement();
  public readonly viewLines: FakeViewLines[] = [];
  public readonly observers: ObserverRecord[] = [];
  private readonly frames = new Map<number, () => void>();
  private readonly timeouts = new Map<number, () => void>();
  private readonly intervals = new Map<number, () => void>();
  private nextId = 1;
  private accent: Record<string, string>;
  public readonly context: vm.Context;

  public constructor(private readonly random: () => number) {
    this.accent = pick(random, ACCENT_SETS);
    const roots = 1 + Math.floor(random() * 3);
    for (let index = 0; index < roots; index += 1) {
      const root = new FakeViewLines();
      const count = Math.floor(random() * 10);
      for (let token = 0; token < count; token += 1) {
        root.add(this.randomToken());
      }
      this.viewLines.push(root);
    }
    if (random() < 0.3) {
      this.documentElement.style.setProperty(
        '--woodfish-overlay-hue-shift',
        String(Math.floor(random() * 180))
      );
      this.documentElement.style.setProperty(
        '--woodfish-overlay-lightness-delta',
        String(random() * 0.4)
      );
    }

    const world = this;
    const observers = this.observers;
    class MutationObserver {
      private readonly record: ObserverRecord;

      public constructor(callback: (records: unknown[]) => void) {
        this.record = { callback, targets: [], disconnected: false };
        observers.push(this.record);
      }

      public observe(target: unknown): void {
        this.record.targets.push(target);
      }

      public disconnect(): void {
        this.record.disconnected = true;
      }
    }

    this.context = vm.createContext({
      Element: FakeElement,
      MutationObserver,
      Node: { TEXT_NODE: 3 },
      console: { warn: (): void => undefined },
      document: {
        body: this.body,
        documentElement: this.documentElement,
        head: this.body,
        querySelectorAll: (selector: string) =>
          selector.includes('[class*="mtk"]')
            ? world.connectedRoots().flatMap((root) => root.querySelectorAll(selector))
            : world.connectedRoots(),
        createElementNS: () => new FakeElement(),
        addEventListener: (): void => undefined,
        removeEventListener: (): void => undefined,
      },
      getComputedStyle: (element: FakeElement) => ({
        color: element instanceof FakeToken ? element.cssColor : 'rgb(248, 248, 242)',
        getPropertyValue: (name: string): string => {
          if (element === world.documentElement) {
            return world.documentElement.style.getPropertyValue(name) || world.accent[name] || '';
          }
          return element === world.body ? world.accent[name] || '' : '';
        },
      }),
      requestAnimationFrame: (callback: () => void) => world.schedule(world.frames, callback),
      cancelAnimationFrame: (id: number) => world.frames.delete(id),
      setTimeout: (callback: () => void) => world.schedule(world.timeouts, callback),
      clearTimeout: (id: number) => world.timeouts.delete(id),
      setInterval: (callback: () => void) => world.schedule(world.intervals, callback),
      clearInterval: (id: number) => world.intervals.delete(id),
    });
  }

  public randomToken(): FakeToken {
    return new FakeToken(
      pick(this.random, COLORS),
      pick(this.random, TEXTS),
      pick(this.random, CLASSES)
    );
  }

  public connectedRoots(): FakeViewLines[] {
    return this.viewLines.filter((root) => root.isConnected);
  }

  private schedule(queue: Map<number, () => void>, callback: () => void): number {
    const id = this.nextId;
    this.nextId += 1;
    queue.set(id, callback);
    return id;
  }

  public settle(): void {
    for (
      let guard = 0;
      guard < 50 && (this.frames.size > 0 || this.timeouts.size > 0);
      guard += 1
    ) {
      for (const [id, callback] of [...this.timeouts]) {
        this.timeouts.delete(id);
        callback();
      }
      for (const [id, callback] of [...this.frames]) {
        this.frames.delete(id);
        callback();
      }
    }
  }

  public tick(): void {
    for (const callback of [...this.intervals.values()]) {
      callback();
    }
    this.settle();
  }

  public observersOf(target: unknown): ObserverRecord[] {
    return this.observers.filter((o) => !o.disconnected && o.targets.includes(target));
  }

  public setAccent(accent: Record<string, string>): void {
    this.accent = accent;
  }

  public snapshot(): string {
    const tokens = this.viewLines.flatMap((root) => root.tokens);
    return JSON.stringify({
      tokens: tokens.map((token) => ({
        dataset: token.dataset,
        style: [...token.style.values.entries()].sort(),
        attributes: [...token.attributes.entries()].sort(),
      })),
      root: this.documentElement.dataset,
      activeObservers: this.observers.filter((o) => !o.disconnected).length,
      observerTargets: this.observers
        .filter((o) => !o.disconnected)
        .map((o) => o.targets.length)
        .join(','),
      intervals: this.intervals.size,
    });
  }
}

type Operation = (world: World, random: () => number) => void;

const OPERATIONS: Operation[] = [
  // New token rendered into an observed line.
  (world, random) => {
    const root = pick(random, world.viewLines);
    const token = world.randomToken();
    root.add(token);
    for (const observer of world.observersOf(root)) {
      observer.callback([{ type: 'childList', addedNodes: [token], target: root }]);
    }
  },
  // Token recolored through a class change.
  (world, random) => {
    const root = pick(random, world.viewLines);
    const token = root.tokens.length > 0 ? pick(random, root.tokens) : null;
    if (!token) {
      return;
    }
    token.cssColor = pick(random, COLORS);
    token.className = pick(random, CLASSES);
    for (const observer of world.observersOf(root)) {
      observer.callback([{ type: 'attributes', target: token }]);
    }
  },
  // Text edited inside a token.
  (world, random) => {
    const root = pick(random, world.viewLines);
    const token = root.tokens.length > 0 ? pick(random, root.tokens) : null;
    if (!token) {
      return;
    }
    token.textContent = pick(random, TEXTS);
    for (const observer of world.observersOf(root)) {
      observer.callback([{ type: 'characterData', target: { nodeType: 3, parentElement: token } }]);
    }
  },
  // Editor closed: its view lines leave the DOM.
  (world, random) => {
    const root = pick(random, world.viewLines);
    root.isConnected = false;
    for (const token of root.tokens) {
      token.isConnected = random() < 0.5;
    }
    world.tick();
  },
  // Editor opened: new view lines discovered through the body observer.
  (world, random) => {
    const root = new FakeViewLines();
    const count = Math.floor(random() * 6);
    for (let index = 0; index < count; index += 1) {
      root.add(world.randomToken());
    }
    world.viewLines.push(root);
    for (const observer of world.observersOf(world.body)) {
      observer.callback([{ type: 'childList', addedNodes: [root], target: world.body }]);
    }
  },
  // Theme switched: accents and token colors change, then the poll notices.
  (world, random) => {
    world.setAccent(pick(random, ACCENT_SETS));
    for (const token of world.viewLines.flatMap((root) => root.tokens)) {
      if (random() < 0.5) {
        token.cssColor = pick(random, COLORS);
      }
    }
    world.tick();
  },
  // Theme class flipped on <html>: the attribute observer fires.
  (world) => {
    for (const observer of world.observersOf(world.documentElement)) {
      observer.callback([{ type: 'attributes', target: world.documentElement }]);
    }
  },
  // Host asks the controller to refresh.
  (world) => {
    vm.runInContext(`globalThis.__woodfishOverlayController.refresh()`, world.context);
  },
];

function runScenario(source: string, seed: number): string[] {
  const random = createRandom(seed);
  const world = new World(random);
  const trace: string[] = [];
  vm.runInContext(source, world.context);
  world.settle();
  trace.push(world.snapshot());

  const steps = 3 + Math.floor(random() * 8);
  for (let step = 0; step < steps; step += 1) {
    pick(random, OPERATIONS)(world, random);
    world.settle();
    trace.push(world.snapshot());
  }

  vm.runInContext(`globalThis.__woodfishOverlayController.dispose()`, world.context);
  world.settle();
  trace.push(world.snapshot());
  return trace;
}

describe('overlay bootstrap equivalence with the frozen 7.0.0 build', () => {
  it('produces identical effects across 500 seeded scenarios', () => {
    let tokensSeen = 0;
    for (let seed = 1; seed <= 500; seed += 1) {
      const expected = runScenario(FROZEN, seed);
      const actual = runScenario(CURRENT, seed);
      expect({ seed, trace: actual }).toEqual({ seed, trace: expected });
      tokensSeen += (expected[expected.length - 1].match(/woodfishOverlayToken/g) ?? []).length;
    }
    // Guard against a harness that never exercises the engine.
    expect(tokensSeen).toBeGreaterThan(500);
  });

  it('keeps the same controller contract and root markers', () => {
    for (const source of [FROZEN, CURRENT]) {
      const world = new World(createRandom(7));
      vm.runInContext(source, world.context);
      world.settle();
      const controller = vm.runInContext(
        `({ version: globalThis.__woodfishOverlayController.version, keys: Object.keys(globalThis.__woodfishOverlayController).sort().join(',') })`,
        world.context
      ) as { version: string; keys: string };
      expect(controller).toEqual({ version: '7.0.0', keys: 'dispose,refresh,version' });
      expect(world.documentElement.dataset.woodfishOverlay).toBe('active');
    }
  });
});
