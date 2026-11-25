import {
  SQUIRCLE_K,
  SquircleCssOptions,
  buildSquircleCss,
  squircleShapeValue,
} from '@woodfish/renderer-runtime';
export { SQUIRCLE_K } from '@woodfish/renderer-runtime';

/** dsh declares these on :root. Its 4px xs token keeps its original size. */
const RADIUS_TOKENS = ['sm', 'md', 'lg', 'xl', 'panel'] as const;

const ROUND_EXEMPT_SELECTORS = [
  '[role="switch"]',
  '[role="switch"] *',
  ...['0px', '1px', '2px', '3px', '4px', '50%', '100%', '999px', '9999px', '10000px'].flatMap(
    (radius) => [`[style*="border-radius:${radius}"]`, `[style*="border-radius: ${radius}"]`]
  ),
].join(', ');

/**
 * Continuous ("Apple") corners for dsh, parameterized by scale and curvature shape.
 * Scales dsh's `--dsw-radius-*` tokens and sets `--dsw-corner-shape`, while keeping pills,
 * circles and 1–4px hairlines round. Paired at runtime with `startNativeCorners()` so
 * hardcoded `border-radius` values inside hashed CSS-module stylesheets follow `--squircle-k`
 * and `--squircle-shape` too.
 */
export function buildCornerCss(options: SquircleCssOptions = {}): string {
  const shape = squircleShapeValue(options.shape);
  const read = RADIUS_TOKENS.map(
    (name) => `    --woodfish-dsh-radius-${name}: var(--dsw-radius-${name});`
  );
  const scaled = RADIUS_TOKENS.map(
    (name) =>
      `    --dsw-radius-${name}: calc(var(--woodfish-dsh-radius-${name}) * var(--squircle-k, ${SQUIRCLE_K}));`
  );
  return buildSquircleCss(
    [
      '  body {',
      `    --dsw-corner-shape: ${shape};`,
      ...read,
      '  }',
      '  body > * {',
      ...scaled,
      '  }',
      `  ${ROUND_EXEMPT_SELECTORS} {`,
      '    --woodfish-native-shape: round;',
      '    --squircle-shape: round;',
      '    --squircle-k: 1;',
      '    corner-shape: round;',
      '  }',
    ].join('\n'),
    options
  );
}
