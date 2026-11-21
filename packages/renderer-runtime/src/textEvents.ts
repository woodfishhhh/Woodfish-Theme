import { Disposer } from './disposers';
import { CaretEvent, ClipRect, InsertEvent } from './effectHost';

/*
 * Turns host activity into the effect host's events. An AI streaming a reply and a user
 * typing look the same to an effect: text was inserted, and a caret now sits at its end.
 * Effects draw on a layer above the whole page, so every event says where its text can be
 * seen (`clip`), and text that cannot be seen sends no insert and a hidden caret.
 */

export interface TextEventSink {
  insert(event: InsertEvent): void;
  caret(event: CaretEvent): void;
}

/** An ancestor that cuts off its content, per axis. */
export interface Clipper {
  element: Element;
  x: boolean;
  y: boolean;
}

/**
 * Ancestors of `element` that cut off its content: overflow other than `visible`, or paint
 * containment. `<body>` and `<html>` are left out: their overflow belongs to the viewport.
 */
export function clippingAncestors(element: Element): Clipper[] {
  const clippers: Clipper[] = [];
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) {
      continue;
    }
    const style = getComputedStyle(node);
    const paint = /paint|strict|content/.test(style.contain);
    const x = paint || style.overflowX !== 'visible';
    const y = paint || style.overflowY !== 'visible';
    if (x || y) {
      clippers.push({ element: node, x, y });
    }
  }
  return clippers;
}

/** `area` cut to `box` on the clipping axes; an area cut away entirely becomes empty. */
export function cutArea(area: ClipRect, box: ClipRect, x = true, y = true): ClipRect {
  const left = x ? Math.max(area.left, box.left) : area.left;
  const top = y ? Math.max(area.top, box.top) : area.top;
  return {
    left,
    top,
    right: Math.max(left, x ? Math.min(area.right, box.right) : area.right),
    bottom: Math.max(top, y ? Math.min(area.bottom, box.bottom) : area.bottom),
  };
}

/** The viewport as cut by `clippers`: where content inside all of them can be seen. */
export function visibleArea(clippers: readonly Clipper[]): ClipRect {
  let area: ClipRect = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  for (const { element, x, y } of clippers) {
    area = cutArea(area, element.getBoundingClientRect(), x, y);
  }
  return area;
}

/**
 * Whether the point (x, y) of `owner`'s text can be seen: it lies in `area`, and the topmost
 * element there is `owner`, inside it or one of its containers, not a menu or dialog on top.
 */
export function canSee(owner: Element, x: number, y: number, area: ClipRect): boolean {
  if (x < area.left || x >= area.right || y < area.top || y >= area.bottom) {
    return false;
  }
  const hit =
    typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : null;
  return hit === null || owner.contains(hit) || hit.contains(owner);
}

const BLOCKS = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, pre, dd, dt';

// Sibling decorations are occluded by the page itself, including a partially covered line.
function lineInArea(x: number, y: number, height: number, area: ClipRect): boolean {
  return (
    area.bottom > area.top &&
    x >= area.left &&
    x < area.right &&
    y < area.bottom &&
    y + height > area.top
  );
}

function lastTextNode(root: Node): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      (node as Text).data.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
  });
  return walker.lastChild() as Text | null;
}

function blockOf(node: Node, root: Element): Element | null {
  const parent = node.parentElement;
  const block = parent?.closest(BLOCKS) ?? parent;
  return block && root.contains(block) ? block : root;
}

function rectsOf(node: Text, start: number, end: number): DOMRect[] {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return [...range.getClientRects()].filter((rect) => rect.width > 0 || rect.height > 0);
}

/** Characters per second, smoothed over the last inserts. */
function createRateMeter(): (chars: number) => number {
  let rate = 0;
  let last = 0;
  return (chars: number): number => {
    const now = performance.now();
    const seconds = Math.max(0.016, (now - last) / 1000);
    rate = last === 0 ? chars / seconds : rate * 0.7 + (chars / seconds) * 0.3;
    last = now;
    return rate;
  };
}

export interface StreamWatcher {
  /** Re-reads the end position (the page scrolled); emits a caret event only. */
  reposition(): void;
  dispose(): void;
}

export interface StreamOptions {
  /** Cuts the reply's visible area further, e.g. where a composer floats over the thread. */
  cover?: (area: ClipRect) => ClipRect;
}

