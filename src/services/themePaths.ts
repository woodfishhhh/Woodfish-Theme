import * as path from 'path';
import * as vscode from 'vscode';

export type ThemePaths = {
  themeIndexCss: string;
  themeBaseCss: string;
  themeGlowCss: string;
  themeRainbowCss: string;
  themeAllCss: string;
  themeJson: string;
  rainbowCursorCss: string;
  cursorLoaderCss: string;
};

export function getThemePaths(context: vscode.ExtensionContext): ThemePaths {
  const absolute = (segments: string[]): string => context.asAbsolutePath(path.join(...segments));

  return {
    themeIndexCss: absolute(['themes', 'Bearded Theme', 'index.css']),
    themeBaseCss: absolute(['themes', 'Bearded Theme', 'index-base.css']),
    themeGlowCss: absolute(['themes', 'Bearded Theme', 'index-with-glow.css']),
    themeRainbowCss: absolute(['themes', 'Bearded Theme', 'index-with-rainbow.css']),
    themeAllCss: absolute(['themes', 'Bearded Theme', 'index-all.css']),
    themeJson: absolute(['themes', 'Bearded Theme', 'Bearded Theme.json']),
    rainbowCursorCss: absolute(['themes', 'Bearded Theme', 'rainbow-cursor.css']),
    cursorLoaderCss: absolute(['themes', 'Bearded Theme', 'cursor-loader.css']),
  };
}

export function toFileUriString(absolutePath: string): string {
  return vscode.Uri.file(absolutePath).toString();
}

