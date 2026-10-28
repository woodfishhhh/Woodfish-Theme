export const CONFIG_SECTION = 'woodfishTheme';
export const WORKBENCH_SECTION = 'workbench';

export const FEATURE_SETTING_KEYS = {
  syntaxGradient: 'syntaxGradient.enabled',
  glow: 'glow.enabled',
  cursor: 'cursor.enabled',
  glass: 'glass.enabled',
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

export const GLASS_SETTING_KEYS = {
  mode: 'glass.mode',
  blur: 'glass.blur',
  saturate: 'glass.saturate',
  opacity: 'glass.opacity',
  noise: 'glass.noise',
  borderRadius: 'glass.borderRadius',
  targets: 'glass.targets',
  animations: 'glass.animations',
  reveal: 'glass.reveal',
  nativeWindowEnabled: 'glass.nativeWindow.enabled',
  nativeWindowWindowsMaterial: 'glass.nativeWindow.windowsMaterial',
  nativeWindowMacVibrancy: 'glass.nativeWindow.macVibrancy',
  nativeWindowOpacity: 'glass.nativeWindow.opacity',
} as const;

export const RUNTIME_SETTING_KEYS = {
  fixChecksums: 'runtime.fixChecksums',
} as const;

export const PRESET_SETTING_KEYS = {
  custom: 'presets.custom',
} as const;
