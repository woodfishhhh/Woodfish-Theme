// Obituary's fit for a continuous corner with Figma's 60% smoothing.
export const SQUIRCLE_K = 1.78;

/** Only Woodfish's own single-radius declarations pass through this builder. */
export function prepareCornerRadii(css: string): string {
  return css.replace(
    /(?<![\w-])border-radius:\s*(inherit|[\d.]+(?:px|%)|var\(--[\w-]+(?:,\s*[\d.]+px)?\))\s*(!important)?;/g,
    (original: string, radius: string, important: string | undefined) => {
      const priority = important ? ' !important' : '';
      const px = parseFloat(radius);
      const round = px >= 100 || radius.endsWith('%');
      if (!round && px < 5) return original;
      const shape =
        radius === 'inherit' ? 'inherit' : round ? 'round' : 'var(--squircle-shape, round)';
      const value =
        round || radius === 'inherit' ? radius : `calc(${radius} * var(--squircle-k, 1))`;
      return `border-radius: ${value}${priority}; corner-shape: ${shape}${priority};`;
    }
  );
}

/** The radius multiplier is only active on engines that also support the shape. */
export function buildSquircleCss(nativeCorners = ''): string {
  return `@supports (corner-shape: squircle) {
  :root { --squircle-shape: squircle; --squircle-k: ${SQUIRCLE_K}; }
${nativeCorners}
}`;
}
