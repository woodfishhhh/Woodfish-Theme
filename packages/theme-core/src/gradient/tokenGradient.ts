import { contrastRatio } from '../color/contrast';
import { formatRgba } from '../color/format';
import { gamutCusp, maxChromaInGamut } from '../color/gamut';
import { gamutMapOklch, rgbToOklch } from '../color/oklch';
import { clamp, parseCssColor } from '../color/parse';
import { OklchColor, RgbColor, RgbaColor } from '../color/types';
import { GradientPreset, findPresetGradient } from './presets';

/** Below this OKLCH chroma a color is treated as neutral (white, grey) and borrows an anchor hue. */
export const NEUTRAL_CHROMA_THRESHOLD = 0.045;

/** Hue used when neither the token palette nor the host accent colors provide one. */
export const DEFAULT_ANCHOR_HUE = 300;

/*
 * The derivation follows the hand-tuned Woodfish Dark gradients:
 * - the gradient starts at the token's own color and ends `hueShift` degrees further
 *   along the hue circle;
 * - the end is more vivid: it closes part of the gap to the most saturated color sRGB can
 *   show there (`#00ff99`, `#f644ff` in the originals);
 * - the end's lightness drifts toward where its hue is most vivid (orange brightens into
 *   yellow, cyan darkens into blue), limited by `lightnessDelta`;
 * - bright neutral text (the editor foreground) gets a soft rainbow around the hue circle;
 * - no stop is less readable on the background than the token's own color.
 */

/** Share of the remaining chroma headroom the gradient end takes. */
const END_VIVIDNESS = 0.85;
/** Same for low-contrast colors such as comments, which should stay calm. */
const DIM_VIVIDNESS = 0.3;
/** Colors less readable than this on the background count as dim (comments, guides). */
const DIM_CONTRAST = 3;
/** Share of the distance to the end hue's cusp lightness the gradient end moves. */
const END_LIGHTNESS_PULL = 0.5;
/**
 * Share of the room between the foreground and the pastel edge (see `pastelEdge`) that the
 * rainbow stops move away from the background.
 */
const RAINBOW_LIGHTNESS_PULL = 0.7;
const RAINBOW_STOP_COUNT = 9;
const PASTEL_EDGE_STEP = 0.005;
/** Chroma multiplier of the rainbow on light backgrounds. */
const JEWEL_CHROMA_FACTOR = 2;
/** Light-background glow: a bright tint of the text hue, never a dark halo. */
const LIGHT_GLOW_LIGHTNESS = 0.8;
const LIGHT_GLOW_MIN_CHROMA = 0.12;
/** Grey text (comments, punctuation) glows almost white, so it stays quiet. */
const LIGHT_GLOW_NEUTRAL_LIGHTNESS = 0.96;
const LIGHT_GLOW_NEUTRAL_CHROMA = 0.02;
/** Contrast a derived stop never has to exceed, even when the source color is higher. */
const READABLE_CONTRAST = 4.5;
const READABILITY_STEP = 0.01;
const READABILITY_MAX_STEPS = 60;

export interface TokenGradientOptions {
  /** Hue (degrees) given to neutral colors so they still get a visible gradient. */
  anchorHue: number;
  /** Hue rotation from the start to the end of the gradient, in degrees. */
  hueShift: number;
  /** Largest OKLCH lightness change of a derived stop. */
  lightnessDelta: number;
  /** Chroma of the rainbow stops of neutral text. */
  neutralChroma: number;
  /** Punctuation gets a weaker glow and half the hue rotation. */
  punctuation: boolean;
  /** Background behind the text; derived stops stay at least as readable as the source. */
  background?: string | null;
  /**
   * The host's default text color. Only it gets the rainbow; without it, any neutral color
   * that is readable on the background (or clearly light or dark) counts as body text.
   */
  foreground?: string | null;
  /** Hand-tuned gradients of the current theme; a matching color uses them as is. */
  preset?: GradientPreset | null;
}

/** CSS colors for a text gradient and its glow layers. */
export interface TokenGradientColors {
  /** Two or more colors, spread evenly from 0% to 100%. */
  stops: string[];
  /** Direction of a hand-tuned gradient in degrees; `null` uses the host's angle setting. */
  angle: number | null;
  /** The source color, used for glow and as a solid fallback. */
  base: string;
  glowNear: string;
  glowMid: string;
  glowFar: string;
  punctuationNear: string;
  punctuationFar: string;
  neutral: boolean;
  /** The stops come from the theme's hand-tuned preset. */
  preset: boolean;
}

/** Moves lightness by `delta`, mirroring the step when it would leave [0, 1]. */
export function offsetLightness(lightness: number, delta: number): number {
  const shifted = lightness + delta;
  if (shifted >= 0 && shifted <= 1) {
    return shifted;
  }

  return clamp(lightness - delta);
}

