/*
 * Woodfish overlay bootstrap for the VS Code workbench renderer.
 *
 * Built by `scripts/build-browser-runtime.js` into `themes/shared/overlay-bootstrap.js`
 * (a self-contained IIFE). Color math comes from `@woodfish/theme-core`; everything
 * here is Monaco/workbench specific: selectors, observers and CSS variable plumbing.
 */
import {
  DEFAULT_ANCHOR_HUE,
  DEFAULT_GLASS,
  DEFAULT_TEXT_GRADIENT,
  TokenGradientColors,
  deriveTokenGradient,
  isPunctuationOnly,
  pickAccentHue,
  rankPaletteAnchorHue,
} from '@woodfish/theme-core';

declare const __WOODFISH_VERSION__: string;

type OverlayController = {
  version: string;
  refresh: () => void;
  dispose: () => void;
};

type ControllerHost = typeof globalThis & {
  __woodfishOverlayController?: Partial<OverlayController>;
};

type Disposer = () => void;
type StartStep = () => (() => void) | void;

const VERSION = __WOODFISH_VERSION__;
const TOKEN_SELECTOR =
  '.monaco-editor .view-lines span[class*="mtk"]:not(.cursor):not(.colorpicker-color-decoration)';
const VIEW_LINES_SELECTOR = '.monaco-editor .view-lines';
const MAX_TOKENS_PER_FRAME = 600;
const THEME_POLL_INTERVAL_MS = 1200;
const ACCENT_VARIABLES = [
  '--vscode-activityBarBadge-background',
  '--vscode-editorCursor-foreground',
  '--vscode-focusBorder',
  '--vscode-textLink-foreground',
];

const controllerHost = globalThis as ControllerHost;
const previousController = controllerHost.__woodfishOverlayController;
if (previousController && typeof previousController.dispose === 'function') {
  previousController.dispose();
}

// Monaco itself only puts `mtk*` color/font-style classes and bracket-pair colors on
// token spans. Any other class is an inline decoration from another extension that
// sets its own text color (Minecraft Color Highlighter, #15); keep its exact color.
const OWN_TOKEN_CLASS = /^(?:mtk\w*|bracket-highlighting-\d+)$/;

function hasForeignDecoration(token: Element): boolean {
  const className = token.className;
  if (typeof className !== 'string') {
    return false;
  }
  return className.split(/\s+/).some((name) => name.length > 0 && !OWN_TOKEN_CLASS.test(name));
}

function readNumberVariable(name: string, fallback: number): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  );
  return Number.isFinite(value) ? value : fallback;
}

function readStringVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const disposers: Disposer[] = [];

