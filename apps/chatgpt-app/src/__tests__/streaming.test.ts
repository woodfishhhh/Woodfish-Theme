import {
  CaretEvent,
  EffectHostApi,
  StreamEndEvent,
  placeCaretLayer,
} from '@woodfish/renderer-runtime';
import { findStreamingReply, trackStreaming } from '../renderer/effects';

const ACTIVE = 'data-app-action-sidebar-thread-active';

/**
 * Codex keeps recently visited threads mounted and hides all but one: here thread A (running,
 * shown) comes first in the DOM and thread B (finished, display: none) after it.
 */
function twoThreads(): void {
  document.body.innerHTML = `
    <nav>
      <div id="row-a" data-app-action-sidebar-thread-row ${ACTIVE}="true">A<span class="motion-safe:animate-spin"></span></div>
      <div id="row-b" data-app-action-sidebar-thread-row ${ACTIVE}="false">B</div>
    </nav>
    <section data-codex-history-swipe-page>
      <div id="timeline-a" data-app-action-timeline-scroll>
        <div data-user-message-bubble>写一篇散文</div>
        <div id="reply-a" data-markdown-text-style="assistant-message"><p>A 正在写</p></div>
      </div>
    </section>
    <section data-codex-history-swipe-page style="display: none">
      <div id="timeline-b" data-app-action-timeline-scroll>
        <div data-user-message-bubble>写一篇散文</div>
        <div id="reply-b" data-markdown-text-style="assistant-message"><p>B 已写完</p></div>
      </div>
    </section>`;
  // jsdom has no layout: only the shown thread has boxes.
  const box = { left: 0, top: 0, right: 800, bottom: 700, x: 0, y: 0, width: 800, height: 700 };
  (document.getElementById('timeline-a') as HTMLElement).getClientRects = () =>
    [box] as unknown as DOMRectList;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Codex streaming reply', () => {
  it('keeps the decoration beside its current text, ahead of the following host card', () => {
    const first = document.createElement('article');
    const next = document.createElement('article');
    const card = document.createElement('button');
    const layer = document.createElement('div');
    document.body.append(first, next, card);
    const caret: CaretEvent = {
      owner: first,
      x: 12,
      y: 24,
      height: 18,
      width: 0,
      source: 'ai',
      visible: true,
    };
    placeCaretLayer(layer, caret);
    expect(first.previousElementSibling).toBe(layer);
    placeCaretLayer(layer, { ...caret, owner: next });
    expect(next.previousElementSibling).toBe(layer);
    next.after(card);
    expect(next.nextElementSibling).toBe(card);
    expect(next.innerHTML).toBe('');
    expect(layer.hasAttribute('inert')).toBe(true);
    expect(layer.style.minHeight).toBe('0');
    // The single-line composer styles its children with `*:overflow-hidden`; inline wins.
    expect(layer.style.overflow).toBe('visible');
  });

  it('looks for the streaming reply only in the thread on screen', () => {
    twoThreads();
    expect(findStreamingReply()?.id).toBe('reply-a');

    // The shown thread is not running: nothing streams, whatever hidden threads hold.
    (document.getElementById('row-a') as HTMLElement).setAttribute(ACTIVE, 'false');
    expect(findStreamingReply()).toBeNull();
  });

  it('ends the stream as soon as another thread becomes active, not at the next poll', async () => {
    twoThreads();
    const carets: CaretEvent[] = [];
    const ends: StreamEndEvent[] = [];
    const host = {
      insert: () => undefined,
      caret: (event: CaretEvent) => carets.push(event),
      streamEnd: (event: StreamEndEvent) => ends.push(event),
    } as unknown as EffectHostApi;
    const stop = trackStreaming(host);
    expect(ends).toEqual([]);

    (document.getElementById('row-a') as HTMLElement).setAttribute(ACTIVE, 'false');
    (document.getElementById('row-b') as HTMLElement).setAttribute(ACTIVE, 'true');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ends).toHaveLength(1);
    expect(carets).toEqual([expect.objectContaining({ source: 'ai', visible: false })]);
    stop();
  });
});
