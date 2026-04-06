import * as vscode from 'vscode';
import { FeatureStateController } from '../config/featureState';
import { IntegratedThemeService } from '../services/runtime/service';

export type CommandDeps = {
  featureState: FeatureStateController;
  runtimeService: IntegratedThemeService;
  extensionContext: vscode.ExtensionContext;
};
