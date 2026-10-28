/*
 * Woodfish overlay bootstrap for the VS Code workbench renderer.
 *
 * Built by `scripts/build-browser-runtime.js` into `themes/shared/overlay-bootstrap.js`
 * (a self-contained IIFE). The engines live in `@woodfish/renderer-runtime` and the color
 * math in `@woodfish/theme-core`; this file only supplies the Monaco/workbench specifics:
 * selectors, settings read from `--woodfish-*` CSS variables, and the page controller.
 */
import { DEFAULT_GLASS, DEFAULT_TEXT_GRADIENT } from '@woodfish/theme-core';
import {
  createDisposerRegistry,
  disposeController,
  installController,
  mountAcrylicFilter,
  readNumberVariable,
  readStringVariable,
  runSteps,
  startReveal,
  startTextGradientEngine,
} from '@woodfish/renderer-runtime';

declare const __WOODFISH_VERSION__: string;

const VERSION = __WOODFISH_VERSION__;
const CONTROLLER_KEY = '__woodfishOverlayController';
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
const REVEAL_TARGETS = [
  '.monaco-list-row',
  '.action-menu-item',
  '.monaco-button',
  '.tabs-container > .tab',
  '.statusbar-item',
  '.activitybar .action-item',
  '.composite-bar .action-item',
  '.pane-header',
];

disposeController(CONTROLLER_KEY);

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

const disposers = createDisposerRegistry();

function startTokens(): (() => void) | void {
  if (readNumberVariable('--woodfish-overlay-tokens', 1) !== 1) {
    return;
  }

  const engine = startTextGradientEngine({
    tokenSelector: TOKEN_SELECTOR,
    rootSelector: VIEW_LINES_SELECTOR,
    acceptToken: (token) => !hasForeignDecoration(token),
    params: {
      hueShift: readNumberVariable('--woodfish-overlay-hue-shift', DEFAULT_TEXT_GRADIENT.hueShift),
      lightnessDelta: readNumberVariable(
        '--woodfish-overlay-lightness-delta',
        DEFAULT_TEXT_GRADIENT.lightnessDelta
      ),
      neutralChroma: readNumberVariable(
        '--woodfish-overlay-neutral-chroma',
        DEFAULT_TEXT_GRADIENT.neutralChroma
      ),
    },
    accentVariables: ACCENT_VARIABLES,
    themeAttributes: ['class', 'data-color-theme'],
    themeSignature: ({ tokenPaletteSignature }) => {
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
    },
    pollIntervalMs: THEME_POLL_INTERVAL_MS,
    maxTokensPerFrame: MAX_TOKENS_PER_FRAME,
  });
  disposers.add(() => engine.dispose());
  return engine.refresh;
}

function startAcrylicFilter(): void {
  if (readStringVariable('--woodfish-glass-mode') !== 'acrylic') {
    return;
  }
  disposers.add(
    mountAcrylicFilter({
      blur: readNumberVariable('--woodfish-glass-blur', DEFAULT_GLASS.blur),
    })
  );
}

function startRevealHighlight(): void {
  if (readNumberVariable('--woodfish-reveal-enabled', 0) !== 1) {
    return;
  }
  disposers.add(startReveal({ targets: REVEAL_TARGETS }));
}

function start(): void {
  if (!document.body) {
    globalThis.setTimeout(start, 0);
    return;
  }

  const { refresh } = runSteps([startTokens, startAcrylicFilter, startRevealHighlight], (failure) =>
    console.warn('[Woodfish] overlay step failed', failure.error)
  );

  document.documentElement.dataset.woodfishOverlay = 'active';
  document.documentElement.dataset.woodfishOverlayVersion = VERSION;

  installController(CONTROLLER_KEY, {
    version: VERSION,
    refresh,
    dispose(): void {
      disposers.disposeAll();
      delete document.documentElement.dataset.woodfishOverlay;
      delete document.documentElement.dataset.woodfishOverlayVersion;
    },
  });
}

start();
