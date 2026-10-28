export interface StyleManagerOptions {
  /** Prefix for every `<style>` id, e.g. `woodfish-codex-`. */
  idPrefix: string;
  /** Extra attributes put on every inserted node (e.g. host-tool ownership markers). */
  nodeAttributes?: Readonly<Record<string, string>>;
  /** Where styles are appended; defaults to `document.head`. */
  container?: () => ParentNode;
}

export interface StyleManager {
  /** Creates or replaces the `<style>` for `name`. Empty CSS removes it. */
  upsert(name: string, css: string): void;
  remove(name: string): void;
  removeAll(): void;
  /** Names currently mounted. */
  names(): string[];
}

/**
 * Owns a set of `<style>` elements. Styles are appended unlayered, so they win over any
 * `@layer` rules the host uses for its theme, without `!important`.
 */
export function createStyleManager(options: StyleManagerOptions): StyleManager {
  const mounted = new Map<string, HTMLStyleElement>();
  const container = options.container ?? ((): ParentNode => document.head);

  function create(name: string): HTMLStyleElement {
    const element = document.createElement('style');
    element.id = `${options.idPrefix}${name}`;
    for (const [attribute, value] of Object.entries(options.nodeAttributes ?? {})) {
      element.setAttribute(attribute, value);
    }
    return element;
  }

  function remove(name: string): void {
    mounted.get(name)?.remove();
    mounted.delete(name);
  }

  return {
    upsert(name: string, css: string): void {
      if (css.trim().length === 0) {
        remove(name);
        return;
      }
      let element = mounted.get(name);
      if (!element || !element.isConnected) {
        element = create(name);
        mounted.set(name, element);
        container().append(element);
      }
      if (element.textContent !== css) {
        element.textContent = css;
      }
    },
    remove,
    removeAll(): void {
      for (const element of mounted.values()) {
        element.remove();
      }
      mounted.clear();
    },
    names(): string[] {
      return [...mounted.keys()];
    },
  };
}
