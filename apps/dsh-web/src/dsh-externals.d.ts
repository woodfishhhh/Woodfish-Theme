/*
 * Minimal ambient module declarations for runtime externals provided by the dsh 0.2.2-rc.5
 * Host (Node runtime resolution) and Client (`window.__ModuleLoader__` staticModules).
 * Keeping these declarations local avoids adding unpublished dsh packages to the workspace
 * lockfile while preserving strict TypeScript checking across both halves of the plugin.
 */

declare module '@deepseek-ai/schemastery' {
  interface SchemaNode<T = unknown> {
    default(value: T): SchemaNode<T>;
    volatile(): SchemaNode<T>;
    description(text: string): SchemaNode<T>;
    readonly __type?: T;
  }
  interface Schemastery {
    string(): SchemaNode<string>;
    number(): SchemaNode<number>;
    boolean(): SchemaNode<boolean>;
    object<T extends Record<string, SchemaNode<unknown>>>(
      dict: T
    ): SchemaNode<{ [K in keyof T]: T[K] extends SchemaNode<infer U> ? U : unknown }>;
  }
  const z: Schemastery;
  export default z;
}

declare module 'react' {
  export type Key = string | number;
  export type ReactNode =
    ReactElement | string | number | boolean | null | undefined | readonly ReactNode[];

  export interface ReactElement<P = Record<string, unknown>> {
    type: unknown;
    props: P;
    key: Key | null;
  }

  export type ComponentType<P = Record<string, unknown>> = (props: P) => ReactNode;

  export interface MutableRefObject<T> {
    current: T;
  }

  export interface ChangeEvent<T = Element> {
    target: EventTarget & T;
    currentTarget: EventTarget & T;
  }

  export interface DragEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    dataTransfer: DataTransfer | null;
    currentTarget: EventTarget & T;
  }

  export const Fragment: unique symbol;

  export function createElement(
    type: string | typeof Fragment | ComponentType<never>,
    props?: Record<string, unknown> | null,
    ...children: ReactNode[]
  ): ReactElement;

  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (next: T | ((previous: T) => T)) => void];

  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;

  export function useCallback<T extends (...args: never[]) => unknown>(
    callback: T,
    deps: readonly unknown[]
  ): T;

  export function useRef<T>(initialValue: T): MutableRefObject<T>;

  export function useSyncExternalStore<T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T
  ): T;
}
