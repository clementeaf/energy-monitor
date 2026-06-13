import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { DataWidget } from '../../../components/ui/DataWidget';
import { Th, Td } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import { useBalanceAnomaliesQuery } from '../../../hooks/queries/useDataQualityQuery';

/**
 * Balance anomalies tab (parent vs children kWh discrepancy).
 */
export function DataQualityBalanceTab() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState<{ from?: string; to?: string }>({});

  const query = useBalanceAnomaliesQuery(applied);
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined || d.length === 0 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 panel p-4">
        <label className="block">
          <span className="text-sm font-medium text-foreground">Desde</span>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); }} className="mt-1 block rounded-md border border-border px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-foreground">Hasta</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); }} className="mt-1 block rounded-md border border-border px-3 py-2 text-sm" />
        </label>
        <Button onClick={() => { setApplied({ from: from || undefined, to: to || undefined }); }} loading={query.isFetching}>
          Buscar
        </Button>
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { query.refetch(); }}
        emptyTitle="Sin anomalias"
        emptyDescription="No hay discrepancias de balance padre/hijos en el rango."
      >
        <div className="max-h-[65vh] overflow-auto panel">
          <table className="min-w-full divide-y divide-border">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                <Th>Medidor padre</Th>
                <Th>Dia</Th>
                <Th>Suma hijos (kWh)</Th>
                <Th>Padre (kWh)</Th>
                <Th>Delta</Th>
                <Th>Delta %</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(query.data ?? []).map((row) => (
                <tr key={row.id} className="hover:bg-surface">
                  <Td className="font-medium">{row.parentMeterName ?? row.parentMeterCode ?? row.parentMeterId.slice(0, 8)}</Td>
                  <Td>{row.day}</Td>
                  <Td>{Number(row.sumChildren).toFixed(2)}</Td>
                  <Td>{Number(row.parentKwh).toFixed(2)}</Td>
                  <Td className={Math.abs(Number(row.delta)) > 1 ? 'text-danger' : ''}>{Number(row.delta).toFixed(2)}</Td>
                  <Td>{row.deltaPct != null ? `${Number(row.deltaPct).toFixed(2)}%` : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>
    </div>
  );
}
