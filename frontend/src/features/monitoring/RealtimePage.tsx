import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { useMetersLatest } from '../../hooks/queries/useMeters';
import type { MeterLatestReading } from '../../types';

const BUILDING = 'Parque Arauco Kennedy';

const columns = ['Medidor', 'Tienda', 'Potencia (kW)', 'Voltaje L1 (V)', 'Corriente L1 (A)', 'FP', 'Estado'];

function formatVal(v: number | null, decimals = 1): string {
  return v !== null ? v.toFixed(decimals) : '—';
}

function getStatus(row: MeterLatestReading): { label: string; color: string } {
  const age = Date.now() - new Date(row.timestamp).getTime();
  if (age < 30 * 60_000) return { label: 'Online', color: 'text-emerald-600 bg-emerald-50' };
  if (age < 120 * 60_000) return { label: 'Delay', color: 'text-amber-600 bg-amber-50' };
  return { label: 'Offline', color: 'text-red-600 bg-red-50' };
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {columns.map((col, j) => (
            <td key={col} className={`py-3 pr-6 ${j === 0 || j === 1 ? 'text-left' : 'text-right'}`}>
              <Skeleton className={`inline-block h-4 ${j === 0 ? 'w-16' : j === 1 ? 'w-28' : j === 6 ? 'w-14 rounded-full' : 'w-12'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function RealtimePage() {
  const { data, isLoading, isError } = useMetersLatest(BUILDING);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Card>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-border text-xs text-muted">
                {columns.map((col, i) => (
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
              {isLoading ? (
                <SkeletonRows />
              ) : isError || !data?.length ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-muted">
                    {isError ? 'Error al cargar datos' : 'Sin datos'}
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const status = getStatus(row);
                  return (
                    <tr key={row.meterId} className="border-b border-border transition-colors hover:bg-raised">
                      <td className="py-2 pr-6 text-left font-medium">{row.meterId}</td>
                      <td className="py-2 pr-6 text-left">{row.storeName}</td>
                      <td className="py-2 pr-6 text-right tabular-nums">{formatVal(row.powerKw)}</td>
                      <td className="py-2 pr-6 text-right tabular-nums">{formatVal(row.voltageL1)}</td>
                      <td className="py-2 pr-6 text-right tabular-nums">{formatVal(row.currentL1, 2)}</td>
                      <td className="py-2 pr-6 text-right tabular-nums">{formatVal(row.powerFactor, 3)}</td>
                      <td className="py-2 pr-6 text-right">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