function limit(value: number, bound: number): number {
  return clamp(value, -bound, bound);
}

interface Readability {
  background: RgbColor;
  /** Contrast every derived stop must reach. */
  minimum: number;
  /** Lightness direction that raises contrast: +1 on dark backgrounds, -1 on light ones. */
  direction: 1 | -1;
}

function readabilityFor(
  source: RgbColor,
  background: string | null | undefined
): Readability | null {
  const parsed = background ? parseCssColor(background) : null;
  if (!parsed || parsed.alpha === 0) {
    return null;
  }
  return {
    background: parsed,
    minimum: Math.min(READABLE_CONTRAST, contrastRatio(source, parsed)),
    direction: rgbToOklch(parsed).l < 0.5 ? 1 : -1,
  };
}

/** Gamut-maps a color, then moves its lightness away from the background until it is readable. */
function toReadableRgb(color: OklchColor, readability: Readability | null): RgbColor {
  let candidate = color;
  let rgb = gamutMapOklch(candidate);
  if (!readability) {
    return rgb;
  }
  for (
    let step = 0;
    step < READABILITY_MAX_STEPS &&
    contrastRatio(rgb, readability.background) < readability.minimum;
    step += 1
  ) {
    candidate = { ...candidate, l: clamp(candidate.l + readability.direction * READABILITY_STEP) };
    rgb = gamutMapOklch(candidate);
  }
  return rgb;
}

/**
 * Start at the source, end further along the hue circle, more vivid. Dim colors and
 * punctuation turn half as far; dim colors also keep their lightness and most of their
 * calm.
 */
function deriveChromaticStops(
  base: OklchColor,
  options: TokenGradientOptions,
  dim: boolean
): OklchColor[] {
  const turn = dim || options.punctuation ? options.hueShift / 2 : options.hueShift;
  const hue = base.h + turn;
  const lightness = dim
    ? base.l
    : clamp(
        base.l + limit((gamutCusp(hue).l - base.l) * END_LIGHTNESS_PULL, options.lightnessDelta)
      );
  const headroom = maxChromaInGamut(lightness, hue);
  const vividness = dim ? DIM_VIVIDNESS : END_VIVIDNESS;
  const chroma = Math.max(base.c, base.c + (headroom - base.c) * vividness);
  return [base, { l: lightness, c: chroma, h: hue }];
}

/**
 * The lightest (direction +1) or darkest (-1) lightness at which this hue can still carry
 * `chroma`. Pastels sit just inside it: the hand-tuned rainbow's yellow #fff6c5 is far
 * brighter than its violet #d7c4ff because yellow keeps its color much closer to white.
 */
function pastelEdge(hue: number, chroma: number, direction: 1 | -1): number {
  let lightness = direction > 0 ? 1 - PASTEL_EDGE_STEP : PASTEL_EDGE_STEP;
  while (lightness > 0 && lightness < 1 && maxChromaInGamut(lightness, hue) < chroma) {
    lightness -= direction * PASTEL_EDGE_STEP;
  }
  return clamp(lightness);
}

/** A soft rainbow around the hue circle, starting and ending at the anchor hue. */
function deriveRainbowStops(
  base: OklchColor,
  options: TokenGradientOptions,
  direction: 1 | -1
): OklchColor[] {
  const stops: OklchColor[] = [];
  for (let index = 0; index < RAINBOW_STOP_COUNT; index += 1) {
    const hue = options.anchorHue + (360 * index) / (RAINBOW_STOP_COUNT - 1);
    if (direction < 0) {
      // Dark text on a light background: deep jewel tones. Near black there is no color,
      // so the stops step toward the background (the readability check stops them at
      // 4.5:1) and carry twice the chroma, since dark colors read greyer.
      const lightness = clamp(base.l + options.lightnessDelta);
      stops.push({
        l: lightness,
        c: Math.min(options.neutralChroma * JEWEL_CHROMA_FACTOR, maxChromaInGamut(lightness, hue)),
        h: hue,
      });
      continue;
    }
    const edge = pastelEdge(hue, options.neutralChroma, direction);
    const room = (edge - base.l) * direction;
    // With room, move most of the way toward the edge (yellow and cyan brighten a lot,
    // violet barely); without room (near-white text), step back to the edge.
    const offset = room > 0 ? room * RAINBOW_LIGHTNESS_PULL * direction : edge - base.l;
    const lightness = clamp(base.l + limit(offset, options.lightnessDelta));
    stops.push({
      l: lightness,
      c: Math.min(options.neutralChroma, maxChromaInGamut(lightness, hue)),
      h: hue,
    });
  }
  return stops;
}

