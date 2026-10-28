/** A feature start function; may return a refresh callback. */
export type StartStep = () => (() => void) | void;

export interface StepFailure {
  index: number;
  error: unknown;
}

/**
 * Runs independent feature steps so one failing feature cannot stop the others.
 * Returns the last refresh callback any step provided, plus the failures.
 */
export function runSteps(
  steps: readonly StartStep[],
  onError: (failure: StepFailure) => void
): { refresh: () => void; failures: StepFailure[] } {
  let refresh: () => void = () => undefined;
  const failures: StepFailure[] = [];
  steps.forEach((step, index) => {
    try {
      const result = step();
      if (typeof result === 'function') {
        refresh = result;
      }
    } catch (error) {
      const failure = { index, error };
      failures.push(failure);
      onError(failure);
    }
  });
  return { refresh, failures };
}
