import * as vscode from 'vscode';
import { CONFIG_SECTION, FEATURE_SETTING_KEYS } from '../constants/config';
import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from '../types/features';

export type FeatureKey = keyof FeatureFlags;

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

export function readFeatureFlags(): FeatureFlags {
  const config = getConfig();
  return {
    glow: config.get<boolean>(FEATURE_SETTING_KEYS.glow, DEFAULT_FEATURE_FLAGS.glow),
    rainbow: config.get<boolean>(FEATURE_SETTING_KEYS.rainbow, DEFAULT_FEATURE_FLAGS.rainbow),
  };
}

export async function setFeatureFlag(feature: FeatureKey, enabled: boolean): Promise<void> {
  const settingKey = FEATURE_SETTING_KEYS[feature];
  await getConfig().update(settingKey, enabled, vscode.ConfigurationTarget.Global);
}

export async function toggleFeatureFlag(feature: FeatureKey): Promise<boolean> {
  const settingKey = FEATURE_SETTING_KEYS[feature];
  const current = getConfig().get<boolean>(settingKey, DEFAULT_FEATURE_FLAGS[feature]);
  const next = !current;
  await setFeatureFlag(feature, next);
  return next;
}

export function onFeatureFlagsChanged(handler: () => void): vscode.Disposable {
  const watchedPaths = Object.values(FEATURE_SETTING_KEYS).map(
    (settingKey) => `${CONFIG_SECTION}.${settingKey}`
  );

  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (watchedPaths.some((path) => event.affectsConfiguration(path))) {
      handler();
    }
  });
}

