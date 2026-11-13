import * as vscode from 'vscode';
import { FeatureStateController } from '../config/featureState';
import { EffectsService } from '../services/effects';
import { IntegratedThemeService } from '../services/runtime/service';

export type CommandDeps = {
  featureState: FeatureStateController;
  runtimeService: IntegratedThemeService;
  effects: EffectsService;
  extensionContext: vscode.ExtensionContext;
};
