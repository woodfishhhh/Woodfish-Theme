import { contrastRatio } from '../color/contrast';
import { hueDistance, normalizeHue, rgbToOklch } from '../color/oklch';
import { requireCssColor } from '../color/parse';
import { OklchColor } from '../color/types';
import { NEUTRAL_CHROMA_THRESHOLD } from '../gradient/tokenGradient';
import { PaletteTokenRole, WoodfishPalette } from './types';

/** WCAG contrast floor for token colors on the editor background. */
export const MIN_TOKEN_CONTRAST = 4.5;
/** Comments may be quieter. */
export const MIN_COMMENT_CONTRAST = 3;
/** Keyword and variable must be told apart by hue (issue #6). */
export const MIN_KEYWORD_VARIABLE_HUE_DISTANCE = 40;

const SIMILAR_ROLE_PAIRS: ReadonlyArray<readonly [PaletteTokenRole, PaletteTokenRole]> = [
  ['keyword', 'function'],
  ['keyword', 'storage'],
  ['function', 'type'],
  ['string', 'type'],
  ['number', 'parameter'],
];

/** OKLCH of a palette color with the hue normalized to [0, 360). */
export function paletteOklch(color: string): OklchColor {
  const oklch = rgbToOklch(requireCssColor(color));
  return { ...oklch, h: normalizeHue(oklch.h) };
}

export function paletteContrast(left: string, right: string): number {
  return contrastRatio(requireCssColor(left), requireCssColor(right));
}

export function paletteHueDistance(left: string, right: string): number {
  return hueDistance(paletteOklch(left).h, paletteOklch(right).h);
}

/**
 * Checks readability rules every Woodfish palette must satisfy.
 * Returns human-readable problems; an empty list means the palette passes.
 */
export function validatePalette(palette: WoodfishPalette): string[] {
  const problems: string[] = [];
  const background = palette.ui.bg;
  const tokenEntries = Object.entries(palette.tokens) as Array<[PaletteTokenRole, string]>;
  for (const [role, color] of tokenEntries) {
    const minimum = role === 'comment' ? MIN_COMMENT_CONTRAST : MIN_TOKEN_CONTRAST;
    const ratio = paletteContrast(color, background);
    if (ratio < minimum) {
      problems.push(`${role} ${color} contrast ${ratio.toFixed(2)} < ${minimum}`);
    }
  }

  const { keyword, variable } = palette.tokens;
  const variableIsNeutral = paletteOklch(variable).c < NEUTRAL_CHROMA_THRESHOLD;
  const keywordVariableDistance = paletteHueDistance(keyword, variable);
  if (!variableIsNeutral && keywordVariableDistance < MIN_KEYWORD_VARIABLE_HUE_DISTANCE) {
    problems.push(
      `keyword/variable hue distance ${keywordVariableDistance.toFixed(1)}° < ${MIN_KEYWORD_VARIABLE_HUE_DISTANCE}°`
    );
  }

  for (const [left, right] of SIMILAR_ROLE_PAIRS) {
    const distance = paletteHueDistance(palette.tokens[left], palette.tokens[right]);
    const lightness = Math.abs(
      paletteOklch(palette.tokens[left]).l - paletteOklch(palette.tokens[right]).l
    );
    if (distance < 25 && lightness < 0.08) {
      problems.push(
        `${left}/${right} too similar (hue ${distance.toFixed(1)}°, ΔL ${lightness.toFixed(3)})`
      );
    }
  }
  return problems;
}
