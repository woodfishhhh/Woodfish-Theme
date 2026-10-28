import {
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
  normalizeCursor,
  normalizeGlass,
  normalizeGlow,
  normalizeNativeWindow,
  normalizeTextGradient,
  sanitizeBoolean,
  sanitizeCustomCssRules,
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

export type OverlaySettings = {
  enabled: boolean;
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

export type RuntimeOptions = {
  fixChecksums: boolean;
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
  runtime?: Partial<RuntimeOptions>;
  explicitSettings?: Partial<ThemeRuntimeExplicitSettings>;
};

export const RUNTIME_SETTING_LIMITS = EFFECT_INPUT_LIMITS;

export const DEFAULT_RUNTIME_SETTINGS: ThemeRuntimeSettings = {
  overlay: {
    enabled: true,
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
