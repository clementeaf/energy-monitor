export interface Column<T> {
  label: string;
  value: (row: T) => string;
  total?: (data: T[]) => string;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  footer?: boolean;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  maxHeight?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  footer = false,
  onRowClick,
  rowKey,
  maxHeight = 'max-h-72',
  emptyMessage = 'Sin datos',
}: Readonly<DataTableProps<T>>) {
  const hasFooter = footer && columns.some((c) => c.total);

  return (
    <div className={`overflow-auto ${maxHeight}`}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`sticky top-0 z-10 bg-white px-3 py-2 font-semibold text-text ${
                  (col.align ?? 'right') === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
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
                    }`}
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
                  className={`sticky bottom-0 z-10 bg-white px-3 py-2 font-semibold ${
                    (col.align ?? 'right') === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.total ? col.total(data) : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
