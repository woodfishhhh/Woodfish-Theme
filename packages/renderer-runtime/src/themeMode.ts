import { Disposer } from './disposers';

export type ThemeMode = 'light' | 'dark';

export interface ThemeModeOptions {
  /** Attribute on `<html>` holding `light`/`dark`, e.g. `data-theme`. */
  attribute: string;
}

function darkMediaQuery(): MediaQueryList | null {
  return typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
}

/** Current mode from the attribute, falling back to `prefers-color-scheme`. */
export function readThemeMode(options: ThemeModeOptions): ThemeMode {
  const value = document.documentElement.getAttribute(options.attribute);
  if (value === 'light' || value === 'dark') {
    return value;
  }
  return darkMediaQuery()?.matches ? 'dark' : 'light';
}

/** Calls `onChange` whenever the effective light/dark mode changes. */
export function watchThemeMode(
  options: ThemeModeOptions,
  onChange: (mode: ThemeMode) => void
): Disposer {
  let mode = readThemeMode(options);
  const check = (): void => {
    const next = readThemeMode(options);
    if (next !== mode) {
      mode = next;
      onChange(next);
    }
  };
  const observer = new MutationObserver(check);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [options.attribute],
  });
  const media = darkMediaQuery();
  media?.addEventListener('change', check);
  return () => {
    observer.disconnect();
    media?.removeEventListener('change', check);
  };
}
