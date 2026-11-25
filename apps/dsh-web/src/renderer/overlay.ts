import { EffectValues, WoodfishPalette, findGradientPreset } from '@woodfish/theme-core';
import {
  EffectSource,
  EffectStatus,
  GradientContext,
  PageController,
  TextGradientEngine,
  blurBackgroundImage,
  clearTextGradientMarks,
  createBackgroundLayer,
  createStyleManager,
  installController,
  startNativeCorners,
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
  CODE_ROOT_SELECTOR,
  CODE_TOKEN_SELECTOR,
  DSH_SELECTORS,
  DshSelectorGroup,
} from '../selectors';
import {
  DSH_GRADIENT_BACKGROUND_ID,
  DshCoreView,
  DshSettings,
  composeDshCoreView,
  findDshPalette,
  normalizeDshSettings,
} from '../settings';
import { DshEffects, startDshEffects } from './effects';

/** How many elements each selector group matches right now. */
export type SelectorReport = Record<DshSelectorGroup, number>;

export interface DshOverlayOptions {
  /** Loads a background picture Blob by id (`'caiyun'` or a 16-hex uploaded image id). */
  loadBackground?: (id: string) => Promise<Blob>;
  /** Invoked whenever palette settings change so the host ThemeRuntime can sync xterm & meta. */
  onPaletteChange?: (palette: DshSettings['palette']) => void;
}