/**
 * Watches one streaming reply: whatever text is appended becomes an insert event (at most
 * one per frame) with the position of its end, followed by a caret event there. Text
 * present when watching starts is not reported, and there is no caret until new text
 * arrives: repositioning alone (a scroll) never shows one. Nothing in the reply is modified.
 */
export function watchStream(
  root: Element,
  sink: TextEventSink,
  options: StreamOptions = {}
): StreamWatcher {
  const measure = createRateMeter();
  const clippers = clippingAncestors(root);
  let last: { node: Text; offset: number } | null = null;
  let frame = 0;
  let pendingText = false;
  let disposed = false;
  /** New text arrived since watching started. */
  let streaming = false;
  /** The sink was last told the caret is visible. */
  let shown = false;

  function prime(): void {
    const node = lastTextNode(root);
    last = node ? { node, offset: node.length } : null;
  }

  function hide(): void {
    if (shown) {
      shown = false;
      sink.caret({ x: 0, y: 0, width: 0, height: 0, source: 'ai', visible: false });
    }
  }

  function flush(): void {
    frame = 0;
    if (disposed) {
      return;
    }
    const node = lastTextNode(root);
    if (!node) {
      hide();
      return;
    }
    const start = last && last.node === node ? Math.min(last.offset, node.length) : 0;
    const appended = pendingText && start < node.length;
    pendingText = false;
    const rects = appended
      ? rectsOf(node, start, node.length)
      : rectsOf(node, Math.max(0, node.length - 1), node.length);
    const end = rects[rects.length - 1];
    if (!end) {
      if (root.getClientRects().length === 0) {
        // The reply's page was hidden (another thread is shown): what it streams meanwhile
        // was never seen arriving, so it is not reported later either.
        last = { node, offset: node.length };
        hide();
      }
      return;
    }
    last = { node, offset: node.length };
    streaming ||= appended;
    if (!streaming) {
      return;
    }
    const seen = visibleArea(clippers);
    const area = options.cover ? options.cover(seen) : seen;
    const visible = lineInArea(end.right - 1, end.top, end.height, area);
    if (appended) {
      const text = node.data.slice(start);
      const rate = measure(text.length);
      if (visible && canSee(root, end.right - 1, end.top + end.height / 2, area)) {
        sink.insert({
          x: end.right,
          y: end.top,
          height: end.height,
          text,
          source: 'ai',
          rate,
          rects,
          block: blockOf(node, root),
          node,
          start,
        });
      }
    }
    if (visible || shown) {
      shown = visible;
      sink.caret({
        x: end.right,
        y: end.top,
        width: 0,
        height: end.height,
        source: 'ai',
        visible,
        owner: root,
        clip: area,
      });
    }
  }

  function schedule(text: boolean): void {
    pendingText ||= text;
    if (frame === 0 && !disposed) {
      frame = requestAnimationFrame(flush);
    }
  }

  const observer = new MutationObserver(() => schedule(true));
  observer.observe(root, { subtree: true, childList: true, characterData: true });
  prime();

  return {
    reposition: () => schedule(false),
    dispose(): void {
      disposed = true;
      observer.disconnect();
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
    },
  };
}

/** Where a collapsed selection inside `editor` sits on screen, or null. */
export function selectionCaretRect(
  editor: Element
): { x: number; y: number; height: number } | null {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer)) {
    return null;
  }
  const rect = range.getClientRects()[0];
  if (rect && rect.height > 0) {
    return { x: rect.left, y: rect.top, height: rect.height };
  }
  // An empty line has no text box: use the placeholder <br>'s line box and line height.
  const node = range.startContainer;
  const line = node instanceof Element ? node : node.parentElement;
  if (!line) {
    return null;
  }
  const placeholder = line.matches('br') ? line : line.querySelector('br');
  const lineBox = placeholder?.parentElement ?? line;
  const box = lineBox.getBoundingClientRect();
  const style = getComputedStyle(lineBox);
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.4;
  return {
    x: box.left + Number.parseFloat(style.paddingLeft || '0'),
    y: box.top + Number.parseFloat(style.paddingTop || '0'),
    height: lineHeight,
  };
}

const INSERTING_INPUT = new Set([
  'insertText',
  'insertReplacementText',
  'insertCompositionText',
  'insertFromPaste',
  'insertFromDrop',
  'insertParagraph',
  'insertLineBreak',
]);

