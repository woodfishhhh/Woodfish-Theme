import { Disposer } from './disposers';
import { CaretEvent, InsertEvent } from './effectHost';

/*
 * Turns host activity into the effect host's events. An AI streaming a reply and a user
 * typing look the same to an effect: text was inserted, and a caret now sits at its end.
 */

export interface TextEventSink {
  insert(event: InsertEvent): void;
  caret(event: CaretEvent): void;
}

const BLOCKS = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, pre, dd, dt';

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

/**
 * Watches one streaming reply: whatever text is appended becomes an insert event (at most
 * one per frame) with the position of its end, followed by a caret event there. Text
 * present when watching starts is not reported. Nothing in the reply is modified.
 */
export function watchStream(root: Element, sink: TextEventSink): StreamWatcher {
  const measure = createRateMeter();
  let last: { node: Text; offset: number } | null = null;
  let frame = 0;
  let pendingText = false;
  let disposed = false;

  function prime(): void {
    const node = lastTextNode(root);
    last = node ? { node, offset: node.length } : null;
  }

  function flush(): void {
    frame = 0;
    if (disposed) {
      return;
    }
    const node = lastTextNode(root);
    if (!node) {
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
      return;
    }
    last = { node, offset: node.length };
    if (appended) {
      const text = node.data.slice(start);
      sink.insert({
        x: end.right,
        y: end.top,
        height: end.height,
        text,
        source: 'ai',
        rate: measure(text.length),
        rects,
        block: blockOf(node, root),
        node,
        start,
      });
    }
    sink.caret({
      x: end.right,
      y: end.top,
      width: 0,
      height: end.height,
      source: 'ai',
      visible: true,
    });
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
  // An empty line has no text box: use the line element and its line height.
  const node = range.startContainer;
  const line = node instanceof Element ? node : node.parentElement;
  if (!line) {
    return null;
  }
  const box = line.getBoundingClientRect();
  const style = getComputedStyle(line);
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
 */
export function watchEditableTyping(selector: string, sink: TextEventSink): Disposer {
  const measure = createRateMeter();
  let frame = 0;
  let typed = '';
  let lastKey = '';
  let shown = false;

  function flush(): void {
    frame = 0;
    const editor = document.activeElement?.closest(selector) ?? null;
    const rect = editor ? selectionCaretRect(editor) : null;
    if (!rect) {
      if (shown) {
        shown = false;
        lastKey = '';
        sink.caret({ x: 0, y: 0, width: 0, height: 0, source: 'user', visible: false });
      }
      typed = '';
      return;
    }
    if (typed) {
      const text = typed;
      typed = '';
      const node = document.getSelection()?.anchorNode ?? null;
      sink.insert({
        x: rect.x,
        y: rect.y,
        height: rect.height,
        text,
        source: 'user',
        rate: measure(text.length),
        rects: [],
        block: node instanceof Element ? node : (node?.parentElement ?? null),
        node: null,
        start: 0,
      });
    }
    const key = `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.height)}`;
    if (key !== lastKey) {
      lastKey = key;
      shown = true;
      sink.caret({
        x: rect.x,
        y: rect.y,
        width: 0,
        height: rect.height,
        source: 'user',
        visible: true,
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
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
  };
}
