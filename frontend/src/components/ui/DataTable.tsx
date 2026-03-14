import { useState, type ReactNode } from 'react';

export interface Column<T> {
  label: string;
  value: (row: T) => ReactNode;
  total?: (data: T[]) => ReactNode;
  align?: 'left' | 'right';
  headerRender?: () => ReactNode;
  cellClassName?: (row: T) => string;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  footer?: boolean;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  maxHeight?: string;
  emptyMessage?: string;
  pageSize?: number;
  tableClassName?: string;
}

export function DataTable<T>({
  data,
  columns,
  footer = false,
  onRowClick,
  rowKey,
  maxHeight = 'max-h-72',
  emptyMessage = 'Sin datos',
  pageSize,
  tableClassName,
}: Readonly<DataTableProps<T>>) {
  const hasFooter = footer && columns.some((c) => c.total);
  const [page, setPage] = useState(0);

  const paginated = pageSize ? data.slice(page * pageSize, (page + 1) * pageSize) : data;
  const totalPages = pageSize ? Math.ceil(data.length / pageSize) : 1;

  return (
    <div>
      <div className={`overflow-auto ${maxHeight}`}>
        <table className={`min-w-full text-sm ${tableClassName ?? ''}`}>
          <thead>
            <tr className="border-b border-border">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`sticky top-0 z-10 bg-surface px-3 py-2 font-semibold text-text ${
                    (col.align ?? 'right') === 'right' ? 'text-right' : 'text-left'
                  } ${col.className ?? ''}`}
                >
                  {col.headerRender ? col.headerRender() : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-border transition-colors hover:bg-raised ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col, i) => (
                    <td
                      key={i}
                      className={`px-3 py-2 ${
                        (col.align ?? 'right') === 'right' ? 'text-right' : 'text-left'
                      } ${col.className ?? ''} ${col.cellClassName?.(row) ?? ''}`}
                    >
                      {col.value(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {hasFooter && (
            <tfoot>
              <tr className="border-t border-border">
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`sticky bottom-0 z-10 bg-surface px-3 py-2 font-semibold ${
                      (col.align ?? 'right') === 'right' ? 'text-right' : 'text-left'
                    } ${col.className ?? ''}`}
                  >
                    {col.total ? col.total(data) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-sm text-muted">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} de {data.length}
          </span>
          <div className="flex gap-1">
            <button
              className="rounded px-2 py-1 hover:bg-raised disabled:opacity-40"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </button>
            <button
              className="rounded px-2 py-1 hover:bg-raised disabled:opacity-40"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
