import {
  EffectHost as EffectHostName,
  EffectManifest,
  EffectValues,
  effectCssVariables,
  normalizeEffectValues,
  patchEffectValues,
} from '@woodfish/theme-core';
import { createStyleManager } from './styleManager';

/*
 * Runs pluggable effects inside a host page. Every effect is a small module
 * (`module.exports = function (ctx) { … }`) that only talks to the `ctx` built here, so
 * the same effect runs in VS Code and in Codex. Effects share one overlay layer and one
 * canvas; the canvas loop only runs while some effect is animating, pauses while the
 * window is in the background, and a failing effect is stopped without touching the
 * others.
 */

export interface EffectTheme {
  mode: 'dark' | 'light';
  /** The theme's cursor / accent colors, in order. */
  stops: string[];
  accent: string;
  accent2: string;
  background: string;
  foreground: string;
  /** Host extras (e.g. the reply rainbow for one Codex appearance). */
  [extra: string]: unknown;
}

/** Text appeared at a position: the user typed it, or an AI streamed it. */
export interface InsertEvent {
  /** Where the inserted text ends (viewport px): the caret after the insertion. */
  x: number;
  y: number;
  height: number;
  text: string;
  source: 'user' | 'ai';
  /** Characters per second over the last few inserts. */
  rate: number;
  /** Client rects of the inserted text (empty when unknown). */
  rects: DOMRect[];
  /** The block element (paragraph, list item, editor line) the text went into. */
  block: Element | null;
  node: Text | null;
  /** Offset of the inserted text inside `node`. */
  start: number;
}

/** A caret moved: the user's text caret, or the end of a streaming reply. */
export interface CaretEvent {
  x: number;
  y: number;
  width: number;
  height: number;
  source: 'user' | 'ai';
  /** False when the caret went away (editor blurred, reply finished). */
  visible: boolean;
}

export interface StreamEndEvent {
  source: 'ai';
}

export type EffectFactory = (module: { exports: unknown }, exports: unknown) => void;

/** One effect folder as the host receives it. */
export interface EffectSource {
  id: string;
  manifest: EffectManifest;
  values: EffectValues;
  /** Identity of the code and manifest; a change restarts the effect. */
  hash: string;
  /** `effect.js` wrapped as a CommonJS-style function; absent for CSS-only and core effects. */
  factory?: EffectFactory;
  /** `effect.css`, mounted while the effect is on. */
  css?: string;
  /** Why the folder could not be loaded; such an effect is listed but never run. */
  error?: string;
}

export type EffectState = 'running' | 'off' | 'failed' | 'core';

export interface EffectStatus {
  id: string;
  manifest: EffectManifest;
  values: EffectValues;
  state: EffectState;
  error?: string;
}

export type Painter = (g: CanvasRenderingContext2D, now: number, dt: number) => boolean | void;

export interface EffectContext {
  id: string;
  host: EffectHostName;
  /** Current values; a new object whenever they change. */
  readonly params: EffectValues;
  theme(): EffectTheme;
  /** Woodfish's rainbow (the VS Code cursor colors). */
  rainbow: readonly string[];
  /** Host selectors, e.g. `composer`, `threadRow`, `activeThread` in Codex. */
  selectors: Readonly<Record<string, string>>;
  /** Host helpers for effects that drive a host engine. */
  lib: Readonly<Record<string, unknown>>;
  onInsert(handler: (event: InsertEvent) => void): void;
  onCaret(handler: (event: CaretEvent) => void): void;
  onStreamEnd(handler: (event: StreamEndEvent) => void): void;
  onTheme(handler: () => void): void;
  /** Draws on the shared canvas every frame until `fn` returns false; `wake()` restarts it. */
  painter(fn: Painter): { wake(): void };
  /** Fixed, full-window container for overlay elements (no pointer events). */
  readonly layer: HTMLElement;
  /** This effect's stylesheet; each call replaces the previous CSS. */
  style(css: string): void;
  on(
    target: EventTarget,
    type: string,
    listener: (event: Event) => void,
    options?: AddEventListenerOptions
  ): void;
  /** `setTimeout` that is cleared when the effect stops. */
  later(ms: number, fn: () => void): () => void;
  /** Reduced motion, or the window is in the background: keep only the still parts. */
  simplified(): boolean;
  reducedMotion(): boolean;
  log(message: string): void;
}

