import {
  DEFAULT_ANCHOR_HUE,
  GradientPreset,
  TokenGradientColors,
  deriveTokenGradient,
  isPunctuationOnly,
  pickAccentHue,
  rankPaletteAnchorHue,
} from '@woodfish/theme-core';
import { RUN_VARIABLES, clearRunVariables, linkGradientRuns } from './gradientRuns';

/** OKLCH tunables the engine applies to every token. */
export interface TextGradientParams {
  hueShift: number;
  lightnessDelta: number;
  neutralChroma: number;
}

/** What the host knows about the theme the text is painted on. */
export interface GradientContext {
  /** Background behind the tokens; derived stops stay at least as readable as the source. */
  background: string | null;
  /** Default text color; only it gets the rainbow. */
  foreground: string | null;
  /** Hand-tuned gradients of the active built-in theme, `null` for any other theme. */
  preset: GradientPreset | null;
}

const NO_CONTEXT: GradientContext = { background: null, foreground: null, preset: null };

/** Helpers handed to {@link TextGradientEngineOptions.themeSignature}. */
export interface ThemeSignatureHelpers {
  /** Up to 24 `className:color` pairs of the currently rendered tokens. */
  tokenPaletteSignature: () => string;
}

export interface TextGradientEngineOptions {
  /** Elements whose own text color gets a gradient, e.g. syntax-highlighted spans. */
  tokenSelector: string;
  /** Containers that are observed for token changes, e.g. an editor's line container. */
  rootSelector: string;
  /** Return false to leave a token untouched (and clear any previous Woodfish styling). */
  acceptToken?: (token: HTMLElement) => boolean;
  /**
   * Replaces a token's computed color before the gradient is derived from it, e.g. to
   * recolor output whose colors are fixed inline by the host into a palette.
   */
  mapColor?: (cssColor: string, token: HTMLElement) => string;
  params: TextGradientParams;
  /** Read again whenever the theme changes; without it every color is derived. */
  gradientContext?: () => GradientContext;
  /**
   * Join adjacent same-colored tokens into one continuous gradient (default true). Needed
   * where the host splits long tokens into several elements, as Monaco does.
   */
  continuousRuns?: boolean;
  /** CSS variables on `<html>`/`<body>` holding host accent colors; used as anchor hue fallback. */
  accentVariables: readonly string[];
  /** Attributes on `<html>`/`<body>` whose change means the host theme switched. */
  themeAttributes: readonly string[];
  /** A string that changes whenever the host theme changes; polled as a safety net. */
  themeSignature: (helpers: ThemeSignatureHelpers) => string;
  pollIntervalMs?: number;
  maxTokensPerFrame?: number;
}

export interface TextGradientEngine {
  /** Re-reads the theme, recomputes the anchor hue and repaints every token. */
  refresh: () => void;
  /** Applies new tunables to every token. */
  update: (params: TextGradientParams) => void;
  /**
   * Watches a root the engine cannot discover by `rootSelector`, such as an open shadow
   * root. It is dropped automatically once disconnected.
   */
  observeRoot: (root: Element | ShadowRoot) => void;
  dispose: () => void;
}

/** Marker and CSS variables written on each token; host CSS reads these. */
export const TOKEN_MARKER_ATTRIBUTE = 'data-woodfish-overlay-token';
export const TOKEN_VARIABLES = {
  /** Comma-separated color stops with positions, for `linear-gradient(angle, …)`. */
  gradientStops: '--woodfish-overlay-gradient-stops',
  /** A hand-tuned angle such as `45deg`; `initial` makes host CSS use its own setting. */
  gradientAngle: '--woodfish-overlay-gradient-angle',
  /** The token's own color. */
  gradientBase: '--woodfish-overlay-gradient-base',
  glowNear: '--woodfish-overlay-glow-near',
  glowMid: '--woodfish-overlay-glow-mid',
  glowFar: '--woodfish-overlay-glow-far',
  punctuationGlowNear: '--woodfish-overlay-punctuation-glow-near',
  punctuationGlowFar: '--woodfish-overlay-punctuation-glow-far',
} as const;

const DEFAULT_POLL_INTERVAL_MS = 1200;

