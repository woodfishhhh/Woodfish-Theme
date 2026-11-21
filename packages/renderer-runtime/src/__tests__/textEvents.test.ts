import { CaretEvent, ClipRect, InsertEvent } from '../effectHost';
import { cutArea, visibleArea, watchEditableTyping, watchStream } from '../textEvents';

/** jsdom has no layout: element boxes, range boxes and frames are driven by the tests. */
let frames: FrameRequestCallback[] = [];
let rangeBox: (node: Node) => ClipRect | null = () => null;

function rect({ left, top, right, bottom }: ClipRect): DOMRect {
  return {
    left,
    top,
    right,
    bottom,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    toJSON: () => ({}),
  };
}

function place(element: Element, box: ClipRect | null): void {
  element.getBoundingClientRect = () => rect(box ?? { left: 0, top: 0, right: 0, bottom: 0 });
  element.getClientRects = () => (box ? [rect(box)] : []) as unknown as DOMRectList;
}

function runFrames(): void {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(0));
}

async function mutations(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function sink(): { inserts: InsertEvent[]; carets: CaretEvent[] } & {
  insert(event: InsertEvent): void;
  caret(event: CaretEvent): void;
} {
  const inserts: InsertEvent[] = [];
  const carets: CaretEvent[] = [];
  return {
    inserts,
    carets,
    insert: (event) => inserts.push(event),
    caret: (event) => carets.push(event),
  };
}

beforeEach(() => {
  frames = [];
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value(this: Range) {
      const box = rangeBox(this.startContainer);
      return box ? [rect(box)] : [];
    },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('visible area', () => {
  it('cuts the viewport by every clipping box, per axis, and empties when cut away', () => {
    const area = { left: 0, top: 0, right: 1000, bottom: 800 };
    expect(cutArea(area, { left: 100, top: 50, right: 900, bottom: 700 })).toEqual({
      left: 100,
      top: 50,
      right: 900,
      bottom: 700,
    });
    // overflow-x: clip only cuts sideways.
    expect(cutArea(area, { left: 100, top: 50, right: 900, bottom: 700 }, true, false)).toEqual({
      left: 100,
      top: 0,
      right: 900,
      bottom: 800,
    });
    expect(cutArea(area, { left: 0, top: 900, right: 1000, bottom: 1200 })).toEqual({
      left: 0,
      top: 900,
      right: 1000,
      bottom: 900,
    });

    const outer = document.createElement('div');
    const inner = document.createElement('div');
    place(outer, { left: 0, top: 100, right: 600, bottom: 700 });
    place(inner, { left: 50, top: -500, right: 550, bottom: 2000 });
    expect(
      visibleArea([
        { element: inner, x: true, y: false },
        { element: outer, x: true, y: true },
      ])
    ).toEqual({ left: 50, top: 100, right: 550, bottom: 700 });
  });
});

/** A reply inside a scrolling thread: thread box 0..800 x 100..700. */
function thread(text: string): { timeline: HTMLElement; reply: HTMLElement; node: Text } {
  document.body.innerHTML = `<div id="timeline" style="overflow-x: hidden; overflow-y: auto"><div id="reply" style="overflow: visible"><p style="overflow: visible">${text}</p></div></div>`;
  const timeline = document.getElementById('timeline') as HTMLElement;
  const reply = document.getElementById('reply') as HTMLElement;
  const paragraph = reply.firstElementChild as HTMLElement;
  place(timeline, { left: 0, top: 100, right: 800, bottom: 700 });
  place(reply, { left: 0, top: 0, right: 800, bottom: 650 });
  place(paragraph, { left: 0, top: 0, right: 800, bottom: 650 });
  return { timeline, reply, node: paragraph.firstChild as Text };
}

describe('watchStream', () => {
  it('shows no caret on repositioning until new text arrives, then follows it', async () => {
    const { reply, node } = thread('已有的回复');
    rangeBox = () => ({ left: 300, top: 600, right: 316, bottom: 620 });
    const events = sink();
    const watcher = watchStream(reply, events);

    watcher.reposition();
    runFrames();
    expect(events.carets).toEqual([]);

    node.appendData('新字');
    await mutations();
    runFrames();
    expect(events.inserts.map((event) => event.text)).toEqual(['新字']);
    expect(events.carets).toEqual([
      expect.objectContaining({
        source: 'ai',
        visible: true,
        x: 316,
        clip: { left: 0, top: 100, right: 800, bottom: 700 },
      }),
    ]);

    watcher.reposition();
    runFrames();
    expect(events.carets).toHaveLength(2);
    watcher.dispose();
  });

  it('hides the caret and sends no insert while the end is behind the composer', async () => {
    const { reply, node } = thread('回复');
    rangeBox = () => ({ left: 300, top: 600, right: 316, bottom: 620 });
    let composerTop = 700;
    const events = sink();
    const watcher = watchStream(reply, events, {
      cover: (area) => cutArea(area, { ...area, bottom: composerTop }),
    });

    node.appendData('一');
    await mutations();
    runFrames();
    expect(events.carets.map((event) => event.visible)).toEqual([true]);

    // A long draft grows the composer over the line being streamed.
    composerTop = 560;
    node.appendData('二');
    await mutations();
    runFrames();
    expect(events.inserts.map((event) => event.text)).toEqual(['一']);
    expect(events.carets.map((event) => event.visible)).toEqual([true, false]);

    node.appendData('三');
    await mutations();
    runFrames();
    expect(events.carets).toHaveLength(2);
    watcher.dispose();
  });

  it('leaves partial menu occlusion to native paint order but suppresses covered inserts', async () => {
    const { reply, node } = thread('回复');
    rangeBox = () => ({ left: 300, top: 600, right: 316, bottom: 620 });
    const menu = document.createElement('div');
    document.body.append(menu);
    let top: Element = reply.firstElementChild as Element;
    document.elementFromPoint = () => top;
    const events = sink();
    const watcher = watchStream(reply, events);

    node.appendData('一');
    await mutations();
    runFrames();
    top = menu;
    node.appendData('二');
    await mutations();
    runFrames();
    expect(events.carets.map((event) => event.visible)).toEqual([true, true]);
    expect(events.carets.at(-1)?.owner).toBe(reply);
    expect(events.inserts.map((event) => event.text)).toEqual(['一']);
    watcher.dispose();
    Reflect.deleteProperty(document, 'elementFromPoint');
  });

  it('hides the caret when its thread is hidden and never reports what streamed meanwhile', async () => {
    const { reply, node } = thread('回复');
    let rendered = true;
    rangeBox = () => (rendered ? { left: 300, top: 600, right: 316, bottom: 620 } : null);
    const events = sink();
    const watcher = watchStream(reply, events);

    node.appendData('一');
    await mutations();
    runFrames();

    // Another thread is shown: Codex keeps this one mounted with display: none.
    rendered = false;
    place(reply, null);
    node.appendData('隐藏时写的');
    await mutations();
    runFrames();
    expect(events.carets.map((event) => event.visible)).toEqual([true, false]);

    rendered = true;
    place(reply, { left: 0, top: 0, right: 800, bottom: 650 });
    node.appendData('二');
    await mutations();
    runFrames();
    expect(events.inserts.map((event) => event.text)).toEqual(['一', '二']);
    expect(events.carets.map((event) => event.visible)).toEqual([true, false, true]);
    watcher.dispose();
  });
});

describe('watchEditableTyping', () => {
  it('re-measures after the window regains focus without changing the selection', () => {
    document.body.innerHTML = '<div id="editor" contenteditable="true"><p>草稿</p></div>';
    const editor = document.getElementById('editor') as HTMLElement;
    const text = (editor.firstElementChild as HTMLElement).firstChild as Text;
    place(editor, { left: 100, top: 200, right: 700, bottom: 300 });
    editor.focus();
    const selection = document.getSelection() as Selection;
    selection.collapse(text, text.length);
    rangeBox = () => ({ left: 400, top: 240, right: 400, bottom: 260 });
    const events = sink();
    const stop = watchEditableTyping('[contenteditable="true"]', events);

    runFrames();
    expect(events.carets.at(-1)).toEqual(expect.objectContaining({ visible: true, y: 240 }));
    const selectedNode = selection.anchorNode;

    (document.hasFocus as jest.Mock).mockReturnValue(false);
    window.dispatchEvent(new Event('blur'));
    runFrames();
    expect(events.carets.at(-1)).toEqual(expect.objectContaining({ visible: false }));

    (document.hasFocus as jest.Mock).mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));
    runFrames();
    expect(events.carets.at(-1)).toEqual(expect.objectContaining({ visible: true, y: 240 }));
    expect(selection.anchorNode).toBe(selectedNode);
    stop();
  });

  it('uses the placeholder line box for an empty paragraph', () => {
    document.body.innerHTML =
      '<div id="editor" contenteditable="true"><p style="line-height: 22px"><br></p></div>';
    const editor = document.getElementById('editor') as HTMLElement;
    const line = editor.firstElementChild as HTMLElement;
    place(editor, { left: 100, top: 200, right: 700, bottom: 300 });
    place(line, { left: 120, top: 220, right: 680, bottom: 242 });
    editor.focus();
    const selection = document.getSelection() as Selection;
    selection.collapse(line, 0);
    rangeBox = () => null;
    const events = sink();
    const stop = watchEditableTyping('[contenteditable="true"]', events);

    runFrames();
    expect(events.carets).toEqual([
      expect.objectContaining({ visible: true, x: 120, y: 220, height: 22 }),
    ]);
    stop();
  });

  it('hides the caret once a long draft scrolls it out of the editor', () => {
    document.body.innerHTML =
      '<div id="box" style="overflow-x: auto; overflow-y: auto"><div id="editor" contenteditable="true" style="overflow: visible"><p style="overflow: visible">草稿</p></div></div>';
    const box = document.getElementById('box') as HTMLElement;
    const editor = document.getElementById('editor') as HTMLElement;
    const text = (editor.firstElementChild as HTMLElement).firstChild as Text;
    place(box, { left: 375, top: 549, right: 1000, bottom: 752 });
    place(editor, { left: 387, top: 432, right: 990, bottom: 752 });
    editor.focus();
    const selection = document.getSelection() as Selection;
    selection.collapse(text, text.length);
    let caretTop = 700;
    rangeBox = () => ({ left: 704, top: caretTop, right: 704, bottom: caretTop + 19 });
    const events = sink();
    const stop = watchEditableTyping('[contenteditable="true"]', events);

    runFrames();
    expect(events.carets).toEqual([
      expect.objectContaining({
        source: 'user',
        visible: true,
        clip: { left: 375, top: 549, right: 1000, bottom: 752 },
      }),
    ]);

    caretTop = 430;
    document.dispatchEvent(new Event('scroll'));
    runFrames();
    expect(events.carets.map((event) => event.visible)).toEqual([true, false]);
    stop();
  });
});
