// Obituary's fit for a continuous corner with Figma's 60% smoothing.
export const SQUIRCLE_K = 1.78;

export const SQUIRCLE_SHAPES = ['squircle', 'soft', 'strong', 'extreme'] as const;
export type SquircleShape = (typeof SQUIRCLE_SHAPES)[number];

export interface SquircleCssOptions {
  scale?: number;
  shape?: string;
}

/** Maps a squircle shape preset to its CSS `corner-shape` value. */
export function squircleShapeValue(shape?: string): string {
  switch (shape) {
    case 'soft':
      return 'superellipse(1.6)';
    case 'strong':
      return 'superellipse(2.4)';
    case 'extreme':
      return 'superellipse(3)';
    default:
      return 'squircle';
  }
}

/** Pixel radii below 5, circles and capsules retain the host shape. */
export function scaleCornerRadius(px: number): number {
  return px >= 5 && px < 100 ? px * SQUIRCLE_K : px;
}

/** Only Woodfish's own single-radius declarations pass through this builder. */
export function prepareCornerRadii(css: string): string {
  return css.replace(
    /(?<![\w-])border-radius:\s*(inherit|[\d.]+(?:px|%)|var\(--[\w-]+(?:,\s*[\d.]+px)?\))\s*(!important)?;/g,
    (original: string, radius: string, important: string | undefined) => {
      const priority = important ? ' !important' : '';
      const px = parseFloat(radius);
      const round = px >= 100 || radius.endsWith('%');
      if (!round && Number.isFinite(px) && scaleCornerRadius(px) === px) return original;
      const shape =
        radius === 'inherit' ? 'inherit' : round ? 'round' : 'var(--squircle-shape, round)';
      const value =
        round || radius === 'inherit' ? radius : `calc(${radius} * var(--squircle-k, 1))`;
      return `border-radius: ${value}${priority}; corner-shape: ${shape}${priority};`;
    }
  );
}

/** The radius multiplier is only active on engines that also support the shape. */
export function buildSquircleCss(nativeCorners = '', options: SquircleCssOptions = {}): string {
  const scale =
    typeof options.scale === 'number' && Number.isFinite(options.scale)
      ? Math.min(2.4, Math.max(1, options.scale))
      : SQUIRCLE_K;
  const shape = squircleShapeValue(options.shape);
  return `@supports (corner-shape: squircle) {
  :root { --squircle-shape: ${shape}; --squircle-k: ${scale}; }
${nativeCorners}
}`;
}

/** Native tokens are captured one level above the override so aliases keep their original value. */
export function buildHostCornerCss(
  scope: string,
  tokens: readonly string[],
  roundSelectors: string
): string {
  const original = (name: string): string => 'var(--woodfish-original' + name + ')';
  return buildSquircleCss(
    [
      scope + ' {',
      ...tokens.map((name) => '  --woodfish-original' + name + ': var(' + name + ');'),
      '}',
      scope + ' > * {',
      ...tokens.map((name) => '  ' + name + ': ' + scaleNativeLength(original(name)) + ';'),
      '}',
      ':where(' +
        scope +
        ', ' +
        scope +
        ' *), :where(' +
        scope +
        ' *)::before, :where(' +
        scope +
        ' *)::after { corner-shape: var(--squircle-shape, round); }',
      [
        roundSelectors,
        ...['0px', '1px', '2px', '3px', '4px', '50%', '100%', '999px', '9999px', '10000px'].flatMap(
          (radius) => [`[style*="border-radius:${radius}"]`, `[style*="border-radius: ${radius}"]`]
        ),
      ].join(', ') +
        ' { --woodfish-native-shape: round; --squircle-shape: round; --squircle-k: 1; corner-shape: round; }',
    ].join('\n')
  );
}

// sign() lets theme overrides cross either boundary without changing circles or tiny corners.
export function eligible(length: string): string {
  return '(1 - max(0, sign(5px - ' + length + '))) * max(0, sign(100px - ' + length + '))';
}

export function scaleNativeLength(length: string): string {
  return 'calc(' + length + ' * (1 + (var(--squircle-k, 1) - 1) * ' + eligible(length) + '))';
}
