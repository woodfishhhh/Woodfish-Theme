export const CONFIG_SECTION = 'woodfishTheme';
export const WORKBENCH_SECTION = 'workbench';

export const FEATURE_SETTING_KEYS = {
  syntaxGradient: 'syntaxGradient.enabled',
  glow: 'glow.enabled',
  cursor: 'cursor.enabled',
} as const;

export const OVERLAY_SETTING_KEYS = {
  enabled: 'overlay.enabled',
  hueShift: 'overlay.hueShift',
  lightnessDelta: 'overlay.lightnessDelta',
  neutralChroma: 'overlay.neutralChroma',
  angle: 'overlay.angle',
} as const;

export const SYNTAX_SETTING_KEYS = {
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
