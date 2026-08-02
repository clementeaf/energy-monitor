import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { DataWidget } from '../../../components/ui/DataWidget';
import { Th, Td } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import { useDataQualityReportQuery } from '../../../hooks/queries/useDataQualityQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import type { DataQualityReportParams } from '../../../types/data-quality';

/**
 * Returns default date range (last 7 days) as ISO date strings.
 */
function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

/**
 * Daily quality aggregates tab (% measured by building).
 */
export function DataQualityReportTab() {
  const defaults = defaultDateRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [appliedParams, setAppliedParams] = useState<DataQualityReportParams | null>(defaults);

  const reportQuery = useDataQualityReportQuery(appliedParams);
  const qs = useQueryState(reportQuery, { isEmpty: (d) => d === undefined || d.rows.length === 0 });

  const buildingsQuery = useBuildingsQuery();
  const buildingNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of buildingsQuery.data ?? []) {
      map.set(b.id, b.name);
    }
    return map;
  }, [buildingsQuery.data]);

  const report = reportQuery.data;

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
        <Button onClick={() => { if (from && to) setAppliedParams({ from, to }); }} loading={reportQuery.isFetching}>
          Generar reporte
        </Button>
      </div>

      {report && (
        <div className="flex flex-wrap gap-4">
          <SummaryCard label="Promedio medido" value={`${report.summary.avgMeasuredPct.toFixed(1)}%`} />
          <SummaryCard label="Promedio invalido" value={`${report.summary.avgInvalidPct.toFixed(1)}%`} />
          <SummaryCard label="Total lecturas" value={report.summary.totalReadings.toLocaleString('es-CL')} />
        </div>
      )}

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { reportQuery.refetch(); }}
        isFetching={reportQuery.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin datos en el rango"
        emptyDescription="No hay agregados de calidad para las fechas seleccionadas."
      >
        <div className="max-h-[65vh] overflow-auto panel">
          <table className="min-w-full divide-y divide-border">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                <Th>Edificio</Th>
                <Th>Dia</Th>
                <Th>% Medido</Th>
                <Th>% Estimado</Th>
                <Th>% Invalido</Th>
                <Th>% Desconocido</Th>
                <Th>Total</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(report?.rows ?? []).map((row) => (
                <tr key={`${row.buildingId}-${row.day}`} className="hover:bg-surface">
                  <Td className="font-medium">{buildingNames.get(row.buildingId) ?? row.buildingId.slice(0, 8)}</Td>
                  <Td>{row.day}</Td>
                  <Td>{row.measuredPct.toFixed(1)}%</Td>
                  <Td>{row.estimatedPct.toFixed(1)}%</Td>
                  <Td className={row.invalidPct > 5 ? 'text-danger' : ''}>{row.invalidPct.toFixed(1)}%</Td>
                  <Td>{row.unknownPct.toFixed(1)}%</Td>
                  <Td>{row.total.toLocaleString('es-CL')}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>
    </div>
  );
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex-1 min-w-[140px] rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
