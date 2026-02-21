import * as vscode from 'vscode';
import { SupportedCssExtension } from './types';

const SUPPORTED_EXTENSIONS: readonly SupportedCssExtension[] = [
  {
    kind: 'custom-css',
    id: 'be5invis.vscode-custom-css',
    name: 'Custom CSS and JS Loader',
    configKey: 'vscode_custom_css.imports',
  },
  {
    kind: 'hot-reload',
    id: 'bartag.custom-css-hot-reload',
    name: 'Custom CSS Hot Reload',
    configKey: 'custom_css_hot_reload.imports',
  },
];

export function detectPreferredCssExtension(): SupportedCssExtension | null {
  for (const candidate of SUPPORTED_EXTENSIONS) {
    if (vscode.extensions.getExtension(candidate.id)) {
      return candidate;
    }
  }
  return null;
}

export function getAllSupportedCssExtensions(): SupportedCssExtension[] {
  return [...SUPPORTED_EXTENSIONS];
}

