import { useMemo, useState, type ReactElement } from 'react';
import type { SeriesOptionsType, Options as HighchartsOptions } from 'highcharts';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { StockChart } from '../../../components/charts/StockChart';
import { Chart } from '../../../components/charts/Chart';
import { DataWidget } from '../../../components/ui/DataWidget';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import {
  compareMetricsByBuilding,
  dailyEnergySeriesByBuilding,
  meterToBuildingMap,
  previousPeriodRange,
} from '../dashboardAggregations';

type RangePreset = 'day' | 'week' | 'month';

const RANGE_PRESETS: { key: RangePreset; label: string; days: number }[] = [
  { key: 'day', label: 'Día', days: 1 },
  { key: 'week', label: 'Semana', days: 7 },
  { key: 'month', label: 'Mes', days: 30 },
];

function formatRangeLabel(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${from.toLocaleDateString('es-CL', opts)} — ${to.toLocaleDateString('es-CL', opts)}`;
}

export function CompareDashboardPage(): ReactElement {
  const [preset, setPreset] = useState<RangePreset>('month');
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);

  const rangeConfig = RANGE_PRESETS.find((r) => r.key === preset)!;
  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - rangeConfig.days);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [rangeConfig.days]);

  const prevRange = useMemo(() => previousPeriodRange(from, to), [from, to]);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const meterById = useMemo(() => meterToBuildingMap(meters), [meters]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const canCompare = compareWithPrevious
    ? selectedIds.length >= 1
    : selectedIds.length >= 2;

  const toggleBuilding = (id: string): void => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = (): void => setSelectedIds(buildings.map((b) => b.id));
  const clearSelection = (): void => setSelectedIds([]);

  const aggQuery = useAggregatedReadingsQuery(
    { from, to, interval: 'daily' },
    canCompare,
  );
  const aggQueryPrev = useAggregatedReadingsQuery(
    { from: prevRange.from, to: prevRange.to, interval: 'daily' },
    canCompare && compareWithPrevious,
  );

  const aggRows = aggQuery.data ?? [];
  const aggRowsPrev = aggQueryPrev.data ?? [];

  const seriesByBuilding = useMemo(
    () => dailyEnergySeriesByBuilding(aggRows, meterById, selectedIds),
    [aggRows, meterById, selectedIds],
  );

  const metrics = useMemo(
    () => compareMetricsByBuilding(aggRows, meterById, selectedIds),
    [aggRows, meterById, selectedIds],
  );

  const metricsPrev = useMemo(
    () => compareMetricsByBuilding(aggRowsPrev, meterById, selectedIds),
    [aggRowsPrev, meterById, selectedIds],
  );

  const tableRowsSingle = useMemo(() => {
    const rows = selectedIds.map((id) => {
      const b = buildings.find((x) => x.id === id);
      const m = metrics.get(id);
      return {
        buildingId: id,
        name: b?.name ?? id,
        energyKwh: m?.energyKwh ?? 0,
        peakDemandKw: m?.peakDemandKw ?? 0,
        avgPf: m?.avgPf ?? 0,
      };
    });
    const meanEnergy =
      rows.length > 0 ? rows.reduce((s, r) => s + r.energyKwh, 0) / rows.length : 0;
    return rows.map((r) => ({
      ...r,
      deltaPct:
        meanEnergy > 0 ? ((r.energyKwh - meanEnergy) / meanEnergy) * 100 : 0,
    }));
  }, [selectedIds, buildings, metrics]);

  const tableRowsDual = useMemo(() => {
    return selectedIds.map((id) => {
      const b = buildings.find((x) => x.id === id);
      const cur = metrics.get(id);
      const prev = metricsPrev.get(id);
      const energyA = cur?.energyKwh ?? 0;
      const energyB = prev?.energyKwh ?? 0;
      let deltaPeriodPct: number | null = null;
      if (energyB > 0) {
        deltaPeriodPct = ((energyA - energyB) / energyB) * 100;
      } else if (energyA === 0 && energyB === 0) {
        deltaPeriodPct = 0;
      }
      return {
        buildingId: id,
        name: b?.name ?? id,
        energyCurrent: energyA,
        energyPrevious: energyB,
        deltaPeriodPct,
        peakDemandKw: cur?.peakDemandKw ?? 0,
        avgPf: cur?.avgPf ?? 0,
      };
    });
  }, [selectedIds, buildings, metrics, metricsPrev]);

  const lineChartOptions = useMemo(() => {
    const colors = ['var(--color-pa-blue)', '#E84C6F', '#2D9F5D', '#F5A623', '#6366F1', '#8B5CF6'];
    const series: SeriesOptionsType[] = selectedIds.map((id, idx) => {
      const b = buildings.find((x) => x.id === id);
      const pts = seriesByBuilding.get(id) ?? [];
      return {
        type: 'line' as const,
        name: b?.name ?? id,
        data: pts,
        color: colors[idx % colors.length],
      };
    });

    return {
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      title: { text: 'Consumo diario por edificio (kWh)' },
      yAxis: [{ title: { text: 'kWh' } }],
      series,
    };
  }, [selectedIds, buildings, seriesByBuilding]);

  const columnChartOptions = useMemo((): HighchartsOptions => {
    const categories = selectedIds.map((id) => buildings.find((x) => x.id === id)?.name ?? id);
    const dataCurrent = selectedIds.map((id) => metrics.get(id)?.energyKwh ?? 0);
    const dataPrevious = selectedIds.map((id) => metricsPrev.get(id)?.energyKwh ?? 0);
    return {
      chart: { type: 'column' },
      title: { text: 'Energía total por edificio (kWh)' },
      xAxis: { categories, labels: { rotation: -25 } },
      yAxis: [{ title: { text: 'kWh' }, min: 0 }],
      plotOptions: {
        column: { grouping: true, groupPadding: 0.12, pointPadding: 0.05 },
      },
      series: [
        { type: 'column', name: 'Periodo actual', data: dataCurrent },
        { type: 'column', name: 'Periodo anterior', data: dataPrevious },
      ],
    };
  }, [selectedIds, buildings, metrics, metricsPrev]);

  const loading = aggQuery.isPending || (compareWithPrevious && aggQueryPrev.isPending);
  const fetchError = aggQuery.error ?? aggQueryPrev.error;
  const isError = aggQuery.isError || (compareWithPrevious && aggQueryPrev.isError);
  const emptyData = compareWithPrevious
    ? aggRows.length === 0 && aggRowsPrev.length === 0
    : aggRows.length === 0;

  const onRetry = (): void => {
    aggQuery.refetch();
    if (compareWithPrevious) aggQueryPrev.refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-pa-text">Dashboard comparativo</h1>
          <p className="mt-0.5 text-[13px] text-pa-text-muted">
            {compareWithPrevious
              ? 'Compara periodo actual con anterior'
              : 'Selecciona al menos dos edificios'}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-pa-border bg-white p-0.5">
          {RANGE_PRESETS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setPreset(r.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                preset === r.key
                  ? 'bg-pa-blue text-white'
                  : 'text-pa-text-muted hover:text-pa-text'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compare toggle */}
      <div className="rounded-lg border border-pa-border bg-white p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={compareWithPrevious}
            onChange={(e) => setCompareWithPrevious(e.target.checked)}
            className="mt-1 size-4 rounded border-pa-border text-pa-blue focus:ring-pa-blue"
          />
          <span>
            <span className="text-[13px] font-medium text-pa-text">Comparar con periodo anterior</span>
            <span className="mt-0.5 block text-[11px] text-pa-text-muted">
              Misma duración, termina justo antes del periodo actual.
            </span>
          </span>
        </label>
        {compareWithPrevious && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 rounded-lg bg-surface px-3 py-2 text-[11px]">
              <span className="font-medium text-pa-text">Actual</span>
              <div className="tabular-nums text-pa-text-muted">{formatRangeLabel(from, to)}</div>
            </div>
            <div className="flex-1 rounded-lg bg-surface px-3 py-2 text-[11px]">
              <span className="font-medium text-pa-text">Anterior</span>
              <div className="tabular-nums text-pa-text-muted">{formatRangeLabel(prevRange.from, prevRange.to)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Building selector */}
      <div className="rounded-lg border border-pa-border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-pa-text">Edificios</span>
          <button type="button" onClick={selectAll} className="text-[11px] text-pa-blue hover:underline">
            Seleccionar todos
          </button>
          <button type="button" onClick={clearSelection} className="text-[11px] text-pa-text-muted hover:underline">
            Limpiar
          </button>
          {!canCompare && (
            <span className="text-[11px] text-pa-amber">
              {compareWithPrevious ? 'Selecciona al menos un edificio.' : 'Elige al menos dos.'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {buildings.map((b) => {
            const on = selectedIds.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBuilding(b.id)}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                  on
                    ? 'border-pa-blue bg-pa-blue/10 text-pa-blue'
                    : 'border-pa-border bg-surface text-pa-text-muted hover:bg-raised'
                }`}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {canCompare && loading && (
        <div className="animate-pulse space-y-4">
          <div className="rounded-lg border border-pa-border bg-white p-4">
            <div className="mb-2 h-4 w-48 rounded bg-gray-200" />
            <div className="h-64 w-full rounded bg-gray-200" />
          </div>
          <div className="rounded-lg border border-pa-border bg-white">
            <div className="h-8 w-full rounded-t bg-gray-200" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 border-t border-pa-border px-3 py-2">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="ml-auto h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!(canCompare && loading) && (
      <DataWidget
        phase={
          !canCompare ? 'empty'
            : loading ? 'loading'
            : isError ? 'error'
            : emptyData ? 'empty'
            : 'ready'
        }
        error={fetchError}
        onRetry={onRetry}
        emptyTitle={!canCompare ? 'Selecciona edificios' : 'Sin lecturas'}
        emptyDescription={
          !canCompare
            ? compareWithPrevious
              ? 'Marca al menos un edificio.'
              : 'Marca al menos dos edificios para comparar.'
            : 'No hay datos agregados en el periodo.'
        }
      >
        {canCompare && !emptyData && (
          <div className="space-y-4">
            {/* Chart */}
            {compareWithPrevious ? (
              <div className="rounded-lg border border-pa-border bg-white p-4">
                <h2 className="mb-2 text-[13px] font-medium text-pa-text">Energía total: actual vs anterior</h2>
                <Chart options={columnChartOptions} />
              </div>
            ) : (
              <div className="rounded-lg border border-pa-border bg-white p-4">
                <h2 className="mb-2 text-[13px] font-medium text-pa-text">Curvas superpuestas</h2>
                <StockChart options={lineChartOptions} loading={aggQuery.isFetching} />
              </div>
            )}

            {/* Table */}
            <div className="space-y-2">
              <h2 className="text-[13px] font-medium text-pa-text">Tabla comparativa</h2>
              <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-pa-border bg-white">
                {compareWithPrevious ? (
                  <table className="min-w-full text-[13px]">
                    <thead className="sticky top-0 z-10 bg-surface text-left text-[11px] font-medium uppercase text-pa-text-muted">
                      <tr>
                        <th className="px-3 py-2">Edificio</th>
                        <th className="px-3 py-2 text-right">Actual (kWh)</th>
                        <th className="px-3 py-2 text-right">Anterior (kWh)</th>
                        <th className="px-3 py-2 text-right">Δ</th>
                        <th className="px-3 py-2 text-right">Pico (kW)</th>
                        <th className="px-3 py-2 text-right">FP</th>
                      </tr>
                    </thead>
                    <TableStateBody phase="ready" colSpan={6} skeletonWidths={['w-28', 'w-20', 'w-20', 'w-16', 'w-16', 'w-16']}>
                      {tableRowsDual.map((r) => (
                        <tr key={r.buildingId}>
                          <td className="px-3 py-1.5 font-medium text-pa-text">{r.name}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {r.energyCurrent.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {r.energyPrevious.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </td>
                          <td className={`px-3 py-1.5 text-right tabular-nums ${
                            r.deltaPeriodPct == null ? 'text-pa-text-muted'
                              : r.deltaPeriodPct > 1 ? 'text-pa-coral'
                              : r.deltaPeriodPct < -1 ? 'text-pa-green'
                              : 'text-pa-text'
                          }`}>
                            {r.deltaPeriodPct == null ? '—' : `${r.deltaPeriodPct > 0 ? '+' : ''}${r.deltaPeriodPct.toFixed(1)}%`}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.peakDemandKw.toFixed(1)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.avgPf > 0 ? r.avgPf.toFixed(3) : '—'}</td>
                        </tr>
                      ))}
                    </TableStateBody>
                  </table>
                ) : (
                  <table className="min-w-full text-[13px]">
                    <thead className="sticky top-0 z-10 bg-surface text-left text-[11px] font-medium uppercase text-pa-text-muted">
                      <tr>
                        <th className="px-3 py-2">Edificio</th>
                        <th className="px-3 py-2 text-right">Energía (kWh)</th>
                        <th className="px-3 py-2 text-right">Pico (kW)</th>
                        <th className="px-3 py-2 text-right">FP</th>
                        <th className="px-3 py-2 text-right">Δ vs media</th>
                      </tr>
                    </thead>
                    <TableStateBody phase="ready" colSpan={5} skeletonWidths={['w-28', 'w-20', 'w-16', 'w-16', 'w-16']}>
                      {tableRowsSingle.map((r) => (
                        <tr key={r.buildingId}>
                          <td className="px-3 py-1.5 font-medium text-pa-text">{r.name}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {r.energyKwh.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.peakDemandKw.toFixed(1)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.avgPf > 0 ? r.avgPf.toFixed(3) : '—'}</td>
                          <td className={`px-3 py-1.5 text-right tabular-nums ${
                            r.deltaPct > 1 ? 'text-pa-coral'
                              : r.deltaPct < -1 ? 'text-pa-green'
                              : 'text-pa-text'
                          }`}>
                            {r.deltaPct > 0 ? '+' : ''}{r.deltaPct.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </TableStateBody>
                  </table>
                )}
              </div>
              <p className="text-[11px] text-pa-text-muted">
                {compareWithPrevious
                  ? 'Δ: variación energía actual vs anterior.'
                  : 'Delta referido al promedio del grupo.'}
              </p>
            </div>
          </div>
        )}
      </DataWidget>
      )}

      {!buildingsQuery.isPending && buildings.length === 0 && (
        <p className="text-[13px] text-pa-text-muted">No hay edificios disponibles en tu alcance.</p>
      )}
    </div>
  );
}
