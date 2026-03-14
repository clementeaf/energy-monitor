import { useState } from 'react';
import { DataTable, type Column } from './DataTable';

interface PaginatedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  footer?: boolean;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  maxHeight?: string;
  emptyMessage?: string;
  pageSize?: number;
  itemLabel?: string;
}

export function PaginatedTable<T>({
  data,
  columns,
  footer,
  onRowClick,
  rowKey,
  maxHeight,
  emptyMessage,
  pageSize = 10,
  itemLabel = 'filas',
}: Readonly<PaginatedTableProps<T>>) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const sliced = data.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      <DataTable
        data={sliced}
        columns={columns}
        footer={footer}
        onRowClick={onRowClick}
        rowKey={rowKey}
        maxHeight={maxHeight}
        emptyMessage={emptyMessage}
      />
      {data.length > pageSize && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-sm text-muted">
          <span>
            {data.length} {itemLabel}
          </span>
          <div className="flex items-center gap-3">
            <button
              className="rounded px-2 py-1 hover:bg-raised disabled:opacity-40"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span>
              {page + 1} de {totalPages}
            </span>
            <button
              className="rounded px-2 py-1 hover:bg-raised disabled:opacity-40"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
