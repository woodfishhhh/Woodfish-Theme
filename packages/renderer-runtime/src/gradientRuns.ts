/*
 * Continuous gradients across split tokens.
 *
 * Monaco renders a token longer than 50 characters as several adjacent spans (at spaces
 * when ligatures are on, every 50 characters otherwise), and a long Markdown paragraph is
 * one such token. Painting each span on its own restarts the gradient in every piece, so
 * long names and paragraphs look cut off and repeated. Adjacent painted siblings with the
 * same color form a run; every span of a run sizes its background to the whole run and
 * shifts it by its own offset, so the run shows one gradient.
 */

/** Background size and position of a span inside a run; unset outside runs. */
export const RUN_VARIABLES = {
  size: '--woodfish-overlay-gradient-size',
  position: '--woodfish-overlay-gradient-position',
} as const;

/** Rows of a run must share a top edge (within this many px); wrapped text is not joined. */
const SAME_ROW_TOLERANCE_PX = 1;

/** Drops a span's run variables; most spans never had them, so nothing is written then. */
export function clearRunVariables(token: HTMLElement): void {
  if (token.style.getPropertyValue(RUN_VARIABLES.size) === '') {
    return;
  }
  token.style.removeProperty(RUN_VARIABLES.size);
  token.style.removeProperty(RUN_VARIABLES.position);
}

function formatPx(value: number): string {
  return `${Number(value.toFixed(2))}px`;
}

/** Adjacent element siblings with the same non-null key, two or more long. */
function collectRuns(
  parent: Element,
  keyOf: (element: Element) => string | null
): { runs: HTMLElement[][]; singles: HTMLElement[] } {
  const runs: HTMLElement[][] = [];
  const singles: HTMLElement[] = [];
  let current: HTMLElement[] = [];
  let currentKey: string | null = null;

  const close = (): void => {
    if (current.length >= 2) {
      runs.push(current);
    } else {
      singles.push(...current);
    }
    current = [];
    currentKey = null;
  };

  for (const child of parent.children) {
    const key = keyOf(child);
    const previous = current[current.length - 1];
    // Only direct neighbours: any text node between two spans breaks the run.
    const adjacent = previous !== undefined && child.previousSibling === previous;
    if (key !== null && key === currentKey && adjacent) {
      current.push(child as HTMLElement);
      continue;
    }
    close();
    if (key !== null) {
      current = [child as HTMLElement];
      currentKey = key;
    }
  }
  close();
  return { runs, singles };
}

/**
 * Re-links the painted children of `parent` into runs. `keyOf` returns the gradient
 * identity of a painted token (its color) or `null` for anything else.
 */
export function linkGradientRuns(
  parent: Element,
  keyOf: (element: Element) => string | null
): void {
  const { runs, singles } = collectRuns(parent, keyOf);
  for (const token of singles) {
    clearRunVariables(token);
  }
  if (runs.length === 0) {
    return;
  }

  // Read every rectangle first, then write, so the page lays out once.
  const measured = runs.map((run) => run.map((token) => token.getBoundingClientRect()));
  runs.forEach((run, index) => {
    const rects = measured[index];
    const top = rects[0].top;
    if (rects.some((rect) => Math.abs(rect.top - top) > SAME_ROW_TOLERANCE_PX)) {
      run.forEach(clearRunVariables);
      return;
    }
    const left = Math.min(...rects.map((rect) => rect.left));
    const width = Math.max(...rects.map((rect) => rect.right)) - left;
    // Also rejects NaN from hosts that cannot measure.
    if (!(width > 0)) {
      run.forEach(clearRunVariables);
      return;
    }
    run.forEach((token, position) => {
      token.style.setProperty(RUN_VARIABLES.size, `${formatPx(width)} 100%`);
      token.style.setProperty(RUN_VARIABLES.position, `${formatPx(left - rects[position].left)} 0`);
    });
  });
}
