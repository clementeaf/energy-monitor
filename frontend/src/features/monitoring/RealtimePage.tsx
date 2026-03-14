import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Skeleton } from '../../components/ui/Skeleton';
import { useMetersLatest } from '../../hooks/queries/useMeters';
import type { MeterLatestReading } from '../../types';

const BUILDING = 'Parque Arauco Kennedy';

function formatVal(v: number | null, decimals = 1): string {
  return v !== null ? v.toFixed(decimals) : '—';
}

function getStatus(row: MeterLatestReading): { label: string; color: string } {
  const age = Date.now() - new Date(row.timestamp).getTime();
  if (age < 30 * 60_000) return { label: 'Online', color: 'text-emerald-600 bg-emerald-50' };
  if (age < 120 * 60_000) return { label: 'Delay', color: 'text-amber-600 bg-amber-50' };
  return { label: 'Offline', color: 'text-red-600 bg-red-50' };
}

const skeletonColumns = ['Medidor', 'Tienda', 'Potencia (kW)', 'Voltaje L1 (V)', 'Corriente L1 (A)', 'FP', 'Estado'];

function SkeletonRows() {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-border text-xs text-muted">
            {skeletonColumns.map((col, i) => (
              <th
                key={col}
                className={`whitespace-nowrap py-2 pr-6 font-medium ${i === 0 || i === 1 ? 'text-left' : 'text-right'}`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="border-b border-border">
              {skeletonColumns.map((col, j) => (
                <td key={col} className={`py-3 pr-6 ${j === 0 || j === 1 ? 'text-left' : 'text-right'}`}>
                  <Skeleton className={`inline-block h-4 ${j === 0 ? 'w-16' : j === 1 ? 'w-28' : j === 6 ? 'w-14 rounded-full' : 'w-12'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const columns: Column<MeterLatestReading>[] = [
  { label: 'Medidor', value: (r) => r.meterId, align: 'left' },
  { label: 'Tienda', value: (r) => r.storeName, align: 'left' },
  { label: 'Potencia (kW)', value: (r) => formatVal(r.powerKw) },
  { label: 'Voltaje L1 (V)', value: (r) => formatVal(r.voltageL1) },
  { label: 'Corriente L1 (A)', value: (r) => formatVal(r.currentL1, 2) },
  { label: 'FP', value: (r) => formatVal(r.powerFactor, 3) },
  {
    label: 'Estado',
    value: (r) => {
      const status = getStatus(r);
      return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      );
    },
  },
];

export function RealtimePage() {
  const { data, isLoading, isError } = useMetersLatest(BUILDING);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Card>
        {isLoading ? (
          <SkeletonRows />
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            rowKey={(r) => r.meterId}
            maxHeight=""
            pageSize={10}
            emptyMessage={isError ? 'Error al cargar datos' : 'Sin datos'}
          />
        )}
      </Card>
    </div>
  );
}
