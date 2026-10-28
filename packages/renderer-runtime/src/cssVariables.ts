/** Reads a numeric custom property from `<html>`, falling back when unset or invalid. */
export function readNumberVariable(name: string, fallback: number): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  );
  return Number.isFinite(value) ? value : fallback;
}

/** Reads a custom property from `<html>` as trimmed text. */
export function readStringVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