export interface EffectInstance {
  update?: (values: EffectValues) => void;
  dispose?: () => void;
}

export interface EffectHostOptions {
  host: EffectHostName;
  theme: () => EffectTheme;
  selectors?: Readonly<Record<string, string>>;
  lib?: Readonly<Record<string, unknown>>;
  /** Prefix of the `<style>` ids. */
  idPrefix: string;
  nodeAttributes?: Readonly<Record<string, string>>;
  /** Host reduced-motion switch, in addition to the media query. */
  reducedMotion?: () => boolean;
  /** Effects whose engine lives in the host (`manifest.core`): values, or null when off. */
  core?: (name: string, values: EffectValues | null) => void;
  onError?: (id: string, message: string) => void;
  log?: (id: string, message: string) => void;
}

export interface EffectHostApi {
  apply(sources: readonly EffectSource[]): void;
  /** Applies unsaved values to one effect (the settings page previews this way). */
  preview(id: string, patch: unknown): EffectValues | null;
  insert(event: InsertEvent): void;
  caret(event: CaretEvent): void;
  streamEnd(event: StreamEndEvent): void;
  /** The theme changed: cached theme data is dropped and effects are told. */
  themeChanged(): void;
  status(): EffectStatus[];
  dispose(): void;
}

/** Woodfish's default cursor rainbow (theme-core DEFAULT_CURSOR). */
const RAINBOW = Object.freeze([
  '#ff2d95',
  '#ff4500',
  '#ffd700',
  '#7cfc00',
  '#00ffff',
  '#1e90ff',
  '#9370db',
  '#ff00ff',
  '#ff1493',
]);
/** Errors an effect may throw from handlers before it is stopped. */
const MAX_ERRORS = 3;
const LAYER_Z_INDEX = '2147483000';

interface Running {
  source: EffectSource;
  instance: EffectInstance;
  handlers: {
    insert: Array<(event: InsertEvent) => void>;
    caret: Array<(event: CaretEvent) => void>;
    streamEnd: Array<(event: StreamEndEvent) => void>;
    theme: Array<() => void>;
  };
  painters: Set<PainterEntry>;
  cleanups: Array<() => void>;
  errors: number;
  stopped: boolean;
}

interface PainterEntry {
  fn: Painter;
  awake: boolean;
  owner: Running;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sameValues(left: EffectValues, right: EffectValues): boolean {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}

/** Starts the effect host. Nothing is added to the page until an effect needs it. */
export function startEffectHost(options: EffectHostOptions): EffectHostApi {
  const styles = createStyleManager({
    idPrefix: options.idPrefix,
    nodeAttributes: options.nodeAttributes,
    container: () => document.head ?? document.documentElement,
  });
  const sources = new Map<string, EffectSource>();
  const running = new Map<string, Running>();
  const failures = new Map<string, string>();
  const painters = new Set<PainterEntry>();
  const motionQuery =
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let layer: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let graphics: CanvasRenderingContext2D | null = null;
  let frame = 0;
  let lastFrame = 0;
  let painted = false;
  let themeCache: EffectTheme | null = null;
  let disposed = false;

  const reducedMotion = (): boolean =>
    Boolean(motionQuery?.matches) || Boolean(options.reducedMotion?.());
  const active = (): boolean => document.visibilityState !== 'hidden' && document.hasFocus();

  function theme(): EffectTheme {
    themeCache ??= options.theme();
    return themeCache;
  }

  function ensureLayer(): HTMLElement {
    if (layer?.isConnected) {
      return layer;
    }
    layer = document.createElement('div');
    layer.setAttribute('data-woodfish-effects-layer', 'true');
    layer.setAttribute('aria-hidden', 'true');
    for (const [name, value] of Object.entries(options.nodeAttributes ?? {})) {
      layer.setAttribute(name, value);
    }
    layer.style.cssText = `position:fixed;inset:0;z-index:${LAYER_Z_INDEX};pointer-events:none;overflow:hidden;contain:strict;`;
    (document.body ?? document.documentElement).append(layer);
    return layer;
  }

  function ensureCanvas(): CanvasRenderingContext2D | null {
    if (graphics && canvas?.isConnected) {
      return graphics;
    }
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;';
    ensureLayer().append(canvas);
    graphics = canvas.getContext('2d');
    resize();
    return graphics;
  }

  function resize(): void {
    if (!canvas) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(innerWidth * ratio));
    canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    painted = true;
    schedule();
  }

