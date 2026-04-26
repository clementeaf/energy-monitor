import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Enable sorting on this column (default false) */
  sortable?: boolean;
  /** Value used for sorting — defaults to render output if it returns string|number */
  sortValue?: (row: T) => string | number;
  /** Header + cell alignment (default 'left') */
  align?: 'left' | 'center' | 'right';
  /** Optional extra class for th/td */
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  /** Rows per page — 0 disables pagination (default 0) */
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  /** Compact density */
  compact?: boolean;
}

type SortDir = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function DataTableInner<T>({
  columns,
  data,
  rowKey,
  pageSize = 0,
  onRowClick,
  emptyMessage = 'Sin datos',
  className = '',
  compact = false,
}: Readonly<DataTableProps<T>>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);

  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
    setPage(0);
  }, []);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const fn = col.sortValue;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = fn(a);
      const vb = fn(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [data, sortKey, sortDir, columns]);

  const paginated = useMemo(() => {
    if (pageSize <= 0) return sorted;
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;

  const cellPad = compact ? 'px-3 py-1.5' : 'px-4 py-3';
  const headPad = compact ? 'px-3 py-2' : 'px-4 py-2.5';

  const alignCls = (a?: 'left' | 'center' | 'right') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 bg-white ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={
                    `${headPad} text-xs font-medium uppercase tracking-wider text-gray-500 ${alignCls(col.align)} ${col.className ?? ''} ` +
                    (col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : '')
                  }
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <SortArrow dir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {paginated.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`${cellPad} whitespace-nowrap text-gray-700 ${alignCls(col.align)} ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
          <span>{data.length} registro{data.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>{page + 1} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataTable<T>(props: Readonly<DataTableProps<T>>) {
  return (
    <WidgetErrorBoundary>
      <DataTableInner {...props} />
    </WidgetErrorBoundary>
  );
}

function SortArrow({ dir }: Readonly<{ dir: SortDir }>) {
  return (
    <svg className="size-3" viewBox="0 0 10 10" fill="currentColor">
      {dir === 'asc'
        ? <path d="M5 2 L9 8 L1 8 Z" />
        : <path d="M5 8 L1 2 L9 2 Z" />
      }
    </svg>
  );
}