/**
 * The user's typing in contenteditable editors (Codex's composer): an insert event for
 * every committed input and a caret event whenever the caret moves, at most once a frame.
 * A caret scrolled out of its editor (a long draft) is reported hidden.
 */
export function watchEditableTyping(selector: string, sink: TextEventSink): Disposer {
  const measure = createRateMeter();
  let frame = 0;
  let typed = '';
  /** What the sink last heard; empty while the caret is hidden. */
  let lastKey = '';
  /** The focused editor and the ancestors that cut it off, read once per editor. */
  let clipped: { editor: Element; clippers: Clipper[] } | null = null;
  // Codex animates the composer while a draft grows: its box changes with no input event.
  const resizes = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;

  function hide(): void {
    if (lastKey) {
      lastKey = '';
      sink.caret({ x: 0, y: 0, width: 0, height: 0, source: 'user', visible: false });
    }
  }

  function flush(): void {
    frame = 0;
    if (!document.hasFocus() || document.visibilityState === 'hidden') {
      hide();
      typed = '';
      return;
    }
    const editor = document.activeElement?.closest(selector) ?? null;
    const rect = editor ? selectionCaretRect(editor) : null;
    if (!editor || !rect) {
      hide();
      typed = '';
      return;
    }
    if (clipped?.editor !== editor) {
      lastKey = '';
      clipped = { editor, clippers: clippingAncestors(editor) };
      resizes?.disconnect();
      const box = clipped.clippers[0]?.element;
      if (box) {
        resizes?.observe(box);
      }
    }
    const area = visibleArea(clipped.clippers);
    const visible = lineInArea(rect.x, rect.y, rect.height, area);
    if (typed) {
      const text = typed;
      typed = '';
      const rate = measure(text.length);
      const node = document.getSelection()?.anchorNode ?? null;
      if (visible && canSee(editor, rect.x, rect.y + rect.height / 2, area)) {
        sink.insert({
          x: rect.x,
          y: rect.y,
          height: rect.height,
          text,
          source: 'user',
          rate,
          rects: [],
          block: node instanceof Element ? node : (node?.parentElement ?? null),
          node: null,
          start: 0,
        });
      }
    }
    if (!visible) {
      hide();
      return;
    }
    const key = [rect.x, rect.y, rect.height, area.left, area.top, area.right, area.bottom]
      .map(Math.round)
      .join();
    if (key !== lastKey) {
      lastKey = key;
      sink.caret({
        x: rect.x,
        y: rect.y,
        width: 0,
        height: rect.height,
        source: 'user',
        visible: true,
        owner: editor,
        clip: area,
      });
    }
  }

  function schedule(): void {
    if (frame === 0) {
      frame = requestAnimationFrame(flush);
    }
  }

  function onInput(event: Event): void {
    const input = event as InputEvent;
    if (!(input.target instanceof Element) || !input.target.closest(selector)) {
      return;
    }
    if (!INSERTING_INPUT.has(input.inputType) || input.isComposing) {
      schedule();
      return;
    }
    typed += input.data ?? (input.inputType.startsWith('insertFrom') ? ' ' : '\n');
    schedule();
  }

  /** IME input (Chinese, Japanese…) is committed here; its input events are all composing. */
  function onCompositionEnd(event: Event): void {
    const composition = event as CompositionEvent;
    if (composition.target instanceof Element && composition.target.closest(selector)) {
      typed += composition.data ?? '';
      schedule();
    }
  }

  const listeners: Array<[EventTarget, string, (event: Event) => void]> = [
    [document, 'input', onInput],
    [document, 'compositionend', onCompositionEnd],
    [document, 'selectionchange', schedule],
    [document, 'focusin', schedule],
    [document, 'focusout', schedule],
    [window, 'focus', schedule],
    [window, 'blur', schedule],
    [document, 'visibilitychange', schedule],
    [document, 'scroll', schedule],
    [window, 'resize', schedule],
  ];
  for (const [target, type, listener] of listeners) {
    target.addEventListener(type, listener, { capture: true, passive: true });
  }
  schedule();
  return () => {
    for (const [target, type, listener] of listeners) {
      target.removeEventListener(type, listener, { capture: true });
    }
    resizes?.disconnect();
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
  };
}
