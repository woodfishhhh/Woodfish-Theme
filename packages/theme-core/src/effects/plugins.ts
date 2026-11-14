import { isValidCssColor } from '../color/validate';

/*
 * Pluggable effects: each effect is a folder with `effect.json` (this manifest), its values
 * in `params.json` and the code in `effect.js`. These helpers are pure so every place that
 * touches values (the CLI, the watcher, the VS Code extension and the page) normalizes them
 * the same way: unknown keys are dropped, numbers clamped, colors and options validated.
 */

/** The hosts an effect can run in. */
export const EFFECT_HOSTS = ['codex', 'vscode'] as const;
export type EffectHost = (typeof EFFECT_HOSTS)[number];

export type EffectParamType = 'number' | 'boolean' | 'select' | 'color';

export interface EffectParamOption {
  value: string;
  label: string;
}

export interface EffectParamSpec {
  type: EffectParamType;
  default: number | boolean | string;
  label: string;
  description: string;
  /** Numbers only. */
  min?: number;
  max?: number;
  step?: number;
  /** CSS unit appended when the value is used in CSS (`px`, `ms`, `s`, `%`). */
  unit?: string;
  /** Selects only. */
  options?: EffectParamOption[];
}

export interface EffectManifest {
  name: string;
  description: string;
  /** Bumped when the shipped files change; an upgrade replaces files the user never edited. */
  version: number;
  hosts: EffectHost[];
  /** Whether the effect is on when the user has not decided. */
  enabled: boolean;
  /** Position in the settings page (smaller first). */
  order: number;
  params: Record<string, EffectParamSpec>;
  /**
   * Set for effects whose engine lives in Woodfish's core (the window background and the
   * code gradient): the folder holds the values and extra CSS, `effect.js` is optional.
   */
  core?: string;
}

/** Values of one effect: `enabled` plus one entry per parameter. */
export type EffectValues = { enabled: boolean } & Record<string, number | boolean | string>;

/** Folder names: lower-case letters, digits and dashes, starting with a letter. */
const EFFECT_ID = /^[a-z][a-z0-9-]{0,39}$/;
const PARAM_KEY = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const TEXT_LIMIT = 400;
const PARAM_LIMIT = 40;
const OPTION_LIMIT = 24;

export function isEffectId(value: unknown): value is string {
  return typeof value === 'string' && EFFECT_ID.test(value);
}

export class EffectManifestError extends Error {}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.slice(0, TEXT_LIMIT) : fallback;
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readOptions(value: unknown, key: string): EffectParamOption[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new EffectManifestError(`参数 ${key} 是 select，需要 options`);
  }
  return value.slice(0, OPTION_LIMIT).map((option) => {
    if (typeof option === 'string') {
      return { value: option, label: option };
    }
    const entry = (option ?? {}) as Record<string, unknown>;
    if (typeof entry.value !== 'string') {
      throw new EffectManifestError(`参数 ${key} 的 options 每项需要 value`);
    }
    return { value: entry.value, label: text(entry.label, entry.value) };
  });
}

function readParam(key: string, raw: unknown): EffectParamSpec {
  if (raw === null || typeof raw !== 'object') {
    throw new EffectManifestError(`参数 ${key} 应该是一个对象`);
  }
  const spec = raw as Record<string, unknown>;
  const type = spec.type;
  const base = { label: text(spec.label, key), description: text(spec.description, '') };
  if (type === 'number') {
    const min = finite(spec.min);
    const max = finite(spec.max);
    const fallback = finite(spec.default);
    if (min === undefined || max === undefined || fallback === undefined || min > max) {
      throw new EffectManifestError(`参数 ${key} 是 number，需要 default、min、max（min ≤ max）`);
    }
    const step = finite(spec.step);
    return {
      ...base,
      type,
      default: Math.min(max, Math.max(min, fallback)),
      min,
      max,
      ...(step !== undefined && step > 0 ? { step } : {}),
      ...(typeof spec.unit === 'string' && /^[a-z%]{0,4}$/.test(spec.unit)
        ? { unit: spec.unit }
        : {}),
    };
  }
  if (type === 'boolean') {
    return { ...base, type, default: spec.default === true };
  }
  if (type === 'select') {
    const options = readOptions(spec.options, key);
    const fallback = options.some((option) => option.value === spec.default)
      ? (spec.default as string)
      : options[0].value;
    return { ...base, type, default: fallback, options };
  }
  if (type === 'color') {
    if (typeof spec.default !== 'string' || !isValidCssColor(spec.default)) {
      throw new EffectManifestError(`参数 ${key} 是 color，default 需要是 #rrggbb 这类颜色`);
    }
    return { ...base, type, default: spec.default };
  }
  throw new EffectManifestError(`参数 ${key} 的 type 只能是 number / boolean / select / color`);
}

/**
 * Reads an `effect.json`. Throws {@link EffectManifestError} with a message for the user
 * (shown in the settings page and the logs) when the file cannot be used.
 */
