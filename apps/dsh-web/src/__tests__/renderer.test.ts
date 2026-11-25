import {
  CaretEvent,
  EffectHostApi,
  EffectSource,
  StreamEndEvent,
} from '@woodfish/renderer-runtime';
import { EffectValues, normalizeEffectManifest } from '@woodfish/theme-core';
import { DSH_CONTROLLER_KEY, DshPersistedConfig } from '../protocol';
import { DEFAULT_DSH_PERSISTED_CONFIG } from '../settings';
import { DshOverlayController, startDshOverlay } from '../renderer';
import { DSH_EFFECT_SELECTORS, findStreamingReply, trackStreaming } from '../renderer/effects';
import { DshBackgroundClient } from '../client/backgrounds';
import { ConfigFormSnapshot, DshClientContext, SettingsPathOp } from '../client/dshClientTypes';
import { WoodfishClientRuntime } from '../client/runtime';

type Host = Record<string, unknown>;
const host = globalThis as unknown as Host;

function controller(): DshOverlayController | undefined {
  return host[DSH_CONTROLLER_KEY] as DshOverlayController | undefined;
}

function core(
  id: 'code-gradient' | 'background' | 'squircle-corners',
  enabled: boolean,
  params: Record<string, unknown> = {}
): EffectSource {
  const manifest = normalizeEffectManifest({
    name: id,
    hosts: ['dsh'],
    core: id,
    order: 100,
    ...(id === 'squircle-corners'
      ? {
          params: {
            scale: { type: 'number', default: 1.78, min: 1, max: 2.4, step: 0.02 },
            shape: {
              type: 'select',
              default: 'squircle',
              options: [
                { value: 'squircle', label: 'squircle' },
                { value: 'strong', label: 'strong' },
              ],
            },
            scanHardcoded: { type: 'boolean', default: true },
          },
        }
      : {}),
  });
  return {
    id,
    hash: id,
    manifest,
    values: { enabled, ...params } as EffectValues,
  };
}

