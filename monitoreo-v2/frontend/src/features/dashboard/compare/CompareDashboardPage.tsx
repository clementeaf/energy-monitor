import { useMemo, useState, type ReactElement } from 'react';
import type { SeriesOptionsType, Options as HighchartsOptions } from 'highcharts';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useCompareBuildingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { Chart } from '../../../components/charts/Chart';
import { PillToggle } from '../../../components/ui/PillToggle';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataWidget } from '../../../components/ui/DataWidget';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import {
  compareMetricsFromBuildingRows,
  dailyEnergySeriesFromBuildingRows,
} from '../dashboardAggregations';
import type { Building } from '../../../types/building';

type RangePreset = 'day' | 'week' | 'month';

const RANGE_PRESETS: { key: RangePreset; label: string; days: number }[] = [
  { key: 'day', label: 'Día', days: 1 },
  { key: 'week', label: 'Semana', days: 7 },
  { key: 'month', label: 'Mes', days: 30 },
];

const CHART_COLORS = ['var(--color-brand)', '#E84C6F', '#2D9F5D', '#F5A623', '#6366F1', '#8B5CF6'];

/**
 * Formatea rango de fechas para etiquetas de periodo.
 * @param fromIso - Inicio ISO
 * @param toIso - Fin ISO
 * @returns Texto legible es-CL
 */
