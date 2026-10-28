import { isValidCssColor } from '../color/validate';

export interface NumericRange {
  readonly minimum: number;
  readonly maximum: number;
}

/** Upper bounds for user-supplied CSS and color lists. */
export const EFFECT_INPUT_LIMITS = {
  customRuleCount: 32,
  customRuleLength: 4096,
  customRulesTotalLength: 16384,
  gradientStopCount: 16,
  gradientStopLength: 64,
} as const;

export function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Clamps finite numbers into `range`; anything else becomes `fallback`. */
export function sanitizeNumber(value: unknown, fallback: number, range: NumericRange): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(range.minimum, Math.min(range.maximum, value))
    : fallback;
}

export function sanitizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const UNSAFE_CSS_PATTERN =
  /<\/?script\b|<\/style\b|@import\b|url\s*\(|(?:-webkit-)?image-set\s*\(|\bimage\s*\(|(?:https?|data|file|ftp|blob):/i;

/** Strips comments and resolves CSS escapes so obfuscated keywords are still detected. */
function normalizeCssForSafety(value: string): string {
  const withoutComments = value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\(?:\r\n|[\n\r\f])/g, '');

  return withoutComments.replace(
    /\\([0-9a-f]{1,6})(?:[ \t\r\n\f])?|\\([^\r\n\f])/gi,
    (_match, hexadecimal: string | undefined, escapedCharacter: string | undefined) => {
      if (!hexadecimal) {
        return escapedCharacter ?? '';
      }

      const codePoint = Number.parseInt(hexadecimal, 16);
      return codePoint === 0 || codePoint > 0x10ffff ? '\uFFFD' : String.fromCodePoint(codePoint);
    }
  );
}

/**
 * True when CSS could break out of a `<style>` block, load remote resources or
 * embed data. Injected user CSS must never do any of these.
 */
export function containsUnsafeCss(value: string): boolean {
  return UNSAFE_CSS_PATTERN.test(normalizeCssForSafety(value));
}

/** Keeps safe, non-empty CSS rule strings within the count and size limits. */
export function sanitizeCustomCssRules(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rules: string[] = [];
  let totalLength = 0;
  for (const candidate of value.slice(0, EFFECT_INPUT_LIMITS.customRuleCount)) {
    if (typeof candidate !== 'string') {
      continue;
    }
    const rule = candidate.trim();
    if (
      rule.length === 0 ||
      rule.length > EFFECT_INPUT_LIMITS.customRuleLength ||
      totalLength + rule.length > EFFECT_INPUT_LIMITS.customRulesTotalLength ||
      containsUnsafeCss(rule)
    ) {
      continue;
    }
    rules.push(rule);
    totalLength += rule.length;
  }
  return rules;
}

/** Keeps valid color stops; falls back when fewer than two remain. */
export function sanitizeGradientStops(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const stops = value
    .slice(0, EFFECT_INPUT_LIMITS.gradientStopCount)
    .filter((candidate): candidate is string => typeof candidate === 'string')
    .map((candidate) => candidate.trim())
    .filter(
      (candidate) =>
        candidate.length > 0 &&
        candidate.length <= EFFECT_INPUT_LIMITS.gradientStopLength &&
        !containsUnsafeCss(candidate) &&
        isValidCssColor(candidate)
    );
  return stops.length >= 2 ? stops : [...fallback];
}
