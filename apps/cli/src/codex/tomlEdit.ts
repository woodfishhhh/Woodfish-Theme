/*
 * Surgical, verified edits to a TOML file that another program (Codex) also writes.
 *
 * Only simple scalar values (strings, integers, booleans) of standard `[table]` sections
 * are changed. Everything else (comments, ordering, whitespace, line endings, BOM, other
 * tables) stays byte-identical. Anything unusual (inline tables, dotted keys, multi-line
 * values) is refused instead of guessed. Every result is re-parsed and compared with the
 * original document plus the intended patch.
 */
import { parse } from 'smol-toml';

export type TomlScalar = string | number | boolean;

export interface TomlSet {
  table: readonly string[];
  key: string;
  value: TomlScalar;
}

export interface TomlRemove {
  table: readonly string[];
  key: string;
}

export class TomlEditError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'TomlEditError';
  }
}

interface Line {
  content: string;
  eol: string;
}

interface Section {
  /** Key path of the table; `null` for the root section before any header. */
  path: string[] | null;
  headerLine: number;
  /** First line of the body (after the header). */
  start: number;
  /** One past the last line of the body. */
  end: number;
}

interface ParsedDocument {
  bom: string;
  lines: Line[];
  eol: string;
  sections: Section[];
  /** Lines that belong to multi-line strings and must never be touched. */
  insideMultiline: Set<number>;
}

const BARE_KEY = /^[A-Za-z0-9_-]+/;

function splitLines(text: string): Line[] {
  const parts = text.split(/(\r?\n)/);
  const lines: Line[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    lines.push({ content: parts[index], eol: parts[index + 1] ?? '' });
  }
  return lines;
}

function dominantEol(lines: Line[]): string {
  const crlf = lines.filter((line) => line.eol === '\r\n').length;
  const lf = lines.filter((line) => line.eol === '\n').length;
  return crlf > lf ? '\r\n' : '\n';
}

/** Parses one key segment (bare, "basic" or 'literal'); returns it and the rest. */
function parseKeySegment(text: string): { key: string; rest: string } | null {
  const trimmed = text.replace(/^[ \t]+/, '');
  if (trimmed.startsWith('"')) {
    let key = '';
    for (let index = 1; index < trimmed.length; index += 1) {
      const char = trimmed[index];
      if (char === '\\') {
        const next = trimmed[index + 1];
        const escapes: Record<string, string> = { '"': '"', '\\': '\\', n: '\n', t: '\t' };
        if (next === undefined || !(next in escapes)) {
          return null;
        }
        key += escapes[next];
        index += 1;
        continue;
      }
      if (char === '"') {
        return { key, rest: trimmed.slice(index + 1) };
      }
      key += char;
    }
    return null;
  }
  if (trimmed.startsWith("'")) {
    const close = trimmed.indexOf("'", 1);
    return close === -1 ? null : { key: trimmed.slice(1, close), rest: trimmed.slice(close + 1) };
  }
  const bare = BARE_KEY.exec(trimmed);
  return bare ? { key: bare[0], rest: trimmed.slice(bare[0].length) } : null;
}

/** Parses a dotted key such as `a."b c".d`; returns the segments and the remaining text. */
function parseDottedKey(text: string): { path: string[]; rest: string } | null {
  const path: string[] = [];
  let rest = text;
  for (;;) {
    const segment = parseKeySegment(rest);
    if (!segment) {
      return null;
    }
    path.push(segment.key);
    rest = segment.rest.replace(/^[ \t]+/, '');
    if (!rest.startsWith('.')) {
      return { path, rest };
    }
    rest = rest.slice(1);
  }
}

/** Updates the multi-line string state across one line; returns the state at line end. */
function scanMultiline(content: string, state: '"""' | "'''" | null): '"""' | "'''" | null {
  let index = 0;
  let current = state;
  while (index < content.length) {
    if (current) {
      const close = content.indexOf(current, index);
      if (close === -1) {
        return current;
      }
      index = close + 3;
      current = null;
      continue;
    }
    const char = content[index];
    if (char === '#') {
      return null;
    }
    if (content.startsWith('"""', index) || content.startsWith("'''", index)) {
      current = content.slice(index, index + 3) as '"""' | "'''";
      index += 3;
      continue;
    }
    if (char === '"') {
      index += 1;
      while (index < content.length && content[index] !== '"') {
        index += content[index] === '\\' ? 2 : 1;
      }
      index += 1;
      continue;
    }
    if (char === "'") {
      const close = content.indexOf("'", index + 1);
      index = close === -1 ? content.length : close + 1;
      continue;
    }
    index += 1;
  }
  return current;
}