function startTokens(): (() => void) | void {
  if (readNumberVariable('--woodfish-overlay-tokens', 1) !== 1) {
    return;
  }

  const settings = {
    hueShift: readNumberVariable('--woodfish-overlay-hue-shift', DEFAULT_TEXT_GRADIENT.hueShift),
    lightnessDelta: readNumberVariable(
      '--woodfish-overlay-lightness-delta',
      DEFAULT_TEXT_GRADIENT.lightnessDelta
    ),
    neutralChroma: readNumberVariable(
      '--woodfish-overlay-neutral-chroma',
      DEFAULT_TEXT_GRADIENT.neutralChroma
    ),
  };
  const pendingTokens = new Set<HTMLElement>();
  const tokenState = new WeakMap<
    HTMLElement,
    { profileVersion: number; cssColor: string; punctuation: boolean }
  >();
  const colorCache = new Map<string, TokenGradientColors | null>();
  const viewLineObservers = new Map<Element, MutationObserver>();
  let anchorHue = DEFAULT_ANCHOR_HUE;
  let profileVersion = 0;
  let frameId = 0;
  let profileRefreshTimer = 0;
  let hasTokenPalette = false;

  function deriveTokenColors(cssColor: string, punctuation: boolean): TokenGradientColors | null {
    const cacheKey = [
      cssColor,
      anchorHue.toFixed(3),
      settings.hueShift,
      settings.lightnessDelta,
      settings.neutralChroma,
      punctuation ? 'punctuation' : 'token',
    ].join('|');
    const cached = colorCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = deriveTokenGradient(cssColor, { ...settings, anchorHue, punctuation });
    if (result) {
      colorCache.set(cacheKey, result);
    }
    return result;
  }

  function applyToken(token: HTMLElement): void {
    if (!token.isConnected) {
      return;
    }
    if (hasForeignDecoration(token)) {
      token.removeAttribute('data-woodfish-overlay-token');
      tokenState.delete(token);
      return;
    }

    const cssColor = getComputedStyle(token).color;
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
      token.removeAttribute('data-woodfish-overlay-token');
      return;
    }

    token.style.setProperty('--woodfish-overlay-gradient-light', colors.light);
    token.style.setProperty('--woodfish-overlay-gradient-base', colors.base);
    token.style.setProperty('--woodfish-overlay-gradient-dark', colors.dark);
    token.style.setProperty('--woodfish-overlay-glow-near', colors.glowNear);
    token.style.setProperty('--woodfish-overlay-glow-mid', colors.glowMid);
    token.style.setProperty('--woodfish-overlay-glow-far', colors.glowFar);
    token.style.setProperty('--woodfish-overlay-punctuation-glow-near', colors.punctuationNear);
    token.style.setProperty('--woodfish-overlay-punctuation-glow-far', colors.punctuationFar);
    token.dataset.woodfishOverlayToken = 'true';
    token.dataset.woodfishNeutral = colors.neutral ? 'true' : 'false';
    token.dataset.woodfishPunctuation = punctuation ? 'true' : 'false';
    tokenState.set(token, {
      profileVersion,
      cssColor,
      punctuation,
    });
  }

  function flushTokens(): void {
    frameId = 0;
    let processed = 0;
    for (const token of pendingTokens) {
      pendingTokens.delete(token);
      applyToken(token);
      processed += 1;
      if (processed >= MAX_TOKENS_PER_FRAME) {
        break;
      }
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
      const token = node.parentElement && node.parentElement.closest<HTMLElement>(TOKEN_SELECTOR);
      if (token) {
        queueToken(token);
      }
      return;
    }
    if (!(node instanceof Element)) {
      return;
    }
    if (node.matches(TOKEN_SELECTOR)) {
      queueToken(node as HTMLElement);
    }
    for (const token of node.querySelectorAll<HTMLElement>(TOKEN_SELECTOR)) {
      queueToken(token);
    }
  }

  function attachViewLines(root: Element): void {
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
    if (node.matches(VIEW_LINES_SELECTOR)) {
      attachViewLines(node);
    }
    for (const root of node.querySelectorAll(VIEW_LINES_SELECTOR)) {
      attachViewLines(root);
    }
  }

  function fallbackAccentHue(): number {
    const styles = [getComputedStyle(document.documentElement), getComputedStyle(document.body)];
    const accentColors = styles.flatMap((style) =>
      ACCENT_VARIABLES.map((variableName) => style.getPropertyValue(variableName))
    );
    return pickAccentHue(accentColors) ?? DEFAULT_ANCHOR_HUE;
  }

  function resolveAnchorHue(): number {
    const tokenColors: string[] = [];
    for (const token of document.querySelectorAll(TOKEN_SELECTOR)) {
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
    if (profileRefreshTimer !== 0) {
      globalThis.clearTimeout(profileRefreshTimer);
      profileRefreshTimer = 0;
    }
    anchorHue = resolveAnchorHue();
    profileVersion += 1;
    colorCache.clear();
    pruneViewLines();
    for (const root of viewLineObservers.keys()) {
      queueTokensFromNode(root);
    }
    document.documentElement.dataset.woodfishOverlayProfile = `h${anchorHue.toFixed(1)}`;
  }

  function scheduleProfileRefresh(): void {
    if (profileRefreshTimer !== 0) {
      return;
    }
    profileRefreshTimer = globalThis.setTimeout(refreshProfile, 60);
  }

  function tokenPaletteSignature(): string {
    const palette = new Map<string, string>();
    for (const token of document.querySelectorAll(TOKEN_SELECTOR)) {
      const className = token.className;
      if (typeof className !== 'string' || palette.has(className)) {
        continue;
      }
      palette.set(className, getComputedStyle(token).color);
      if (palette.size >= 24) {
        break;
      }
    }

    return [...palette.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([className, color]) => `${className}:${color}`)
      .join(',');
  }

  function themeSignature(): string {
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    return [
      rootStyle.getPropertyValue('--vscode-editor-background'),
      rootStyle.getPropertyValue('--vscode-editor-foreground'),
      rootStyle.getPropertyValue('--vscode-activityBarBadge-background'),
      bodyStyle.getPropertyValue('--vscode-editor-background'),
      document.documentElement.className,
      document.body.className,
      tokenPaletteSignature(),
    ].join('|');
  }

  const discoveryObserver = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        discoverViewLines(node);
      }
    }
  });
  discoveryObserver.observe(document.body, { childList: true, subtree: true });

  for (const root of document.querySelectorAll(VIEW_LINES_SELECTOR)) {
    attachViewLines(root);
  }

  let lastThemeSignature = themeSignature();
  const themeObserver = new MutationObserver(() => {
    scheduleProfileRefresh();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-color-theme'],
  });
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'data-color-theme'],
  });

  const themeInterval = globalThis.setInterval(() => {
    pruneViewLines();
    const nextSignature = themeSignature();
    if (nextSignature !== lastThemeSignature) {
      lastThemeSignature = nextSignature;
      scheduleProfileRefresh();
    }
  }, THEME_POLL_INTERVAL_MS);

  refreshProfile();

  disposers.push(() => {
    discoveryObserver.disconnect();
    themeObserver.disconnect();
    for (const observer of viewLineObservers.values()) {
      observer.disconnect();
    }
    viewLineObservers.clear();
    globalThis.clearInterval(themeInterval);
    if (profileRefreshTimer !== 0) {
      globalThis.clearTimeout(profileRefreshTimer);
    }
    if (frameId !== 0) {
      cancelAnimationFrame(frameId);
    }
    delete document.documentElement.dataset.woodfishOverlayProfile;
  });
  return refreshProfile;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const ACRYLIC_FILTER_ID = 'woodfish-acrylic';

