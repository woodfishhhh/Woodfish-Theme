import * as vscode from 'vscode';
import { FeatureFlags } from '../types/features';
import {
  FeatureKey,
  onFeatureFlagsChanged,
  readFeatureFlags,
  setFeatureFlag,
  toggleFeatureFlag,
} from './featureFlags';
import { ThemeStatusBar } from '../ui/statusBar';

export class FeatureStateController {
  private features: FeatureFlags;

  constructor(private readonly statusBar: ThemeStatusBar) {
    this.features = readFeatureFlags();
    this.statusBar.update(this.features);
  }

  public current(): FeatureFlags {
    return { ...this.features };
  }

  public refreshFromConfig(): FeatureFlags {
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

  public registerConfigListener(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      onFeatureFlagsChanged(() => {
        this.refreshFromConfig();
      })
    );
  }
}

