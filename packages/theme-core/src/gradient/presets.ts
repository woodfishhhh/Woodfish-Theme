import { parseCssColor } from '../color/parse';
import { RgbaColor } from '../color/types';

/** One hand-tuned text gradient. */
export interface PresetGradient {
  /** Direction in degrees. */
  angle: number;
  /** Two or more CSS colors, spread evenly from 0% to 100%. */
  stops: readonly string[];
}

/**
 * The hand-tuned gradients of one built-in theme, keyed by the token color they replace.
 * Colors without an entry fall back to the derived gradient.
 */
export interface GradientPreset {
  /** Palette slug. */
  slug: string;
  /** Editor background and foreground; hosts recognise the active theme by them. */
  background: string;
  foreground: string;
  /** Keys are upper-case `#RRGGBB`; translucent token colors never match. */
  tokens: Readonly<Record<string, PresetGradient>>;
}

function toHexKey(color: RgbaColor): string | null {
  if (color.alpha < 1) {
    return null;
  }
  return `#${[color.r, color.g, color.b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/** The preset's gradient for an opaque token color, or `null`. */
export function findPresetGradient(
  preset: GradientPreset,
  color: RgbaColor
): PresetGradient | null {
  const key = toHexKey(color);
  return key ? (preset.tokens[key] ?? null) : null;
}

function sameColor(left: string, right: string): boolean {
  const first = parseCssColor(left);
  const second = parseCssColor(right);
  return (
    first !== null &&
    second !== null &&
    toHexKey(first) !== null &&
    toHexKey(first) === toHexKey(second)
  );
}

/** The preset whose theme has exactly this editor background and foreground. */
export function matchGradientPreset(
  presets: readonly GradientPreset[],
  background: string,
  foreground: string
): GradientPreset | null {
  return (
    presets.find(
      (preset) =>
        sameColor(preset.background, background) && sameColor(preset.foreground, foreground)
    ) ?? null
  );
}
