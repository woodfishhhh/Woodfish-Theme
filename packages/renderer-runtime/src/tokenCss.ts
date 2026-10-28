/*
 * CSS declarations that consume the per-token variables written by the text gradient
 * engine. Pure string builders (no DOM), so host-side code can assemble payloads too.
 */

/** Selector of every token the engine has painted. */
export const PAINTED_TOKEN_SELECTOR = '[data-woodfish-overlay-token="true"]';

/** Formats a number for CSS with at most four decimals and no trailing zeros. */
export function formatCssNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

/** Scales a glow radius by `intensity`, never below half a pixel. */
export function scaleGlowRadius(radius: number, intensity: number): string {
  return `${formatCssNumber(Math.max(0.5, radius * intensity))}px`;
}

/**
 * Three-stop `background-clip: text` gradient. `angleVariable` must hold an angle such
 * as `90deg`.
 */
export function buildGradientDeclarations(angleVariable = '--woodfish-overlay-angle'): string[] {
  return [
    '  background-image: linear-gradient(',
    `    var(${angleVariable}),`,
    '    var(--woodfish-overlay-gradient-light) 0%,',
    '    var(--woodfish-overlay-gradient-base) 50%,',
    '    var(--woodfish-overlay-gradient-dark) 100%',
    '  ) !important;',
    '  background-clip: text !important;',
    '  -webkit-background-clip: text !important;',
    '  -webkit-text-fill-color: transparent !important;',
    '  background-repeat: no-repeat !important;',
    '  background-size: 100% 100% !important;',
    '  background-position: center !important;',
    // `background-clip: text` only paints inside the span box; italic or wide glyphs
    // (JetBrains Mono, Cascadia, ligatures) overhang it and were clipped. Padding
    // extends the painted area, the negative margin keeps the host's layout unchanged.
    '  padding-inline: 0.12em !important;',
    '  margin-inline: -0.12em !important;',
    '  padding-block: 0.08em !important;',
  ];
}

/** Three-layer text glow in the token's own color. */
export function buildGlowDeclarations(intensity: number): string[] {
  return [
    '  text-shadow:',
    `    0 0 ${scaleGlowRadius(4, intensity)} var(--woodfish-overlay-glow-near),`,
    `    0 0 ${scaleGlowRadius(10, intensity)} var(--woodfish-overlay-glow-mid),`,
    `    0 0 ${scaleGlowRadius(20, intensity)} var(--woodfish-overlay-glow-far) !important;`,
  ];
}

/** Weaker two-layer glow for brackets and operators. */
export function buildPunctuationGlowDeclarations(intensity: number): string[] {
  return [
    '  text-shadow:',
    `    0 0 ${scaleGlowRadius(2, intensity)} var(--woodfish-overlay-punctuation-glow-near),`,
    `    0 0 ${scaleGlowRadius(6, intensity)} var(--woodfish-overlay-punctuation-glow-far) !important;`,
  ];
}

/** Monochrome SVG grain as a CSS `url()` for frosted surfaces; `opacity` is 0-1. */
export function buildNoiseDataUri(opacity: number): string {
  const svg = [
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>",
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/>",
    "<feColorMatrix type='saturate' values='0'/></filter>",
    `<rect width='100%' height='100%' filter='url(#n)' opacity='${formatCssNumber(opacity)}'/>`,
    '</svg>',
  ].join('');
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
}