  function clear(): void {
    if (graphics && canvas && painted) {
      graphics.setTransform(1, 0, 0, 1, 0, 0);
      graphics.clearRect(0, 0, canvas.width, canvas.height);
      painted = false;
    }
  }

  function schedule(): void {
    if (frame === 0 && !disposed && active()) {
      frame = requestAnimationFrame(loop);
    }
  }

  function loop(): void {
    frame = 0;
    const g = ensureCanvas();
    if (!g || !active()) {
      clear();
      return;
    }
    // performance.now(), not the rAF time: handlers stamp events with performance.now().
    const now = performance.now();
    const dt = Math.min(64, now - lastFrame || 16.7);
    lastFrame = now;
    clear();
    const ratio = window.devicePixelRatio || 1;
    let busy = false;
    for (const entry of painters) {
      if (!entry.awake || entry.owner.stopped) {
        continue;
      }
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      g.save();
      let keep = false;
      try {
        keep = entry.fn(g, now, dt) !== false;
      } catch (error) {
        report(entry.owner, error);
      }
      g.restore();
      painted = true;
      entry.awake = keep;
      busy ||= keep;
    }
    // One more frame after the last painter stops, so its last drawing is cleared.
    if (busy || painted) {
      schedule();
    }
  }

  /** CSS animations of effects pause while the window is in the background. */
  const PAUSED_ATTRIBUTE = 'data-woodfish-paused';

  function onFocusChange(): void {
    document.documentElement.toggleAttribute(PAUSED_ATTRIBUTE, !active());
    if (active()) {
      lastFrame = performance.now();
      schedule();
    } else {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      clear();
    }
  }

  document.documentElement.toggleAttribute(PAUSED_ATTRIBUTE, !active());
  window.addEventListener('resize', resize);
  window.addEventListener('focus', onFocusChange);
  window.addEventListener('blur', onFocusChange);
  document.addEventListener('visibilitychange', onFocusChange);

  function report(owner: Running, error: unknown): void {
    owner.errors += 1;
    const text = message(error);
    options.log?.(owner.source.id, text);
    if (owner.errors >= MAX_ERRORS) {
      fail(owner.source.id, `运行出错：${text}`);
    }
  }

  function fail(id: string, text: string): void {
    stop(id);
    failures.set(id, text);
    options.onError?.(id, text);
  }

  /** Wraps a callback from an effect so its errors are counted, not thrown into the page. */
  function guard<A extends unknown[]>(
    owner: Running,
    fn: (...args: A) => void
  ): (...args: A) => void {
    return (...args: A): void => {
      if (owner.stopped) {
        return;
      }
      try {
        fn(...args);
      } catch (error) {
        report(owner, error);
      }
    };
  }

  function mountCss(source: EffectSource): void {
    const variables = effectCssVariables(source.id, source.manifest, source.values);
    styles.upsert(
      `${source.id}-vars`,
      variables.length > 0 ? `:root {\n  ${variables.join('\n  ')}\n}` : ''
    );
    styles.upsert(`${source.id}-css`, source.css ?? '');
  }

