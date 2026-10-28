/** Minimal shape every Woodfish page controller exposes on `globalThis`. */
export interface PageController {
  version: string;
  dispose: () => void;
}

type ControllerHost = Record<string, unknown>;

function host(): ControllerHost {
  return globalThis;
}

/** Returns the controller stored under `key`, if it looks like one. */
export function readController<T extends PageController>(key: string): Partial<T> | undefined {
  const value = host()[key];
  return value !== null && typeof value === 'object' ? value : undefined;
}

/** Disposes whatever controller an earlier injection left under `key`. */
export function disposeController(key: string): void {
  const previous = readController(key);
  if (previous && typeof previous.dispose === 'function') {
    previous.dispose();
  }
}

/** Publishes `controller` under `key` so later injections and tooling can find it. */
export function installController<T extends PageController>(key: string, controller: T): T {
  host()[key] = controller;
  return controller;
}

/** Removes `controller` from `key` if it is still the published one. */
export function uninstallController(key: string, controller: PageController): void {
  if (host()[key] === controller) {
    delete host()[key];
  }
}