/** `a 0%, b 50%, c 100%`: the stops spread evenly. */
export function formatGradientStops(stops: readonly string[]): string {
  const last = Math.max(1, stops.length - 1);
  return stops
    .map((stop, index) => `${stop} ${Number(((100 * index) / last).toFixed(2))}%`)
    .join(', ');
}
const DEFAULT_MAX_TOKENS_PER_FRAME = 600;
const PALETTE_SIGNATURE_LIMIT = 24;

/**
 * Gives every matching text element a gradient: the theme's hand-tuned one for its
 * computed color, or one derived from that color in OKLCH. Tokens are discovered with MutationObservers on the root containers and
 * painted in animation-frame batches; neutral colors borrow the dominant palette hue.
 */
export function startTextGradientEngine(options: TextGradientEngineOptions): TextGradientEngine {
  const tokenSelector = options.tokenSelector;
  const rootSelector = options.rootSelector;
  const acceptToken = options.acceptToken ?? ((): boolean => true);
  const MAX_TOKENS_PER_FRAME = options.maxTokensPerFrame ?? DEFAULT_MAX_TOKENS_PER_FRAME;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const continuousRuns = options.continuousRuns ?? true;
  let settings: TextGradientParams = { ...options.params };
  const pendingTokens = new Set<HTMLElement>();
  const tokenState = new WeakMap<
    HTMLElement,
    { profileVersion: number; cssColor: string; punctuation: boolean }
  >();
  const colorCache = new Map<string, TokenGradientColors | null>();
  const viewLineObservers = new Map<Element | ShadowRoot, MutationObserver>();
  let anchorHue = DEFAULT_ANCHOR_HUE;
  let context: GradientContext = NO_CONTEXT;
  let profileVersion = 0;
  let frameId = 0;
  let profileRefreshTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let hasTokenPalette = false;
  let disposed = false;

  function deriveTokenColors(cssColor: string, punctuation: boolean): TokenGradientColors | null {
    // The cache is cleared whenever the profile (anchor hue, context) is refreshed.
    const cacheKey = [
      cssColor,
      settings.hueShift,
      settings.lightnessDelta,
      settings.neutralChroma,
      punctuation ? 'punctuation' : 'token',
    ].join('|');
    const cached = colorCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = deriveTokenGradient(cssColor, {
      ...settings,
      anchorHue,
      punctuation,
      background: context.background,
      foreground: context.foreground,
      preset: context.preset,
    });
    if (result) {
      colorCache.set(cacheKey, result);
    }
    return result;
  }

  function applyToken(token: HTMLElement): void {
    if (!token.isConnected) {
      return;
    }
    if (!acceptToken(token)) {
      token.removeAttribute(TOKEN_MARKER_ATTRIBUTE);
      clearRunVariables(token);
      tokenState.delete(token);
      return;
    }

    const computed = getComputedStyle(token).color;
    const cssColor = options.mapColor ? options.mapColor(computed, token) : computed;
    const punctuation = isPunctuationOnly(token.textContent || '');
    const previous = tokenState.get(token);
    if (
      previous &&
      previous.profileVersion === profileVersion &&
      previous.cssColor === cssColor &&
      previous.punctuation === punctuation
    ) {
      return;
    }

    const colors = deriveTokenColors(cssColor, punctuation);
    if (!colors) {
      token.removeAttribute(TOKEN_MARKER_ATTRIBUTE);
      clearRunVariables(token);
      return;
    }

    token.style.setProperty(TOKEN_VARIABLES.gradientStops, formatGradientStops(colors.stops));
    token.style.setProperty(
      TOKEN_VARIABLES.gradientAngle,
      colors.angle === null ? 'initial' : `${colors.angle}deg`
    );
    token.style.setProperty(TOKEN_VARIABLES.gradientBase, colors.base);
    token.style.setProperty(TOKEN_VARIABLES.glowNear, colors.glowNear);
    token.style.setProperty(TOKEN_VARIABLES.glowMid, colors.glowMid);
    token.style.setProperty(TOKEN_VARIABLES.glowFar, colors.glowFar);
    token.style.setProperty(TOKEN_VARIABLES.punctuationGlowNear, colors.punctuationNear);
    token.style.setProperty(TOKEN_VARIABLES.punctuationGlowFar, colors.punctuationFar);
    token.dataset.woodfishOverlayToken = 'true';
    token.dataset.woodfishNeutral = colors.neutral ? 'true' : 'false';
    token.dataset.woodfishPunctuation = punctuation ? 'true' : 'false';
    token.dataset.woodfishPreset = colors.preset ? 'true' : 'false';
    tokenState.set(token, {
      profileVersion,
      cssColor,
      punctuation,
    });
  }

  /** Gradient identity of a painted token, for joining runs. */
  function runKey(element: Element): string | null {
    // Duck-typed: the marker lives in the dataset, so no global HTMLElement is needed.
    const token = element as HTMLElement;
    if (token.dataset?.woodfishOverlayToken !== 'true') {
      return null;
    }
    const state = tokenState.get(token);
    return state && state.profileVersion === profileVersion ? state.cssColor : null;
  }

  function flushTokens(): void {
    frameId = 0;
    let processed = 0;
    const touchedParents = new Set<Element>();
    for (const token of pendingTokens) {
      pendingTokens.delete(token);
      applyToken(token);
      if (continuousRuns && token.isConnected && token.parentElement) {
        touchedParents.add(token.parentElement);
      }
      processed += 1;
      if (processed >= MAX_TOKENS_PER_FRAME) {
        break;
      }
    }
    for (const parent of touchedParents) {
      linkGradientRuns(parent, runKey);
    }

    if (pendingTokens.size > 0) {
      frameId = requestAnimationFrame(flushTokens);
    }
  }

  function queueToken(token: HTMLElement): void {
    pendingTokens.add(token);
    if (frameId === 0) {
      frameId = requestAnimationFrame(flushTokens);
    }
  }

  function queueTokensFromNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const token = node.parentElement && node.parentElement.closest<HTMLElement>(tokenSelector);
      if (token) {
        queueToken(token);
      }
      return;
    }
    if (typeof ShadowRoot !== 'undefined' && node instanceof ShadowRoot) {
      for (const token of node.querySelectorAll<HTMLElement>(tokenSelector)) {
        queueToken(token);
      }
      return;
    }
    if (!(node instanceof Element)) {
      return;
    }
    if (node.matches(tokenSelector)) {
      queueToken(node as HTMLElement);
    }
    for (const token of node.querySelectorAll<HTMLElement>(tokenSelector)) {
      queueToken(token);
    }
  }

  function attachViewLines(root: Element | ShadowRoot): void {
    if (viewLineObservers.has(root)) {
      return;
    }

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') {
          queueTokensFromNode(record.target);
          continue;
        }
        if (record.type === 'attributes') {
          queueTokensFromNode(record.target);
          continue;
        }
        for (const node of record.addedNodes) {
          queueTokensFromNode(node);
        }
      }
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    viewLineObservers.set(root, observer);
    queueTokensFromNode(root);
    if (!hasTokenPalette) {
      scheduleProfileRefresh();
    }
  }

  function pruneViewLines(): void {
    for (const [root, observer] of viewLineObservers) {
      if (!root.isConnected) {
        observer.disconnect();
        viewLineObservers.delete(root);
      }
    }
  }

  function discoverViewLines(node: Node): void {
    if (!(node instanceof Element)) {
      return;
    }
    if (node.matches(rootSelector)) {
      attachViewLines(node);
    }
    for (const root of node.querySelectorAll(rootSelector)) {
      attachViewLines(root);
    }
  }

  function fallbackAccentHue(): number {
    const styles = [getComputedStyle(document.documentElement), getComputedStyle(document.body)];
    const accentColors = styles.flatMap((style) =>
      options.accentVariables.map((variableName) => style.getPropertyValue(variableName))
    );
    return pickAccentHue(accentColors) ?? DEFAULT_ANCHOR_HUE;
  }

  function resolveAnchorHue(): number {
    const tokenColors: string[] = [];
    for (const token of document.querySelectorAll(tokenSelector)) {
      const text = (token.textContent || '').replace(/\u00a0/g, ' ').trim();
      if (!text || isPunctuationOnly(text)) {
        continue;
      }
      tokenColors.push(getComputedStyle(token).color);
    }

    const paletteHue = rankPaletteAnchorHue(tokenColors);
    hasTokenPalette = paletteHue !== null;
    return paletteHue ?? fallbackAccentHue();
  }

  function refreshProfile(): void {
    if (disposed) {
      return;
    }
    if (profileRefreshTimer !== null) {
      globalThis.clearTimeout(profileRefreshTimer);
      profileRefreshTimer = null;
    }
    anchorHue = resolveAnchorHue();
    context = options.gradientContext ? options.gradientContext() : NO_CONTEXT;
    profileVersion += 1;
    colorCache.clear();
    pruneViewLines();
    for (const root of viewLineObservers.keys()) {
      queueTokensFromNode(root);
    }
    document.documentElement.dataset.woodfishOverlayProfile = `h${anchorHue.toFixed(1)}`;
  }

  function scheduleProfileRefresh(): void {
    if (profileRefreshTimer !== null) {
      return;
    }
    profileRefreshTimer = globalThis.setTimeout(refreshProfile, 60);
  }

  function tokenPaletteSignature(): string {
    const palette = new Map<string, string>();
    for (const token of document.querySelectorAll(tokenSelector)) {
      const className = token.className;
      if (typeof className !== 'string' || palette.has(className)) {
        continue;
      }
      palette.set(className, getComputedStyle(token).color);
      if (palette.size >= PALETTE_SIGNATURE_LIMIT) {
        break;
      }
    }

    return [...palette.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([className, color]) => `${className}:${color}`)
      .join(',');
  }

  const signatureHelpers: ThemeSignatureHelpers = { tokenPaletteSignature };
  const themeSignature = (): string => options.themeSignature(signatureHelpers);

  const discoveryObserver = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        discoverViewLines(node);
      }
    }
  });
  discoveryObserver.observe(document.body, { childList: true, subtree: true });

  for (const root of document.querySelectorAll(rootSelector)) {
    attachViewLines(root);
  }

  let lastThemeSignature = themeSignature();
  const themeObserver = new MutationObserver(() => {
    scheduleProfileRefresh();
  });
  const themeAttributeFilter = [...options.themeAttributes];
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: themeAttributeFilter,
  });
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: themeAttributeFilter,
  });

  const themeInterval = globalThis.setInterval(() => {
    pruneViewLines();
    const nextSignature = themeSignature();
    if (nextSignature !== lastThemeSignature) {
      lastThemeSignature = nextSignature;
      scheduleProfileRefresh();
    }
  }, pollIntervalMs);

  refreshProfile();

  return {
    refresh: refreshProfile,
    update: (params: TextGradientParams): void => {
      settings = { ...params };
      refreshProfile();
    },
    observeRoot: (root: Element | ShadowRoot): void => {
      if (!disposed) {
        attachViewLines(root);
      }
    },
    dispose: (): void => {
      if (disposed) {
        return;
      }
      disposed = true;
      discoveryObserver.disconnect();
      themeObserver.disconnect();
      for (const observer of viewLineObservers.values()) {
        observer.disconnect();
      }
      viewLineObservers.clear();
      globalThis.clearInterval(themeInterval);
      if (profileRefreshTimer !== null) {
        globalThis.clearTimeout(profileRefreshTimer);
      }
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
      delete document.documentElement.dataset.woodfishOverlayProfile;
    },
  };
}

/**
 * Removes the marker and CSS variables the engine wrote. The VS Code host leaves them in
 * place on dispose (Monaco re-renders tokens anyway); hosts with long-lived DOM call this.
 */
export function clearTextGradientMarks(root: ParentNode = document): void {
  for (const token of root.querySelectorAll<HTMLElement>(`[${TOKEN_MARKER_ATTRIBUTE}]`)) {
    token.removeAttribute(TOKEN_MARKER_ATTRIBUTE);
    delete token.dataset.woodfishNeutral;
    delete token.dataset.woodfishPunctuation;
    delete token.dataset.woodfishPreset;
    for (const variable of [...Object.values(TOKEN_VARIABLES), ...Object.values(RUN_VARIABLES)]) {
      token.style.removeProperty(variable);
    }
    if (token.getAttribute('style') === '') {
      token.removeAttribute('style');
    }
  }
}
