import {
  BackgroundParams,
  DEFAULT_BACKGROUND,
  DEFAULT_CURSOR,
  DEFAULT_GLASS,
  DEFAULT_GLOW,
  DEFAULT_NATIVE_WINDOW,
  DEFAULT_TEXT_GRADIENT,
  EFFECT_INPUT_LIMITS,
  GLASS_MODES,
  GlassMode,
  NATIVE_MAC_VIBRANCY,
  NATIVE_WINDOWS_MATERIALS,
  NativeMacVibrancy,
  NativeWindowsMaterial,
  normalizeBackground,
  normalizeCursor,
  normalizeGlass,
  normalizeGlow,
  normalizeNativeWindow,
  normalizeTextGradient,
  sanitizeBoolean,
  sanitizeCustomCssRules,
  sanitizeEnum,
} from '@woodfish/theme-core';

export { GLASS_MODES, NATIVE_MAC_VIBRANCY, NATIVE_WINDOWS_MATERIALS };
export type { GlassMode, NativeMacVibrancy, NativeWindowsMaterial };

export type FeatureFlags = {
  syntaxGradient: boolean;
  glow: boolean;
  cursor: boolean;
  glass: boolean;
};

export type RuntimeStatus = 'on' | 'paused' | 'off';

export type RuntimeStatusSnapshot = {
  state: RuntimeStatus;
  activeTheme: string;
  isWoodfishTheme: boolean;
  hasPayload: boolean;
};

/** `classic` is the 5.x look (#31): bold code and a wide halo in the text's own color. */
export const OVERLAY_STYLES = ['modern', 'classic'] as const;
export type OverlayStyle = (typeof OVERLAY_STYLES)[number];

export type OverlaySettings = {
  enabled: boolean;
  style: OverlayStyle;
  hueShift: number;
  lightnessDelta: number;
  neutralChroma: number;
  angle: number;
};

export type SyntaxGradientSettings = {
  enabled: boolean;
  customRules: string[];
};

export type GlowSettings = {
  enabled: boolean;
  intensity: number;
  customRules: string[];
};

export type CursorSettings = {
  enabled: boolean;
  animationDuration: number;
  gradientStops: string[];
  borderRadius: number;
  glow: boolean;
  glowBlur: number;
  glowOpacity: number;
  customRules: string[];
};

export const GLASS_TARGET_KEYS = [
  'menu',
  'hover',
  'suggest',
  'quickInput',
  'notifications',
  'editorWidget',
  'dropdown',
  'breadcrumbPicker',
  'debugToolbar',
  'stickyScroll',
  'paneHeader',
  'dialog',
] as const;

export type GlassTargetKey = (typeof GLASS_TARGET_KEYS)[number];

export type NativeWindowSettings = {
  enabled: boolean;
  windowsMaterial: NativeWindowsMaterial;
  macVibrancy: NativeMacVibrancy;
  opacity: number;
};

export type GlassSettings = {
  enabled: boolean;
  mode: GlassMode;
  blur: number;
  saturate: number;
  opacity: number;
  noise: number;
  borderRadius: number;
  targets: GlassTargetKey[];
  animations: boolean;
  reveal: boolean;
  nativeWindow: NativeWindowSettings;
};

/**
 * The window background. `image` is `''` (the bundled 《彩云》), `gradient` (the `fill`
 * colors) or the file name of a picture copied into the extension's global storage.
 */
export type BackgroundSettings = { enabled: boolean; image: string } & BackgroundParams;

export const BACKGROUND_GRADIENT_IMAGE = 'gradient';
const BACKGROUND_FILE_NAME = /^[0-9a-f]{12}\.(?:webp|png|jpg)$/;

/** Keeps only the values the extension itself writes, so the setting cannot name other files. */
export function sanitizeBackgroundImage(value: unknown): string {
  return typeof value === 'string' &&
    (value === BACKGROUND_GRADIENT_IMAGE || BACKGROUND_FILE_NAME.test(value))
    ? value
    : '';
}

export type RuntimeOptions = {
  fixChecksums: boolean;
};

/**
 * Effect plugins (mouse trail, caret trail, typing particles and any effect in the user's
 * effects folder). Their own values are read live by the effects service; only this master
 * switch changes the workbench payload.
 */
export type EffectsSettings = {
  enabled: boolean;
};

export type CursorThemeDefaultKey = keyof Pick<
  CursorSettings,
  'animationDuration' | 'gradientStops' | 'borderRadius' | 'glowBlur' | 'glowOpacity'
>;

export type ThemeRuntimeExplicitSettings = {
  cursor: Partial<Record<CursorThemeDefaultKey, boolean>>;
};

export type ThemeRuntimeSettings = {
  overlay: OverlaySettings;
  syntaxGradient: SyntaxGradientSettings;
  glow: GlowSettings;
  cursor: CursorSettings;
  glass: GlassSettings;
  background: BackgroundSettings;
  effects: EffectsSettings;
  runtime: RuntimeOptions;
  explicitSettings?: ThemeRuntimeExplicitSettings;
};

export type PartialRuntimeSettings = {
  overlay?: Partial<OverlaySettings>;
  syntaxGradient?: Partial<SyntaxGradientSettings>;
  glow?: Partial<GlowSettings>;
  cursor?: Partial<CursorSettings>;
  glass?: Partial<Omit<GlassSettings, 'nativeWindow'>> & {
    nativeWindow?: Partial<NativeWindowSettings>;
  };
  background?: Partial<BackgroundSettings>;
  effects?: Partial<EffectsSettings>;
  runtime?: Partial<RuntimeOptions>;
  explicitSettings?: Partial<ThemeRuntimeExplicitSettings>;
};

