import {
  EffectValues,
  WoodfishPalette,
  defaultEffectValues,
  findGradientPreset,
  patchEffectValues,
} from '@woodfish/theme-core';
import {
  EffectSource,
  EffectStatus,
  GradientContext,
  PageController,
  StyleManager,
  TextGradientEngine,
  base64ToBlob,
  blobToBase64,
  blurBackgroundImage,
  clearTextGradientMarks,
  createStyleManager,
  installController,
  resizeBackgroundImage,
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
  CODEX_LOG_BINDING,
  CODEX_PLUS_NODE_ATTRIBUTE,
  CODEX_PLUS_STYLE_ID_PREFIX,
  CODEX_RELOAD_BINDING,
  CODEX_SETTINGS_BINDING,
  CODEX_STYLE_ID_PREFIX,
  CODEX_USERSCRIPT_STORAGE_KEY,
  CodexOverlaySource,
} from '../protocol';
import {
  CODE_ROOT_SELECTOR,
  CODE_TOKEN_SELECTOR,
  CODEX_SELECTORS,
  CodexSelectorGroup,
} from '../selectors';
import {
  CODEX_DEFAULT_BACKGROUND_ID,
  CODEX_GRADIENT_BACKGROUND_ID,
  CodexCoreView,
  CodexSettings,
  CodexSettingsPatch,
  applyCodexSettingsPatch,
  composeCodexCoreView,
  findCodexPalette,
  normalizeCodexSettings,
} from '../settings';
import { createBackgroundLayer, createBackgroundStore } from './background';
import { DIFF_TOKEN_SELECTOR, isDiffToken, mapDiffColor, startDiffDecorator } from './diffs';
import { CodexEffects, startCodexEffects } from './effects';
import { startSettingsPanel } from './settingsPanel';

/** How many elements each selector group matches right now. */
export type SelectorReport = Record<CodexSelectorGroup, number>;

export interface CodexOverlayController extends PageController {
  source: CodexOverlaySource;
  /** Bundle identity; see CODEX_BUILD_ID. */
  build: string;
  /**
   * Applies new settings (and effects, when given) in place. Accepts untrusted input. A new
   * `reload` value restarts every effect.
   */
  update: (settings: unknown, effects?: unknown, reload?: unknown, userCss?: unknown) => void;
  /** A copy of the settings in effect. */
  settings: () => CodexSettings;
  /** Every effect with its state, values and error, for `woodfish codex effects`. */
  effects: () => EffectStatus[];
  /** Selector hit counts, for `woodfish codex doctor`. */
  probe: () => SelectorReport;
  /** Groups that should always be on screen but are missing (selector drift). */
  degraded: () => string[];
  /** The watcher's answer to a background picture request. */
  backgroundReply: (nonce: string, reply: unknown) => void;
  /** Scales a picture for `woodfish codex background set` (base64 in, WebP base64 out). */
  resizeBackground: (base64: string, type: string) => Promise<string>;
  dispose: () => void;
}

