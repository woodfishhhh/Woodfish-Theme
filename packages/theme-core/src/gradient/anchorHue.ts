import { rgbToOklch } from '../color/oklch';
import { parseCssColor } from '../color/parse';
import { OklchColor } from '../color/types';
import { NEUTRAL_CHROMA_THRESHOLD } from './tokenGradient';

/** Palette colors darker or greyer than this are ignored when picking the anchor hue. */
const ANCHOR_MINIMUM_CHROMA = 0.075;
const ANCHOR_MINIMUM_LIGHTNESS = 0.4;

const PUNCTUATION_ONLY = /^[()[\]{}.,;:+\-*/%=<>!?&|~^@#`'"\\]+$/;

/** True when the visible text is only brackets, operators and similar symbols. */
export function isPunctuationOnly(value: string): boolean {
  const text = value.replace(/\u00a0/g, ' ').trim();
  return text.length > 0 && PUNCTUATION_ONLY.test(text);
}

/**
 * Picks the dominant hue of a text palette. Each entry is the color of one rendered
 * word (repeat colors to weight them); colors are ranked by `occurrences × chroma`.
 * Returns `null` when no color is colorful and bright enough.
 */
export function rankPaletteAnchorHue(colors: Iterable<string>): number | null {
  const palette = new Map<string, OklchColor & { count: number }>();
  for (const cssColor of colors) {
    const parsed = parseCssColor(cssColor);
    if (!parsed) {
      continue;
    }
    const color = rgbToOklch(parsed);
    if (color.c < ANCHOR_MINIMUM_CHROMA || color.l < ANCHOR_MINIMUM_LIGHTNESS) {
      continue;
    }
    const entry = palette.get(cssColor) ?? { ...color, count: 0 };
    entry.count += 1;
    palette.set(cssColor, entry);
  }

  const ranked = [...palette.values()].sort(
    (left, right) => right.count * right.c - left.count * left.c
  );
  return ranked[0] ? ranked[0].h : null;
}

/** Hue of the most saturated non-neutral accent color, or `null` when all are neutral. */
export function pickAccentHue(colors: Iterable<string>): number | null {
  let best: OklchColor | null = null;
  for (const cssColor of colors) {
    const parsed = parseCssColor(cssColor);
    if (!parsed) {
      continue;
    }
    const color = rgbToOklch(parsed);
    if (color.c >= NEUTRAL_CHROMA_THRESHOLD && (!best || color.c > best.c)) {
      best = color;
    }
  }
  return best ? best.h : null;
}