export const RUNTIME_SETTING_LIMITS = EFFECT_INPUT_LIMITS;

export const DEFAULT_RUNTIME_SETTINGS: ThemeRuntimeSettings = {
  overlay: {
    enabled: true,
    style: 'modern',
    ...DEFAULT_TEXT_GRADIENT,
  },
  syntaxGradient: {
    enabled: true,
    customRules: [],
  },
  glow: {
    enabled: true,
    intensity: DEFAULT_GLOW.intensity,
    customRules: [],
  },
  cursor: {
    enabled: true,
    animationDuration: DEFAULT_CURSOR.animationDuration,
    gradientStops: [...DEFAULT_CURSOR.gradientStops],
    borderRadius: DEFAULT_CURSOR.borderRadius,
    glow: true,
    glowBlur: DEFAULT_CURSOR.glowBlur,
    glowOpacity: DEFAULT_CURSOR.glowOpacity,
    customRules: [],
  },
  glass: {
    enabled: false,
    ...DEFAULT_GLASS,
    targets: [...GLASS_TARGET_KEYS],
    animations: true,
    reveal: true,
    nativeWindow: {
      enabled: false,
      ...DEFAULT_NATIVE_WINDOW,
    },
  },
  // Off by default: the extension is public; users opt in with the command or the setting.
  background: {
    enabled: false,
    image: '',
    ...DEFAULT_BACKGROUND,
    fill: [...DEFAULT_BACKGROUND.fill],
  },
  effects: {
    enabled: true,
  },
  runtime: {
    fixChecksums: true,
  },
};

function sanitizeGlassTargets(value: unknown, fallback: GlassTargetKey[]): GlassTargetKey[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const allowed = GLASS_TARGET_KEYS as readonly string[];
  const targets = value.filter(
    (candidate): candidate is GlassTargetKey =>
      typeof candidate === 'string' && allowed.includes(candidate)
  );
  return [...new Set(targets)];
}

export function normalizeRuntimeSettings(
  partial: PartialRuntimeSettings = {}
): ThemeRuntimeSettings {
  const explicitSettings = partial.explicitSettings?.cursor
    ? {
        cursor: { ...partial.explicitSettings.cursor },
      }
    : undefined;
  const cursor = normalizeCursor(partial.cursor);

  return {
    overlay: {
      enabled: sanitizeBoolean(partial.overlay?.enabled, DEFAULT_RUNTIME_SETTINGS.overlay.enabled),
      style: sanitizeEnum(
        partial.overlay?.style,
        OVERLAY_STYLES,
        DEFAULT_RUNTIME_SETTINGS.overlay.style
      ),
      ...normalizeTextGradient(partial.overlay),
    },
    syntaxGradient: {
      enabled: sanitizeBoolean(
        partial.syntaxGradient?.enabled,
        DEFAULT_RUNTIME_SETTINGS.syntaxGradient.enabled
      ),
      customRules: sanitizeCustomCssRules(partial.syntaxGradient?.customRules),
    },
    glow: {
      enabled: sanitizeBoolean(partial.glow?.enabled, DEFAULT_RUNTIME_SETTINGS.glow.enabled),
      intensity: normalizeGlow(partial.glow).intensity,
      customRules: sanitizeCustomCssRules(partial.glow?.customRules),
    },
    cursor: {
      enabled: sanitizeBoolean(partial.cursor?.enabled, DEFAULT_RUNTIME_SETTINGS.cursor.enabled),
      animationDuration: cursor.animationDuration,
      gradientStops: cursor.gradientStops,
      borderRadius: cursor.borderRadius,
      glow: sanitizeBoolean(partial.cursor?.glow, DEFAULT_RUNTIME_SETTINGS.cursor.glow),
      glowBlur: cursor.glowBlur,
      glowOpacity: cursor.glowOpacity,
      customRules: sanitizeCustomCssRules(partial.cursor?.customRules),
    },
    glass: normalizeGlassSettings(partial.glass),
    background: {
      enabled: sanitizeBoolean(
        partial.background?.enabled,
        DEFAULT_RUNTIME_SETTINGS.background.enabled
      ),
      image: sanitizeBackgroundImage(partial.background?.image),
      ...normalizeBackground(partial.background),
    },
    effects: {
      enabled: sanitizeBoolean(partial.effects?.enabled, DEFAULT_RUNTIME_SETTINGS.effects.enabled),
    },
    runtime: {
      fixChecksums: sanitizeBoolean(
        partial.runtime?.fixChecksums,
        DEFAULT_RUNTIME_SETTINGS.runtime.fixChecksums
      ),
    },
    ...(explicitSettings ? { explicitSettings } : {}),
  };
}

function normalizeGlassSettings(partial: PartialRuntimeSettings['glass']): GlassSettings {
  const defaults = DEFAULT_RUNTIME_SETTINGS.glass;
  return {
    enabled: sanitizeBoolean(partial?.enabled, defaults.enabled),
    ...normalizeGlass(partial),
    targets: sanitizeGlassTargets(partial?.targets, defaults.targets),
    animations: sanitizeBoolean(partial?.animations, defaults.animations),
    reveal: sanitizeBoolean(partial?.reveal, defaults.reveal),
    nativeWindow: {
      enabled: sanitizeBoolean(partial?.nativeWindow?.enabled, defaults.nativeWindow.enabled),
      ...normalizeNativeWindow(partial?.nativeWindow),
    },
  };
}

export function featureFlagsFromSettings(settings: ThemeRuntimeSettings): FeatureFlags {
  return {
    syntaxGradient: settings.syntaxGradient.enabled,
    glow: settings.glow.enabled,
    cursor: settings.cursor.enabled,
    glass: settings.glass.enabled,
  };
}