  function unmountCss(id: string): void {
    styles.remove(`${id}-vars`);
    styles.remove(`${id}-css`);
    styles.remove(`${id}-js`);
  }

  function createContext(owner: Running): EffectContext {
    const { source } = owner;
    return {
      id: source.id,
      host: options.host,
      get params(): EffectValues {
        return owner.source.values;
      },
      theme,
      rainbow: RAINBOW,
      selectors: options.selectors ?? {},
      lib: options.lib ?? {},
      onInsert: (handler) => owner.handlers.insert.push(guard(owner, handler)),
      onCaret: (handler) => owner.handlers.caret.push(guard(owner, handler)),
      onStreamEnd: (handler) => owner.handlers.streamEnd.push(guard(owner, handler)),
      onTheme: (handler) => owner.handlers.theme.push(guard(owner, handler)),
      painter: (fn): { wake(): void } => {
        const entry: PainterEntry = { fn, awake: false, owner };
        painters.add(entry);
        owner.painters.add(entry);
        return {
          wake: (): void => {
            if (owner.stopped) {
              return;
            }
            entry.awake = true;
            ensureCanvas();
            schedule();
          },
        };
      },
      get layer(): HTMLElement {
        return ensureLayer();
      },
      style: (css): void => styles.upsert(`${source.id}-js`, css),
      on: (target, type, listener, listenerOptions): void => {
        const wrapped = guard(owner, listener);
        target.addEventListener(type, wrapped, listenerOptions);
        owner.cleanups.push(() => target.removeEventListener(type, wrapped, listenerOptions));
      },
      later: (ms, fn): (() => void) => {
        const timer = globalThis.setTimeout(guard(owner, fn), ms);
        const cancel = (): void => globalThis.clearTimeout(timer);
        owner.cleanups.push(cancel);
        return cancel;
      },
      simplified: () => reducedMotion() || !active(),
      reducedMotion,
      log: (text) => options.log?.(source.id, text),
    };
  }

  function start(source: EffectSource): void {
    failures.delete(source.id);
    const owner: Running = {
      source,
      instance: {},
      handlers: { insert: [], caret: [], streamEnd: [], theme: [] },
      painters: new Set(),
      cleanups: [],
      errors: 0,
      stopped: false,
    };
    const context = createContext(owner);
    running.set(source.id, owner);
    mountCss(source);
    if (!source.factory) {
      return;
    }
    try {
      const module: { exports: unknown } = { exports: {} };
      source.factory(module, module.exports);
      if (typeof module.exports !== 'function') {
        throw new Error('effect.js 需要 module.exports = function (ctx) { … }');
      }
      const result: unknown = (module.exports as (ctx: EffectContext) => unknown)(context);
      owner.instance = result !== null && typeof result === 'object' ? result : {};
    } catch (error) {
      fail(source.id, `启动失败：${message(error)}`);
    }
  }

  function stop(id: string): void {
    const owner = running.get(id);
    running.delete(id);
    unmountCss(id);
    if (!owner) {
      return;
    }
    owner.stopped = true;
    for (const entry of owner.painters) {
      painters.delete(entry);
    }
    for (const cleanup of owner.cleanups.splice(0)) {
      try {
        cleanup();
      } catch {
        // Keep stopping.
      }
    }
    try {
      owner.instance.dispose?.();
    } catch (error) {
      options.log?.(id, `停止时出错：${message(error)}`);
    }
    painted = true;
    schedule();
  }

  function update(owner: Running, source: EffectSource): void {
    owner.source = source;
    mountCss(source);
    if (!owner.instance.update) {
      stop(source.id);
      start(source);
      return;
    }
    try {
      owner.instance.update(source.values);
    } catch (error) {
      fail(source.id, `更新参数失败：${message(error)}`);
    }
  }

