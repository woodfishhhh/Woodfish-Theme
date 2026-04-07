import * as vscode from 'vscode';
import {
  FeatureKey,
  onThemeSettingsChanged,
  readFeatureFlags,
  readRuntimeSettings,
  setFeatureFlag,
  toggleFeatureFlag,
} from './featureFlags';
import { ThemeStatusBar } from '../ui/statusBar';
import { FeatureFlags, RuntimeStatusSnapshot, ThemeRuntimeSettings } from '../types/features';

type RuntimeStatusResolver = (features: FeatureFlags) => RuntimeStatusSnapshot;

const DEFAULT_RUNTIME_STATUS: RuntimeStatusSnapshot = {
  state: 'off',
  activeTheme: '',
  isWoodfishTheme: false,
  hasPayload: false,
};

export class FeatureStateController {
  private features: FeatureFlags;
  private settings: ThemeRuntimeSettings;
  private runtimeStatusResolver: RuntimeStatusResolver = () => DEFAULT_RUNTIME_STATUS;

  constructor(private readonly statusBar: ThemeStatusBar) {
    this.settings = readRuntimeSettings();
    this.features = readFeatureFlags();
    this.refreshStatusBar();
  }

  public current(): FeatureFlags {
    return { ...this.features };
  }

  public currentSettings(): ThemeRuntimeSettings {
    return {
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
    this.refreshStatusBar();
    return this.current();
  }

  public refreshStatusBar(): void {
    this.statusBar.update(this.features, this.runtimeStatusResolver(this.features));
  }

  public setRuntimeStatusResolver(resolver: RuntimeStatusResolver): void {
    this.runtimeStatusResolver = resolver;
    this.refreshStatusBar();
  }

  public async toggle(feature: FeatureKey): Promise<FeatureFlags> {
    await toggleFeatureFlag(feature);
    return this.refreshFromConfig();
  }

  public async set(feature: FeatureKey, enabled: boolean): Promise<FeatureFlags> {
    await setFeatureFlag(feature, enabled);
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
