import { useMemo, useState, type ReactElement } from 'react';
import type { SeriesOptionsType, Options as HighchartsOptions } from 'highcharts';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { StockChart } from '../../../components/charts/StockChart';
import { Chart } from '../../../components/charts/Chart';
import { DataWidget } from '../../../components/ui/DataWidget';
import {
  compareMetricsByBuilding,
  dailyEnergySeriesByBuilding,
  dateRangeFromPreset,
  meterToBuildingMap,
  previousPeriodRange,
} from '../dashboardAggregations';

type RangePreset = '7d' | '30d' | '90d';

/**
 * Formatea un rango ISO para etiquetas cortas en español.
 * @param fromIso - Inicio ISO
 * @param toIso - Fin ISO
 * @returns Texto legible
 */
function formatRangeLabel(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${from.toLocaleDateString('es-CL', opts)} — ${to.toLocaleDateString('es-CL', opts)}`;
}

/**
 * Dashboard comparativo: edificios y/o periodo actual vs anterior.
 * @returns Vista de la ruta `/dashboard/compare`
 */
export function CompareDashboardPage(): ReactElement {
  const [preset, setPreset] = useState<RangePreset>('30d');
  const { from, to } = useMemo(() => dateRangeFromPreset(preset), [preset]);
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);

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
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const selectAll = (): void => {
    setSelectedIds(buildings.map((b) => b.id));
  };

  const clearSelection = (): void => {
    setSelectedIds([]);
  };

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
    const colors = [
      'var(--color-primary, #3D3BF3)',
      '#E84C6F',
      '#2D9F5D',
      '#F5A623',
      '#6366F1',
      '#8B5CF6',
    ];
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
        column: {
          grouping: true,
          groupPadding: 0.12,
          pointPadding: 0.05,
        },
      },
      series: [
        {
          type: 'column',
          name: 'Periodo actual',
          data: dataCurrent,
        },
        {
          type: 'column',
          name: 'Periodo anterior',
          data: dataPrevious,
        },
      ],
    };
  }, [selectedIds, buildings, metrics, metricsPrev]);

  const loading =
    aggQuery.isPending || (compareWithPrevious && aggQueryPrev.isPending);
  const fetchError = aggQuery.error ?? aggQueryPrev.error;
  const isError = aggQuery.isError || (compareWithPrevious && aggQueryPrev.isError);

  const emptyData = compareWithPrevious
    ? aggRows.length === 0 && aggRowsPrev.length === 0
    : aggRows.length === 0;

  const onRetry = (): void => {
    aggQuery.refetch();
    if (compareWithPrevious) {
      aggQueryPrev.refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard comparativo</h1>
          <p className="mt-1 text-sm text-gray-500">
            {compareWithPrevious
              ? 'Compara el periodo actual con el anterior (misma duración). Puedes elegir uno o más edificios.'
              : 'Selecciona al menos dos edificios para comparar consumo y demanda en el mismo periodo.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setPreset(p); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                preset === p
                  ? 'bg-[var(--color-primary,#3D3BF3)]/15 text-[var(--color-primary,#3D3BF3)]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={compareWithPrevious}
            onChange={(e) => { setCompareWithPrevious(e.target.checked); }}
            className="mt-1 size-4 rounded border-gray-300 text-[var(--color-primary,#3D3BF3)] focus:ring-[var(--color-primary,#3D3BF3)]"
          />
          <span>
            <span className="text-sm font-medium text-gray-900">
              Comparar con periodo anterior
            </span>
            <span className="mt-1 block text-xs text-gray-500">
              El periodo anterior tiene la misma duración y termina justo antes del inicio del
              periodo actual (según el preset 7/30/90 días).
            </span>
          </span>
        </label>
        {compareWithPrevious && (
          <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <span className="font-medium text-gray-700">Periodo actual</span>
              <div className="tabular-nums text-gray-600">{formatRangeLabel(from, to)}</div>
            </div>
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <span className="font-medium text-gray-700">Periodo anterior</span>
              <div className="tabular-nums text-gray-600">
                {formatRangeLabel(prevRange.from, prevRange.to)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Edificios</span>
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-[var(--color-primary,#3D3BF3)] hover:underline"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-gray-500 hover:underline"
          >
            Limpiar
          </button>
          {!canCompare && (
            <span className="text-xs text-amber-600">
              {compareWithPrevious
                ? 'Selecciona al menos un edificio.'
                : 'Elige al menos dos edificios.'}
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
                onClick={() => { toggleBuilding(b.id); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on
                    ? 'border-[var(--color-primary,#3D3BF3)] bg-[var(--color-primary,#3D3BF3)]/10 text-[var(--color-primary,#3D3BF3)]'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
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
          !canCompare
            ? 'empty'
            : loading
              ? 'loading'
              : isError
                ? 'error'
                : emptyData
                  ? 'empty'
                  : 'ready'
        }
        error={fetchError}
        onRetry={onRetry}
        emptyTitle={!canCompare ? 'Selecciona edificios' : 'Sin lecturas'}
        emptyDescription={
          !canCompare
            ? compareWithPrevious
              ? 'Marca al menos un edificio.'
              : 'Marca al menos dos edificios para generar la comparación.'
            : 'No hay datos agregados en el periodo para los edificios elegidos.'
        }
      >
        {canCompare && !emptyData && (
          <div className="space-y-6">
            {compareWithPrevious ? (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-gray-700">
                  Energía total: periodo actual vs anterior
                </h2>
                <Chart options={columnChartOptions} />
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-gray-700">Curvas superpuestas</h2>
                <StockChart options={lineChartOptions} loading={aggQuery.isFetching} />
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-700">Tabla comparativa</h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                {compareWithPrevious ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-2">Edificio</th>
                        <th className="px-4 py-2 text-right">Energía actual (kWh)</th>
                        <th className="px-4 py-2 text-right">Energía anterior (kWh)</th>
                        <th className="px-4 py-2 text-right">Δ periodos</th>
                        <th className="px-4 py-2 text-right">Pico demanda (kW)</th>
                        <th className="px-4 py-2 text-right">FP medio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tableRowsDual.map((r) => (
                        <tr key={r.buildingId}>
                          <td className="px-4 py-2 font-medium text-gray-900">{r.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {r.energyCurrent.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {r.energyPrevious.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </td>
                          <td
                            className={`px-4 py-2 text-right tabular-nums ${
                              r.deltaPeriodPct == null
                                ? 'text-gray-500'
                                : r.deltaPeriodPct > 1
                                  ? 'text-red-600'
                                  : r.deltaPeriodPct < -1
                                    ? 'text-emerald-600'
                                    : 'text-gray-700'
                            }`}
                          >
                            {r.deltaPeriodPct == null
                              ? '—'
                              : `${r.deltaPeriodPct > 0 ? '+' : ''}${r.deltaPeriodPct.toFixed(1)}%`}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {r.peakDemandKw.toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {r.avgPf > 0 ? r.avgPf.toFixed(3) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-2">Edificio</th>
                        <th className="px-4 py-2 text-right">Energía (kWh)</th>
                        <th className="px-4 py-2 text-right">Pico demanda (kW)</th>
                        <th className="px-4 py-2 text-right">FP medio</th>
                        <th className="px-4 py-2 text-right">Δ vs media grupo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tableRowsSingle.map((r) => (
                        <tr key={r.buildingId}>
                          <td className="px-4 py-2 font-medium text-gray-900">{r.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {r.energyKwh.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {r.peakDemandKw.toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {r.avgPf > 0 ? r.avgPf.toFixed(3) : '—'}
                          </td>
                          <td
                            className={`px-4 py-2 text-right tabular-nums ${
                              r.deltaPct > 1
                                ? 'text-red-600'
                                : r.deltaPct < -1
                                  ? 'text-emerald-600'
                                  : 'text-gray-700'
                            }`}
                          >
                            {r.deltaPct > 0 ? '+' : ''}
                            {r.deltaPct.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {compareWithPrevious
                  ? 'Δ periodos: variación porcentual de la energía del periodo actual respecto al anterior.'
                  : 'Delta referido al promedio de energía del grupo en el periodo seleccionado.'}
              </p>
            </div>
          </div>
        )}
      </DataWidget>

      {!buildingsQuery.isPending && buildings.length === 0 && (
        <p className="text-sm text-gray-500">No hay edificios disponibles en tu alcance.</p>
      )}
    </div>
  );
}
