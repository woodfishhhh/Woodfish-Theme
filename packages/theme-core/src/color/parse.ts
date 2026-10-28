import { RgbaColor } from './types';

export function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

const HEX_COLOR = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

/**
 * Parses `#rgb[a]`, `#rrggbb[aa]` and the numeric channels of `rgb()` / `rgba()` as
 * returned by `getComputedStyle`. Returns `null` when no color can be read.
 */
export function parseCssColor(value: string): RgbaColor | null {
  const hexadecimal = HEX_COLOR.exec(value.trim());
  if (hexadecimal) {
    const compact = hexadecimal[1];
    const expanded =
      compact.length <= 4
        ? [...compact].map((channel) => `${channel}${channel}`).join('')
        : compact;
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      alpha: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
  }

  const channels = value.match(/[+-]?(?:\d*\.)?\d+/g);
  if (!channels || channels.length < 3) {
    return null;
  }

  return {
    r: clamp(Number(channels[0]), 0, 255),
    g: clamp(Number(channels[1]), 0, 255),
    b: clamp(Number(channels[2]), 0, 255),
    alpha: clamp(channels[3] === undefined ? 1 : Number(channels[3])),
  };
}

/** Like {@link parseCssColor} but throws, for trusted inputs such as palette specs. */
export function requireCssColor(value: string): RgbaColor {
  const parsed = parseCssColor(value);
  if (!parsed) {
    throw new Error(`Invalid color: ${value}`);
  }
  return parsed;
}