export interface DshOverlayController extends PageController {
  /** Bundle identity; see DSH_BUILD_ID. */
  build: string;
  /**
   * Applies new settings (and effects or `user.css`, when given) in place. Accepts
   * untrusted input; it is normalized first.
   */
  update: (settings: unknown, effects?: unknown, userCss?: unknown) => void;
  /** Applies an immediate live preview patch to one effect without rebuilding the full list. */
  previewEffect: (id: string, patch: Record<string, unknown>) => EffectValues | null;
  /** Updates `user.css` live in place and re-evaluates CSS variable overrides. */
  setUserCss: (css: string) => void;
  /** A copy of the settings in effect. */
  settings: () => DshSettings;
  /** Every effect with its state, values and error. */
  effects: () => EffectStatus[];
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
const RESIZE_DEBOUNCE_MS = 200;

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

/** Normalizes an effect list into EffectSource entries. */
function readEffects(input: unknown): EffectSource[] | null {
  if (!Array.isArray(input)) {
    return null;
  }
  return input.filter(
    (entry): entry is EffectSource =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof (entry as EffectSource).id === 'string' &&
      typeof (entry as EffectSource).hash === 'string' &&
      typeof (entry as EffectSource).manifest === 'object' &&
      typeof (entry as EffectSource).values === 'object'
  );
}

/**
 * Starts the Woodfish overlay in a dsh page and publishes its controller. Must run after
 * `document.body` exists.
 */
export function startDshOverlay(
  input: unknown,
  effectsInput?: unknown,
  userCssInput?: unknown,
  options: DshOverlayOptions = {}
): DshOverlayController {
  let settings = normalizeDshSettings(input);
  const styles = createStyleManager({
    idPrefix: DSH_STYLE_ID_PREFIX,
    container: () => document.head ?? document.documentElement,
  });
  const backgroundLayer = createBackgroundLayer(styles);
  /** Values of the core effects (null: off or missing), filled by the effect host. */
  const core: Record<'code-gradient' | 'background' | 'squircle-corners', EffectValues | null> = {
    'squircle-corners': null,
    'code-gradient': null,
    background: null,
  };
  let view: DshCoreView = composeDshCoreView(settings, core);
  let codeEngine: TextGradientEngine | null = null;
  let stopNativeCorners: (() => void) | null = null;
  let applyingEffects = false;
  let degradedTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let resizeTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let lastPaletteKey = '';
  let disposed = false;
  let effects: DshEffects | null = null;

  /** The Woodfish palette of the appearance mode dsh is in, if one is selected. */
  function activePalette(): WoodfishPalette | null {
    const slug = settings.palette[isDark() ? 'dark' : 'light'];
    return slug === null ? null : (findDshPalette(slug) ?? null);
  }

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

  function applyBackgroundImage(): void {
    const background = view.background;
    const loader = options.loadBackground;
    if (!background.enabled || view.backgroundImage === DSH_GRADIENT_BACKGROUND_ID || !loader) {
      const none = (): Promise<Blob> => Promise.reject(new Error('none'));
      backgroundLayer.show(null, none, none).catch(() => undefined);
      return;
    }
    const id = view.backgroundImage;
    const key = `${id}|${background.blur}|${background.saturate}|${background.size}|${window.innerWidth}x${window.innerHeight}`;
    backgroundLayer
      .show(
        key,
        () => loader(id),
        (blob) =>
          blurBackgroundImage(blob, background, {
            width: window.innerWidth,
            height: window.innerHeight,
          })
      )
      .catch(() => undefined);
  }

  function applyNativeCorners(): void {
    const want = view.squircleCorners.enabled && view.squircleCorners.scanHardcoded;
    if (want && !stopNativeCorners) {
      stopNativeCorners = startNativeCorners();
    } else if (!want && stopNativeCorners) {
      stopNativeCorners();
      stopNativeCorners = null;
    }
  }

  function applyEngine(): void {
    const wantCode = view.codeGradient.enabled || view.codeGlow.enabled;
    if (wantCode && !codeEngine) {
      codeEngine = startTextGradientEngine({
        tokenSelector: CODE_TOKEN_SELECTOR,
        rootSelector: CODE_ROOT_SELECTOR,
        gradientContext,
        params: {
          hueShift: view.codeGradient.hueShift,
          lightnessDelta: view.codeGradient.lightnessDelta,
          neutralChroma: view.codeGradient.neutralChroma,
        },
        accentVariables: ACCENT_VARIABLES,
        themeAttributes: ['data-ds-dark-theme', 'data-ds-theme-source', 'class'],
        themeSignature,
      });
    } else if (wantCode && codeEngine) {
      codeEngine.update(view.codeGradient);
    } else if (!wantCode && codeEngine) {
      codeEngine.dispose();
      codeEngine = null;
    }
    if (!codeEngine) {
      clearTextGradientMarks();
    }
  }

  function notifyPaletteChange(): void {
    const key = `${settings.palette.dark ?? ''}|${settings.palette.light ?? ''}`;
    if (key !== lastPaletteKey) {
      lastPaletteKey = key;
      options.onPaletteChange?.({ ...settings.palette });
    }
  }

  /** Recomputes everything the core draws (palette, corners, code/diff gradient, background). */
  function applyCore(): void {
    view = composeDshCoreView(settings, core);
    const css = buildDshCss(view);
    for (const name of DSH_STYLE_NAMES) {
      styles.upsert(name, css[name]);
    }
    applyNativeCorners();
    applyBackgroundImage();
    applyEngine();
    codeEngine?.refresh();
    notifyPaletteChange();
  }

  function applyEffects(list: EffectSource[]): void {
    applyingEffects = true;
    try {
      effects?.host.apply(list);
    } finally {
      applyingEffects = false;
    }
  }

  function applyUserCss(css: unknown): void {
    if (typeof css === 'string') {
      effects?.host.setUserCss(css);
    }
  }

  function onResize(): void {
    if (!view.background.enabled || view.backgroundImage === DSH_GRADIENT_BACKGROUND_ID) {
      return;
    }
    if (resizeTimer !== null) {
      globalThis.clearTimeout(resizeTimer);
    }
    resizeTimer = globalThis.setTimeout(() => {
      resizeTimer = null;
      if (!disposed) {
        applyBackgroundImage();
      }
    }, RESIZE_DEBOUNCE_MS);
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
    update: (next: unknown, nextEffects?: unknown, userCss?: unknown): void => {
      if (disposed) {
        return;
      }
      settings = normalizeDshSettings(next);
      applyUserCss(userCss ?? settings.userCss);
      const list = readEffects(nextEffects);
      if (list) {
        applyEffects(list);
      }
      applyCore();
      effects?.host.themeChanged();
    },
    previewEffect: (id: string, patch: Record<string, unknown>): EffectValues | null => {
      if (disposed || !effects) {
        return null;
      }
      return effects.host.preview(id, patch);
    },
    setUserCss: (css: string): void => {
      if (disposed) {
        return;
      }
      settings = { ...settings, userCss: css };
      applyUserCss(css);
    },
    settings: () => normalizeDshSettings(settings),
    effects: () => effects?.host.status() ?? [],
    probe: probeSelectors,
    degraded: missingAlwaysPresentGroups,
    dispose: (): void => {
      if (disposed) {
        return;
      }
      disposed = true;
      const steps: Array<() => void> = [
        (): void => {
          if (degradedTimer !== null) {
            globalThis.clearTimeout(degradedTimer);
          }
          if (resizeTimer !== null) {
            globalThis.clearTimeout(resizeTimer);
          }
          window.removeEventListener('resize', onResize);
        },
        (): void => stopNativeCorners?.(),
        (): void => effects?.dispose(),
        (): void => backgroundLayer.dispose(),
        (): void => codeEngine?.dispose(),
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
      stopNativeCorners = null;
      codeEngine = null;
      effects = null;
      uninstallController(DSH_CONTROLLER_KEY, controller);
    },
  };

  effects = startDshEffects({
    settings: () => settings,
    idPrefix: `${DSH_STYLE_ID_PREFIX}fx-`,
    core: (name: string, values: EffectValues | null): void => {
      if (name === 'code-gradient' || name === 'background' || name === 'squircle-corners') {
        core[name] = values;
        if (!applyingEffects) {
          applyCore();
        }
      }
    },
    onError: (): void => undefined,
  });
  window.addEventListener('resize', onResize, { passive: true });
  applyUserCss(userCssInput ?? settings.userCss);
  applyEffects(readEffects(effectsInput) ?? []);
  applyCore();
  document.documentElement.dataset[DSH_DATASET.active] = DSH_ADAPTER_VERSION;
  degradedTimer = globalThis.setTimeout(markDegraded, DEGRADED_CHECK_DELAY_MS);
  return installController(DSH_CONTROLLER_KEY, controller);
}