function formatRangeLabel(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${from.toLocaleDateString('es-CL', opts)} — ${to.toLocaleDateString('es-CL', opts)}`;
}

/**
 * Dashboard comparativo multi-edificio con datos precargados vía bundle API.
 * @returns Vista de la ruta `/dashboard/compare`
 */
export function CompareDashboardPage(): ReactElement {
  const [preset, setPreset] = useState<RangePreset>('month');
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);

  const rangeConfig = RANGE_PRESETS.find((r) => r.key === preset)!;
  const compareQuery = useCompareBuildingsQuery(rangeConfig.days);
  const buildingsQuery = useBuildingsQuery();

  const buildings = buildingsQuery.data ?? [];
  const buildingsById = useMemo(() => {
    const map = new Map<string, Building>();
    for (const b of buildings) map.set(b.id, b);
    return map;
  }, [buildings]);

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

  const bundle = compareQuery.data;
  const from = bundle?.from ?? '';
  const to = bundle?.to ?? '';
  const prevRange = bundle
    ? { from: bundle.previousFrom, to: bundle.previousTo }
    : { from: '', to: '' };

  const aggRows = bundle?.current ?? [];
  const aggRowsPrev = bundle?.previous ?? [];

  const seriesByBuilding = useMemo(
    () => dailyEnergySeriesFromBuildingRows(aggRows, selectedIds),
    [aggRows, selectedIds],
  );

  const metrics = useMemo(
    () => compareMetricsFromBuildingRows(aggRows, selectedIds),
    [aggRows, selectedIds],
  );

  const metricsPrev = useMemo(
    () => compareMetricsFromBuildingRows(aggRowsPrev, selectedIds),
    [aggRowsPrev, selectedIds],
  );

  const tableRowsSingle = useMemo(() => {
    const rows = selectedIds.map((id) => {
      const b = buildingsById.get(id);
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
  }, [selectedIds, buildingsById, metrics]);

  const tableRowsDual = useMemo(() => {
    return selectedIds.map((id) => {
      const b = buildingsById.get(id);
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
  }, [selectedIds, buildingsById, metrics, metricsPrev]);

  const lineChartOptions = useMemo((): HighchartsOptions => {
    const series: SeriesOptionsType[] = selectedIds.map((id, idx) => {
      const b = buildingsById.get(id);
      const pts = seriesByBuilding.get(id) ?? [];
      return {
        type: 'line' as const,
        name: b?.name ?? id,
        data: pts,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    });

    return {
      chart: { type: 'line' },
      title: { text: 'Consumo diario por edificio (kWh)' },
      xAxis: { type: 'datetime' },
      yAxis: [{ title: { text: 'kWh' } }],
      series,
    };
  }, [selectedIds, buildingsById, seriesByBuilding]);

  const columnChartOptions = useMemo((): HighchartsOptions => {
    const categories = selectedIds.map((id) => buildingsById.get(id)?.name ?? id);
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
  }, [selectedIds, buildingsById, metrics, metricsPrev]);

  const loading = compareQuery.isPending && !compareQuery.data;
  const fetchError = compareQuery.error;
  const isError = compareQuery.isError;
  const emptyData = compareWithPrevious
    ? aggRows.length === 0 && aggRowsPrev.length === 0
    : aggRows.length === 0;

  const onRetry = (): void => {
    void compareQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard comparativo"
        eyebrow="Dashboard"
        description={
          compareWithPrevious
            ? 'Compara periodo actual con anterior'
            : 'Selecciona al menos dos edificios'
        }
        actions={
          <PillToggle
            options={RANGE_PRESETS.map((r) => ({ key: r.key, label: r.label }))}
            value={preset}
            onChange={setPreset}
            size="sm"
          />
        }
      />

      <div className="panel p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={compareWithPrevious}
            onChange={(e) => setCompareWithPrevious(e.target.checked)}
            className="mt-1 size-4 rounded border-border text-brand focus:ring-brand"
          />
          <span>
            <span className="text-[13px] font-medium text-foreground">Comparar con periodo anterior</span>
            <span className="mt-0.5 block text-[11px] text-muted">
              Misma duración, termina justo antes del periodo actual.
            </span>
          </span>
        </label>
        {compareWithPrevious && bundle && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 rounded-lg bg-surface px-3 py-2 text-[11px]">
              <span className="font-medium text-foreground">Actual</span>
              <div className="tabular-nums text-muted">{formatRangeLabel(from, to)}</div>
            </div>
            <div className="flex-1 rounded-lg bg-surface px-3 py-2 text-[11px]">
              <span className="font-medium text-foreground">Anterior</span>
              <div className="tabular-nums text-muted">{formatRangeLabel(prevRange.from, prevRange.to)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">Edificios</span>
          <button type="button" onClick={selectAll} className="text-[11px] text-brand hover:underline">
            Seleccionar todos
          </button>
          <button type="button" onClick={clearSelection} className="text-[11px] text-muted hover:underline">
            Limpiar
          </button>
          {!canCompare && (
            <span className="text-[11px] text-warning">
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
                    ? 'border-brand bg-brand-muted text-brand'
                    : 'border-border bg-surface text-muted hover:bg-background'
                }`}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      </div>

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
            {compareWithPrevious ? (
              <div className="panel p-4">
                <h2 className="mb-2 text-[13px] font-medium text-foreground">Energía total: actual vs anterior</h2>
                <Chart options={columnChartOptions} loading={compareQuery.isFetching && !compareQuery.isPending} />
              </div>
            ) : (
              <div className="panel p-4">
                <h2 className="mb-2 text-[13px] font-medium text-foreground">Curvas superpuestas</h2>
                <Chart options={lineChartOptions} loading={compareQuery.isFetching && !compareQuery.isPending} />
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-[13px] font-medium text-foreground">Tabla comparativa</h2>
              <div className="overflow-auto panel">
                {compareWithPrevious ? (
                  <table className="min-w-full text-[13px]">
                    <thead className="sticky top-0 z-10 bg-surface text-left text-[11px] font-medium uppercase text-muted">
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
                          <td className="px-3 py-1.5 font-medium text-foreground">{r.name}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {r.energyCurrent.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {r.energyPrevious.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </td>
                          <td className={`px-3 py-1.5 text-right tabular-nums ${
                            r.deltaPeriodPct == null ? 'text-muted'
                              : r.deltaPeriodPct > 1 ? 'text-danger'
                              : r.deltaPeriodPct < -1 ? 'text-success'
                              : 'text-foreground'
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
                    <thead className="sticky top-0 z-10 bg-surface text-left text-[11px] font-medium uppercase text-muted">
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
                          <td className="px-3 py-1.5 font-medium text-foreground">{r.name}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {r.energyKwh.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.peakDemandKw.toFixed(1)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.avgPf > 0 ? r.avgPf.toFixed(3) : '—'}</td>
                          <td className={`px-3 py-1.5 text-right tabular-nums ${
                            r.deltaPct > 1 ? 'text-danger'
                              : r.deltaPct < -1 ? 'text-success'
                              : 'text-foreground'
                          }`}>
                            {r.deltaPct > 0 ? '+' : ''}{r.deltaPct.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </TableStateBody>
                  </table>
                )}
              </div>
              <p className="text-[11px] text-muted">
                {compareWithPrevious
                  ? 'Δ: variación energía actual vs anterior.'
                  : 'Delta referido al promedio del grupo.'}
              </p>
            </div>
          </div>
        )}
      </DataWidget>

      {!buildingsQuery.isPending && buildings.length === 0 && (
        <p className="text-[13px] text-muted">No hay edificios disponibles en tu alcance.</p>
      )}
    </div>
  );
}
