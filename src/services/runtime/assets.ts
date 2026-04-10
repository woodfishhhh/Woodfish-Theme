import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { RuntimeCssAssets } from './payloadBuilder';

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8').trim();
}

export function readRuntimeAssets(context: vscode.ExtensionContext): RuntimeCssAssets {
  const resolveThemePath = (...segments: string[]): string =>
    context.asAbsolutePath(path.join('themes', 'Bearded Theme', ...segments));

  return {
    activityBar: readFile(resolveThemePath('activity-bar.css')),
    tabBar: readFile(resolveThemePath('tab-bar.css')),
    syntaxGradient: readFile(resolveThemePath('syntax-highlighting.css')),
    glow: readFile(resolveThemePath('glow-effects.css')),
    cursorCore: readFile(resolveThemePath('cursor-core.css')),
    cursorGlow: readFile(resolveThemePath('cursor-glow.css')),
  };
}