function parseDocument(text: string): ParsedDocument {
  const bom = text.startsWith('\uFEFF') ? '\uFEFF' : '';
  const lines = splitLines(bom ? text.slice(1) : text);
  const sections: Section[] = [{ path: null, headerLine: -1, start: 0, end: lines.length }];
  const insideMultiline = new Set<number>();
  let multiline: '"""' | "'''" | null = null;

  lines.forEach((line, index) => {
    if (multiline) {
      insideMultiline.add(index);
      multiline = scanMultiline(line.content, multiline);
      return;
    }
    const trimmed = line.content.trim();
    if (trimmed.startsWith('[') && !trimmed.startsWith('[[')) {
      const parsed = parseDottedKey(trimmed.slice(1));
      if (parsed && /^\][ \t]*(?:#.*)?$/.test(parsed.rest)) {
        sections[sections.length - 1].end = index;
        sections.push({
          path: parsed.path,
          headerLine: index,
          start: index + 1,
          end: lines.length,
        });
        return;
      }
    }
    if (trimmed.startsWith('[[')) {
      // Arrays of tables are never managed, but they still end the previous section.
      sections[sections.length - 1].end = index;
      sections.push({ path: ['\0array'], headerLine: index, start: index + 1, end: lines.length });
      return;
    }
    multiline = scanMultiline(line.content, null);
  });

  return { bom, lines, eol: dominantEol(lines), sections, insideMultiline };
}

function samePath(left: readonly string[] | null, right: readonly string[]): boolean {
  return (
    left !== null && left.length === right.length && left.every((part, i) => part === right[i])
  );
}

function findSections(document: ParsedDocument, table: readonly string[]): Section[] {
  return document.sections.filter((section) => samePath(section.path, table));
}

interface KeyLine {
  index: number;
  path: string[];
  /** Offset in the line where the value starts. */
  valueStart: number;
}

function keyLines(document: ParsedDocument, section: Section): KeyLine[] {
  const result: KeyLine[] = [];
  for (let index = section.start; index < section.end; index += 1) {
    if (document.insideMultiline.has(index)) {
      continue;
    }
    const content = document.lines[index].content;
    const trimmed = content.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    const parsed = parseDottedKey(content);
    if (!parsed || !parsed.rest.startsWith('=')) {
      continue;
    }
    const afterEquals = parsed.rest.slice(1);
    const valueOffset = afterEquals.length - afterEquals.replace(/^[ \t]+/, '').length;
    result.push({
      index,
      path: parsed.path,
      valueStart: content.length - parsed.rest.length + 1 + valueOffset,
    });
  }
  return result;
}

/** Length of a simple scalar at the start of `text`, or null if it is not one. */
function scalarLength(text: string): number | null {
  if (text.startsWith('"""') || text.startsWith("'''") || /^[[{]/.test(text)) {
    return null;
  }
  if (text.startsWith('"')) {
    for (let index = 1; index < text.length; index += 1) {
      if (text[index] === '\\') {
        index += 1;
        continue;
      }
      if (text[index] === '"') {
        return index + 1;
      }
    }
    return null;
  }
  if (text.startsWith("'")) {
    const close = text.indexOf("'", 1);
    return close === -1 ? null : close + 1;
  }
  const bare = /^[^\s#,]+/.exec(text);
  return bare ? bare[0].length : null;
}

function serialize(value: TomlScalar): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new TomlEditError(`只支持整数值：${value}`);
    }
    return String(value);
  }
  // Control characters, quotes and backslashes would need escaping; Woodfish never writes them.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f"\\\u007f]/.test(value)) {
    throw new TomlEditError(`字符串包含不支持的字符：${JSON.stringify(value)}`);
  }
  return `"${value}"`;
}

function tableLabel(table: readonly string[]): string {
  return table.join('.');
}

/** Reads a nested value from a parsed document. */
export function readTomlValue(
  document: Record<string, unknown>,
  table: readonly string[],
  key: string
): unknown {
  let node: unknown = document;
  for (const part of table) {
    if (node === null || typeof node !== 'object') {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return node !== null && typeof node === 'object'
    ? (node as Record<string, unknown>)[key]
    : undefined;
}

function cloneDocument(value: unknown): unknown {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (Array.isArray(value)) {
    return value.map(cloneDocument);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, cloneDocument(v)])
    );
  }
  return value;
}

