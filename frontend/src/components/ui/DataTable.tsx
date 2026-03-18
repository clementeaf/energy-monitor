import { useRef, useEffect, useCallback, useState, useMemo, type ReactNode } from 'react';

export interface Column<T> {
  label: string;
  value: (row: T) => ReactNode;
  total?: (data: T[]) => ReactNode;
  align?: 'left' | 'right' | 'center';
  headerRender?: () => ReactNode;
  cellClassName?: (row: T) => string;
  className?: string;
  width?: string;
  sortKey?: (row: T) => number | string | null;
}

export interface ColumnGroup {
  label: string;
  colSpan: number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  columnGroups?: (ColumnGroup | null)[];
  footer?: boolean;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  maxHeight?: string;
  emptyMessage?: string;
  pageSize?: number;
  tableClassName?: string;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T>({
  data,
  columns,
  columnGroups,
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
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(colIndex: number) {
    if (!columns[colIndex].sortKey) return;
    if (sortCol === colIndex) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colIndex);
      setSortDir('asc');
    }
  }

  const sortedData = useMemo(() => {
    if (sortCol === null) return data;
    const key = columns[sortCol].sortKey;
    if (!key) return data;
    const sorted = [...data].sort((a, b) => {
      const va = key(a);
      const vb = key(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb), 'es');
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortCol, sortDir, columns]);

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

  const paginated = pageSize ? sortedData.slice(0, visibleCount) : sortedData;
  const hasMore = pageSize ? visibleCount < sortedData.length : false;

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className={`overflow-y-auto overflow-x-hidden flex-1 min-h-0 ${maxHeight}`}>
        <table className={`min-w-full text-[13px] ${tableClassName ?? ''}`}>
          {columns.some((c) => c.width) && (
            <colgroup>
              {columns.map((col, i) => (
                <col key={i} style={col.width ? { width: col.width } : undefined} />
              ))}
            </colgroup>
          )}
          <thead>
            {columnGroups && (
              <tr>
                {columnGroups.map((g, i) =>
                  g ? (
                    <th
                      key={i}
                      colSpan={g.colSpan}
                      className="sticky top-0 z-10 border-b border-pa-border bg-white px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-pa-navy"
                    >
                      {g.label}
                    </th>
                  ) : (
                    <th key={i} className="sticky top-0 z-10 border-b border-pa-border bg-white" />
                  ),
                )}
              </tr>
            )}
            <tr>
              {columns.map((col, i) => {
                const sortable = !!col.sortKey;
                const isActive = sortCol === i;
                const stickyTop = columnGroups ? 'top-[30px]' : 'top-0';
                return (
                  <th
                    key={i}
                    onClick={sortable ? () => handleSort(i) : undefined}
                    className={`sticky ${stickyTop} z-10 border-b border-pa-border bg-white px-3 py-2.5 text-[13px] font-semibold text-pa-navy ${
                      col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'
                    } ${sortable ? 'cursor-pointer select-none hover:bg-gray-50' : ''} ${col.className ?? ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.headerRender ? col.headerRender() : col.label}
                      {sortable && (
                        <svg className={`h-3 w-3 shrink-0 ${isActive ? 'opacity-100' : 'opacity-30'}`} viewBox="0 0 10 14" fill="currentColor">
                          <path d="M5 0L9.33 5H0.67L5 0Z" className={isActive && sortDir === 'asc' ? 'opacity-100' : 'opacity-30'} />
                          <path d="M5 14L0.67 9H9.33L5 14Z" className={isActive && sortDir === 'desc' ? 'opacity-100' : 'opacity-30'} />
                        </svg>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`px-3 py-6 text-pa-text-muted ${
                      col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'
                    } ${col.className ?? ''}`}
                  >
                    {i === 0 ? emptyMessage : ''}
                  </td>
                ))}
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
                          col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'
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
        </table>
      </div>
      {hasFooter && (
        <table className={`mt-auto min-w-full shrink-0 text-[13px] ${tableClassName ?? ''}`}>
          <tfoot>
            <tr className="border-t border-pa-border">
              {columns.map((col, i) => (
                <td
                  key={i}
                  className={`bg-pa-bg-alt px-3 py-2.5 font-bold text-pa-navy ${
                    col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'
                  } ${col.className ?? ''}`}
                >
                  {col.total ? col.total(data) : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      )}
      {pageSize && data.length > 0 && (
        <div className="border-t border-pa-border px-3 py-2 text-[13px] text-pa-text-muted">
          {Math.min(visibleCount, data.length)} de {data.length}
        </div>
      )}
    </div>
  );
}
