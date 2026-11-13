import {
  BACKGROUND_IMAGE_LIMITS,
  BackgroundParams,
  readBackgroundImageInfo,
} from '@woodfish/theme-core';
import { formatCssNumber } from './tokenCss';

/*
 * The window background shared by every host: one fixed layer under the whole page with
 * the picture showing through the theme color, and declarations for the panels laid over
 * it. Everything is a static, pre-scaled image, so scrolling and streaming cost nothing.
 */

/** Holds the picture as a CSS image (`url(blob:…)`), set at runtime by hosts that load it. */
export const BACKGROUND_IMAGE_VARIABLE = '--woodfish-background-image';
/** A blurred copy of the picture for frosted panels drawn without a live backdrop filter. */
export const BACKGROUND_SOFT_IMAGE_VARIABLE = '--woodfish-background-image-soft';
const LUMINOSITY_VARIABLE = '--woodfish-background-luminosity';

export interface BackgroundLayerOptions {
  /** The layer, usually a pseudo-element such as `body::before`. */
  layerSelector: string;
  /** The theme's own background color under the picture. */
  base: string;
  /** Matches light themes, where the luminosity layer turns light. */
  lightScope: string;
  /** CSS image of the picture; defaults to the runtime variable. */
  image?: string;
}

function percent(value: number): string {
  return `${formatCssNumber(value * 100)}%`;
}

function rule(selector: string, declarations: string[]): string {
  return [`${selector} {`, ...declarations, '}'].join('\n');
}

/** The theme color at `1 - opacity` laid over the picture, so the picture shows at `opacity`. */
function veil(base: string, params: BackgroundParams): string {
  const color = `color-mix(in oklab, ${base} ${percent(1 - params.opacity)}, transparent)`;
  return `linear-gradient(${color}, ${color})`;
}

/** The gradient used instead of a picture (top to bottom, like the default picture). */
export function buildBackgroundFillImage(fill: readonly string[]): string {
  return `linear-gradient(180deg, ${fill.join(', ')})`;
}

/**
 * The layer itself: the theme color, the picture over it, and the veil over the picture.
 * The layer is opaque, so whatever the host draws under it (an OS material) does not leak
 * through.
 */
export function buildBackgroundLayerCss(
  params: BackgroundParams,
  options: BackgroundLayerOptions
): string {
  const image = options.image ?? `var(${BACKGROUND_IMAGE_VARIABLE}, none)`;
  return [
    rule(':root', [`  ${LUMINOSITY_VARIABLE}: rgb(51 51 51 / ${percent(params.luminosity)});`]),
    rule(options.lightScope, [
      `  ${LUMINOSITY_VARIABLE}: rgb(204 204 204 / ${percent(params.luminosity)});`,
    ]),
    rule(options.layerSelector, [
      '  content: "";',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: -1;',
      '  pointer-events: none;',
      `  background-color: ${options.base};`,
      `  background-image: ${veil(options.base, params)}, ${image};`,
      `  background-size: auto, ${params.size};`,
      `  background-position: center, ${params.position};`,
      '  background-repeat: no-repeat;',
    ]),
  ].join('\n\n');
}

export interface BackgroundCopyOptions {
  base: string;
  /** CSS image; defaults to the runtime variable (the blurred copy when `soft`). */
  image?: string;
  soft?: boolean;
  /** The panel's own color, laid over the copy at the mask strength (frosted panels). */
  tint?: string;
}

/**
 * The background drawn again on one element, pinned to the window so it lines up with the
 * layer. A band shows exactly what lies under it and hides content scrolling beneath; a
 * frosted panel shows the pre-blurred copy under the luminosity layer and its tint. Both
 * are static images: a live backdrop-filter is recomputed on every frame something under
 * or inside it moves (streaming text, a running indicator, the caret), this is not.
 */
export function buildBackgroundCopyDeclarations(
  params: BackgroundParams,
  options: BackgroundCopyOptions
): string[] {
  const image =
    options.image ??
    (options.soft
      ? `var(${BACKGROUND_SOFT_IMAGE_VARIABLE}, var(${BACKGROUND_IMAGE_VARIABLE}, none))`
      : `var(${BACKGROUND_IMAGE_VARIABLE}, none)`);
  const layers: string[] = [];
  if (options.tint) {
    const color = `color-mix(in oklab, ${options.tint} ${percent(params.mask)}, transparent)`;
    layers.push(
      `linear-gradient(${color}, ${color})`,
      `linear-gradient(var(${LUMINOSITY_VARIABLE}), var(${LUMINOSITY_VARIABLE}))`
    );
  }
  layers.push(veil(options.base, params), image);
  const each = (last: string, others: string): string =>
    layers.map((_, index) => (index === layers.length - 1 ? last : others)).join(', ');
  const declarations = [
    `  background-color: ${options.base} !important;`,
    `  background-image: ${layers.join(', ')} !important;`,
    `  background-size: ${each(params.size, 'auto')} !important;`,
    `  background-position: ${each(params.position, 'center')} !important;`,
    '  background-repeat: no-repeat !important;',
    '  background-attachment: fixed !important;',
  ];
  if (params.transition > 0) {
    declarations.push(
      `  transition: background-color ${formatCssNumber(params.transition)}ms ease;`
    );
  }
  return declarations;
}