function ensureTable(
  document: Record<string, unknown>,
  table: readonly string[]
): Record<string, unknown> {
  let node = document;
  for (const part of table) {
    const next = node[part];
    if (next === undefined) {
      node[part] = {};
    } else if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      throw new TomlEditError(`${tableLabel(table)} 不是表`);
    }
    node = node[part] as Record<string, unknown>;
  }
  return node;
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && left.getTime() === right.getTime();
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => deepEqual(item, right[index]))
    );
  }
  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object') {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      deepEqual(leftKeys, rightKeys) &&
      leftKeys.every((key) =>
        deepEqual((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key])
      )
    );
  }
  return Object.is(left, right);
}

/** Parses TOML, turning parser errors into a TomlEditError. */
export function parseToml(text: string): Record<string, unknown> {
  try {
    return parse(text.startsWith('\uFEFF') ? text.slice(1) : text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new TomlEditError(`config.toml 无法解析，未做任何修改：${message}`);
  }
}

export interface TomlEditResult {
  text: string;
  /** Tables that did not exist and were created (in order). */
  createdTables: string[][];
}

/**
 * Applies `sets` and `removes`. `ensureTables` are created (empty) if missing, e.g. a
 * sibling sub-table a schema requires. Throws TomlEditError and changes nothing on any doubt.
 */
export function editToml(
  original: string,
  edits: {
    sets?: readonly TomlSet[];
    removes?: readonly TomlRemove[];
    ensureTables?: readonly (readonly string[])[];
    removeTablesIfEmpty?: readonly (readonly string[])[];
  }
): TomlEditResult {
  const before = parseToml(original);
  const expected = cloneDocument(before) as Record<string, unknown>;
  const document = parseDocument(original);
  const lines = document.lines.map((line) => ({ ...line }));
  /** Lines to insert after a given index (or at the end for -1). */
  const insertions = new Map<number, string[]>();
  const removals = new Set<number>();
  const appended: string[] = [];
  const createdTables: string[][] = [];
  const pendingTables = new Map<string, { path: string[]; keys: string[] }>();

  function insertAfter(index: number, line: string): void {
    const list = insertions.get(index) ?? [];
    list.push(line);
    insertions.set(index, list);
  }

  function requireStandardTable(table: readonly string[]): Section | null {
    const sections = findSections(document, table);
    if (sections.length > 1) {
      throw new TomlEditError(`${tableLabel(table)} 出现了多次，未做修改`);
    }
    const existing = readTomlValue(before, table.slice(0, -1), table[table.length - 1]);
    // A table that only exists implicitly through `[table.child]` headers may still get its
    // own `[table]` header later in the file; anything else means inline or dotted keys.
    const implicitOnly =
      existing !== null &&
      typeof existing === 'object' &&
      Object.keys(existing).every((key) =>
        document.sections.some(
          (section) =>
            section.path !== null &&
            section.path.length > table.length &&
            table.every((part, index) => section.path?.[index] === part) &&
            section.path[table.length] === key
        )
      );
    if (sections.length === 0 && existing !== undefined && !implicitOnly) {
      throw new TomlEditError(
        `${tableLabel(table)} 使用内联表或点号键定义，Woodfish 不会改写这种写法，请手动修改`
      );
    }
    return sections[0] ?? null;
  }

  function pendingTable(table: readonly string[]): { path: string[]; keys: string[] } {
    const label = tableLabel(table);
    let pending = pendingTables.get(label);
    if (!pending) {
      pending = { path: [...table], keys: [] };
      pendingTables.set(label, pending);
      createdTables.push([...table]);
    }
    return pending;
  }

  for (const table of edits.ensureTables ?? []) {
    if (!requireStandardTable(table)) {
      pendingTable(table);
      ensureTable(expected, table);
    }
  }

  for (const set of edits.sets ?? []) {
    const serialized = serialize(set.value);
    const section = requireStandardTable(set.table);
    ensureTable(expected, set.table)[set.key] = set.value;
    if (!section) {
      pendingTable(set.table).keys.push(`${set.key} = ${serialized}`);
      continue;
    }
    const entries = keyLines(document, section);
    if (entries.some((entry) => entry.path.length > 1 && entry.path[0] === set.key)) {
      throw new TomlEditError(`${tableLabel(set.table)}.${set.key} 使用点号键定义，未做修改`);
    }
    const existing = entries.filter(
      (entry) => entry.path.length === 1 && entry.path[0] === set.key
    );
    if (existing.length > 1) {
      throw new TomlEditError(`${tableLabel(set.table)}.${set.key} 重复定义，未做修改`);
    }
    if (existing.length === 1) {
      const entry = existing[0];
      const content = lines[entry.index].content;
      const length = scalarLength(content.slice(entry.valueStart));
      if (length === null) {
        throw new TomlEditError(`${tableLabel(set.table)}.${set.key} 不是简单值，未做修改`);
      }
      lines[entry.index].content =
        content.slice(0, entry.valueStart) + serialized + content.slice(entry.valueStart + length);
      continue;
    }
    const anchor = entries.length > 0 ? entries[entries.length - 1].index : section.headerLine;
    insertAfter(anchor, `${set.key} = ${serialized}`);
  }

  for (const remove of edits.removes ?? []) {
    const section = requireStandardTable(remove.table);
    if (!section) {
      continue;
    }
    const existing = keyLines(document, section).filter(
      (entry) => entry.path.length === 1 && entry.path[0] === remove.key
    );
    for (const entry of existing) {
      if (scalarLength(lines[entry.index].content.slice(entry.valueStart)) === null) {
        throw new TomlEditError(`${tableLabel(remove.table)}.${remove.key} 不是简单值，未做修改`);
      }
      removals.add(entry.index);
    }
    const table = readTomlValue(
      expected,
      remove.table.slice(0, -1),
      remove.table[remove.table.length - 1]
    );
    if (table && typeof table === 'object') {
      delete (table as Record<string, unknown>)[remove.key];
    }
  }

  /**
   * Deletes `table` from the expected document, then implicit parent tables that became
   * empty: in TOML a parent only survives through its own header or remaining children.
   */
  function removeFromExpected(table: readonly string[]): void {
    for (let depth = table.length; depth > 0; depth -= 1) {
      const path = table.slice(0, depth);
      const parent = path.slice(0, -1);
      const parentValue =
        parent.length === 0
          ? expected
          : readTomlValue(expected, parent.slice(0, -1), parent[parent.length - 1]);
      if (!parentValue || typeof parentValue !== 'object') {
        return;
      }
      const container = parentValue as Record<string, unknown>;
      const value = container[path[path.length - 1]];
      const empty = value !== null && typeof value === 'object' && Object.keys(value).length === 0;
      const explicitHeader = document.sections.some(
        (section) => samePath(section.path, path) && !removals.has(section.headerLine)
      );
      if (depth < table.length && (!empty || explicitHeader)) {
        return;
      }
      delete container[path[path.length - 1]];
    }
  }

  for (const table of edits.removeTablesIfEmpty ?? []) {
    const section = findSections(document, table)[0];
    if (!section) {
      continue;
    }
    const value = readTomlValue(expected, table.slice(0, -1), table[table.length - 1]);
    const remainingKeys = keyLines(document, section).filter((entry) => !removals.has(entry.index));
    const hasChildren = document.sections.some(
      (other) =>
        other.path !== null &&
        !removals.has(other.headerLine) &&
        other.path.length > table.length &&
        table.every((part, index) => other.path?.[index] === part)
    );
    if (remainingKeys.length > 0 || hasChildren || insertions.has(section.headerLine)) {
      continue;
    }
    if (value && typeof value === 'object' && Object.keys(value).length > 0) {
      continue;
    }
    removals.add(section.headerLine);
    // Drop one blank separator line before the header, if any.
    const previous = section.headerLine - 1;
    if (previous >= 0 && lines[previous].content.trim() === '' && !removals.has(previous)) {
      removals.add(previous);
    }
    removeFromExpected(table);
  }

  for (const pending of pendingTables.values()) {
    appended.push('', `[${pending.path.join('.')}]`, ...pending.keys);
  }

  const eol = document.eol;
  const output: string[] = [];
  const pushLine = (content: string, lineEol: string): void => {
    output.push(content + lineEol);
  };
  insertions.get(-1)?.forEach((line) => pushLine(line, eol));
  lines.forEach((line, index) => {
    const extra = insertions.get(index);
    if (!removals.has(index)) {
      pushLine(line.content, extra && line.eol === '' ? eol : line.eol);
    } else if (extra && line.eol === '') {
      output.push(eol);
    }
    extra?.forEach((inserted, position) =>
      pushLine(
        inserted,
        position === extra.length - 1 && line.eol === '' && index === lines.length - 1 ? '' : eol
      )
    );
  });
  let text = output.join('');
  if (appended.length > 0) {
    if (text.length > 0 && !text.endsWith('\n')) {
      text += eol;
    }
    text += appended.map((line) => line + eol).join('');
  }
  text = document.bom + text;

  const after = parseToml(text);
  if (!deepEqual(after, expected)) {
    throw new TomlEditError('修改后的 config.toml 与预期不一致，已放弃写入');
  }
  return { text, createdTables };
}