/** Dim neutrals (comments, punctuation) drift gently toward the anchor hue. */
function deriveMutedStops(base: OklchColor, options: TokenGradientOptions): OklchColor[] {
  return [
    base,
    {
      l: base.l,
      c: Math.max(base.c, options.neutralChroma / 2),
      h: options.anchorHue + (options.punctuation ? 0 : options.hueShift / 2),
    },
  ];
}

function sameOpaqueColor(left: RgbaColor, right: string): boolean {
  const other = parseCssColor(right);
  return (
    other !== null &&
    [left.r, left.g, left.b].every(
      (channel, index) => Math.round(channel) === Math.round([other.r, other.g, other.b][index])
    ) &&
    left.alpha === other.alpha
  );
}

function isBodyText(
  source: RgbaColor,
  base: OklchColor,
  options: TokenGradientOptions,
  readability: Readability | null
): boolean {
  if (options.foreground) {
    return sameOpaqueColor(source, options.foreground);
  }
  if (readability) {
    return contrastRatio(source, readability.background) >= READABLE_CONTRAST;
  }
  return base.l >= 0.7 || base.l <= 0.4;
}

function isDim(source: RgbColor, readability: Readability | null): boolean {
  return readability !== null && contrastRatio(source, readability.background) < DIM_CONTRAST;
}

function deriveStops(
  parsed: RgbaColor,
  base: OklchColor,
  neutral: boolean,
  options: TokenGradientOptions
): string[] {
  const readability = readabilityFor(parsed, options.background);
  let stops: OklchColor[];
  if (!neutral) {
    stops = deriveChromaticStops(base, options, isDim(parsed, readability));
  } else if (!options.punctuation && isBodyText(parsed, base, options, readability)) {
    const direction = readability ? readability.direction : base.l >= 0.5 ? 1 : -1;
    stops = deriveRainbowStops(base, options, direction);
  } else {
    stops = deriveMutedStops(base, options);
  }

  // The source color itself is kept exactly; only derived stops are adjusted.
  return stops.map((stop) =>
    formatRgba(stop === base ? parsed : toReadableRgb(stop, readability), parsed.alpha)
  );
}

function isLightBackground(background: string | null | undefined): boolean {
  const parsed = background ? parseCssColor(background) : null;
  return parsed !== null && parsed.alpha > 0 && rgbToOklch(parsed).l >= 0.5;
}

/**
 * Color the glow is drawn in. Light should be brighter than what it shines on: on a dark
 * background the text itself is, but dark text on a light background would cast a grey
 * smudge. There the glow is a bright, saturated tint of the text's hue instead.
 */
function glowSource(
  parsed: RgbaColor,
  base: OklchColor,
  neutral: boolean,
  options: TokenGradientOptions
): RgbColor {
  if (!isLightBackground(options.background)) {
    return parsed;
  }
  const hue = neutral ? options.anchorHue : base.h;
  const lightness = neutral ? LIGHT_GLOW_NEUTRAL_LIGHTNESS : LIGHT_GLOW_LIGHTNESS;
  const chroma = neutral ? LIGHT_GLOW_NEUTRAL_CHROMA : Math.max(base.c, LIGHT_GLOW_MIN_CHROMA);
  return gamutMapOklch({
    l: lightness,
    c: Math.min(chroma, maxChromaInGamut(lightness, hue)),
    h: hue,
  });
}

/**
 * Derives the gradient of one text color: the theme's hand-tuned gradient when the
 * preset has one for this color, otherwise the algorithm above. Returns `null` for
 * colors that cannot be parsed.
 */
export function deriveTokenGradient(
  cssColor: string,
  options: TokenGradientOptions
): TokenGradientColors | null {
  const parsed = parseCssColor(cssColor);
  if (!parsed) {
    return null;
  }

  const base = rgbToOklch(parsed);
  const neutral = base.c < NEUTRAL_CHROMA_THRESHOLD;
  const tuned = options.preset ? findPresetGradient(options.preset, parsed) : null;
  const nearOpacity = options.punctuation ? 0.28 : neutral ? 0.58 : 0.72;
  const midOpacity = options.punctuation ? 0.12 : neutral ? 0.28 : 0.42;
  const farOpacity = neutral ? 0.12 : 0.2;
  const glow = glowSource(parsed, base, neutral, options);

  return {
    stops: tuned ? [...tuned.stops] : deriveStops(parsed, base, neutral, options),
    angle: tuned ? tuned.angle : null,
    base: formatRgba(parsed, parsed.alpha),
    glowNear: formatRgba(glow, parsed.alpha * nearOpacity),
    glowMid: formatRgba(glow, parsed.alpha * midOpacity),
    glowFar: formatRgba(glow, parsed.alpha * farOpacity),
    punctuationNear: formatRgba(glow, parsed.alpha * 0.28),
    punctuationFar: formatRgba(glow, parsed.alpha * 0.12),
    neutral,
    preset: tuned !== null,
  };
}
