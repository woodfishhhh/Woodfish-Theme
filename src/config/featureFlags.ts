import * as vscode from 'vscode';
import {
  CONFIG_SECTION,
  CURSOR_SETTING_KEYS,
  FEATURE_SETTING_KEYS,
  GLOW_SETTING_KEYS,
  RUNTIME_SETTING_KEYS,
  SYNTAX_SETTING_KEYS,
  WORKBENCH_SECTION,
} from '../constants/config';
import {
  DEFAULT_RUNTIME_SETTINGS,
  FeatureFlags,
  ThemeRuntimeSettings,
  featureFlagsFromSettings,
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

export function readRuntimeSettings(): ThemeRuntimeSettings {
  return {
    runtime: {
      enabled: readSetting(RUNTIME_SETTING_KEYS.enabled, DEFAULT_RUNTIME_SETTINGS.runtime.enabled),
      autoSwitchTheme: readSetting(
        RUNTIME_SETTING_KEYS.autoSwitchTheme,
        DEFAULT_RUNTIME_SETTINGS.runtime.autoSwitchTheme
      ),
      reapplyOnStartup: readSetting(
        RUNTIME_SETTING_KEYS.reapplyOnStartup,
        DEFAULT_RUNTIME_SETTINGS.runtime.reapplyOnStartup
      ),
    },
    syntaxGradient: {
      enabled: readSetting(
        FEATURE_SETTING_KEYS.syntaxGradient,
        DEFAULT_RUNTIME_SETTINGS.syntaxGradient.enabled
      ),
      preset: readSetting(
        SYNTAX_SETTING_KEYS.preset,
        DEFAULT_RUNTIME_SETTINGS.syntaxGradient.preset
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
  };
}

export function readFeatureFlags(): FeatureFlags {
  return featureFlagsFromSettings(readRuntimeSettings());
}

export async function setFeatureFlag(feature: FeatureKey, enabled: boolean): Promise<void> {
  const settingKey = FEATURE_SETTING_KEYS[feature];
  await getThemeConfig().update(settingKey, enabled, vscode.ConfigurationTarget.Global);
}

export async function toggleFeatureFlag(feature: FeatureKey): Promise<boolean> {
  const current = readFeatureFlags()[feature];
  const next = !current;
  await setFeatureFlag(feature, next);
  return next;
}

export async function setRuntimeEnabled(enabled: boolean): Promise<void> {
  await getThemeConfig().update(
    RUNTIME_SETTING_KEYS.enabled,
    enabled,
    vscode.ConfigurationTarget.Global
  );
}

export function readCurrentColorTheme(): string {
  return vscode.workspace.getConfiguration(WORKBENCH_SECTION).get<string>('colorTheme', '');
}

export async function setColorTheme(themeName: string): Promise<void> {
  await vscode.workspace
    .getConfiguration(WORKBENCH_SECTION)
    .update('colorTheme', themeName, vscode.ConfigurationTarget.Global);
}

export function onThemeSettingsChanged(handler: () => void): vscode.Disposable {
  const watchedPaths = [
    `${CONFIG_SECTION}.${RUNTIME_SETTING_KEYS.enabled}`,
    `${CONFIG_SECTION}.${RUNTIME_SETTING_KEYS.autoSwitchTheme}`,
    `${CONFIG_SECTION}.${RUNTIME_SETTING_KEYS.reapplyOnStartup}`,
    `${CONFIG_SECTION}.${FEATURE_SETTING_KEYS.syntaxGradient}`,
    `${CONFIG_SECTION}.${FEATURE_SETTING_KEYS.glow}`,
    `${CONFIG_SECTION}.${FEATURE_SETTING_KEYS.cursor}`,
    `${CONFIG_SECTION}.${SYNTAX_SETTING_KEYS.preset}`,
    `${CONFIG_SECTION}.${SYNTAX_SETTING_KEYS.customRules}`,
    `${CONFIG_SECTION}.${GLOW_SETTING_KEYS.intensity}`,
    `${CONFIG_SECTION}.${GLOW_SETTING_KEYS.customRules}`,
    `${CONFIG_SECTION}.${CURSOR_SETTING_KEYS.animationDuration}`,
    `${CONFIG_SECTION}.${CURSOR_SETTING_KEYS.gradientStops}`,
    `${CONFIG_SECTION}.${CURSOR_SETTING_KEYS.borderRadius}`,
    `${CONFIG_SECTION}.${CURSOR_SETTING_KEYS.glow}`,
    `${CONFIG_SECTION}.${CURSOR_SETTING_KEYS.glowBlur}`,
    `${CONFIG_SECTION}.${CURSOR_SETTING_KEYS.glowOpacity}`,
    `${CONFIG_SECTION}.${CURSOR_SETTING_KEYS.customRules}`,
    `${WORKBENCH_SECTION}.colorTheme`,
  ];

  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (watchedPaths.some((path) => event.affectsConfiguration(path))) {
      handler();
    }
  });
}
