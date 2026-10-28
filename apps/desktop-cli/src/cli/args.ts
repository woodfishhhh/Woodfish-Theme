export interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string | true>;
  /** Repeated `--set key=value` pairs, in order. */
  sets: string[];
}

/** Tiny, dependency-free parser: `--flag`, `--key value`, `--key=value`, `--set a=b`. */
export function parseArgs(argv: readonly string[], valueFlags: ReadonlySet<string>): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | true>();
  const sets: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) {
      positionals.push(argument);
      continue;
    }
    const equals = argument.indexOf('=');
    const name = argument.slice(2, equals === -1 ? undefined : equals);
    let value: string | true = equals === -1 ? true : argument.slice(equals + 1);
    if (value === true && valueFlags.has(name)) {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`--${name} 需要一个值`);
      }
      value = next;
      index += 1;
    }
    if (name === 'set') {
      if (value === true) {
        throw new Error('--set 需要 key=value');
      }
      sets.push(value);
      continue;
    }
    flags.set(name, value);
  }
  return { positionals, flags, sets };
}

export function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  return typeof value === 'string' ? value : undefined;
}

export function booleanFlag(args: ParsedArgs, name: string): boolean {
  return args.flags.get(name) === true || args.flags.get(name) === 'true';
}

/** Parses `a.b.c=value` into a nested patch, interpreting JSON values when possible. */
export function parseSetting(assignment: string): Record<string, unknown> {
  const equals = assignment.indexOf('=');
  if (equals <= 0) {
    throw new Error(`设置格式应为 key=value：${assignment}`);
  }
  const keys = assignment.slice(0, equals).split('.');
  if (keys.some((key) => !/^[A-Za-z][A-Za-z0-9]*$/.test(key))) {
    throw new Error(`设置名无效：${assignment.slice(0, equals)}`);
  }
  const raw = assignment.slice(equals + 1);
  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    value = raw;
  }
  return keys.reduceRight<Record<string, unknown>>(
    (inner, key, index) => ({ [key]: index === keys.length - 1 ? value : inner }),
    {}
  );
}

/** Deep-merges plain objects (arrays and scalars are replaced). */
export function mergeSettings(
  base: unknown,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> =
    base !== null && typeof base === 'object' && !Array.isArray(base)
      ? { ...(base as Record<string, unknown>) }
      : {};
  for (const [key, value] of Object.entries(patch)) {
    result[key] =
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? mergeSettings(result[key], value as Record<string, unknown>)
        : value;
  }
  return result;
}
