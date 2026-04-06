export const CONFIG_SECTION = 'woodfishTheme';
export const WORKBENCH_SECTION = 'workbench';
export const WOODFISH_THEME_NAME = 'Woodfish Dark';

export const FEATURE_SETTING_KEYS = {
  syntaxGradient: 'syntaxGradient.enabled',
  glow: 'glow.enabled',
  cursor: 'cursor.enabled',
} as const;

export const RUNTIME_SETTING_KEYS = {
  enabled: 'runtime.enabled',
  autoSwitchTheme: 'runtime.autoSwitchTheme',
  reapplyOnStartup: 'runtime.reapplyOnStartup',
} as const;

export const SYNTAX_SETTING_KEYS = {
  preset: 'syntaxGradient.preset',
  customRules: 'syntaxGradient.customRules',
} as const;

export const GLOW_SETTING_KEYS = {
  intensity: 'glow.intensity',
  customRules: 'glow.customRules',
} as const;

export const CURSOR_SETTING_KEYS = {
  animationDuration: 'cursor.animationDuration',
  gradientStops: 'cursor.gradientStops',
  borderRadius: 'cursor.borderRadius',
  glow: 'cursor.glow',
  glowBlur: 'cursor.glowBlur',
  glowOpacity: 'cursor.glowOpacity',
  customRules: 'cursor.customRules',
} as const;
