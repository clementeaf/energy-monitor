import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { MeterListItem } from '../../../types';

const PAGE_SIZE = 10;

interface MetersTableProps {
  data: MeterListItem[];
  buildingName: string;
}

export function MetersTable({ data, buildingName }: MetersTableProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const slice = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex max-h-72 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-border text-xs text-muted">
              <th className="whitespace-nowrap py-2 pr-6 text-left font-medium">Medidor</th>
              <th className="whitespace-nowrap py-2 pr-6 text-left font-medium">Tienda</th>
              <th className="whitespace-nowrap py-2 pr-6 text-left font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr
                key={row.meterId}
                onClick={() => navigate(`/meters/${row.meterId}`, { state: { buildingName } })}
                className="cursor-pointer border-b border-border/50 text-text transition-colors hover:bg-raised"
              >
                <td className="whitespace-nowrap py-2 pr-6 font-medium">{row.meterId}</td>
                <td className={`whitespace-nowrap py-2 pr-6 ${row.storeName === 'Por censar' ? 'text-muted' : ''}`}>
                  {row.storeName}
                </td>
                <td className="whitespace-nowrap py-2 pr-6 text-muted">{row.storeType || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span>{data.length} medidores</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-2 py-1 transition-colors hover:bg-raised disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="tabular-nums">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded px-2 py-1 transition-colors hover:bg-raised disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
