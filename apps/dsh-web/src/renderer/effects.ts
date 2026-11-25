import {
  ACRYLIC_FILTER_ID,
  ClipRect,
  Disposer,
  EffectHostApi,
  EffectTheme,
  StreamWatcher,
  buildNoiseDataUri,
  cutArea,
  mountAcrylicFilter,
  placeCaretLayer,
  startEffectHost,
  startReveal,
  watchEditableTyping,
  watchStream,
} from '@woodfish/renderer-runtime';
import { EffectValues, findGradientPreset } from '@woodfish/theme-core';
import { BODY_TEXT_SELECTOR, selectorOf } from '../selectors';
import { DshSettings, findDshPalette } from '../settings';

/*
 * dsh's side of the effect plugins, the same contract as in Codex: what `ctx.theme()`,
 * `ctx.selectors` and `ctx.lib` hold, and where the shared events come from. Typing in the
 * composer and the reply dsh is streaming both become "text inserted here" and "the caret
 * is here", so the caret, its trail, the particles and the reveal behave as in Codex.
 */

const STREAM_POLL_MS = 400;
const HEX = /#[0-9a-f]{6}\b/gi;

/**
 * One selector per name: effects append pseudo-classes and pseudo-elements (`::after`,
 * `:hover`), which would only reach the last entry of a plain list.
 */
function single(selector: string): string {
  return selector.includes(',') ? `:is(${selector})` : selector;
}

/** Selectors effects may use (`ctx.selectors`), under the names the Codex host uses. */
export const DSH_EFFECT_SELECTORS: Readonly<Record<string, string>> = Object.freeze({
  composer: single(selectorOf('composer')),
  composerSurface: single(selectorOf('composer')),
  composerEditor: single(selectorOf('composerEditor')),
  composerPrimaryButton: single(selectorOf('composerSendButton')),
  editorRoot: single(selectorOf('composer')),
  threadRow: single(selectorOf('sessionRow')),
  activeThread: single(selectorOf('activeSession')),
  runningThread: single(selectorOf('runningSession')),
  assistantMarkdown: single(selectorOf('assistantStep')),
  userMessage: single(selectorOf('userMessage')),
  bodyText: single(BODY_TEXT_SELECTOR),
  activeTab: single(selectorOf('activeTab')),
  floatingLayer: single(selectorOf('floatingLayer')),
  revealTarget: single(selectorOf('menuItem')),
  timeline: single(selectorOf('timeline')),
});

/** Shared helpers effects may call (`ctx.lib`). */
export const DSH_EFFECT_LIB: Readonly<Record<string, unknown>> = Object.freeze({
  placeCaretLayer,
  startReveal,
  mountAcrylicFilter,
  acrylicFilterId: ACRYLIC_FILTER_ID,
  noiseDataUri: buildNoiseDataUri,
});

function hexColors(value: string | undefined): string[] {
  return value ? (value.match(HEX) ?? []) : [];
}

function isDark(): boolean {
  return document.body?.hasAttribute('data-ds-dark-theme') ?? false;
}

/** The theme as effects see it, for the appearance mode dsh shows right now. */
export function dshEffectTheme(settings: DshSettings): EffectTheme {
  const mode = isDark() ? 'dark' : 'light';
  const slug = settings.palette[mode];
  const palette = slug ? (findDshPalette(slug) ?? null) : null;
  const style = getComputedStyle(document.body ?? document.documentElement);
  const variable = (name: string): string => style.getPropertyValue(name).trim();
  const accent =
    palette?.ui.accent ?? (variable('--dsw-alias-state-business-primary') || '#4176e6');
  const accent2 = palette?.ui.accent2 ?? accent;
  const background =
    palette?.ui.bg ??
    (variable('--dsw-alias-bg-base') || (mode === 'dark' ? '#151517' : '#ffffff'));
  const foreground =
    palette?.ui.fg ??
    (variable('--dsw-alias-label-primary') || (mode === 'dark' ? '#f9fafb' : '#0f1115'));
  const cursor = palette?.meta.runtime?.cursorDefaults?.gradientStops ?? null;
  const tab = hexColors(palette?.meta.tabBorderGradient);
  const preset = palette ? findGradientPreset(palette.slug) : null;
  const tuned = preset?.tokens[preset.foreground];
  return {
    mode,
    stops: cursor ?? (tab.length > 1 ? tab : [accent, accent2]),
    accent,
    accent2,
    background,
    foreground,
    cursor: cursor ? [...cursor] : null,
    reply: tuned ? `linear-gradient(${tuned.angle}deg, ${tuned.stops.join(', ')})` : null,
  };
}

