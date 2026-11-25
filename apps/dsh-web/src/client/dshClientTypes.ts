import type { ComponentType } from 'react';
import type { DshPersistedConfig } from '../protocol';

export interface SettingsPathOp {
  readonly op: 'set' | 'unset';
  readonly path: readonly string[];
  readonly value?: unknown;
}

export interface ConfigFormSnapshot<T> {
  readonly status: 'loading' | 'ready' | 'unavailable';
  readonly value: T | undefined;
  readonly revision: number | undefined;
  readonly writable: boolean;
}

export interface ConfigForm<T> {
  getSnapshot(): ConfigFormSnapshot<T>;
  subscribe(listener: () => void): () => void;
  set(field: string, value: unknown): Promise<boolean>;
  mutate(ops: readonly SettingsPathOp[], expectedRevision?: number): Promise<boolean>;
}

export type DshThemePreference = 'light' | 'dark' | 'system';

export interface DshThemeSnapshot {
  readonly preference: DshThemePreference;
  readonly active: {
    readonly id: string;
    readonly colorScheme: 'light' | 'dark';
  };
  readonly revision: number;
}

export interface DshThemeRuntime {
  getTheme(): DshThemeSnapshot;
  setTheme(id: string): void;
  overrideTokens(
    source: string,
    tokens: Record<string, { light: string; dark: string }>
  ): () => void;
}

export interface DshSlotRegistry {
  inject(slotName: string, register: () => (() => void) | void): void;
  register(
    options: {
      name: string;
      id?: string;
      key?: string;
      order?: number;
      label?: () => string;
    },
    component: ComponentType<never>
  ): () => void;
}

export interface DshClientContext {
  readonly slots: DshSlotRegistry;
  readonly configForms: {
    get<T = DshPersistedConfig>(entryId: string): ConfigForm<T>;
  };
  readonly theme: DshThemeRuntime;
  effect(callback: () => (() => void) | void, label?: string): void;
  on(event: 'theme/change', listener: (snapshot: DshThemeSnapshot) => void): () => void;
}

export interface DshClientTransport {
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  resolveAsset?: (reference: string) => string;
}

export interface DshBrowserGlobals {
  __DSH_TRANSPORT__?: DshClientTransport;
  __WOODFISH_DSH_BOOT__?: unknown;
}
