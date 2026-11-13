import { Disposer } from '@woodfish/renderer-runtime';

/** Attribute on `<html>` while the drawn caret replaces the native one. */
export const CARET_GLOW_ATTRIBUTE = 'data-woodfish-codex-caret-glow';
/** Attribute on the reply that is streaming right now. */
export const STREAMING_TAIL_ATTRIBUTE = 'data-woodfish-codex-streaming-tail';

const LIVE_POLL_MS = 400;

/** Where a collapsed selection sits on screen, or null if there is no usable caret. */
function caretRect(editor: Element): { x: number; y: number; height: number } | null {
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

/**
 * Draws the composer caret as a glowing gradient bar (Codex's own caret is a plain text
 * caret that CSS cannot light up). One position update per frame at most, only while an
 * editor has focus; the native caret is hidden through CSS while this runs.
 */
export function startCaretGlow(options: {
  editorSelector: string;
  nodeAttributes?: Readonly<Record<string, string>>;
}): Disposer {
  const caret = document.createElement('div');
  caret.setAttribute('data-woodfish-codex-caret', 'true');
  caret.setAttribute('aria-hidden', 'true');
  for (const [name, value] of Object.entries(options.nodeAttributes ?? {})) {
    caret.setAttribute(name, value);
  }
  caret.hidden = true;
  document.body.append(caret);
  document.documentElement.setAttribute(CARET_GLOW_ATTRIBUTE, 'true');
  let frame = 0;
  let lastKey = '';

  function place(): void {
    frame = 0;
    const editor = document.activeElement?.closest(options.editorSelector) ?? null;
    const rect = editor ? caretRect(editor) : null;
    if (!rect) {
      caret.hidden = true;
      lastKey = '';
      return;
    }
    const key = `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.height)}`;
    caret.hidden = false;
    if (key === lastKey) {
      return;
    }
    lastKey = key;
    caret.style.transform = `translate(${rect.x - 1}px, ${rect.y}px)`;
    caret.style.height = `${rect.height}px`;
    // Restart the breathing so the caret stays solid while the user types or moves.
    caret.style.animation = 'none';
    void caret.offsetWidth;
    caret.style.removeProperty('animation');
  }

  function schedule(): void {
    if (frame === 0) {
      frame = requestAnimationFrame(place);
    }
  }

  const events: Array<[EventTarget, string]> = [
    [document, 'selectionchange'],
    [document, 'focusin'],
    [document, 'focusout'],
    [document, 'scroll'],
    [window, 'resize'],
  ];
  for (const [target, type] of events) {
    target.addEventListener(type, schedule, { capture: true, passive: true });
  }
  schedule();

  return () => {
    for (const [target, type] of events) {
      target.removeEventListener(type, schedule, { capture: true });
    }
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
    caret.remove();
    document.documentElement.removeAttribute(CARET_GLOW_ATTRIBUTE);
  };
}

/**
 * Marks the reply that is streaming, so CSS can put a glowing cursor at its end. A light
 * poll (no observers on the growing text): the active thread shows Codex's spinner, and
 * its last assistant reply comes after the last user message.
 */
export function startStreamingTail(options: {
  runningSelector: string;
  replySelector: string;
  userMessageSelector: string;
}): Disposer {
  let marked: Element | null = null;

  function tick(): void {
    let tail: Element | null = null;
    if (document.querySelector(options.runningSelector)) {
      const replies = document.querySelectorAll(options.replySelector);
      const users = document.querySelectorAll(options.userMessageSelector);
      const reply = replies[replies.length - 1] ?? null;
      const user = users[users.length - 1] ?? null;
      const afterUser =
        reply !== null &&
        (user === null ||
          (user.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
      tail = afterUser ? reply : null;
    }
    if (tail !== marked) {
      marked?.removeAttribute(STREAMING_TAIL_ATTRIBUTE);
      tail?.setAttribute(STREAMING_TAIL_ATTRIBUTE, 'true');
      marked = tail;
    }
  }

  const timer = globalThis.setInterval(tick, LIVE_POLL_MS);
  tick();
  return () => {
    globalThis.clearInterval(timer);
    marked?.removeAttribute(STREAMING_TAIL_ATTRIBUTE);
  };
}