/** The reply dsh is writing right now (it marks it with `data-streaming`), if one is on screen. */
export function findStreamingReply(): Element | null {
  const marked = [...document.querySelectorAll(selectorOf('streamingReply'))].filter(
    (element) => element.getClientRects().length > 0
  );
  return marked[marked.length - 1] ?? null;
}

/**
 * The reply scrolls under the bar that holds the composer; its text is hidden from the top
 * of the composer card down.
 */
function coverByComposer(reply: Element): (area: ClipRect) => ClipRect {
  const find = (): Element | null =>
    reply.closest('[data-conversation-scroll]')?.querySelector(selectorOf('composer')) ?? null;
  let composer = find();
  return (area) => {
    if (!composer?.isConnected) {
      composer = find();
    }
    return composer
      ? cutArea(area, { ...area, bottom: composer.getBoundingClientRect().top })
      : area;
  };
}

/** Feeds the host with the reply being streamed: inserts, the AI caret, and its end. */
export function trackStreaming(host: EffectHostApi): Disposer {
  let reply: Element | null = null;
  let watcher: StreamWatcher | null = null;

  function end(): void {
    watcher?.dispose();
    watcher = null;
    if (reply) {
      reply = null;
      host.caret({ x: 0, y: 0, width: 0, height: 0, source: 'ai', visible: false });
      host.streamEnd({ source: 'ai' });
    }
  }

  function tick(): void {
    const next = findStreamingReply();
    if (next === reply) {
      watcher?.reposition();
      return;
    }
    end();
    if (next) {
      reply = next;
      watcher = watchStream(next, host, { cover: coverByComposer(next) });
    }
  }

  const onScroll = (): void => watcher?.reposition();
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  // dsh adds and removes `data-streaming` as replies start and finish, and switching
  // sessions replaces the flow: both end or start a reply at once instead of at the poll.
  const changes = new MutationObserver(tick);
  changes.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-streaming', 'aria-selected'],
  });
  const timer = globalThis.setInterval(tick, STREAM_POLL_MS);
  tick();
  return () => {
    globalThis.clearInterval(timer);
    changes.disconnect();
    document.removeEventListener('scroll', onScroll, { capture: true });
    end();
  };
}

export interface DshEffectsOptions {
  settings: () => DshSettings;
  idPrefix: string;
  core: (name: string, values: EffectValues | null) => void;
  onError: (id: string, message: string) => void;
}

export interface DshEffects {
  host: EffectHostApi;
  dispose: Disposer;
}

/** Starts the effect host in dsh together with its event sources. */
export function startDshEffects(options: DshEffectsOptions): DshEffects {
  const host = startEffectHost({
    host: 'dsh',
    theme: () => dshEffectTheme(options.settings()),
    selectors: DSH_EFFECT_SELECTORS,
    lib: DSH_EFFECT_LIB,
    idPrefix: options.idPrefix,
    core: options.core,
    onError: options.onError,
    log: (id, message) => console.warn(`[Woodfish] 效果 ${id}：${message}`),
  });
  const typing = watchEditableTyping(DSH_EFFECT_SELECTORS.composerEditor, host);
  const streaming = trackStreaming(host);
  // dsh switches appearance through an attribute on <body>.
  const themeObserver = new MutationObserver(() => host.themeChanged());
  if (document.body) {
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-ds-dark-theme'],
    });
  }
  return {
    host,
    dispose: (): void => {
      themeObserver.disconnect();
      typing();
      streaming();
      host.dispose();
    },
  };
}
