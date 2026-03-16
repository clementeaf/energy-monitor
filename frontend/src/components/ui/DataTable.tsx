import { useRef, useEffect, useCallback, useState, type ReactNode } from 'react';

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
  const [visibleCount, setVisibleCount] = useState(pageSize ?? data.length);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset visible count when data changes (e.g. filters applied)
  useEffect(() => {
    if (pageSize) setVisibleCount(pageSize);
  }, [data, pageSize]);

  // When no pageSize, show all data
  useEffect(() => {
    if (!pageSize) setVisibleCount(data.length);
  }, [data.length, pageSize]);

  const loadMore = useCallback(() => {
    if (!pageSize) return;
    setVisibleCount((prev) => Math.min(prev + pageSize, data.length));
  }, [pageSize, data.length]);

  // IntersectionObserver for infinite scroll sentinel
  useEffect(() => {
    if (!pageSize || !sentinelRef.current || !scrollRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: scrollRef.current, threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [pageSize, loadMore, visibleCount]);

  const paginated = pageSize ? data.slice(0, visibleCount) : data;
  const hasMore = pageSize ? visibleCount < data.length : false;

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className={`overflow-auto flex-1 min-h-0 ${maxHeight}`}>
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
              <>
                {paginated.map((row) => (
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
                ))}
                {hasMore && (
                  <tr ref={sentinelRef}>
                    <td colSpan={columns.length} className="px-3 py-3 text-center text-[13px] text-pa-text-muted">
                      Cargando más...
                    </td>
                  </tr>
                )}
              </>
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
      {pageSize && data.length > 0 && (
        <div className="border-t border-pa-border px-3 py-2 text-[13px] text-pa-text-muted">
          {Math.min(visibleCount, data.length)} de {data.length}
        </div>
      )}
    </div>
  );
}
