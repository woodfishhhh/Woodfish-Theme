import { WoodfishPalette, findGradientPreset } from '@woodfish/theme-core';
import {
  GradientContext,
  PageController,
  TextGradientEngine,
  clearTextGradientMarks,
  createStyleManager,
  installController,
  startTextGradientEngine,
  uninstallController,
} from '@woodfish/renderer-runtime';
import { DSH_STYLE_NAMES, buildDshCss } from '../css';
import {
  DSH_ADAPTER_VERSION,
  DSH_BUILD_ID,
  DSH_CONTROLLER_KEY,
  DSH_DATASET,
  DSH_STYLE_ID_PREFIX,
} from '../protocol';
import {
  BODY_ROOT_SELECTOR,
  BODY_TEXT_SELECTOR,
  CODE_ROOT_SELECTOR,
  CODE_TOKEN_SELECTOR,
  DSH_SELECTORS,
  DshSelectorGroup,
} from '../selectors';
import { DshSettings, findDshPalette, normalizeDshSettings } from '../settings';

/** How many elements each selector group matches right now. */
export type SelectorReport = Record<DshSelectorGroup, number>;

export interface DshOverlayController extends PageController {
  /** Bundle identity; see DSH_BUILD_ID. */
  build: string;
  /** Applies new settings in place. Accepts untrusted input; it is normalized first. */
  update: (settings: unknown) => void;
  /** A copy of the settings in effect. */
  settings: () => DshSettings;
  /** Selector hit counts, for diagnosing selector drift after a dsh update. */
  probe: () => SelectorReport;
  /** Groups that should always be on screen but are missing (selector drift). */
  degraded: () => string[];
  dispose: () => void;
}

/** dsh's accent variables; used as the anchor hue when no token palette is on screen. */
const ACCENT_VARIABLES = [
  '--dsw-alias-state-business-primary',
  '--dsw-alias-brand-primary-new-colorprimary-new-color',
];
const DEGRADED_CHECK_DELAY_MS = 4000;

function probeSelectors(): SelectorReport {
  const report = {} as SelectorReport;
  for (const [group, definition] of Object.entries(DSH_SELECTORS)) {
    report[group as DshSelectorGroup] = document.querySelectorAll(
      definition.selectors.join(', ')
    ).length;
  }
  return report;
}

function missingAlwaysPresentGroups(): string[] {
  const report = probeSelectors();
  return Object.entries(DSH_SELECTORS)
    .filter(
      ([group, definition]) => definition.alwaysPresent && report[group as DshSelectorGroup] === 0
    )
    .map(([group]) => group);
}

function isDark(): boolean {
  return document.body?.hasAttribute('data-ds-dark-theme') ?? false;
}

function themeSignature(helpers: { tokenPaletteSignature: () => string }): string {
  const style = getComputedStyle(document.body ?? document.documentElement);
  return [
    isDark() ? 'dark' : 'light',
    style.getPropertyValue('--dsw-alias-state-business-primary'),
    style.getPropertyValue('--dsw-alias-bg-base'),
    style.getPropertyValue('--shiki-token-keyword'),
    helpers.tokenPaletteSignature(),
  ].join('|');
}

/**
 * Starts the Woodfish overlay in a dsh page and publishes its controller. Must run after
 * `document.body` exists.
 */
export function startDshOverlay(input: unknown): DshOverlayController {
  let settings = normalizeDshSettings(input);
  const styles = createStyleManager({
    idPrefix: DSH_STYLE_ID_PREFIX,
    container: () => document.head ?? document.documentElement,
  });
  let codeEngine: TextGradientEngine | null = null;
  let bodyEngine: TextGradientEngine | null = null;
  let degradedTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let disposed = false;

  /** The Woodfish palette of the appearance mode dsh is in, if one is selected. */
  function activePalette(): WoodfishPalette | null {
    const slug = settings.palette[isDark() ? 'dark' : 'light'];
    return slug === null ? null : (findDshPalette(slug) ?? null);
  }

  /**
   * A Woodfish palette brings its hand-tuned gradients; with dsh's own colors every
   * gradient is derived, readable against the code block background dsh draws.
   */
  function gradientContext(): GradientContext {
    const palette = activePalette();
    if (palette) {
      return {
        background: palette.ui.bg,
        foreground: palette.ui.fg,
        preset: findGradientPreset(palette.slug),
      };
    }
    const style = getComputedStyle(document.body);
    return {
      background: style.getPropertyValue('--dsw-alias-bg-base').trim() || null,
      foreground: style.color || null,
      preset: null,
    };
  }

  function startEngine(tokenSelector: string, rootSelector: string): TextGradientEngine {
    return startTextGradientEngine({
      tokenSelector,
      rootSelector,
      gradientContext,
      params: {
        hueShift: settings.codeGradient.hueShift,
        lightnessDelta: settings.codeGradient.lightnessDelta,
        neutralChroma: settings.codeGradient.neutralChroma,
      },
      accentVariables: ACCENT_VARIABLES,
      themeAttributes: ['data-ds-dark-theme', 'data-ds-theme-source', 'class'],
      themeSignature,
    });
  }

  function applyStyles(): void {
    const css = buildDshCss(settings);
    for (const name of DSH_STYLE_NAMES) {
      styles.upsert(name, css[name]);
    }
  }

  function applyEngines(): void {
    const wantCode = settings.codeGradient.enabled || settings.codeGlow.enabled;
    if (wantCode && !codeEngine) {
      codeEngine = startEngine(CODE_TOKEN_SELECTOR, CODE_ROOT_SELECTOR);
    } else if (wantCode && codeEngine) {
      codeEngine.update(settings.codeGradient);
    } else if (!wantCode && codeEngine) {
      codeEngine.dispose();
      codeEngine = null;
    }

    if (settings.bodyText.enabled && !bodyEngine) {
      bodyEngine = startEngine(BODY_TEXT_SELECTOR, BODY_ROOT_SELECTOR);
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
    const missing = missingAlwaysPresentGroups();
    if (missing.length === 0) {
      delete document.documentElement.dataset[DSH_DATASET.degraded];
    } else {
      document.documentElement.dataset[DSH_DATASET.degraded] = missing.join(',');
    }
  }

  const controller: DshOverlayController = {
    version: DSH_ADAPTER_VERSION,
    build: DSH_BUILD_ID,
    update: (next: unknown): void => {
      if (disposed) {
        return;
      }
      settings = normalizeDshSettings(next);
      applyStyles();
      applyEngines();
      // Engines re-read the palette only when the theme signature changes.
      codeEngine?.refresh();
      bodyEngine?.refresh();
    },
    settings: () => normalizeDshSettings(settings),
    probe: probeSelectors,
    degraded: missingAlwaysPresentGroups,
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
          delete document.documentElement.dataset[DSH_DATASET.active];
          delete document.documentElement.dataset[DSH_DATASET.degraded];
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
      uninstallController(DSH_CONTROLLER_KEY, controller);
    },
  };

  applyStyles();
  applyEngines();
  document.documentElement.dataset[DSH_DATASET.active] = DSH_ADAPTER_VERSION;
  degradedTimer = globalThis.setTimeout(markDegraded, DEGRADED_CHECK_DELAY_MS);
  return installController(DSH_CONTROLLER_KEY, controller);
}
