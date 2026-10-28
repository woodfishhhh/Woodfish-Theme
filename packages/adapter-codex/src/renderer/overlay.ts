import {
  PageController,
  StyleManager,
  TextGradientEngine,
  clearTextGradientMarks,
  createStyleManager,
  installController,
  startTextGradientEngine,
  uninstallController,
} from '@woodfish/renderer-runtime';
import { CODEX_STYLE_NAMES, buildCodexCss } from '../css';
import {
  CODEX_ADAPTER_VERSION,
  CODEX_BUILD_ID,
  CODEX_CONTROLLER_KEY,
  CODEX_DATASET,
  CODEX_PLUS_NODE_ATTRIBUTE,
  CODEX_PLUS_STYLE_ID_PREFIX,
  CODEX_STYLE_ID_PREFIX,
  CodexOverlaySource,
} from '../protocol';
import {
  BODY_ROOT_SELECTOR,
  BODY_TEXT_SELECTOR,
  CODE_ROOT_SELECTOR,
  CODE_TOKEN_SELECTOR,
  CODEX_SELECTORS,
  CodexSelectorGroup,
} from '../selectors';
import { CodexSettings, normalizeCodexSettings } from '../settings';

/** How many elements each selector group matches right now. */
export type SelectorReport = Record<CodexSelectorGroup, number>;

export interface CodexOverlayController extends PageController {
  source: CodexOverlaySource;
  /** Bundle identity; see CODEX_BUILD_ID. */
  build: string;
  /** Applies new settings in place. Accepts untrusted input; it is normalized first. */
  update: (settings: unknown) => void;
  /** Selector hit counts, for `woodfish codex doctor`. */
  probe: () => SelectorReport;
  /** Groups that should always be on screen but are missing (selector drift). */
  degraded: () => string[];
  dispose: () => void;
}

/** Text colors Codex derives from its theme; used when no token palette is on screen. */
const ACCENT_VARIABLES = ['--app-color-text-accent', '--app-color-border-focus'];
const DEGRADED_CHECK_DELAY_MS = 4000;

function probeSelectors(): SelectorReport {
  const report = {} as SelectorReport;
  for (const [group, definition] of Object.entries(CODEX_SELECTORS)) {
    report[group as CodexSelectorGroup] = document.querySelectorAll(
      definition.selectors.join(', ')
    ).length;
  }
  return report;
}

function missingAlwaysPresentGroups(report: SelectorReport): string[] {
  return Object.entries(CODEX_SELECTORS)
    .filter(
      ([group, definition]) => definition.alwaysPresent && report[group as CodexSelectorGroup] === 0
    )
    .map(([group]) => group);
}

function themeSignature(helpers: { tokenPaletteSignature: () => string }): string {
  const style = getComputedStyle(document.documentElement);
  return [
    document.documentElement.getAttribute('data-theme') ?? '',
    style.getPropertyValue('--app-color-text-accent'),
    style.getPropertyValue('--app-color-background-surface'),
    style.getPropertyValue('--color-codex-syntax-keyword'),
    helpers.tokenPaletteSignature(),
  ].join('|');
}

function startEngine(
  tokenSelector: string,
  rootSelector: string,
  settings: CodexSettings,
  acceptToken?: (token: HTMLElement) => boolean
): TextGradientEngine {
  return startTextGradientEngine({
    tokenSelector,
    rootSelector,
    acceptToken,
    params: {
      hueShift: settings.codeGradient.hueShift,
      lightnessDelta: settings.codeGradient.lightnessDelta,
      neutralChroma: settings.codeGradient.neutralChroma,
    },
    accentVariables: ACCENT_VARIABLES,
    themeAttributes: ['data-theme', 'class'],
    themeSignature,
  });
}

/** Code inside the composer is the user's own draft; never repaint it. */
function outsideComposer(token: HTMLElement): boolean {
  return token.closest('[data-codex-composer-root], [contenteditable="true"]') === null;
}