  function applyOne(source: EffectSource): void {
    const owner = running.get(source.id);
    const runs = source.manifest.hosts.includes(options.host);
    if (source.error || !runs) {
      if (owner) {
        stop(source.id);
      }
      return;
    }
    if (source.manifest.core) {
      options.core?.(source.manifest.core, source.values.enabled ? source.values : null);
      if (source.values.enabled) {
        mountCss(source);
      } else {
        unmountCss(source.id);
      }
      return;
    }
    if (!source.values.enabled) {
      if (owner) {
        stop(source.id);
      }
      failures.delete(source.id);
      return;
    }
    if (owner && owner.source.hash === source.hash && !failures.has(source.id)) {
      if (!sameValues(owner.source.values, source.values)) {
        update(owner, source);
      }
      return;
    }
    if (owner) {
      stop(source.id);
    }
    if (
      failures.has(source.id) &&
      owner === undefined &&
      sources.get(source.id)?.hash === source.hash
    ) {
      // Failed with this exact code; wait for a fix (a new hash) or a toggle.
      return;
    }
    start(source);
  }

  function owners(): Running[] {
    return [...running.values()];
  }

  return {
    apply(next: readonly EffectSource[]): void {
      if (disposed) {
        return;
      }
      const seen = new Set<string>();
      for (const source of next) {
        if (seen.has(source.id)) {
          continue;
        }
        seen.add(source.id);
        const previous = sources.get(source.id);
        if (previous && previous.hash !== source.hash) {
          failures.delete(source.id);
        }
        applyOne(source);
        sources.set(source.id, source);
      }
      for (const [id, source] of [...sources]) {
        if (!seen.has(id)) {
          sources.delete(id);
          failures.delete(id);
          if (source.manifest.core) {
            options.core?.(source.manifest.core, null);
          }
          stop(id);
        }
      }
    },
    preview(id: string, patch: unknown): EffectValues | null {
      const source = sources.get(id);
      if (!source || disposed) {
        return null;
      }
      const values = patchEffectValues(source.manifest, source.values, patch);
      const next = { ...source, values };
      if (failures.has(id) && values.enabled !== source.values.enabled) {
        failures.delete(id);
      }
      sources.set(id, next);
      applyOne(next);
      return values;
    },
    insert(event: InsertEvent): void {
      owners().forEach((owner) => owner.handlers.insert.forEach((handler) => handler(event)));
    },
    caret(event: CaretEvent): void {
      owners().forEach((owner) => owner.handlers.caret.forEach((handler) => handler(event)));
    },
    streamEnd(event: StreamEndEvent): void {
      owners().forEach((owner) => owner.handlers.streamEnd.forEach((handler) => handler(event)));
    },
    themeChanged(): void {
      themeCache = null;
      owners().forEach((owner) => owner.handlers.theme.forEach((handler) => handler()));
    },
    status(): EffectStatus[] {
      return [...sources.values()]
        .filter((source) => source.error || source.manifest.hosts.includes(options.host))
        .map((source): EffectStatus => {
          const error = source.error ?? failures.get(source.id);
          const state: EffectState = error
            ? 'failed'
            : source.manifest.core
              ? 'core'
              : running.has(source.id)
                ? 'running'
                : 'off';
          return {
            id: source.id,
            manifest: source.manifest,
            values: normalizeEffectValues(source.manifest, source.values),
            state,
            ...(error ? { error } : {}),
          };
        })
        .sort(
          (left, right) =>
            left.manifest.order - right.manifest.order || left.id.localeCompare(right.id)
        );
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      for (const id of [...running.keys()]) {
        stop(id);
      }
      for (const source of sources.values()) {
        if (source.manifest.core) {
          options.core?.(source.manifest.core, null);
        }
      }
      disposed = true;
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener('resize', resize);
      window.removeEventListener('focus', onFocusChange);
      window.removeEventListener('blur', onFocusChange);
      document.removeEventListener('visibilitychange', onFocusChange);
      document.documentElement.removeAttribute(PAUSED_ATTRIBUTE);
      styles.removeAll();
      layer?.remove();
      layer = null;
      canvas = null;
      graphics = null;
      sources.clear();
      failures.clear();
    },
  };
}
