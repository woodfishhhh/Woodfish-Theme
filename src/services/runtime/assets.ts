import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CursorThemeDefaults, RuntimeCssAssets } from './payloadBuilder';
import { DEFAULT_WOODFISH_THEME_LABEL, resolveWoodfishTheme } from './themeRegistry';
import {
  compileTokenColorSelectors,
  EditorColorOverrides,
  resolveEditorColorOverrides,
  TokenColorTheme,
} from './tokenColorMap';

const runtimeAssetCache = new WeakMap<vscode.ExtensionContext, Map<string, RuntimeCssAssets>>();

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8').trim();
}

type ThemeMeta = {
  label: string;
  slug: string;
  activityBadgeGradient: string;
  activityBadgeTextColor?: string;
  tabBorderGradient: string;
  runtime?: {
    activityBadgeShadow?: string;
    tabBorderShadow?: string;
    tabBorderAnimationDuration?: string;
    cursorDefaults?: CursorThemeDefaults;
  };
};

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function buildThemeVariableBlock(meta: ThemeMeta): string {
  const runtime = meta.runtime ?? {};

  return [
    ':root {',
    `  --woodfish-activity-badge-gradient: ${meta.activityBadgeGradient};`,
    `  --woodfish-activity-badge-text-color: ${meta.activityBadgeTextColor ?? 'rgb(70 70 70)'};`,
    `  --woodfish-activity-badge-shadow: ${runtime.activityBadgeShadow ?? 'none'};`,
    `  --woodfish-tab-border-gradient: ${meta.tabBorderGradient};`,
    `  --woodfish-tab-border-shadow: ${runtime.tabBorderShadow ?? 'none'};`,
    `  --woodfish-tab-border-animation-duration: ${runtime.tabBorderAnimationDuration ?? '3s'};`,
    '}',
  ].join('\n');
}

function readEditorColorOverrides(themeLabel: string): EditorColorOverrides {
  const workspace = vscode.workspace as typeof vscode.workspace | undefined;
  if (!workspace) {
    return {};
  }

  const customizations = workspace
    .getConfiguration('workbench')
    .get<unknown>('colorCustomizations');
  return resolveEditorColorOverrides(customizations, themeLabel);
}

export function readRuntimeAssets(
  context: vscode.ExtensionContext,
  themeLabel = DEFAULT_WOODFISH_THEME_LABEL
): RuntimeCssAssets {
  const theme = resolveWoodfishTheme(themeLabel);
  if (!theme) {
    throw new Error(`Unknown Woodfish runtime theme: ${themeLabel}`);
  }

  let contextCache = runtimeAssetCache.get(context);
  if (!contextCache) {
    contextCache = new Map<string, RuntimeCssAssets>();
    runtimeAssetCache.set(context, contextCache);
  }

  const editorColorOverrides = readEditorColorOverrides(theme.label);
  const cacheKey = `${theme.label}:${JSON.stringify(editorColorOverrides)}`;
  const cachedAssets = contextCache.get(cacheKey);
  if (cachedAssets) {
    return cachedAssets;
  }

  const resolveSharedThemePath = (...segments: string[]): string =>
    context.asAbsolutePath(path.join('themes', 'shared', ...segments));
  const resolveThemePath = (...segments: string[]): string =>
    context.asAbsolutePath(path.join('themes', theme.directory, ...segments));
  const themeMeta = readJsonFile<ThemeMeta>(resolveThemePath(theme.metaFile));
  const themeSource = readJsonFile<TokenColorTheme>(resolveThemePath(theme.themeFile));
  const glowParts = [readFile(resolveSharedThemePath('glow-effects.css'))];
  if (theme.glowFile) {
    glowParts.push(
      compileTokenColorSelectors(
        readFile(resolveThemePath(theme.glowFile)),
        themeSource,
        editorColorOverrides
      )
    );
  }

  const assets = {
    themeVariables: buildThemeVariableBlock(themeMeta),
    cursorDefaults: themeMeta.runtime?.cursorDefaults,
    activityBar: readFile(resolveSharedThemePath('activity-bar.css')),
    tabBar: readFile(resolveSharedThemePath('tab-bar.css')),
    syntaxGradient: compileTokenColorSelectors(
      readFile(resolveThemePath(theme.syntaxFile)),
      themeSource,
      editorColorOverrides
    ),
    glow: glowParts.join('\n\n'),
    cursorCore: readFile(resolveSharedThemePath('cursor-core.css')),
    cursorGlow: readFile(resolveSharedThemePath('cursor-glow.css')),
  };
  contextCache.set(cacheKey, assets);
  return assets;
}