function createStyles(source: CodexOverlaySource): StyleManager {
  const head = (): ParentNode => document.head ?? document.documentElement;
  return source === 'userscript'
    ? createStyleManager({
        idPrefix: CODEX_PLUS_STYLE_ID_PREFIX,
        nodeAttributes: { [CODEX_PLUS_NODE_ATTRIBUTE]: 'woodfish' },
        container: head,
      })
    : createStyleManager({ idPrefix: CODEX_STYLE_ID_PREFIX, container: head });
}

/**
 * Starts the Woodfish overlay in the Codex main window and publishes its controller.
 * Must run after `document.body` exists.
 */
export function startCodexOverlay(
  input: unknown,
  source: CodexOverlaySource
): CodexOverlayController {
  let settings = normalizeCodexSettings(input);
  const styles = createStyles(source);
  let codeEngine: TextGradientEngine | null = null;
  let bodyEngine: TextGradientEngine | null = null;
  let degradedTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let disposed = false;

  function applyStyles(): void {
    const css = buildCodexCss(settings);
    for (const name of CODEX_STYLE_NAMES) {
      styles.upsert(name, css[name]);
    }
  }

  function applyEngines(): void {
    const wantCode = settings.codeGradient.enabled || settings.codeGlow.enabled;
    if (wantCode && !codeEngine) {
      codeEngine = startEngine(CODE_TOKEN_SELECTOR, CODE_ROOT_SELECTOR, settings, outsideComposer);
    } else if (wantCode && codeEngine) {
      codeEngine.update(settings.codeGradient);
    } else if (!wantCode && codeEngine) {
      codeEngine.dispose();
      codeEngine = null;
    }

    if (settings.bodyText.enabled && !bodyEngine) {
      bodyEngine = startEngine(BODY_TEXT_SELECTOR, BODY_ROOT_SELECTOR, settings);
    } else if (settings.bodyText.enabled && bodyEngine) {
      bodyEngine.update(settings.codeGradient);
    } else if (!settings.bodyText.enabled && bodyEngine) {
      bodyEngine.dispose();
      bodyEngine = null;
    }

    if (!codeEngine && !bodyEngine) {
      clearTextGradientMarks();
    }
  }

  function markDegraded(): void {
    degradedTimer = null;
    const missing = missingAlwaysPresentGroups(probeSelectors());
    if (missing.length > 0) {
      document.documentElement.dataset[CODEX_DATASET.degraded] = missing.join(',');
    } else {
      delete document.documentElement.dataset[CODEX_DATASET.degraded];
    }
  }

  const controller: CodexOverlayController = {
    version: CODEX_ADAPTER_VERSION,
    source,
    build: CODEX_BUILD_ID,
    update: (next: unknown): void => {
      if (disposed) {
        return;
      }
      settings = normalizeCodexSettings(next);
      applyStyles();
      applyEngines();
    },
    probe: probeSelectors,
    degraded: () => missingAlwaysPresentGroups(probeSelectors()),
    dispose: (): void => {
      if (disposed) {
        return;
      }
      disposed = true;
      // Each step runs even if an earlier one throws: the page must end up clean.
      const steps: Array<() => void> = [
        (): void => {
          if (degradedTimer !== null) {
            globalThis.clearTimeout(degradedTimer);
          }
        },
        (): void => codeEngine?.dispose(),
        (): void => bodyEngine?.dispose(),
        (): void => clearTextGradientMarks(),
        (): void => styles.removeAll(),
        (): void => {
          const dataset = document.documentElement.dataset;
          delete dataset[CODEX_DATASET.active];
          delete dataset[CODEX_DATASET.source];
          delete dataset[CODEX_DATASET.degraded];
        },
      ];
      for (const step of steps) {
        try {
          step();
        } catch {
          // Best effort; continue cleaning up.
        }
      }
      codeEngine = null;
      bodyEngine = null;
      uninstallController(CODEX_CONTROLLER_KEY, controller);
    },
  };

  applyStyles();
  applyEngines();
  document.documentElement.dataset[CODEX_DATASET.active] = CODEX_ADAPTER_VERSION;
  document.documentElement.dataset[CODEX_DATASET.source] = source;
  degradedTimer = globalThis.setTimeout(markDegraded, DEGRADED_CHECK_DELAY_MS);
  return installController(CODEX_CONTROLLER_KEY, controller);
}
