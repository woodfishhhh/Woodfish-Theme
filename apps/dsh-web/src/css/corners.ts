import { buildSquircleCss } from '@woodfish/renderer-runtime';
export { SQUIRCLE_K } from '@woodfish/renderer-runtime';

/** dsh's radius tokens, declared on `:root`. */
const RADIUS_TOKENS = ['xs', 'sm', 'md', 'lg', 'xl', 'panel'] as const;

/**
 * Continuous ("Apple") corners for dsh, the same system as Obituary's windows. dsh already
 * draws every corner with `corner-shape: var(--dsw-corner-shape)` (a gentle superellipse) and
 * sizes most of them with `--dsw-radius-*`, so two variable changes switch the whole UI:
 * the shape becomes `squircle` and every radius token grows by the shared scale. Pills keep
 * the `corner-shape: round` dsh gives them. Effects that draw their own rounded boxes read
 * `--squircle-k` and `--squircle-shape` (Obituary's names; without them, circular corners).
 * Engines without `corner-shape: squircle` skip the block and keep dsh's own corners.
 *
 * The tokens are read on `<body>` (inherited from `:root`) and replaced one level further down,
 * because a custom property cannot refer to itself on the element that sets it.
 */
export function buildCornerCss(): string {
  const read = RADIUS_TOKENS.map(
    (name) => `    --woodfish-dsh-radius-${name}: var(--dsw-radius-${name});`
  );
  const scaled = RADIUS_TOKENS.map(
    (name) =>
      `    --dsw-radius-${name}: calc(var(--woodfish-dsh-radius-${name}) * var(--squircle-k));`
  );
  return buildSquircleCss(
    [
      '  body {',
      '    --dsw-corner-shape: squircle;',
      ...read,
      '  }',
      '  body > * {',
      ...scaled,
      '  }',
    ].join('\n')
  );
}