/**
 * A frosted panel with a live backdrop blur: the luminosity layer, the panel's own color
 * (`tint`) at the mask strength, and `backdrop-filter`. For hosts whose panels sit over
 * content that rarely changes; `blur: null` keeps the panel translucent without a filter.
 */
export function buildFrostedPanelDeclarations(
  tint: string,
  params: BackgroundParams,
  blur: number | null
): string[] {
  const color = `color-mix(in oklab, ${tint} ${percent(params.mask)}, transparent)`;
  const declarations = [
    `  background-color: var(${LUMINOSITY_VARIABLE}) !important;`,
    `  background-image: linear-gradient(${color}, ${color}) !important;`,
  ];
  if (blur !== null && blur > 0) {
    const filter = `blur(${formatCssNumber(blur)}px) saturate(${formatCssNumber(params.saturate)}%)`;
    declarations.push(
      `  -webkit-backdrop-filter: ${filter} !important;`,
      `  backdrop-filter: ${filter} !important;`
    );
  }
  if (params.transition > 0) {
    declarations.push(
      `  transition: background-color ${formatCssNumber(params.transition)}ms ease, background-image ${formatCssNumber(params.transition)}ms ease;`
    );
  }
  return declarations;
}

/** Decodes base64 into a Blob in memory (Codex's CSP does not let `fetch` read data: URLs). */
export function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks: string[] = [];
  for (let index = 0; index < bytes.length; index += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)));
  }
  return btoa(chunks.join(''));
}

/** Why a picture was refused, in the user's words. */
export class BackgroundImageError extends Error {}

/**
 * Checks a picture by its content, decodes it straight at the target size (a huge photo
 * never sits in memory at full resolution), lets `draw` paint it and encodes WebP.
 */
async function redraw(
  picture: Blob,
  maxEdge: number,
  quality: number,
  draw: (context: CanvasRenderingContext2D, bitmap: ImageBitmap) => void
): Promise<Blob> {
  if (picture.size > BACKGROUND_IMAGE_LIMITS.maxInputBytes) {
    throw new BackgroundImageError('图片太大（超过 40 MB）');
  }
  const info = readBackgroundImageInfo(new Uint8Array(await picture.arrayBuffer()));
  if (!info) {
    throw new BackgroundImageError('只支持 JPG、PNG 和 WebP 图片');
  }
  const scale = Math.min(1, maxEdge / Math.max(info.width, info.height));
  const bitmap = await createImageBitmap(picture, {
    resizeWidth: Math.max(1, Math.round(info.width * scale)),
    resizeHeight: Math.max(1, Math.round(info.height * scale)),
    resizeQuality: 'high',
  });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new BackgroundImageError('无法处理这张图片');
    }
    draw(context, bitmap);
    const encoded = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality)
    );
    if (!encoded) {
      throw new BackgroundImageError('无法处理这张图片');
    }
    return encoded;
  } finally {
    bitmap.close();
  }
}

/** Scales a picture so the longest edge is at most `maxEdge`, re-encoded as WebP. */
export function resizeBackgroundImage(
  picture: Blob,
  maxEdge: number = BACKGROUND_IMAGE_LIMITS.maxEdge,
  quality = 0.85
): Promise<Blob> {
  return redraw(picture, maxEdge, quality, (context, bitmap) => context.drawImage(bitmap, 0, 0));
}

/** Longest edge of the blurred copy; blur hides detail, so a small image is enough. */
const SOFT_EDGE = 640;

/**
 * The blurred, saturated copy frosted panels show, made once per picture and setting.
 * `blur` is in screen pixels; the copy is drawn with `size` over `viewport`, so the canvas
 * radius is scaled to match.
 */
export function blurBackgroundImage(
  picture: Blob,
  params: Pick<BackgroundParams, 'blur' | 'saturate' | 'size'>,
  viewport: { width: number; height: number }
): Promise<Blob> {
  return redraw(picture, SOFT_EDGE, 0.9, (context, bitmap) => {
    const { width, height } = bitmap;
    const shown =
      params.size === 'cover'
        ? Math.max(viewport.width / width, viewport.height / height)
        : Math.min(viewport.width / width, viewport.height / height);
    const radius = params.blur / Math.max(shown, 0.01);
    context.filter = `blur(${formatCssNumber(radius)}px) saturate(${formatCssNumber(params.saturate)}%)`;
    // Overdraw the edges a little so the blur does not fade out to transparent there.
    const pad = radius * 2;
    context.drawImage(bitmap, -pad, -pad, width + pad * 2, height + pad * 2);
  });
}
