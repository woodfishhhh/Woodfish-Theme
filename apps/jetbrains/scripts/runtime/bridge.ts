import { scaleCornerRadius } from '../../../../packages/renderer-runtime/src/squircle';
import { motionCreate, motionEvent, motionFrame } from './inputMotion';
// Java hands the bundled core plain numbers. No IDE objects enter the script.
import {
  gamutMapOklch,
  isInSrgbGamut,
  oklchToRgb,
  rgbToOklch,
} from '../../../../packages/theme-core/src/color/oklch';
import {
  DEFAULT_ANCHOR_HUE,
  deriveTokenGradient,
  offsetLightness,
  NEUTRAL_CHROMA_THRESHOLD,
  glowOpacities,
} from '../../../../packages/theme-core/src/gradient/tokenGradient';
import { requireCssColor } from '../../../../packages/theme-core/src/color/parse';
import { detectGradientPreset } from '../../../../packages/theme-core/src/palettes/gradientPresets';
import {
  rankPaletteAnchorHue,
  pickAccentHue,
} from '../../../../packages/theme-core/src/gradient/anchorHue';
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

function css(argb: number): string {
  return '#' + ((argb & 0xffffff) * 256 + (argb >>> 24)).toString(16).padStart(8, '0');
}

function packedCss(cssColor: string): number {
  const color = requireCssColor(cssColor);
  return packed(color, color.alpha);
}

function token(
  argb: number,
  punctuation: boolean,
  hueShift: number,
  lightnessDelta: number,
  neutralChroma: number,
  anchorHue: number,
  background: number,
  foreground: number
): number[] {
  const bg = css(background),
    fg = css(foreground);
  const colors = deriveTokenGradient(css(argb), {
    punctuation,
    hueShift,
    lightnessDelta,
    neutralChroma,
    anchorHue,
    background: bg,
    foreground: fg,
    preset: detectGradientPreset(bg, fg),
  })!;
  return [
    colors.angle ?? -1,
    Number(colors.neutral),
    packedCss(colors.glowNear),
    packedCss(colors.glowMid),
    packedCss(colors.glowFar),
    ...colors.stops.map(packedCss),
  ];
}

function anchor(samplesJson: string, accentsJson: string): number {
  const samples: [number, string][] = JSON.parse(samplesJson);
  const accents: number[] = JSON.parse(accentsJson);
  return (
    rankPaletteAnchorHue(samples.map(([argb, weight]) => [css(argb), Number(weight)] as const)) ??
    pickAccentHue(accents.map(css)) ??
    DEFAULT_ANCHOR_HUE
  );
}

function roundedArc(diameter: number): number {
  return Math.round(2 * scaleCornerRadius(diameter / 2));
}

Object.assign(globalThis, {
  WoodfishCore: {
    roundedArc,
    anchor,
    oklch,
    rgb,
    inGamut,
    offsetLightness,
    symmetric,
    token,
    motionCreate,
    motionEvent,
    motionFrame,
  },
});
