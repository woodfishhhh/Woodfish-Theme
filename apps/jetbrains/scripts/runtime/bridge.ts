// Java hands the bundled core plain numbers. No IDE objects enter the script.
import {
  gamutMapOklch,
  isInSrgbGamut,
  oklchToRgb,
  rgbToOklch,
} from '../../../../packages/theme-core/src/color/oklch';
import {
  offsetLightness,
  NEUTRAL_CHROMA_THRESHOLD,
  glowOpacities,
} from '../../../../packages/theme-core/src/gradient/tokenGradient';
import type { RgbColor } from '../../../../packages/theme-core/src/color/types';

function oklch(r: number, g: number, b: number): number[] {
  const v = rgbToOklch({ r, g, b });
  return [v.l, v.c, v.h];
}
function rgb(l: number, c: number, h: number, map: boolean): number[] {
  const v = (map ? gamutMapOklch : oklchToRgb)({ l, c, h });
  return [v.r, v.g, v.b];
}
function inGamut(r: number, g: number, b: number): boolean {
  return isInSrgbGamut({ r, g, b });
}
function packed(v: RgbColor, alpha: number): number {
  const channel = (n: number) => Math.round(Math.max(0, Math.min(255, n)));
  return (channel(alpha * 255) << 24) | (channel(v.r) << 16) | (channel(v.g) << 8) | channel(v.b);
}

// The four-argument Java API retains the symmetric gradient used by pre-parity settings.
function symmetric(
  argb: number,
  punctuation: boolean,
  shift: number,
  delta: number,
  neutralChroma: number,
  anchor: number
): number[] {
  const source = { r: (argb >>> 16) & 255, g: (argb >>> 8) & 255, b: argb & 255 };
  const base = rgbToOklch(source);
  const neutral = base.c < NEUTRAL_CHROMA_THRESHOLD;
  const alpha = (argb >>> 24) / 255;
  const h = neutral ? anchor : base.h;
  const c = neutral ? Math.max(base.c, neutralChroma) : base.c;
  const stop = (direction: number) =>
    packed(
      gamutMapOklch({ l: offsetLightness(base.l, direction * delta), c, h: h - direction * shift }),
      alpha
    );
  const glow = glowOpacities(neutral, punctuation);
  return [
    stop(1),
    stop(-1),
    packed(source, alpha * glow.near),
    packed(source, alpha * glow.mid),
    packed(source, alpha * glow.far),
    Number(neutral),
  ];
}

Object.assign(globalThis, { WoodfishCore: { oklch, rgb, inGamut, offsetLightness, symmetric } });
