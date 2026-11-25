import { EffectSource, EffectStatus } from '@woodfish/renderer-runtime';
import { defaultEffectValues } from '@woodfish/theme-core';
import { DSH_BOOT_GLOBAL, DSH_SETTINGS_NAMESPACE, DshPersistedConfig } from '../protocol';
import {
  DEFAULT_DSH_SETTINGS,
  DshBackgroundId,
  DshEffectOverrides,
  DshMode,
  DshSettings,
  applyDshEffectOverrides,
  fromPersistedConfig,
  normalizeBackgroundId,
  normalizeDshSettings,
  toPersistedConfig,
} from '../settings';
import { DshOverlayController, startDshOverlay } from '../renderer/overlay';
import { DshBackgroundClient } from './backgrounds';
import {
  ConfigForm,
  DshBrowserGlobals,
  DshClientContext,
  DshThemePreference,
  SettingsPathOp,
} from './dshClientTypes';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface WoodfishUiSnapshot {
  readonly settings: DshSettings;
  readonly effects: readonly EffectStatus[];
  readonly appearance: DshThemePreference;
  readonly resolvedMode: 'light' | 'dark';
  readonly saveState: SaveState;
  readonly saveError: string | null;
  readonly revision: number;
}

const DEBOUNCE_MS = 180;

function readBootSettings(): DshSettings {
  const boot = (globalThis as unknown as DshBrowserGlobals)[DSH_BOOT_GLOBAL];
  return boot ? fromPersistedConfig(boot) : normalizeDshSettings(DEFAULT_DSH_SETTINGS);
}

function samePersisted(a: DshPersistedConfig, b: DshPersistedConfig): boolean {
  return (
    a.paletteDark === b.paletteDark &&
    a.paletteLight === b.paletteLight &&
    a.backgroundImage === b.backgroundImage &&
    a.customCss === b.customCss &&
    a.userCss === b.userCss &&
    a.effectsJson === b.effectsJson
  );
}

function diffOps(
  previous: DshPersistedConfig,
  next: DshPersistedConfig
): readonly SettingsPathOp[] {
  const keys: ReadonlyArray<keyof DshPersistedConfig> = [
    'paletteDark',
    'paletteLight',
    'backgroundImage',
    'customCss',
    'userCss',
    'effectsJson',
  ];
  const ops: SettingsPathOp[] = [];
  for (const key of keys) {
    if (previous[key] !== next[key]) {
      ops.push({ op: 'set', path: [key], value: next[key] });
    }
  }
  return ops;
}

/**
 * Reactive client runtime coordinating the Woodfish DOM overlay, bundled effect plugins,
 * dsh's native `ThemeRuntime` (for xterm & theme-color sync), and Host settings persistence
 * (`ctx.configForms.get('woodfish-theme')`).
 */
export class WoodfishClientRuntime {
  private readonly ctx: DshClientContext;
  private readonly baseEffects: readonly EffectSource[];
  private readonly form: ConfigForm<DshPersistedConfig>;
  private readonly overlay: DshOverlayController;
  private readonly listeners = new Set<() => void>();
  private readonly cleanups: Array<() => void> = [];

  private settings: DshSettings;
  private lastPersisted: DshPersistedConfig;
  private saveState: SaveState = 'idle';
  private saveError: string | null = null;
  private pendingWrites = 0;
  private flushTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private themeOverrideDispose: (() => void) | null = null;
  private revision = 0;
  private disposed = false;
  private snapshot: WoodfishUiSnapshot;

  constructor(
    ctx: DshClientContext,
    baseEffects: readonly EffectSource[],
    backgrounds: DshBackgroundClient
  ) {
    this.ctx = ctx;
    this.baseEffects = baseEffects;
    this.form = ctx.configForms.get<DshPersistedConfig>(DSH_SETTINGS_NAMESPACE);
    this.settings = readBootSettings();
    this.lastPersisted = toPersistedConfig(this.settings);

    const initialEffects = applyDshEffectOverrides(this.baseEffects, this.settings.effects);
    this.overlay = startDshOverlay(this.settings, initialEffects, this.settings.userCss, {
      loadBackground: (id) => backgrounds.load(id),
      onPaletteChange: (palette) => this.syncThemeRuntime(palette),
    });

    this.snapshot = this.buildSnapshot();

    this.cleanups.push(
      this.form.subscribe(() => this.adoptFromHost()),
      this.ctx.on('theme/change', () => this.publish())
    );
    this.adoptFromHost();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): WoodfishUiSnapshot => {
    return this.snapshot;
  };

  setAppearance(preference: DshThemePreference): void {
    this.ctx.theme.setTheme(preference);
  }

  setPalette(mode: DshMode, slug: string | null): void {
    const next = normalizeDshSettings({
      ...this.settings,
      palette: { ...this.settings.palette, [mode]: slug },
    });
    this.applyLocalSettings(next, true);
  }

  setBackgroundImage(id: DshBackgroundId): void {
    const next = normalizeDshSettings({
      ...this.settings,
      backgroundImage: normalizeBackgroundId(id),
    });
    this.applyLocalSettings(next, true);
  }

  /** Updates any effect switch or parameter immediately in the live page, then persists. */
  setEffectParam(
    id: string,
    patch: Record<string, number | boolean | string>,
    immediate = false
  ): void {
    const updated = this.overlay.previewEffect(id, patch);
    if (!updated) {
      return;
    }
    const base = this.baseEffects.find((entry) => entry.id === id);
    const defaults = base ? defaultEffectValues(base.manifest) : null;
    const compact: Record<string, number | boolean | string> = {};
    for (const [key, value] of Object.entries(updated)) {
      if (!defaults || defaults[key] !== value) {
        compact[key] = value;
      }
    }
    const nextEffects: DshEffectOverrides = { ...this.settings.effects };
    if (Object.keys(compact).length > 0) {
      nextEffects[id] = compact;
    } else {
      delete nextEffects[id];
    }
    this.settings = { ...this.settings, effects: nextEffects };
    this.publish();
    this.schedulePersist(immediate);
  }

