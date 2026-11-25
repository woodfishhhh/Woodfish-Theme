import {
  CaretEvent,
  EffectHostApi,
  EffectSource,
  StreamEndEvent,
} from '@woodfish/renderer-runtime';
import { EffectValues, normalizeEffectManifest } from '@woodfish/theme-core';
import { DSH_CONTROLLER_KEY, DSH_STORAGE_KEY } from '../protocol';
import { DshOverlayController, bootFromUserScript, startDshOverlay } from '../renderer';
import { DSH_EFFECT_SELECTORS, findStreamingReply, trackStreaming } from '../renderer/effects';

type Host = Record<string, unknown>;
const host = globalThis as unknown as Host;

function controller(): DshOverlayController | undefined {
  return host[DSH_CONTROLLER_KEY] as DshOverlayController | undefined;
}

function core(id: 'code-gradient' | 'background', enabled: boolean): EffectSource {
  return {
    id,
    hash: id,
    manifest: normalizeEffectManifest({ name: id, hosts: ['dsh'], core: id, order: 100 }),
    values: { enabled } as EffectValues,
  };
}

/** A plugin effect that styles the active tab, the way the accent effect does. */
function plugin(name: string, order: number): EffectSource {
  return {
    id: name,
    hash: name,
    manifest: normalizeEffectManifest({ name, hosts: ['dsh'], order }),
    values: { enabled: true } as EffectValues,
    factory: (module) => {
      module.exports = (ctx: {
        host: string;
        style: (css: string) => void;
        selectors: Record<string, string>;
      }) => {
        ctx.style(`${ctx.selectors.activeTab}::after { content: "${ctx.host}"; }`);
      };
    },
  };
}

function page(): void {
  document.documentElement.setAttribute('data-ds-theme-source', 'system');
  document.body.setAttribute('data-ds-dark-theme', '');
  document.body.innerHTML = `
    <div id="root"><div data-slot="root"><div class="frame">
      <div data-conversation-tabs role="tablist"><button role="tab" aria-selected="true">对话</button></div>
      <div data-conversation-scroll>
        <div data-chat-flow>
          <div data-chat-flow-kind="assistant-step"><div id="reply"><p>写到一半</p></div></div>
        </div>
        <div data-composer-seat><div data-composer-card><div data-composer-input contenteditable="true"></div></div></div>
      </div>
    </div></div></div>`;
}

function styles(): string[] {
  return [...document.querySelectorAll('style[id^="woodfish-dsh-"]')].map((style) => style.id);
}

afterEach(() => {
  controller()?.dispose();
  localStorage.clear();
  document.body.innerHTML = '';
  for (const key of [
    'GM_registerMenuCommand',
    'GM_unregisterMenuCommand',
    'GM_getValue',
    'GM_setValue',
  ]) {
    delete host[key];
  }
});

describe('dsh overlay', () => {
  it('runs dsh effects, mounts the core features they turn on, and cleans up', () => {
    page();
    const overlay = startDshOverlay({}, [
      plugin('accent', 80),
      core('background', true),
      core('code-gradient', true),
    ]);
    expect(overlay.effects().map((effect) => [effect.id, effect.state])).toEqual([
      ['accent', 'running'],
      ['background', 'core'],
      ['code-gradient', 'core'],
    ]);
    const css = [...document.querySelectorAll('style')]
      .map((style) => style.textContent)
      .join('\n');
    // A selector list reaches the effect as one selector, so `::after` applies to every entry.
    expect(css).toContain(`${DSH_EFFECT_SELECTORS.activeTab}::after { content: "dsh"; }`);
    expect(DSH_EFFECT_SELECTORS.activeTab.startsWith(':is(')).toBe(true);
    expect(styles()).toEqual(
      expect.arrayContaining([
        'woodfish-dsh-palette',
        'woodfish-dsh-background',
        'woodfish-dsh-code',
      ])
    );
    expect(document.documentElement.dataset.woodfishDsh).toBe('0.2.0');

    overlay.update({}, [plugin('accent', 80), core('background', false)]);
    expect(document.getElementById('woodfish-dsh-background')).toBeNull();

    overlay.dispose();
    expect(styles()).toEqual([]);
    expect(document.documentElement.dataset.woodfishDsh).toBeUndefined();
    expect(controller()).toBeUndefined();
  });
});

describe('dsh streaming', () => {
  function sink(): EffectHostApi & { carets: CaretEvent[]; ends: StreamEndEvent[] } {
    const carets: CaretEvent[] = [];
    const ends: StreamEndEvent[] = [];
    return {
      carets,
      ends,
      caret: (event: CaretEvent) => carets.push(event),
      streamEnd: (event: StreamEndEvent) => ends.push(event),
      insert: () => undefined,
    } as unknown as EffectHostApi & { carets: CaretEvent[]; ends: StreamEndEvent[] };
  }

  it('follows the reply dsh marks as streaming and ends when the mark goes', async () => {
    page();
    const reply = document.getElementById('reply') as HTMLElement;
    reply.getClientRects = () => [{ width: 10, height: 10 }] as unknown as DOMRectList;
    expect(findStreamingReply()).toBeNull();
    reply.setAttribute('data-streaming', 'true');
    expect(findStreamingReply()).toBe(reply);

    const host = sink();
    const stop = trackStreaming(host);
    reply.removeAttribute('data-streaming');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(host.ends).toEqual([{ source: 'ai' }]);
    expect(host.carets.at(-1)?.visible).toBe(false);
    stop();
  });
});

describe('dsh user script menu', () => {
  it('lists the themes and every baked-in effect in order, and keeps switches in storage', () => {
    page();
    const menu: Array<{ label: string; run: () => void; live: boolean }> = [];
    const stored: Record<string, unknown> = {};
    host.GM_registerMenuCommand = (label: string, run: () => void) =>
      menu.push({ label, run, live: true }) - 1;
    host.GM_unregisterMenuCommand = (id: number) => {
      menu[id].live = false;
    };
    host.GM_getValue = (key: string, fallback: unknown) => (key in stored ? stored[key] : fallback);
    host.GM_setValue = (key: string, value: unknown) => {
      stored[key] = value;
    };
    bootFromUserScript({}, [plugin('thread-ring', 60), plugin('caret', 5)], '');
    const labels = (): string[] => menu.filter((entry) => entry.live).map((entry) => entry.label);
    expect(labels().slice(2)).toEqual(['caret：开', 'thread-ring：开', '恢复默认设置']);

    menu.find((entry) => entry.live && entry.label.startsWith('thread-ring'))?.run();
    expect(stored[DSH_STORAGE_KEY]).toEqual({
      palette: {},
      effects: { 'thread-ring': { enabled: false } },
    });
    expect(labels()).toContain('thread-ring：关');
    expect(
      controller()
        ?.effects()
        .find((effect) => effect.id === 'thread-ring')?.state
    ).toBe('off');

    menu.find((entry) => entry.live && entry.label === '恢复默认设置')?.run();
    expect(stored[DSH_STORAGE_KEY]).toBeNull();
    expect(labels()).toContain('thread-ring：开');
    expect(localStorage.length).toBe(0);
  });
});
