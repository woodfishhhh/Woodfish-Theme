import * as vscode from 'vscode';
import {
  FeatureKey,
  onThemeSettingsChanged,
  readFeatureFlags,
  readRuntimeSettings,
  setFeatureFlag,
  setRuntimeEnabled,
  toggleFeatureFlag,
} from './featureFlags';
import { ThemeStatusBar } from '../ui/statusBar';
import { FeatureFlags, ThemeRuntimeSettings } from '../types/features';

export class FeatureStateController {
  private features: FeatureFlags;
  private settings: ThemeRuntimeSettings;

  constructor(private readonly statusBar: ThemeStatusBar) {
    this.settings = readRuntimeSettings();
    this.features = readFeatureFlags();
    this.statusBar.update(this.features);
  }

  public current(): FeatureFlags {
    return { ...this.features };
  }

  public currentSettings(): ThemeRuntimeSettings {
    return {
      runtime: { ...this.settings.runtime },
      syntaxGradient: {
        ...this.settings.syntaxGradient,
        customRules: [...this.settings.syntaxGradient.customRules],
      },
      glow: {
        ...this.settings.glow,
        customRules: [...this.settings.glow.customRules],
      },
      cursor: {
        ...this.settings.cursor,
        gradientStops: [...this.settings.cursor.gradientStops],
        customRules: [...this.settings.cursor.customRules],
      },
    };
  }

  public refreshFromConfig(): FeatureFlags {
    this.settings = readRuntimeSettings();
    this.features = readFeatureFlags();
    this.statusBar.update(this.features);
    return this.current();
  }

  public async toggle(feature: FeatureKey): Promise<FeatureFlags> {
    await toggleFeatureFlag(feature);
    return this.refreshFromConfig();
  }

  public async set(feature: FeatureKey, enabled: boolean): Promise<FeatureFlags> {
    await setFeatureFlag(feature, enabled);
    return this.refreshFromConfig();
  }

  public async setRuntimeEnabled(enabled: boolean): Promise<FeatureFlags> {
    await setRuntimeEnabled(enabled);
    return this.refreshFromConfig();
  }

  public registerConfigListener(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      onThemeSettingsChanged(() => {
        this.refreshFromConfig();
      })
    );
  }
}
