import { useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Skeleton } from '../../components/ui/Skeleton';
import { useMetersLatest } from '../../hooks/queries/useMeters';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
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
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-pa-border">
            {skeletonColumns.map((col, i) => (
              <th
                key={col}
                className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold text-pa-navy ${i === 0 || i === 1 ? 'text-left' : 'text-right'}`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="border-b border-pa-border">
              {skeletonColumns.map((col, j) => (
                <td key={col} className={`px-3 py-3 ${j === 0 || j === 1 ? 'text-left' : 'text-right'}`}>
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
  const { isMultiOp, hasOperator, operatorMeterIds } = useOperatorFilter();

  const filteredData = useMemo(() => {
    if (!data) return data;
    if (isMultiOp && hasOperator && operatorMeterIds) {
      return data.filter((m) => operatorMeterIds.has(m.meterId));
    }
    return data;
  }, [data, isMultiOp, hasOperator, operatorMeterIds]);

  if (isMultiOp && !hasOperator) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-pa-text-muted">Selecciona un operador en el sidebar para ver sus medidores.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Card>
        {isLoading ? (
          <SkeletonRows />
        ) : (
          <DataTable
            data={filteredData ?? []}
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
