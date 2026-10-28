export type Disposer = () => void;

export interface DisposerRegistry {
  add(disposer: Disposer): void;
  /** Runs every disposer once in registration order, ignoring individual failures. */
  disposeAll(): void;
  readonly size: number;
}

export function createDisposerRegistry(): DisposerRegistry {
  const disposers: Disposer[] = [];
  return {
    add(disposer: Disposer): void {
      disposers.push(disposer);
    },
    disposeAll(): void {
      for (const dispose of disposers.splice(0)) {
        try {
          dispose();
        } catch {
          // Disposal is best effort.
        }
      }
    },
    get size(): number {
      return disposers.length;
    },
  };
}
