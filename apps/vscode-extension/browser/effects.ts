/*
 * Effect plugins in the VS Code workbench. The extension writes the user's effects folder
 * as an ES module into its global storage (`--woodfish-effects-url` points there); this
 * step imports it, re-imports it whenever its version file changes (so saving an effect
 * file or a setting reloads effects without reloading the window), and feeds the effects
 * the shared events: the editor caret moved, and text was typed at the caret.
 */
import {
  ACRYLIC_FILTER_ID,
  EffectHostApi,
  EffectSource,
  EffectTheme,
  buildNoiseDataUri,
  mountAcrylicFilter,
  readStringVariable,
  startEffectHost,
  startReveal,
} from '@woodfish/renderer-runtime';
import { DEFAULT_CURSOR } from '@woodfish/theme-core';

const POLL_MS = 1500;
/** A keystroke and the caret move it causes are this close together. */
const TYPING_WINDOW_MS = 250;
const HEX = /#[0-9a-f]{6}\b/gi;
/** Woodfish's default cursor rainbow (theme-core DEFAULT_CURSOR), lower case. */
const RAINBOW = DEFAULT_CURSOR.gradientStops.map((color) => color.toLowerCase());

function effectsUrl(): string | null {
  const raw = readStringVariable('--woodfish-effects-url').replace(/^["']|["']$/g, '');
  return raw.startsWith('vscode-file://') && raw.endsWith('/') ? raw : null;
}

function workbench(): Element {
  return document.querySelector('.monaco-workbench') ?? document.body;
}

/** The theme as effects see it: VS Code's editor colors and Woodfish's cursor colors. */
function vscodeTheme(): EffectTheme {
  const host = workbench();
  const style = getComputedStyle(host);
  const variable = (name: string): string => style.getPropertyValue(name).trim();
  const light = host.classList.contains('vs') || host.classList.contains('hc-light');
  const root = getComputedStyle(document.documentElement);
  const cursorStops = root.getPropertyValue('--woodfish-cursor-gradient').match(HEX) ?? [];
  const tab = root.getPropertyValue('--woodfish-tab-border-gradient').match(HEX) ?? [];
  // Like Codex: a theme's own cursor colors, else its tab gradient (the default rainbow is
  // what every theme without cursor colors gets, so it does not count as the theme's).
  const own =
    cursorStops.length > 1 && cursorStops.join().toLowerCase() !== RAINBOW.join()
      ? cursorStops
      : null;
  const accent =
    variable('--vscode-editorCursor-foreground') || variable('--vscode-focusBorder') || '#61afea';
  const accent2 = variable('--vscode-textLink-foreground') || accent;
  return {
    mode: light ? 'light' : 'dark',
    stops: own ?? (tab.length > 1 ? tab : cursorStops.length > 1 ? cursorStops : [accent, accent2]),
    accent,
    accent2,
    background: variable('--vscode-editor-background') || (light ? '#ffffff' : '#1e1e1e'),
    foreground: variable('--vscode-editor-foreground') || (light ? '#000000' : '#d4d4d4'),
    cursor: own,
  };
}

/** The text a keystroke inserts, or null for keys that only move the caret. */
function typedText(event: KeyboardEvent): string | null {
  if (event.ctrlKey && !event.altKey) {
    return null;
  }
  if (event.metaKey) {
    return null;
  }
  if (event.key === 'Enter') {
    return '\n';
  }
  if (event.key === 'Tab') {
    return '\t';
  }
  // IME composition: the text is not known yet, the caret move tells us where it went.
  if (event.key === 'Process' || event.isComposing) {
    return '　';
  }
  return event.key.length === 1 ? event.key : null;
}

/**
 * The focused editor's primary caret as caret events, and keystrokes followed by a caret
 * move as insert events. Monaco moves its cursor element by setting `top` / `left` (with
 * a CSS transition when smooth caret animation is on), so the target position is read
 * from those styles, not from the animated box.
 */
function watchMonaco(host: EffectHostApi): () => void {
  let editor: Element | null = null;
  let observer: MutationObserver | null = null;
  let frame = 0;
  let typed: { text: string; at: number } | null = null;
  let lastKey = '';
  let rate = 0;
  let rateAt = 0;

  function primaryCursor(): HTMLElement | null {
    const layer = editor?.querySelector('.cursors-layer');
    if (!layer) {
      return null;
    }
    return (
      [...layer.querySelectorAll<HTMLElement>('.cursor')].find(
        (cursor) => cursor.style.display !== 'none' && cursor.style.visibility !== 'hidden'
      ) ?? null
    );
  }

  function hide(): void {
    if (lastKey) {
      lastKey = '';
      host.caret({ x: 0, y: 0, width: 0, height: 0, source: 'user', visible: false });
    }
  }

  function flush(): void {
    frame = 0;
    const cursor = editor?.classList.contains('focused') ? primaryCursor() : null;
    const layer = cursor?.parentElement;
    if (!cursor || !layer) {
      hide();
      return;
    }
    const box = layer.getBoundingClientRect();
    const x = box.left + (Number.parseFloat(cursor.style.left) || 0);
    const y = box.top + (Number.parseFloat(cursor.style.top) || 0);
    const width = cursor.offsetWidth || Number.parseFloat(cursor.style.width) || 2;
    const height = cursor.offsetHeight || Number.parseFloat(cursor.style.height) || 18;
    const key = `${Math.round(x)},${Math.round(y)}`;
    if (key === lastKey) {
      return;
    }
    lastKey = key;
    const now = performance.now();
    if (typed && now - typed.at < TYPING_WINDOW_MS) {
      const seconds = Math.max(0.016, (now - rateAt) / 1000);
      rate =
        rateAt === 0
          ? typed.text.length / seconds
          : rate * 0.7 + (typed.text.length / seconds) * 0.3;
      rateAt = now;
      host.insert({
        x,
        y,
        height,
        text: typed.text,
        source: 'user',
        rate,
        rects: [],
        block: editor,
        node: null,
        start: 0,
      });
      typed = null;
    }
    host.caret({ x, y, width, height, source: 'user', visible: true });
  }

  function schedule(): void {
    if (frame === 0) {
      frame = requestAnimationFrame(flush);
    }
  }

  function follow(): void {
    const next = document.activeElement?.closest('.monaco-editor') ?? null;
    if (next !== editor) {
      observer?.disconnect();
      editor = next;
      const layer = editor?.querySelector('.cursors-layer');
      if (layer) {
        observer = new MutationObserver(schedule);
        observer.observe(layer, { attributes: true, childList: true, subtree: true });
      }
    }
    schedule();
  }

  function onKeyDown(event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (!(keyboard.target instanceof Element) || !keyboard.target.closest('.monaco-editor')) {
      return;
    }
    const text = typedText(keyboard);
    if (text !== null) {
      typed = { text, at: performance.now() };
    }
  }

  function onPaste(event: Event): void {
    if (event.target instanceof Element && event.target.closest('.monaco-editor')) {
      typed = {
        text: (event as ClipboardEvent).clipboardData?.getData('text') || ' ',
        at: performance.now(),
      };
    }
  }

  const listeners: Array<[EventTarget, string, (event: Event) => void]> = [
    [document, 'focusin', follow],
    [document, 'focusout', follow],
    [document, 'keydown', onKeyDown],
    [document, 'paste', onPaste],
    [window, 'resize', schedule],
  ];
  for (const [target, type, listener] of listeners) {
    target.addEventListener(type, listener, { capture: true, passive: true });
  }
  follow();
  return () => {
    for (const [target, type, listener] of listeners) {
      target.removeEventListener(type, listener, { capture: true });
    }
    observer?.disconnect();
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
  };
}

/** Starts the effect plugins when the payload points at them. */
export function startEffects(): (() => void) | void {
  const base = effectsUrl();
  if (!base) {
    return;
  }
  const host = startEffectHost({
    host: 'vscode',
    theme: vscodeTheme,
    selectors: { editorRoot: '.monaco-editor', editor: '.monaco-editor' },
    lib: {
      startReveal,
      mountAcrylicFilter,
      acrylicFilterId: ACRYLIC_FILTER_ID,
      noiseDataUri: buildNoiseDataUri,
    },
    idPrefix: 'woodfish-fx-',
    reducedMotion: () => workbench().classList.contains('monaco-reduce-motion'),
    onError: (id, message) => console.warn(`[Woodfish] 效果 ${id}：${message}`),
    log: (id, message) => console.warn(`[Woodfish] 效果 ${id}：${message}`),
  });
  const typing = watchMonaco(host);
  // VS Code switches themes through classes on the workbench.
  const themeObserver = new MutationObserver(() => host.themeChanged());
  themeObserver.observe(workbench(), { attributes: true, attributeFilter: ['class'] });

  let version = '';
  let reload: unknown;
  let timer = 0;
  let disposed = false;

  async function poll(): Promise<void> {
    const active = document.visibilityState === 'visible' && document.hasFocus();
    if (!disposed && (active || version === '')) {
      try {
        const response = await fetch(`${base}effects.json?t=${Date.now()}`, { cache: 'no-store' });
        const next = (await response.json()) as { hash?: unknown; reload?: unknown };
        const key = `${String(next.hash)}|${String(next.reload)}`;
        if (response.ok && key !== version) {
          const module = (await import(`${base}effects.mjs?v=${encodeURIComponent(key)}`)) as {
            default?: unknown;
            userCss?: unknown;
          };
          const list = Array.isArray(module.default) ? (module.default as EffectSource[]) : [];
          if (next.reload !== reload) {
            // A reload was asked for: every effect starts afresh, failed ones included.
            host.apply([]);
            reload = next.reload;
          }
          host.setUserCss(typeof module.userCss === 'string' ? module.userCss : '');
          host.apply(list);
          version = key;
        }
      } catch (error) {
        console.warn('[Woodfish] 加载效果失败', error);
      }
    }
    if (!disposed) {
      timer = window.setTimeout(() => void poll(), POLL_MS);
    }
  }
  void poll();

  return () => {
    disposed = true;
    window.clearTimeout(timer);
    themeObserver.disconnect();
    typing();
    host.dispose();
  };
}
