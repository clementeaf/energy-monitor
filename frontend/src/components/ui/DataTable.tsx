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
    <div className="h-full flex flex-col">
      <div className={`overflow-auto flex-1 ${maxHeight}`}>
        <table className={`min-w-full h-full text-[13px] ${tableClassName ?? ''}`}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`sticky top-0 z-10 border-b border-pa-border bg-white px-3 py-2.5 text-[13px] font-semibold text-pa-navy ${
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
                <td colSpan={columns.length} className="px-3 py-6 text-center text-pa-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-pa-border ${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col, i) => (
                    <td
                      key={i}
                      className={`px-3 py-3 text-pa-text ${
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
              <tr className="border-t border-pa-border">
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`sticky bottom-0 z-10 bg-pa-bg-alt px-3 py-2.5 font-bold text-pa-navy ${
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
        <div className="flex items-center justify-between border-t border-pa-border px-3 py-2 text-[13px] text-pa-text-muted">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} de {data.length}
          </span>
          <div className="flex gap-1">
            <button
              className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </button>
            <button
              className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
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