  resetEffect(id: string): void {
    const base = this.baseEffects.find((entry) => entry.id === id);
    if (!base) {
      return;
    }
    const defaults = defaultEffectValues(base.manifest);
    this.overlay.previewEffect(id, defaults);
    const nextEffects: DshEffectOverrides = { ...this.settings.effects };
    delete nextEffects[id];
    this.settings = { ...this.settings, effects: nextEffects };
    this.publish();
    this.schedulePersist(true);
  }

  resetAllEffects(): void {
    const next = normalizeDshSettings({ ...this.settings, effects: {} });
    this.applyLocalSettings(next, true);
  }

  setUserCss(css: string, immediate = false): void {
    const clamped = css.slice(0, 64 * 1024);
    this.settings = { ...this.settings, userCss: clamped };
    this.overlay.setUserCss(clamped);
    this.publish();
    this.schedulePersist(immediate);
  }

  resetAll(): void {
    this.applyLocalSettings(normalizeDshSettings(DEFAULT_DSH_SETTINGS), true);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.flushTimer !== null) {
      globalThis.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    for (const cleanup of this.cleanups.splice(0)) {
      try {
        cleanup();
      } catch {
        // Best-effort teardown.
      }
    }
    try {
      this.themeOverrideDispose?.();
    } catch {
      // Best-effort teardown.
    }
    this.themeOverrideDispose = null;
    this.overlay.dispose();
    this.listeners.clear();
  }

  private applyLocalSettings(next: DshSettings, immediate: boolean): void {
    this.settings = next;
    const sources = applyDshEffectOverrides(this.baseEffects, next.effects);
    this.overlay.update(next, sources, next.userCss);
    this.publish();
    this.schedulePersist(immediate);
  }

  private syncThemeRuntime(palette: DshSettings['palette']): void {
    if (this.disposed) {
      return;
    }
    try {
      this.themeOverrideDispose = this.ctx.theme.overrideTokens(DSH_SETTINGS_NAMESPACE, {
        '--woodfish-theme-sync': {
          dark: palette.dark ?? 'default',
          light: palette.light ?? 'default',
        },
      });
    } catch {
      // ThemeRuntime may not be ready in minimal unit-test harnesses.
    }
  }

  private adoptFromHost(): void {
    if (this.disposed || this.pendingWrites > 0 || this.flushTimer !== null) {
      return;
    }
    const formState = this.form.getSnapshot();
    if (formState.status !== 'ready' || formState.value === undefined) {
      return;
    }
    const incoming = fromPersistedConfig(formState.value);
    const incomingFlat = toPersistedConfig(incoming);
    if (samePersisted(incomingFlat, toPersistedConfig(this.settings))) {
      this.lastPersisted = incomingFlat;
      return;
    }
    this.settings = incoming;
    this.lastPersisted = incomingFlat;
    const sources = applyDshEffectOverrides(this.baseEffects, incoming.effects);
    this.overlay.update(incoming, sources, incoming.userCss);
    this.publish();
  }

  private schedulePersist(immediate: boolean): void {
    if (this.disposed) {
      return;
    }
    if (this.flushTimer !== null) {
      globalThis.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (immediate) {
      void this.flushPersist();
      return;
    }
    this.saveState = 'saving';
    this.saveError = null;
    this.publish();
    this.flushTimer = globalThis.setTimeout(() => {
      this.flushTimer = null;
      void this.flushPersist();
    }, DEBOUNCE_MS);
  }

  private async flushPersist(): Promise<void> {
    if (this.disposed) {
      return;
    }
    const nextFlat = toPersistedConfig(this.settings);
    const ops = diffOps(this.lastPersisted, nextFlat);
    if (ops.length === 0) {
      if (this.saveState === 'saving') {
        this.saveState = 'saved';
        this.publish();
      }
      return;
    }
    this.saveState = 'saving';
    this.saveError = null;
    this.pendingWrites += 1;
    this.publish();
    try {
      const ok = await this.form.mutate(ops);
      if (ok) {
        this.lastPersisted = nextFlat;
        this.saveState = 'saved';
        this.saveError = null;
      } else {
        this.saveState = 'error';
        this.saveError = '设置未能保存到 dsh 宿主，请重试';
      }
    } catch (error) {
      this.saveState = 'error';
      this.saveError = error instanceof Error ? error.message : String(error);
    } finally {
      this.pendingWrites -= 1;
      if (!this.disposed) {
        this.publish();
        if (this.pendingWrites === 0 && this.flushTimer === null) {
          this.adoptFromHost();
        }
      }
    }
  }

  private buildSnapshot(): WoodfishUiSnapshot {
    const themeState = this.ctx.theme.getTheme();
    return Object.freeze({
      settings: this.settings,
      effects: this.overlay.effects(),
      appearance: themeState.preference,
      resolvedMode: themeState.active.colorScheme,
      saveState: this.saveState,
      saveError: this.saveError,
      revision: this.revision,
    });
  }

  private publish(): void {
    this.revision += 1;
    this.snapshot = this.buildSnapshot();
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch {
        // Never allow one UI subscriber to stall state propagation.
      }
    }
  }
}
