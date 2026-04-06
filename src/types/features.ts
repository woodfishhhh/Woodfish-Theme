export type FeatureFlags = {
  runtimeEnabled: boolean;
  syntaxGradient: boolean;
  glow: boolean;
  cursor: boolean;
};

export type RuntimeSettings = {
  enabled: boolean;
  autoSwitchTheme: boolean;
  reapplyOnStartup: boolean;
};

export type SyntaxGradientSettings = {
  enabled: boolean;
  preset: string;
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

export type ThemeRuntimeSettings = {
  runtime: RuntimeSettings;
  syntaxGradient: SyntaxGradientSettings;
  glow: GlowSettings;
  cursor: CursorSettings;
};

export const DEFAULT_RUNTIME_SETTINGS: ThemeRuntimeSettings = {
  runtime: {
    enabled: true,
    autoSwitchTheme: true,
    reapplyOnStartup: true,
  },
  syntaxGradient: {
    enabled: true,
    preset: 'woodfish',
    customRules: [],
  },
  glow: {
    enabled: true,
    intensity: 1,
    customRules: [],
  },
  cursor: {
    enabled: true,
    animationDuration: 8,
    gradientStops: [
      '#ff2d95',
      '#ff4500',
      '#ffd700',
      '#7cfc00',
      '#00ffff',
      '#1e90ff',
      '#9370db',
      '#ff00ff',
      '#ff1493',
    ],
    borderRadius: 2,
    glow: true,
    glowBlur: 4,
    glowOpacity: 0.7,
    customRules: [],
  },
};

export function featureFlagsFromSettings(settings: ThemeRuntimeSettings): FeatureFlags {
  return {
    runtimeEnabled: settings.runtime.enabled,
    syntaxGradient: settings.syntaxGradient.enabled,
    glow: settings.glow.enabled,
    cursor: settings.cursor.enabled,
  };
}