/** Text colors Codex derives from its theme; used when no token palette is on screen. */
const ACCENT_VARIABLES = ['--app-color-text-accent', '--app-color-border-focus'];
const DEGRADED_CHECK_DELAY_MS = 4000;
/** Codex may still be starting (or showing its login screen) at the first check. */
const DEGRADED_RECHECK_MS = 5000;
const DEGRADED_MAX_CHECKS = 12;
/** Sliders fire on every pixel; changes are saved once the hand rests. */
const SAVE_DELAY_MS = 300;

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
  view: CodexCoreView,
  extra: {
    acceptToken?: (token: HTMLElement) => boolean;
    mapColor?: (cssColor: string) => string;
    gradientContext?: () => GradientContext;
  } = {}
): TextGradientEngine {
  return startTextGradientEngine({
    tokenSelector,
    rootSelector,
    acceptToken: extra.acceptToken,
    mapColor: extra.mapColor,
    gradientContext: extra.gradientContext,
    params: {
      hueShift: view.codeGradient.hueShift,
      lightnessDelta: view.codeGradient.lightnessDelta,
      neutralChroma: view.codeGradient.neutralChroma,
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

type Loose = Record<string, unknown>;

/** Merges two settings patches; effect values merge per effect, resets accumulate. */
export function mergePatches(base: unknown, patch: CodexSettingsPatch): CodexSettingsPatch {
  const merged: CodexSettingsPatch =
    base !== null && typeof base === 'object' ? { ...(base as CodexSettingsPatch) } : {};
  if (patch.palette) {
    merged.palette = { ...merged.palette, ...patch.palette };
  }
  if (patch.backgroundImage !== undefined) {
    merged.backgroundImage = patch.backgroundImage;
  }
  for (const id of patch.reset ?? []) {
    merged.reset = [...new Set([...(merged.reset ?? []), id])];
    if (merged.effects) {
      delete merged.effects[id];
    }
  }
  for (const [id, values] of Object.entries(patch.effects ?? {})) {
    merged.effects = { ...merged.effects, [id]: { ...merged.effects?.[id], ...values } };
  }
  return merged;
}

/**
 * Applies a stored user-script patch to the baked-in effects (a user script has no watcher
 * to write the effect folders, so its panel changes live in localStorage).
 */
export function applyStoredEffects(effects: unknown, patch: unknown): unknown {
  if (!Array.isArray(effects) || patch === null || typeof patch !== 'object') {
    return effects;
  }
  const stored = patch as CodexSettingsPatch;
  return effects.map((entry: unknown) => {
    const source = entry as EffectSource;
    if (!source || typeof source.id !== 'string' || !source.manifest) {
      return entry;
    }
    let values = source.values;
    if (stored.reset?.includes(source.id)) {
      values = defaultEffectValues(source.manifest);
    }
    const change = stored.effects?.[source.id];
    return change
      ? { ...source, values: patchEffectValues(source.manifest, values, change) }
      : { ...source, values };
  });
}

function binding(name: string): ((payload: string) => void) | null {
  const candidate = (globalThis as unknown as Loose)[name];
  return typeof candidate === 'function' ? (candidate as (payload: string) => void) : null;
}

/** Normalizes the injected effects list (untrusted page data) into sources. */
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

const PANEL_FOOTNOTE: Readonly<Record<CodexOverlaySource, string>> = {
  cdp: '由 Woodfish 注入提供：主题和背景图片存在 %APPDATA%\\Woodfish\\codex.json，效果参数存在各效果文件夹的 params.json，所有 Codex 窗口同步。',
  userscript:
    '由 Woodfish 的 Codex++ 用户脚本提供，改动保存在本机的 Codex 中；效果文件改了之后需要重新运行 woodfish codex install-userscript。',
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

/** True for Ctrl+Alt+R (the 「刷新效果」 shortcut), on any keyboard layout. */
function isReloadShortcut(event: KeyboardEvent): boolean {
  return (
    event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey && event.code === 'KeyR'
  );
}

/**
 * Starts the Woodfish overlay in the Codex main window and publishes its controller.
 * Must run after `document.body` exists.
 */
export function startCodexOverlay(
  input: unknown,
  source: CodexOverlaySource,
  effectsInput?: unknown,
  reloadInput?: unknown,
  userCssInput?: unknown
): CodexOverlayController {
  let settings = normalizeCodexSettings(input);
  const styles = createStyles(source);
  let codeEngine: TextGradientEngine | null = null;
  let diffEngine: TextGradientEngine | null = null;
  const ownership: Readonly<Record<string, string>> =
    source === 'userscript' ? { [CODEX_PLUS_NODE_ATTRIBUTE]: 'woodfish' } : {};
  const diffs = startDiffDecorator(ownership);
  const backgrounds = createBackgroundStore(source);
  const backgroundLayer = createBackgroundLayer(styles);
  /** Values of the core effects (null: off or missing), filled by the effect host. */
  const core: { 'code-gradient': EffectValues | null; background: EffectValues | null } = {
    'code-gradient': null,
    background: null,
  };
  let view = composeCodexCoreView(settings, core);
  let applyingEffects = false;
  let reloadToken = reloadInput;
  let degradedTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let degradedChecks = 0;
  let disposed = false;
  let saveTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let pendingPatch: CodexSettingsPatch = {};
  // Assigned right below; they only call back after the controller exists.
  let panel: ReturnType<typeof startSettingsPanel> | null = null;
  let effects: CodexEffects | null = null;

  /** The Woodfish palette of the appearance mode Codex is in, if one is selected. */
  function activePalette(): WoodfishPalette | null {
    const mode = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const slug = settings.palette[mode];
    return slug ? findCodexPalette(slug) : null;
  }

  /** Diffs take the palette of the appearance mode Codex is in, if one is selected. */
  function diffColor(cssColor: string): string {
    return mapDiffColor(cssColor, activePalette());
  }

  /**
   * A Woodfish palette brings its hand-tuned gradients; with Codex's own theme every color
   * is derived, readable against the surface Codex actually draws.
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
    const style = getComputedStyle(document.documentElement);
    return {
      background: style.getPropertyValue('--app-color-background-surface').trim() || null,
      foreground: getComputedStyle(document.body).color || null,
      preset: null,
    };
  }

  /** Loads the picture the layer should show; a missing saved picture falls back to 《彩云》. */
  function applyBackgroundImage(): void {
    const background = view.background;
    // shortcut: the blurred copy is sized for the window at the time it is made; a later
    // resize keeps it slightly off until the picture or blur changes.
    const softKey = `${background.blur}|${background.saturate}|${background.size}`;
    const soften = (picture: Blob): Promise<Blob> =>
      blurBackgroundImage(picture, background, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
    const request =
      !background.enabled || background.image === CODEX_GRADIENT_BACKGROUND_ID
        ? backgroundLayer.show(null, () => Promise.reject(new Error('none')), soften)
        : backgroundLayer.show(
            `${background.image}|${softKey}`,
            () =>
              backgrounds
                .get(background.image)
                .catch(() => backgrounds.get(CODEX_DEFAULT_BACKGROUND_ID)),
            soften
          );
    request.catch(() => undefined);
  }

  function applyStyles(): void {
    const css = buildCodexCss(view);
    for (const name of CODEX_STYLE_NAMES) {
      styles.upsert(name, css[name]);
    }
    diffs.setCss(buildDiffCss(view));
  }

  function applyEngines(): void {
    const wantCode = view.codeGradient.enabled || view.codeGlow.enabled;
    if (wantCode && !codeEngine) {
      codeEngine = startEngine(CODE_TOKEN_SELECTOR, CODE_ROOT_SELECTOR, view, {
        acceptToken: outsideComposer,
        gradientContext,
      });
      diffEngine = startEngine(
        DIFF_TOKEN_SELECTOR,
        CODEX_SELECTORS.diff.selectors.join(', '),
        view,
        {
          acceptToken: isDiffToken,
          mapColor: diffColor,
          gradientContext,
        }
      );
      diffs.setEngine(diffEngine);
    } else if (wantCode && codeEngine) {
      codeEngine.update(view.codeGradient);
      diffEngine?.update(view.codeGradient);
    } else if (!wantCode && codeEngine) {
      codeEngine.dispose();
      codeEngine = null;
      diffEngine?.dispose();
      diffEngine = null;
      diffs.setEngine(null);
    }
    if (!codeEngine) {
      clearTextGradientMarks();
    }
  }

  /** Recomputes everything the core draws (palette, code gradient, background). */
  function applyCore(): void {
    view = composeCodexCoreView(settings, core);
    applyStyles();
    applyBackgroundImage();
    applyEngines();
  }

  function applyEffects(list: EffectSource[]): void {
    if (!effects) {
      return;
    }
    applyingEffects = true;
    try {
      effects.host.apply(list);
    } finally {
      applyingEffects = false;
    }
  }

  /** Saves a change: the watcher writes the files (CDP); a user script keeps localStorage. */
  function persist(patch: CodexSettingsPatch): void {
    pendingPatch = mergePatches(pendingPatch, patch);
    if (saveTimer !== null) {
      globalThis.clearTimeout(saveTimer);
    }
    saveTimer = globalThis.setTimeout(flushSave, SAVE_DELAY_MS);
  }

  function flushSave(): void {
    saveTimer = null;
    const patch = pendingPatch;
    pendingPatch = {};
    if (Object.keys(patch).length === 0) {
      return;
    }
    if (source === 'cdp') {
      binding(CODEX_SETTINGS_BINDING)?.(JSON.stringify(patch));
      return;
    }
    try {
      globalThis.localStorage?.setItem(
        CODEX_USERSCRIPT_STORAGE_KEY,
        JSON.stringify(mergePatches(readStoredPatch(), patch))
      );
    } catch {
      // Storage unavailable: the change still applies until Codex reloads.
    }
  }

  function changeSettings(patch: CodexSettingsPatch): void {
    settings = applyCodexSettingsPatch(settings, patch);
    applyCore();
    effects?.host.themeChanged();
    persist(patch);
  }

  function changeEffect(id: string, values: Loose): void {
    effects?.host.preview(id, values);
    persist({ effects: { [id]: values } });
    panel?.refresh();
  }

  function resetEffects(id: string | null): void {
    const statuses = effects?.host.status() ?? [];
    const ids = id === null ? statuses.map((status) => status.id) : [id];
    for (const target of statuses.filter((status) => ids.includes(status.id))) {
      effects?.host.preview(target.id, defaultEffectValues(target.manifest));
    }
    persist({ reset: ids });
    panel?.refresh();
  }

  /** Asks the watcher for `action` (only a CDP injection has one); false when it is not there. */
  function ask(action: 'reload' | 'open-user-css' | 'reset-user-css'): boolean {
    const call = binding(CODEX_RELOAD_BINDING);
    if (!call) {
      panel?.say('没有连上 Woodfish 监视进程');
      return false;
    }
    call(action);
    return true;
  }

  const reload =
    source === 'cdp'
      ? (): void => {
          flushSave();
          ask('reload');
        }
      : null;

  /** The user's user.css (effects folder): a string replaces it, anything else keeps it. */
  function applyUserCss(css: unknown): void {
    if (typeof css === 'string') {
      effects?.host.setUserCss(css);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (isReloadShortcut(event)) {
      event.preventDefault();
      event.stopPropagation();
      reload?.();
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
    update: (next: unknown, nextEffects?: unknown, reload?: unknown, userCss?: unknown): void => {
      if (disposed) {
        return;
      }
      settings = normalizeCodexSettings(next);
      applyUserCss(userCss);
      const list = readEffects(nextEffects);
      if (list && reload !== reloadToken) {
        // A reload was asked for: start every effect afresh (failed ones get another try).
        reloadToken = reload;
        applyEffects([]);
      }
      if (list) {
        applyEffects(list);
      }
      applyCore();
      effects?.host.themeChanged();
      panel?.refresh();
      if (list) {
        const failed = effects?.host.status().filter((status) => status.state === 'failed') ?? [];
        panel?.say(
          failed.length > 0
            ? `已刷新；${failed.length} 个效果加载失败：${failed.map((status) => status.id).join('、')}`
            : '已刷新'
        );
      }
    },
    settings: () => normalizeCodexSettings(settings),
    effects: () => effects?.host.status() ?? [],
    probe: probeSelectors,
    degraded: () => missingAlwaysPresentGroups(probeSelectors()),
    backgroundReply: (nonce: string, reply: unknown): void => backgrounds.reply(nonce, reply),
    resizeBackground: async (base64: string, type: string): Promise<string> =>
      blobToBase64(await resizeBackgroundImage(base64ToBlob(base64, type))),
    dispose: (): void => {
      if (disposed) {
        return;
      }
      flushSave();
      disposed = true;
      // Each step runs even if an earlier one throws: the page must end up clean.
      const steps: Array<() => void> = [
        (): void => {
          if (degradedTimer !== null) {
            globalThis.clearTimeout(degradedTimer);
          }
        },
        (): void => document.removeEventListener('keydown', onKeyDown, true),
        (): void => panel?.dispose(),
        (): void => effects?.dispose(),
        (): void => backgroundLayer.dispose(),
        (): void => backgrounds.dispose(),
        (): void => diffs.dispose(),
        (): void => diffEngine?.dispose(),
        (): void => codeEngine?.dispose(),
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
      diffEngine = null;
      uninstallController(CODEX_CONTROLLER_KEY, controller);
    },
  };

  effects = startCodexEffects({
    settings: () => settings,
    nodeAttributes: ownership,
    idPrefix: `${source === 'userscript' ? CODEX_PLUS_STYLE_ID_PREFIX : CODEX_STYLE_ID_PREFIX}fx-`,
    core: (name: string, values: EffectValues | null): void => {
      if (name === 'code-gradient' || name === 'background') {
        core[name] = values;
        if (!applyingEffects) {
          applyCore();
        }
      }
    },
    onError: (id: string, message: string): void => {
      binding(CODEX_LOG_BINDING)?.(JSON.stringify({ id, message }));
      panel?.refresh();
    },
  });
  applyUserCss(userCssInput);
  applyEffects(readEffects(effectsInput) ?? []);
  applyCore();
  styles.upsert('settings', SETTINGS_PANEL_CSS);
  panel = startSettingsPanel({
    settings: () => settings,
    change: changeSettings,
    effects: {
      effects: () => effects?.host.status() ?? [],
      change: changeEffect,
      reset: resetEffects,
      reload,
      location: '%APPDATA%\\Woodfish\\effects',
      userCss:
        source === 'cdp'
          ? {
              open: (): boolean => ask('open-user-css'),
              reset: (): boolean => ask('reset-user-css'),
            }
          : null,
    },
    background: { store: backgrounds },
    footnote: PANEL_FOOTNOTE[source],
    nodeAttributes: ownership,
  });
  document.addEventListener('keydown', onKeyDown, true);
  document.documentElement.dataset[CODEX_DATASET.active] = CODEX_ADAPTER_VERSION;
  document.documentElement.dataset[CODEX_DATASET.source] = source;
  degradedTimer = globalThis.setTimeout(markDegraded, DEGRADED_CHECK_DELAY_MS);
  return installController(CODEX_CONTROLLER_KEY, controller);
}
