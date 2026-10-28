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
import { CODEX_STYLE_NAMES, buildCodexCss, buildDiffCss } from '../css';
import { SETTINGS_PANEL_CSS } from '../css/settingsPanel';
import {
  CODEX_ADAPTER_VERSION,
  CODEX_BUILD_ID,
  CODEX_CONTROLLER_KEY,
  CODEX_DATASET,
  CODEX_PLUS_NODE_ATTRIBUTE,
  CODEX_PLUS_STYLE_ID_PREFIX,
  CODEX_SETTINGS_BINDING,
  CODEX_STYLE_ID_PREFIX,
  CODEX_USERSCRIPT_STORAGE_KEY,
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
import {
  CodexSettings,
  CodexSettingsPatch,
  applyCodexSettingsPatch,
  findCodexPalette,
  normalizeCodexSettings,
} from '../settings';
import { DIFF_TOKEN_SELECTOR, isDiffToken, mapDiffColor, startDiffDecorator } from './diffs';
import { startSettingsPanel } from './settingsPanel';

/** How many elements each selector group matches right now. */
export type SelectorReport = Record<CodexSelectorGroup, number>;

export interface CodexOverlayController extends PageController {
  source: CodexOverlaySource;
  /** Bundle identity; see CODEX_BUILD_ID. */
  build: string;
  /** Applies new settings in place. Accepts untrusted input; it is normalized first. */
  update: (settings: unknown) => void;
  /** A copy of the settings in effect. */
  settings: () => CodexSettings;
  /** Selector hit counts, for `woodfish codex doctor`. */
  probe: () => SelectorReport;
  /** Groups that should always be on screen but are missing (selector drift). */
  degraded: () => string[];
  dispose: () => void;
}

/** Text colors Codex derives from its theme; used when no token palette is on screen. */
const ACCENT_VARIABLES = ['--app-color-text-accent', '--app-color-border-focus'];
const DEGRADED_CHECK_DELAY_MS = 4000;
/** Codex may still be starting (or showing its login screen) at the first check. */
const DEGRADED_RECHECK_MS = 5000;
const DEGRADED_MAX_CHECKS = 12;

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
  extra: {
    acceptToken?: (token: HTMLElement) => boolean;
    mapColor?: (cssColor: string) => string;
  } = {}
): TextGradientEngine {
  return startTextGradientEngine({
    tokenSelector,
    rootSelector,
    acceptToken: extra.acceptToken,
    mapColor: extra.mapColor,
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

/** Reads the panel changes a Codex++ user script kept in localStorage. */
export function readStoredPatch(): unknown {
  try {
    const raw = globalThis.localStorage?.getItem(CODEX_USERSCRIPT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/**
 * Keeps a change made in the settings panel. A CDP overlay hands it to the watcher, which
 * saves it for every window; a user script has no watcher and keeps it in localStorage.
 */
function persistPatch(source: CodexOverlaySource, patch: CodexSettingsPatch): void {
  if (source === 'cdp') {
    const binding = (globalThis as unknown as Record<string, unknown>)[CODEX_SETTINGS_BINDING];
    if (typeof binding === 'function') {
      (binding as (payload: string) => void)(JSON.stringify(patch));
    }
    return;
  }
  try {
    const stored = readStoredPatch();
    const merged: Record<string, unknown> =
      stored !== null && typeof stored === 'object' ? { ...stored } : {};
    for (const [key, value] of Object.entries(patch)) {
      const previous = merged[key];
      merged[key] =
        previous !== null && typeof previous === 'object' ? { ...previous, ...value } : value;
    }
    globalThis.localStorage?.setItem(CODEX_USERSCRIPT_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Storage unavailable: the change still applies until Codex reloads.
  }
}

const PANEL_FOOTNOTE: Readonly<Record<CodexOverlaySource, string>> = {
  cdp: '由 Woodfish 注入提供，改动会保存到 Woodfish 设置并同步到所有 Codex 窗口。',
  userscript: '由 Woodfish 的 Codex++ 用户脚本提供，改动保存在本机的 Codex 中。',
};

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
  let diffEngine: TextGradientEngine | null = null;
  const diffs = startDiffDecorator(
    source === 'userscript' ? { [CODEX_PLUS_NODE_ATTRIBUTE]: 'woodfish' } : {}
  );

  /** Diffs take the palette of the appearance mode Codex is in, if one is selected. */
  function diffColor(cssColor: string): string {
    const mode = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const slug = settings.palette[mode];
    return mapDiffColor(cssColor, slug ? findCodexPalette(slug) : null);
  }
  let degradedTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let degradedChecks = 0;
  let disposed = false;
  // Assigned right below; the panel only calls back after the controller exists.
  let panel: { refresh: () => void; dispose: () => void } | null = null;

  function applyStyles(): void {
    const css = buildCodexCss(settings);
    for (const name of CODEX_STYLE_NAMES) {
      styles.upsert(name, css[name]);
    }
    diffs.setCss(buildDiffCss(settings));
  }

  function applyEngines(): void {
    const wantCode = settings.codeGradient.enabled || settings.codeGlow.enabled;
    if (wantCode && !codeEngine) {
      codeEngine = startEngine(CODE_TOKEN_SELECTOR, CODE_ROOT_SELECTOR, settings, {
        acceptToken: outsideComposer,
      });
      diffEngine = startEngine(
        DIFF_TOKEN_SELECTOR,
        CODEX_SELECTORS.diff.selectors.join(', '),
        settings,
        {
          acceptToken: isDiffToken,
          mapColor: diffColor,
        }
      );
      diffs.setEngine(diffEngine);
    } else if (wantCode && codeEngine) {
      codeEngine.update(settings.codeGradient);
      diffEngine?.update(settings.codeGradient);
    } else if (!wantCode && codeEngine) {
      codeEngine.dispose();
      codeEngine = null;
      diffEngine?.dispose();
      diffEngine = null;
      diffs.setEngine(null);
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

  /** Marks missing groups; re-checks for a while, since the first check can be too early. */
  function markDegraded(): void {
    degradedTimer = null;
    degradedChecks += 1;
    const missing = missingAlwaysPresentGroups(probeSelectors());
    if (missing.length === 0) {
      delete document.documentElement.dataset[CODEX_DATASET.degraded];
      return;
    }
    document.documentElement.dataset[CODEX_DATASET.degraded] = missing.join(',');
    if (degradedChecks < DEGRADED_MAX_CHECKS) {
      degradedTimer = globalThis.setTimeout(markDegraded, DEGRADED_RECHECK_MS);
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
      panel?.refresh();
    },
    settings: () => normalizeCodexSettings(settings),
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
        (): void => panel?.dispose(),
        (): void => diffs.dispose(),
        (): void => diffEngine?.dispose(),
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
      diffEngine = null;
      uninstallController(CODEX_CONTROLLER_KEY, controller);
    },
  };

  applyStyles();
  applyEngines();
  styles.upsert('settings', SETTINGS_PANEL_CSS);
  panel = startSettingsPanel({
    settings: () => settings,
    change: (patch: CodexSettingsPatch): void => {
      controller.update(applyCodexSettingsPatch(settings, patch));
      persistPatch(source, patch);
    },
    footnote: PANEL_FOOTNOTE[source],
    nodeAttributes: source === 'userscript' ? { [CODEX_PLUS_NODE_ATTRIBUTE]: 'woodfish' } : {},
  });
  document.documentElement.dataset[CODEX_DATASET.active] = CODEX_ADAPTER_VERSION;
  document.documentElement.dataset[CODEX_DATASET.source] = source;
  degradedTimer = globalThis.setTimeout(markDegraded, DEGRADED_CHECK_DELAY_MS);
  return installController(CODEX_CONTROLLER_KEY, controller);
}
