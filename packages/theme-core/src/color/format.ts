import { clamp } from './parse';
import { RgbColor } from './types';

/** Formats a (possibly out-of-range) sRGB color as a clamped `rgba()` string. */
export function formatRgba(color: RgbColor, alpha: number): string {
  return `rgba(${Math.round(clamp(color.r, 0, 255))}, ${Math.round(
    clamp(color.g, 0, 255)
  )}, ${Math.round(clamp(color.b, 0, 255))}, ${Number(clamp(alpha).toFixed(4))})`;
}

/** Appends a two-digit alpha channel to a `#rrggbb` color. */
export function withHexAlpha(hex: string, opacity: number): string {
  return `${hex.slice(0, 7)}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()}`;
}
