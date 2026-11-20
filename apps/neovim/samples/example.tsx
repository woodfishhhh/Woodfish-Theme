// Comparison sample: a typed, filterable data table.
import { type ReactNode, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  readonly key: keyof T & string;
  title: string;
  width?: number;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

interface TableProps<T extends { id: number }> {
  rows: ReadonlyArray<T>;
  columns: Column<T>[];
  pageSize?: number;
  onSelect?: (row: T) => void;
}

enum Status {
  Active = 'active',
  Paused = 'paused',
  Archived = 'archived',
}

interface Project {
  id: number;
  name: string;
  status: Status;
  stars: number;
  updated: Date | null;
}

const DEFAULT_PAGE_SIZE = 10;
const BADGES: Record<Status, string> = {
  [Status.Active]: 'green',
  [Status.Paused]: 'amber',
  [Status.Archived]: 'gray',
};

function compare<T>(a: T, b: T, direction: SortDirection): number {
  const result = a === b ? 0 : (a as number | string) > (b as number | string) ? 1 : -1;
  return direction === 'asc' ? result : -result;
}

export function DataTable<T extends { id: number }>({ rows, columns, pageSize = DEFAULT_PAGE_SIZE, onSelect }: TableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [direction, setDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (sortKey === null) return [...rows];
    return [...rows].sort((a, b) => compare(a[sortKey], b[sortKey], direction));
  }, [rows, sortKey, direction]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggle = (key: keyof T & string): void => {
    setDirection((current) => (key === sortKey && current === 'asc' ? 'desc' : 'asc'));
    setSortKey(key);
  };

  return (
    <table className="data-table" role="grid">
      <thead>
        <tr>
          {columns.map(({ key, title, width }) => (
            <th key={key} style={{ width }} onClick={() => toggle(key)} aria-sort={key === sortKey ? direction : undefined}>
              {title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visible.map((row) => (
          <tr key={row.id} onClick={() => onSelect?.(row)}>
            {columns.map((column) => (
              <td key={column.key}>{column.render ? column.render(row[column.key], row) : String(row[column.key])}</td>
            ))}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={columns.length}>
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span>{page + 1} / {pages}</span>
            <button disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

export const projectColumns: Column<Project>[] = [
  { key: 'name', title: 'Name', width: 240 },
  { key: 'status', title: 'Status', render: (value) => <span className={`badge ${BADGES[value as Status]}`}>{String(value)}</span> },
  { key: 'stars', title: 'Stars' },
  { key: 'updated', title: 'Updated', render: (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : '-') },
];
