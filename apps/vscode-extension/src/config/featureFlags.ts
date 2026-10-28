import * as vscode from 'vscode';
import {
  CONFIG_SECTION,
  CURSOR_SETTING_KEYS,
  FEATURE_SETTING_KEYS,
  GLASS_SETTING_KEYS,
  GLOW_SETTING_KEYS,
  OVERLAY_SETTING_KEYS,
  RUNTIME_SETTING_KEYS,
  SYNTAX_SETTING_KEYS,
  WORKBENCH_SECTION,
} from '../constants/config';
import {
  DEFAULT_RUNTIME_SETTINGS,
  FeatureFlags,
  ThemeRuntimeSettings,
  featureFlagsFromSettings,
  normalizeRuntimeSettings,
} from '../types/features';

export type FeatureKey = keyof typeof FEATURE_SETTING_KEYS;

function getRootConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration();
}

function getThemeConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

function getThemeSettingKey(key: string): string {
  return `${CONFIG_SECTION}.${key}`;
}

function readSetting<T>(key: string, fallback: T): T {
  return getRootConfig().get<T>(getThemeSettingKey(key), fallback);
}

function isExplicitSetting(key: string): boolean {
  const inspected = getRootConfig().inspect(getThemeSettingKey(key));
  if (!inspected) {
    return false;
  }

  return [
    inspected.globalValue,
    inspected.workspaceValue,
    inspected.workspaceFolderValue,
    inspected.globalLanguageValue,
    inspected.workspaceLanguageValue,
    inspected.workspaceFolderLanguageValue,
  ].some((value) => value !== undefined);
}

