import { srgbToLinear } from './oklch';
import { RgbColor } from './types';

/** WCAG 2.x relative luminance. */
export function relativeLuminance(color: RgbColor): number {
  return (
    0.2126 * srgbToLinear(color.r) + 0.7152 * srgbToLinear(color.g) + 0.0722 * srgbToLinear(color.b)
  );
}

/** WCAG 2.x contrast ratio, 1-21. Order of the arguments does not matter. */
export function contrastRatio(left: RgbColor, right: RgbColor): number {
  const [high, low] = [relativeLuminance(left), relativeLuminance(right)].sort(
    (first, second) => second - first
  );
  return (high + 0.05) / (low + 0.05);
}
