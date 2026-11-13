import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildBackgroundFillImage,
  buildBackgroundLayerCss,
  buildFrostedPanelDeclarations,
  formatCssNumber,
} from '@woodfish/renderer-runtime';
import {
  BACKGROUND_IMAGE_LIMITS,
  backgroundImageExtension,
  needsBackgroundCompression,
  readBackgroundImageInfo,
} from '@woodfish/theme-core';
import { BACKGROUND_GRADIENT_IMAGE, BackgroundSettings } from '../../types/features';
import { NATIVE_PARTS } from './glass';

/** Where the packaged extension keeps 《彩云》 (staged in while packaging, see scripts/paths.js). */
export const DEFAULT_BACKGROUND_RELATIVE = path.join(
  'themes',
  'shared',
  'backgrounds',
  'caiyun.webp'
);
/** The committed original, used when running from the repository. */
const DEFAULT_BACKGROUND_SOURCE = path.join(
  '..',
  '..',
  'packages',
  'renderer-runtime',
  'assets',
  'caiyun.webp'
);
const STORAGE_FOLDER = 'backgrounds';

export class BackgroundImportError extends Error {}

export interface BackgroundLocations {
  extensionPath: string;
  /** The extension's global storage folder. */
  storagePath: string;
}

/**
 * The workbench loads files through `vscode-file://vscode-app/<path>`; VS Code serves
 * images (.webp, .png, .jpg) from any folder that way, so no data URI is needed.
 */
export function toWorkbenchFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const absolute = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `vscode-file://vscode-app${encodeURI(absolute).replace(/[#?]/g, encodeURIComponent)}`;
}

/** The picture file the setting points at; a missing import falls back to 《彩云》. */
export function resolveBackgroundFile(
  settings: BackgroundSettings,
  locations: BackgroundLocations
): string | null {
  if (settings.image === BACKGROUND_GRADIENT_IMAGE) {
    return null;
  }
  const candidates = [
    ...(settings.image ? [path.join(locations.storagePath, STORAGE_FOLDER, settings.image)] : []),
    path.join(locations.extensionPath, DEFAULT_BACKGROUND_RELATIVE),
    path.resolve(locations.extensionPath, DEFAULT_BACKGROUND_SOURCE),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function rule(selectors: string, declarations: string[]): string {
  return [`${selectors} {`, ...declarations, '}'].join('\n');
}

/**
 * VS Code 1.146's floating panels paint the parts and their panes with `!important` at
 * up to four-class specificity (`.monaco-workbench.floating-panels .part.auxiliarybar`);
 * `:root body` puts the background rules above them.
 */
function scoped(selectors: readonly string[]): string {
  return selectors.map((selector) => `:root body ${selector}`).join(',\n');
}

/** Opaque layers of the floating-panels layout: the frame around the parts, the editor card. */
const FLOATING_MAIN = ['.monaco-workbench .monaco-grid-view', '.monaco-workbench .part.editor'];
/** Views inside side bars and the panel paint the side bar color again. */
const SIDE_PANES = [
  '.monaco-workbench :is(.part.sidebar, .part.auxiliarybar, .part.panel) .monaco-pane-view .pane',
];

/**
 * The window background in VS Code: the layer under the workbench (the editor color with
 * the picture showing through), the editor cleared, side bars and the panel frosted and
 * the thin strips (tabs, title, status, activity bar) lightly blurred. The workbench
 * already loads it as a file; nothing runs per frame.
 */
export function buildBackgroundCss(settings: BackgroundSettings, imageUrl: string | null): string {
  if (!settings.enabled) {
    return '';
  }
  const image =
    settings.image === BACKGROUND_GRADIENT_IMAGE
      ? buildBackgroundFillImage(settings.fill)
      : imageUrl
        ? `url("${imageUrl}")`
        : 'none';
  const parts = [
    buildBackgroundLayerCss(settings, {
      layerSelector: '.monaco-workbench::before',
      base: 'var(--vscode-editor-background)',
      lightScope: '.monaco-workbench.vs, .monaco-workbench.hc-light',
      image,
    }),
    rule('html,\nbody,\n.monaco-workbench', ['  background: transparent !important;']),
    rule(scoped([...FLOATING_MAIN, ...SIDE_PANES]), [
      '  background-color: transparent !important;',
    ]),
    ...NATIVE_PARTS.map((part) =>
      rule(
        scoped(part.selectors),
        part.kind === 'main'
          ? ['  background-color: transparent !important;']
          : buildFrostedPanelDeclarations(
              `var(${part.colorVariable})`,
              settings,
              part.kind === 'panel' ? settings.blur : settings.secondaryBlur
            )
      )
    ),
    // The minimap paints the editor color into its canvas; let the picture through.
    rule('.monaco-editor .minimap canvas:not(.minimap-decorations-layer)', [
      `  opacity: ${formatCssNumber(Math.max(0.4, 1 - settings.opacity))};`,
    ]),
  ];
  return ['@media not (prefers-reduced-transparency: reduce) {', parts.join('\n\n'), '}'].join(
    '\n'
  );
}

/** Scales a large picture down and re-encodes it as WebP (done in a webview's canvas). */
export type BackgroundCompressor = (
  data: Buffer,
  info: { type: string; width: number; height: number }
) => Promise<Buffer>;

/**
 * Validates a picture by its content and keeps a copy in the extension's storage, named
 * by its hash, so the original can be moved or deleted. Large pictures are compressed
 * first. Older imports are removed; only the one in use is kept. Returns the file name
 * the setting stores.
 */
export async function importBackgroundImage(
  source: string,
  storagePath: string,
  compress: BackgroundCompressor
): Promise<string> {
  const size = fs.statSync(source).size;
  if (size > BACKGROUND_IMAGE_LIMITS.maxInputBytes) {
    throw new BackgroundImportError('图片太大（超过 40 MB）');
  }
  let data = fs.readFileSync(source);
  let info = readBackgroundImageInfo(data);
  if (!info) {
    throw new BackgroundImportError('只支持 JPG、PNG 和 WebP 图片');
  }
  if (needsBackgroundCompression(info, data.length)) {
    data = await compress(data, info);
    info = readBackgroundImageInfo(data);
    if (!info || needsBackgroundCompression(info, data.length)) {
      throw new BackgroundImportError('无法压缩这张图片');
    }
  }
  const name = `${createHash('sha256').update(data).digest('hex').slice(0, 12)}.${backgroundImageExtension(info.type)}`;
  const folder = path.join(storagePath, STORAGE_FOLDER);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, name), data);
  for (const entry of fs.readdirSync(folder)) {
    if (entry !== name) {
      fs.rmSync(path.join(folder, entry), { force: true });
    }
  }
  return name;
}