export function readRuntimeSettings(): ThemeRuntimeSettings {
  return normalizeRuntimeSettings({
    overlay: {
      enabled: readSetting(OVERLAY_SETTING_KEYS.enabled, DEFAULT_RUNTIME_SETTINGS.overlay.enabled),
      hueShift: readSetting(
        OVERLAY_SETTING_KEYS.hueShift,
        DEFAULT_RUNTIME_SETTINGS.overlay.hueShift
      ),
      lightnessDelta: readSetting(
        OVERLAY_SETTING_KEYS.lightnessDelta,
        DEFAULT_RUNTIME_SETTINGS.overlay.lightnessDelta
      ),
      neutralChroma: readSetting(
        OVERLAY_SETTING_KEYS.neutralChroma,
        DEFAULT_RUNTIME_SETTINGS.overlay.neutralChroma
      ),
      angle: readSetting(OVERLAY_SETTING_KEYS.angle, DEFAULT_RUNTIME_SETTINGS.overlay.angle),
    },
    syntaxGradient: {
      enabled: readSetting(
        FEATURE_SETTING_KEYS.syntaxGradient,
        DEFAULT_RUNTIME_SETTINGS.syntaxGradient.enabled
      ),
      customRules: readSetting(
        SYNTAX_SETTING_KEYS.customRules,
        DEFAULT_RUNTIME_SETTINGS.syntaxGradient.customRules
      ),
    },
    glow: {
      enabled: readSetting(FEATURE_SETTING_KEYS.glow, DEFAULT_RUNTIME_SETTINGS.glow.enabled),
      intensity: readSetting(GLOW_SETTING_KEYS.intensity, DEFAULT_RUNTIME_SETTINGS.glow.intensity),
      customRules: readSetting(
        GLOW_SETTING_KEYS.customRules,
        DEFAULT_RUNTIME_SETTINGS.glow.customRules
      ),
    },
    cursor: {
      enabled: readSetting(FEATURE_SETTING_KEYS.cursor, DEFAULT_RUNTIME_SETTINGS.cursor.enabled),
      animationDuration: readSetting(
        CURSOR_SETTING_KEYS.animationDuration,
        DEFAULT_RUNTIME_SETTINGS.cursor.animationDuration
      ),
      gradientStops: readSetting(
        CURSOR_SETTING_KEYS.gradientStops,
        DEFAULT_RUNTIME_SETTINGS.cursor.gradientStops
      ),
      borderRadius: readSetting(
        CURSOR_SETTING_KEYS.borderRadius,
        DEFAULT_RUNTIME_SETTINGS.cursor.borderRadius
      ),
      glow: readSetting(CURSOR_SETTING_KEYS.glow, DEFAULT_RUNTIME_SETTINGS.cursor.glow),
      glowBlur: readSetting(CURSOR_SETTING_KEYS.glowBlur, DEFAULT_RUNTIME_SETTINGS.cursor.glowBlur),
      glowOpacity: readSetting(
        CURSOR_SETTING_KEYS.glowOpacity,
        DEFAULT_RUNTIME_SETTINGS.cursor.glowOpacity
      ),
      customRules: readSetting(
        CURSOR_SETTING_KEYS.customRules,
        DEFAULT_RUNTIME_SETTINGS.cursor.customRules
      ),
    },
    glass: {
      enabled: readSetting(FEATURE_SETTING_KEYS.glass, DEFAULT_RUNTIME_SETTINGS.glass.enabled),
      mode: readSetting(GLASS_SETTING_KEYS.mode, DEFAULT_RUNTIME_SETTINGS.glass.mode),
      blur: readSetting(GLASS_SETTING_KEYS.blur, DEFAULT_RUNTIME_SETTINGS.glass.blur),
      saturate: readSetting(GLASS_SETTING_KEYS.saturate, DEFAULT_RUNTIME_SETTINGS.glass.saturate),
      opacity: readSetting(GLASS_SETTING_KEYS.opacity, DEFAULT_RUNTIME_SETTINGS.glass.opacity),
      noise: readSetting(GLASS_SETTING_KEYS.noise, DEFAULT_RUNTIME_SETTINGS.glass.noise),
      borderRadius: readSetting(
        GLASS_SETTING_KEYS.borderRadius,
        DEFAULT_RUNTIME_SETTINGS.glass.borderRadius
      ),
      targets: readSetting(GLASS_SETTING_KEYS.targets, DEFAULT_RUNTIME_SETTINGS.glass.targets),
      animations: readSetting(
        GLASS_SETTING_KEYS.animations,
        DEFAULT_RUNTIME_SETTINGS.glass.animations
      ),
      reveal: readSetting(GLASS_SETTING_KEYS.reveal, DEFAULT_RUNTIME_SETTINGS.glass.reveal),
      nativeWindow: {
        enabled: readSetting(
          GLASS_SETTING_KEYS.nativeWindowEnabled,
          DEFAULT_RUNTIME_SETTINGS.glass.nativeWindow.enabled
        ),
        windowsMaterial: readSetting(
          GLASS_SETTING_KEYS.nativeWindowWindowsMaterial,
          DEFAULT_RUNTIME_SETTINGS.glass.nativeWindow.windowsMaterial
        ),
        macVibrancy: readSetting(
          GLASS_SETTING_KEYS.nativeWindowMacVibrancy,
          DEFAULT_RUNTIME_SETTINGS.glass.nativeWindow.macVibrancy
        ),
        opacity: readSetting(
          GLASS_SETTING_KEYS.nativeWindowOpacity,
          DEFAULT_RUNTIME_SETTINGS.glass.nativeWindow.opacity
        ),
      },
    },
    runtime: {
      fixChecksums: readSetting(
        RUNTIME_SETTING_KEYS.fixChecksums,
        DEFAULT_RUNTIME_SETTINGS.runtime.fixChecksums
      ),
    },
    explicitSettings: {
      cursor: {
        animationDuration: isExplicitSetting(CURSOR_SETTING_KEYS.animationDuration),
        gradientStops: isExplicitSetting(CURSOR_SETTING_KEYS.gradientStops),
        borderRadius: isExplicitSetting(CURSOR_SETTING_KEYS.borderRadius),
        glowBlur: isExplicitSetting(CURSOR_SETTING_KEYS.glowBlur),
        glowOpacity: isExplicitSetting(CURSOR_SETTING_KEYS.glowOpacity),
      },
    },
  });
}

export function readFeatureFlags(): FeatureFlags {
  return featureFlagsFromSettings(readRuntimeSettings());
}

export async function setFeatureFlag(feature: FeatureKey, enabled: boolean): Promise<void> {
  const settingKey = FEATURE_SETTING_KEYS[feature];
  await getThemeConfig().update(settingKey, enabled, vscode.ConfigurationTarget.Global);
}

export async function setOverlayEnabled(enabled: boolean): Promise<void> {
  await getThemeConfig().update(
    OVERLAY_SETTING_KEYS.enabled,
    enabled,
    vscode.ConfigurationTarget.Global
  );
}

export async function toggleFeatureFlag(feature: FeatureKey): Promise<boolean> {
  const current = readFeatureFlags()[feature];
  const next = !current;
  await setFeatureFlag(feature, next);
  return next;
}

export function readCurrentColorTheme(): string {
  return vscode.workspace.getConfiguration(WORKBENCH_SECTION).get<string>('colorTheme', '');
}

export function onThemeSettingsChanged(handler: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (
      event.affectsConfiguration(CONFIG_SECTION) ||
      event.affectsConfiguration(`${WORKBENCH_SECTION}.colorTheme`)
    ) {
      handler();
    }
  });
}