export function normalizeEffectManifest(raw: unknown): EffectManifest {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new EffectManifestError('effect.json 应该是一个 JSON 对象');
  }
  const input = raw as Record<string, unknown>;
  const hosts = Array.isArray(input.hosts)
    ? EFFECT_HOSTS.filter((host) => (input.hosts as unknown[]).includes(host))
    : [...EFFECT_HOSTS];
  const params: Record<string, EffectParamSpec> = {};
  const rawParams = input.params ?? {};
  if (rawParams === null || typeof rawParams !== 'object' || Array.isArray(rawParams)) {
    throw new EffectManifestError('params 应该是一个对象');
  }
  for (const [key, spec] of Object.entries(rawParams).slice(0, PARAM_LIMIT)) {
    if (!PARAM_KEY.test(key) || key === 'enabled') {
      throw new EffectManifestError(
        `参数名 ${key} 无效（字母开头，只用字母和数字，不能叫 enabled）`
      );
    }
    params[key] = readParam(key, spec);
  }
  return {
    name: text(input.name, '未命名效果'),
    description: text(input.description, ''),
    version: Math.max(1, Math.floor(finite(input.version) ?? 1)),
    hosts,
    enabled: input.enabled !== false,
    order: finite(input.order) ?? 100,
    params,
    ...(typeof input.core === 'string' && EFFECT_ID.test(input.core) ? { core: input.core } : {}),
  };
}

function normalizeValue(spec: EffectParamSpec, value: unknown): number | boolean | string {
  switch (spec.type) {
    case 'number': {
      const number = finite(value);
      return number === undefined
        ? spec.default
        : Math.min(spec.max ?? number, Math.max(spec.min ?? number, number));
    }
    case 'boolean':
      return typeof value === 'boolean' ? value : spec.default;
    case 'select':
      return typeof value === 'string' && spec.options?.some((option) => option.value === value)
        ? value
        : spec.default;
    case 'color':
      return typeof value === 'string' && isValidCssColor(value) ? value : spec.default;
  }
}

/** Complete, valid values for `manifest` from untrusted input (missing keys get defaults). */
export function normalizeEffectValues(manifest: EffectManifest, raw: unknown): EffectValues {
  const input =
    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const values: EffectValues = {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : manifest.enabled,
  };
  for (const [key, spec] of Object.entries(manifest.params)) {
    values[key] = normalizeValue(spec, input[key]);
  }
  return values;
}

/** The defaults of every parameter (what "恢复默认" writes). */
export function defaultEffectValues(manifest: EffectManifest): EffectValues {
  return normalizeEffectValues(manifest, {});
}

/** Applies an untrusted patch to valid values; keys the manifest does not know are ignored. */
export function patchEffectValues(
  manifest: EffectManifest,
  values: EffectValues,
  patch: unknown
): EffectValues {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return normalizeEffectValues(manifest, values);
  }
  return normalizeEffectValues(manifest, { ...values, ...(patch as Record<string, unknown>) });
}

/** `--woodfish-<id>-<param>`: the custom property a parameter is exposed as. */
export function effectCssVariable(id: string, key: string): string {
  return `--woodfish-${id}-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** `--woodfish-<id>-<param>` custom properties for CSS-only effects. */
export function effectCssVariables(
  id: string,
  manifest: EffectManifest,
  values: EffectValues
): string[] {
  return Object.entries(manifest.params).flatMap(([key, spec]) => {
    const name = effectCssVariable(id, key);
    const value = values[key];
    if (spec.type === 'boolean') {
      return [`${name}: ${value ? 1 : 0};`];
    }
    if (spec.type === 'number') {
      return [`${name}: ${String(value)}${spec.unit ?? ''};`];
    }
    // Colors are validated; select values are only exposed when they are plain words.
    return typeof value === 'string' && (spec.type === 'color' || /^[a-z0-9-]+$/i.test(value))
      ? [`${name}: ${value};`]
      : [];
  });
}

const CSS_NUMBER = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;

/** One parameter read from a custom property's text; undefined when it does not fit. */
function valueFromCss(spec: EffectParamSpec, text: string): number | boolean | string | undefined {
  switch (spec.type) {
    case 'number': {
      const match = CSS_NUMBER.exec(text);
      if (!match) {
        return undefined;
      }
      const unit = match[2].toLowerCase();
      const number = Number(match[1]);
      if (unit === 'ms' && spec.unit === 's') {
        return normalizeValue(spec, number / 1000);
      }
      if (unit === 's' && spec.unit === 'ms') {
        return normalizeValue(spec, number * 1000);
      }
      return unit === '' || unit === spec.unit ? normalizeValue(spec, number) : undefined;
    }
    case 'boolean':
      return text === '1' || text === 'true'
        ? true
        : text === '0' || text === 'false'
          ? false
          : undefined;
    case 'color':
      return isValidCssColor(text) ? text : undefined;
    case 'select':
      return spec.options?.some((option) => option.value === text) ? text : undefined;
  }
}

/**
 * Parameters as the page's CSS has them: `read(name)` returns a custom property's computed
 * value on the root element, where the user's `user.css` overrides what Woodfish writes
 * from params.json. Only values that fit the parameter are returned (numbers clamped), so
 * a typo leaves the params.json value in place.
 */
export function effectValuesFromCss(
  id: string,
  manifest: EffectManifest,
  read: (name: string) => string
): Record<string, number | boolean | string> {
  const values: Record<string, number | boolean | string> = {};
  for (const [key, spec] of Object.entries(manifest.params)) {
    const text = read(effectCssVariable(id, key)).trim();
    const value = text ? valueFromCss(spec, text) : undefined;
    if (value !== undefined) {
      values[key] = value;
    }
  }
  return values;
}