function svgElement(name: string, attributes: Record<string, string | number>): Element {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

// Acrylic recipe (Fluent): backdrop blur, a luminosity-preserving tint applied by CSS,
// and a faint monochrome grain so large surfaces do not look like flat smears.
function startAcrylicFilter(): void {
  if (readStringVariable('--woodfish-glass-mode') !== 'acrylic') {
    return;
  }

  const blur = Math.max(0, readNumberVariable('--woodfish-glass-blur', DEFAULT_GLASS.blur));
  const host = svgElement('svg', {
    width: 0,
    height: 0,
    'aria-hidden': 'true',
    'data-woodfish-theme': 'acrylic',
    style: 'position:absolute;width:0;height:0;pointer-events:none',
  });
  const filter = svgElement('filter', {
    id: ACRYLIC_FILTER_ID,
    x: 0,
    y: 0,
    width: '100%',
    height: '100%',
    'color-interpolation-filters': 'sRGB',
  });
  filter.append(
    svgElement('feGaussianBlur', {
      in: 'SourceGraphic',
      stdDeviation: blur,
      edgeMode: 'duplicate',
      result: 'blur',
    }),
    svgElement('feTurbulence', {
      type: 'fractalNoise',
      baseFrequency: 0.8,
      numOctaves: 3,
      stitchTiles: 'stitch',
      result: 'noise',
    }),
    svgElement('feColorMatrix', {
      in: 'noise',
      type: 'matrix',
      values: '0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.03 0',
      result: 'grain',
    }),
    svgElement('feBlend', { in: 'grain', in2: 'blur', mode: 'overlay' })
  );
  const definitions = svgElement('defs', {});
  host.append(definitions);
  definitions.append(filter);
  document.body.append(host);
  disposers.push(() => host.remove());
}

const REVEAL_TARGETS = [
  '.monaco-list-row',
  '.action-menu-item',
  '.monaco-button',
  '.tabs-container > .tab',
  '.statusbar-item',
  '.activitybar .action-item',
  '.composite-bar .action-item',
  '.pane-header',
].join(',');

// Reveal highlight (Fluent): a soft light that follows the pointer over interactive rows.
function startReveal(): void {
  if (readNumberVariable('--woodfish-reveal-enabled', 0) !== 1) {
    return;
  }

  let current: HTMLElement | null = null;
  let pending: { target: EventTarget | null; x: number; y: number } | null = null;
  let frame = 0;

  function clear(): void {
    if (current) {
      current.removeAttribute('data-woodfish-reveal');
      current.style.removeProperty('--woodfish-reveal-x');
      current.style.removeProperty('--woodfish-reveal-y');
      current = null;
    }
  }

  function paint(): void {
    frame = 0;
    if (!pending) {
      return;
    }
    const { target, x, y } = pending;
    pending = null;
    const element = target instanceof Element ? target.closest<HTMLElement>(REVEAL_TARGETS) : null;
    if (element !== current) {
      clear();
      current = element;
      if (current) {
        current.setAttribute('data-woodfish-reveal', 'true');
      }
    }
    if (current) {
      const bounds = current.getBoundingClientRect();
      current.style.setProperty('--woodfish-reveal-x', `${Math.round(x - bounds.left)}px`);
      current.style.setProperty('--woodfish-reveal-y', `${Math.round(y - bounds.top)}px`);
    }
  }

  function onPointerMove(event: PointerEvent): void {
    pending = { target: event.target, x: event.clientX, y: event.clientY };
    if (frame === 0) {
      frame = requestAnimationFrame(paint);
    }
  }

  function onPointerLeave(): void {
    pending = null;
    clear();
  }

  document.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave, { passive: true });
  disposers.push(() => {
    document.removeEventListener('pointermove', onPointerMove, { capture: true });
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
    clear();
  });
}

function start(): void {
  if (!document.body) {
    globalThis.setTimeout(start, 0);
    return;
  }

  const steps: StartStep[] = [startTokens, startAcrylicFilter, startReveal];
  let refresh: () => void = () => undefined;
  for (const step of steps) {
    try {
      const result = step();
      if (typeof result === 'function') {
        refresh = result;
      }
    } catch (error) {
      console.warn('[Woodfish] overlay step failed', error);
    }
  }

  document.documentElement.dataset.woodfishOverlay = 'active';
  document.documentElement.dataset.woodfishOverlayVersion = VERSION;

  controllerHost.__woodfishOverlayController = {
    version: VERSION,
    refresh,
    dispose(): void {
      for (const dispose of disposers.splice(0)) {
        try {
          dispose();
        } catch {
          // Disposal is best effort.
        }
      }
      delete document.documentElement.dataset.woodfishOverlay;
      delete document.documentElement.dataset.woodfishOverlayVersion;
    },
  };
}

start();
