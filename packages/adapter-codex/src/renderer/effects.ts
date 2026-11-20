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
  startEffectHost,
  startReveal,
  watchEditableTyping,
  watchStream,
} from '@woodfish/renderer-runtime';
import { EffectValues, findGradientPreset } from '@woodfish/theme-core';
import { BODY_TEXT_SELECTOR, CODEX_SELECTORS, CodexSelectorGroup } from '../selectors';
import { CodexSettings, findCodexPalette } from '../settings';

/*
 * Codex's side of the effect plugins: what `ctx.theme()`, `ctx.selectors` and `ctx.lib`
 * hold in Codex, and where the shared events come from. Typing in the composer and the
 * reply Codex is streaming both become "text inserted here" and "the caret is here".
 */

const STREAM_POLL_MS = 400;
const HEX = /#[0-9a-f]{6}\b/gi;

function joined(group: CodexSelectorGroup): string {
  return CODEX_SELECTORS[group].selectors.join(', ');
}

/** Selectors effects may use (`ctx.selectors`), one string each. */
export const CODEX_EFFECT_SELECTORS: Readonly<Record<string, string>> = Object.freeze({
  composer: joined('composer'),
  composerSurface: joined('composerSurface'),
  composerEditor: joined('composerEditor'),
  composerPrimaryButton: joined('composerPrimaryButton'),
  composerMenuHeader: joined('composerMenuHeader'),
  editorRoot: joined('composer'),
  threadRow: joined('sidebarThreadRow'),
  activeThread: joined('sidebarActiveThread'),
  runningThread: joined('sidebarRunningThread'),
  assistantMarkdown: joined('assistantMarkdown'),
  userMessage: joined('userMessage'),
  bodyText: BODY_TEXT_SELECTOR,
  activeTab: joined('activeTab'),
  floatingLayer: joined('floatingLayer'),
  revealTarget: joined('revealTarget'),
  timeline: joined('timeline'),
});

/** Shared helpers effects may call (`ctx.lib`). */
export const CODEX_EFFECT_LIB: Readonly<Record<string, unknown>> = Object.freeze({
  startReveal,
  mountAcrylicFilter,
  acrylicFilterId: ACRYLIC_FILTER_ID,
  noiseDataUri: buildNoiseDataUri,
});

function hexColors(value: string | undefined): string[] {
  return value ? (value.match(HEX) ?? []) : [];
}

/** The theme as effects see it, for the appearance mode Codex shows right now. */
export function codexEffectTheme(settings: CodexSettings): EffectTheme {
  const root = document.documentElement;
  const mode = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const slug = settings.palette[mode];
  const palette = slug ? findCodexPalette(slug) : null;
  const style = getComputedStyle(root);
  const variable = (name: string): string => style.getPropertyValue(name).trim();
  const accent = palette?.ui.accent ?? (variable('--app-color-text-accent') || '#339cff');
  const accent2 = palette?.ui.accent2 ?? accent;
  const background =
    palette?.ui.bg ??
    (variable('--app-color-background-surface') || (mode === 'dark' ? '#181818' : '#ffffff'));
  const foreground =
    palette?.ui.fg ??
    (getComputedStyle(document.body).color || (mode === 'dark' ? '#ffffff' : '#000000'));
  const cursor = palette?.meta.runtime?.cursorDefaults?.gradientStops ?? null;
  const tab = hexColors(palette?.meta.tabBorderGradient);
  const preset = slug ? findGradientPreset(slug) : null;
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

/** Set on the sidebar row of the thread Codex shows (the `sidebarActiveThread` selector). */
const ACTIVE_THREAD_ATTRIBUTE = 'data-app-action-sidebar-thread-active';

/**
 * Finds the reply Codex is streaming: the active thread shows its spinner and its last
 * assistant reply comes after the last user message. Codex keeps recently visited threads
 * mounted but hidden, so only the thread on screen counts. A light poll, no observer on the
 * whole thread.
 */
export function findStreamingReply(): Element | null {
  const running = `${CODEX_SELECTORS.sidebarRunningThread.selectors[0]}${CODEX_SELECTORS.sidebarActiveThread.selectors[0]}`;
  if (!document.querySelector(running)) {
    return null;
  }
  const thread = [...document.querySelectorAll(joined('timeline'))].find(
    (timeline) => timeline.getClientRects().length > 0
  );
  if (!thread) {
    return null;
  }
  const replies = thread.querySelectorAll(joined('assistantMarkdown'));
  const users = thread.querySelectorAll(joined('userMessage'));
  const reply = replies[replies.length - 1] ?? null;
  const user = users[users.length - 1] ?? null;
  const afterUser =
    reply !== null &&
    (user === null ||
      (user.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
  return afterUser ? reply : null;
}

/** The reply's text is hidden from the top of the strip behind the composer downwards. */
function coverByComposer(reply: Element): (area: ClipRect) => ClipRect {
  // Found once per reply: it sits after the whole thread in the DOM.
  let strip = reply.closest(joined('timeline'))?.querySelector(joined('threadFooter')) ?? null;
  return (area) => {
    if (strip && !strip.isConnected) {
      strip = reply.closest(joined('timeline'))?.querySelector(joined('threadFooter')) ?? null;
    }
    return strip ? cutArea(area, { ...area, bottom: strip.getBoundingClientRect().top }) : area;
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
      // The composer may have grown over the caret or a menu opened on it meanwhile.
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
  // Leaving the thread ends its effects at once instead of at the next poll.
  const switches = new MutationObserver(tick);
  switches.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: [ACTIVE_THREAD_ATTRIBUTE],
  });
  const timer = globalThis.setInterval(tick, STREAM_POLL_MS);
  tick();
  return () => {
    globalThis.clearInterval(timer);
    switches.disconnect();
    document.removeEventListener('scroll', onScroll, { capture: true });
    end();
  };
}

export interface CodexEffectsOptions {
  settings: () => CodexSettings;
  nodeAttributes: Readonly<Record<string, string>>;
  idPrefix: string;
  core: (name: string, values: EffectValues | null) => void;
  onError: (id: string, message: string) => void;
}

export interface CodexEffects {
  host: EffectHostApi;
  dispose: Disposer;
}

/** Starts the effect host in Codex together with its event sources. */
export function startCodexEffects(options: CodexEffectsOptions): CodexEffects {
  const host = startEffectHost({
    host: 'codex',
    theme: () => codexEffectTheme(options.settings()),
    selectors: CODEX_EFFECT_SELECTORS,
    lib: CODEX_EFFECT_LIB,
    idPrefix: options.idPrefix,
    nodeAttributes: options.nodeAttributes,
    reducedMotion: () => document.documentElement.getAttribute('data-reduced-motion') === 'true',
    core: options.core,
    onError: options.onError,
    log: (id, message) => console.warn(`[Woodfish] 效果 ${id}：${message}`),
  });
  const typing = watchEditableTyping(CODEX_EFFECT_SELECTORS.composerEditor, host);
  const streaming = trackStreaming(host);
  // Codex switches appearance through attributes on <html>.
  const themeObserver = new MutationObserver(() => host.themeChanged());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });
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
