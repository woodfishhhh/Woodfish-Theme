import * as vscode from 'vscode';
import { FeatureStateController } from '../config/featureState';
import { CustomCssService } from '../services/customCss/service';
import { ThemePaths } from '../services/themePaths';

export type CommandDeps = {
  featureState: FeatureStateController;
  customCssService: CustomCssService;
  themePaths: ThemePaths;
  extensionContext: vscode.ExtensionContext;
};