/** A plugin effect that styles the active tab, the way the accent effect does. */
function plugin(name: string, order: number): EffectSource {
  return {
    id: name,
    hash: name,
    manifest: normalizeEffectManifest({
      name,
      hosts: ['dsh'],
      order,
      params: {
        width: { type: 'number', default: 6, min: 1, max: 16, step: 0.5 },
      },
    }),
    values: { enabled: true, width: 6 } as EffectValues,
    factory: (module) => {
      module.exports = (ctx: {
        host: string;
        params: EffectValues;
        style: (css: string) => void;
        selectors: Record<string, string>;
      }) => {
        const render = (): void => {
          ctx.style(
            `${ctx.selectors.activeTab}::after { content: "${ctx.host}"; width: ${String(ctx.params.width)}px; }`
          );
        };
        render();
        return { update: render };
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
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('dsh overlay', () => {
  it('runs dsh effects, mounts core features with live preview, and cleans up completely', () => {
    page();
    const overlay = startDshOverlay({}, [
      plugin('accent', 80),
      core('squircle-corners', true, { scale: 1.78, shape: 'squircle', scanHardcoded: true }),
      core('background', true),
      core('code-gradient', true),
    ]);
    expect(overlay.effects().map((effect) => [effect.id, effect.state])).toEqual([
      ['accent', 'running'],
      ['background', 'core'],
      ['code-gradient', 'core'],
      ['squircle-corners', 'core'],
    ]);
    expect(styles()).toEqual(
      expect.arrayContaining([
        'woodfish-dsh-palette',
        'woodfish-dsh-corners',
        'woodfish-dsh-background',
        'woodfish-dsh-code',
      ])
    );
    expect(document.documentElement.dataset.woodfishDsh).toBe('1.0.0');

    // Instant live preview updates both CSS and plugin parameters without full reload.
    overlay.previewEffect('squircle-corners', { scale: 2.1, shape: 'strong' });
    expect(document.getElementById('woodfish-dsh-corners')?.textContent).toContain(
      '--squircle-k: 2.1;'
    );
    expect(document.getElementById('woodfish-dsh-corners')?.textContent).toContain(
      'superellipse(2.4)'
    );

    overlay.previewEffect('accent', { width: 12 });
    expect(document.getElementById('woodfish-dsh-fx-accent-js')?.textContent).toContain(
      'width: 12px;'
    );

    overlay.setUserCss(':root { --woodfish-accent-width: 9px; }');
    expect(document.querySelector('style[data-woodfish-user-css]')?.textContent).toContain(
      '--woodfish-accent-width: 9px'
    );

    overlay.update({}, [plugin('accent', 80), core('background', false)]);
    expect(document.getElementById('woodfish-dsh-background')).toBeNull();

    overlay.dispose();
    expect(styles()).toEqual([]);
    expect(document.documentElement.dataset.woodfishDsh).toBeUndefined();
    expect(controller()).toBeUndefined();
  });

  it('uses wrapped :is() selectors for multi-entry groups', () => {
    expect(DSH_EFFECT_SELECTORS.activeTab.startsWith(':is(')).toBe(true);
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

    const effectSink = sink();
    const stop = trackStreaming(effectSink);
    reply.removeAttribute('data-streaming');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(effectSink.ends).toEqual([{ source: 'ai' }]);
    expect(effectSink.carets.at(-1)?.visible).toBe(false);
    stop();
  });
});

describe('WoodfishClientRuntime', () => {
  it('applies changes live, syncs ThemeRuntime overrides, and persists through ConfigForm', async () => {
    page();
    let persisted: DshPersistedConfig = { ...DEFAULT_DSH_PERSISTED_CONFIG };
    const formListeners = new Set<() => void>();
    const mutations: SettingsPathOp[][] = [];
    const themeOverrides: Array<Record<string, { light: string; dark: string }>> = [];
    let appearance: 'light' | 'dark' | 'system' = 'dark';

    const ctx: DshClientContext = {
      slots: {
        inject: () => undefined,
        register: () => () => undefined,
      },
      configForms: {
        get: <T>() => ({
          getSnapshot: () =>
            ({
              status: 'ready',
              value: persisted as unknown as T,
              revision: 1,
              writable: true,
            }) as ConfigFormSnapshot<T>,
          subscribe: (listener) => {
            formListeners.add(listener);
            return () => formListeners.delete(listener);
          },
          set: async (field, value) => {
            persisted = { ...persisted, [field]: value as string };
            return true;
          },
          mutate: async (ops) => {
            mutations.push([...ops]);
            const next = { ...persisted } as Record<string, string>;
            for (const op of ops) {
              if (op.op === 'set' && op.path.length === 1) {
                next[op.path[0]] = String(op.value ?? '');
              }
            }
            persisted = next as unknown as DshPersistedConfig;
            return true;
          },
        }),
      },
      theme: {
        getTheme: () => ({
          preference: appearance,
          active: {
            id: appearance === 'light' ? 'light' : 'dark',
            colorScheme: appearance === 'light' ? 'light' : 'dark',
          },
          revision: 1,
        }),
        setTheme: (id) => {
          appearance = id as 'light' | 'dark' | 'system';
        },
        overrideTokens: (_source, tokens) => {
          themeOverrides.push(tokens);
          return () => undefined;
        },
      },
      effect: () => undefined,
      on: () => () => undefined,
    };

    const backgrounds: DshBackgroundClient = {
      load: () => Promise.reject(new Error('unused')),
      list: async () => [],
      upload: () => Promise.reject(new Error('unused')),
      remove: async () => undefined,
    };

    const runtime = new WoodfishClientRuntime(
      ctx,
      [
        plugin('accent', 80),
        core('squircle-corners', true, { scale: 1.78, shape: 'squircle', scanHardcoded: true }),
      ],
      backgrounds
    );

    runtime.setPalette('dark', 'dracula');
    runtime.setEffectParam('squircle-corners', { scale: 2.05, shape: 'strong' }, true);
    runtime.setUserCss(':root { --woodfish-accent-width: 11px; }', true);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(persisted.paletteDark).toBe('dracula');
    expect(JSON.parse(persisted.effectsJson)).toEqual({
      'squircle-corners': { scale: 2.05, shape: 'strong' },
    });
    expect(persisted.userCss).toBe(':root { --woodfish-accent-width: 11px; }');
    expect(themeOverrides.at(-1)?.['--woodfish-theme-sync']?.dark).toBe('dracula');
    expect(mutations.length).toBeGreaterThanOrEqual(3);

    runtime.resetEffect('squircle-corners');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(JSON.parse(persisted.effectsJson)).toEqual({});

    runtime.dispose();
  });
});
