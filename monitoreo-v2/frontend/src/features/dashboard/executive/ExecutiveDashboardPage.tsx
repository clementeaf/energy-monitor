import { useMemo, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router';

import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useTariffsQuery, useTariffBlocksQuery } from '../../../hooks/queries/useTariffsQuery';
import { StockChart } from '../../../components/charts/StockChart';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { DataWidget } from '../../../components/ui/DataWidget';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import {
  aggregatePortfolioByBucket,
  countMetersByBuilding,
  dateRangeFromLatestReadings,
} from '../dashboardAggregations';

type RangePreset = 'day' | 'week' | 'month';
type ChartView = 'energy' | 'demand' | 'cost';

const RANGE_PRESETS: { key: RangePreset; label: string; days: number; interval: 'hourly' | 'daily' | 'daily' }[] = [
  { key: 'day', label: 'Día', days: 1, interval: 'hourly' },
  { key: 'week', label: 'Semana', days: 7, interval: 'daily' },
  { key: 'month', label: 'Mes', days: 30, interval: 'daily' },
];

const CHART_VIEWS: { key: ChartView; label: string }[] = [
  { key: 'energy', label: 'Energía' },
  { key: 'demand', label: 'Demanda' },
  { key: 'cost', label: 'Costo' },
];

/**
 * Dashboard ejecutivo multi-edificio: KPIs, tendencias y ranking de intensidad.
 * @returns Vista principal de la ruta `/dashboard/executive`
 */
export function ExecutiveDashboardPage(): ReactElement {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<RangePreset>('week');
  const [chartView, setChartView] = useState<ChartView>('energy');

  const rangeConfig = RANGE_PRESETS.find((r) => r.key === preset)!;

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();

  const { from, to } = useMemo(
    () => dateRangeFromLatestReadings(rangeConfig.days, latestQuery.data ?? []),
    [latestQuery.data, rangeConfig.days],
  );

  const aggQuery = useAggregatedReadingsQuery(
    { from, to, interval: rangeConfig.interval, groupBy: 'portfolio' },
    latestQuery.isSuccess,
  );
  const activeAlertsQuery = useAlertsQuery({ status: 'active' });
  const tariffsQuery = useTariffsQuery();
  const firstTariffId = tariffsQuery.data?.find((t) => t.isActive)?.id ?? tariffsQuery.data?.[0]?.id ?? null;
  const tariffBlocksQuery = useTariffBlocksQuery(firstTariffId);

  const buildingsQs = useQueryState(buildingsQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const latestReadings = latestQuery.data ?? [];
  const aggRows = aggQuery.data ?? [];
  const activeAlerts = activeAlertsQuery.data ?? [];

  const metersByBuilding = useMemo(() => countMetersByBuilding(meters), [meters]);

  // Ranking by current power per building (from latestReadings — already loaded, no extra query)
  const ranking = useMemo(() => {
    const powerByBuilding = new Map<string, number>();
    for (const r of latestReadings) {
      const bid = r.building_id;
      if (!bid) continue;
      powerByBuilding.set(bid, (powerByBuilding.get(bid) ?? 0) + Number(r.power_kw ?? 0));
    }
    return buildings
      .map((b) => ({
        buildingId: b.id,
        buildingName: b.name,
        totalEnergyKwh: powerByBuilding.get(b.id) ?? 0,
        intensity: (powerByBuilding.get(b.id) ?? 0) / (metersByBuilding.get(b.id) || 1),
        meterCount: metersByBuilding.get(b.id) ?? 0,
      }))
      .sort((a, b) => b.totalEnergyKwh - a.totalEnergyKwh);
  }, [latestReadings, buildings, metersByBuilding]);

  const portfolioSeries = useMemo(() => aggregatePortfolioByBucket(aggRows), [aggRows]);

  const refEnergyRate = useMemo((): number | null => {
    const blocks = tariffBlocksQuery.data ?? [];
    if (blocks.length === 0) return null;
    const sum = blocks.reduce((s, b) => s + Number(b.energyRate), 0);
    return sum / blocks.length;
  }, [tariffBlocksQuery.data]);

  const totalPowerKw = useMemo(
    () => latestReadings.reduce((s, r) => s + Number(r.power_kw ?? 0), 0),
    [latestReadings],
  );

  const avgPf = useMemo(() => {
    if (latestReadings.length === 0) return 0;
    return (
      latestReadings.reduce((s, r) => s + Number(r.power_factor ?? 0), 0) / latestReadings.length
    );
  }, [latestReadings]);

  const totalEnergyPeriod = useMemo(
    () => portfolioSeries.reduce((s, p) => s + p.energyKwh, 0),
    [portfolioSeries],
  );

  const estimatedCost = useMemo(() => {
    if (refEnergyRate == null) return null;
    return totalEnergyPeriod * refEnergyRate;
  }, [refEnergyRate, totalEnergyPeriod]);

  const criticalAlerts = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'critical'),
    [activeAlerts],
  );

  const chartOptions = useMemo(() => {
    const ts = (p: (typeof portfolioSeries)[number]) => new Date(p.bucket).getTime();
    const base = {
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
    };

    if (chartView === 'energy') {
      return {
        ...base,
        title: { text: 'Consumo energético' },
        yAxis: [{ title: { text: 'Energía (kWh)' } }],
        series: [{
          type: 'column' as const,
          name: 'Consumo (kWh)',
          data: portfolioSeries.map((p) => [ts(p), p.energyKwh]),
        }],
      };
    }

    if (chartView === 'demand') {
      return {
        ...base,
        title: { text: 'Demanda agregada' },
        yAxis: [{ title: { text: 'Potencia (kW)' } }],
        series: [{
          type: 'line' as const,
          name: 'Demanda (kW)',
          data: portfolioSeries.map((p) => [ts(p), p.demandKw]),
        }],
      };
    }

    // cost
    const rate = refEnergyRate ?? 0;
    return {
      ...base,
      title: { text: 'Costo estimado' },
      yAxis: [{ title: { text: 'Costo (CLP)' } }],
      series: [{
        type: 'line' as const,
        name: 'Costo (CLP)',
        data: portfolioSeries.map((p) => [ts(p), p.energyKwh * rate]),
        dashStyle: 'ShortDash' as const,
      }],
    };
  }, [portfolioSeries, refEnergyRate, chartView]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard ejecutivo"
        eyebrow="Dashboard"
        description="Vista consolidada multi-edificio"
        actions={
          <PillToggle
            options={RANGE_PRESETS.map((r) => ({ key: r.key, label: r.label }))}
            value={preset}
            onChange={setPreset}
            size="sm"
          />
        }
      />

      {/* 2-column layout: Cards+Chart | Ranking+Alerts */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Column 1: KPIs + Chart */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* KPI row */}
          {buildingsQuery.isPending || latestQuery.isPending ? (
            <div className="animate-pulse flex flex-wrap gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-1 basis-32 panel px-3 py-2.5">
                  <div className="h-3 w-20 rounded bg-raised" />
                  <div className="mt-1.5 h-5 w-24 rounded bg-raised" />
                </div>
              ))}
            </div>
          ) : (
          <div className="flex flex-wrap gap-3">
            <KpiCard title="Edificios" value={String(buildings.length)} />
            <KpiCard title="Medidores" value={String(latestReadings.length)} />
            <KpiCard title="Potencia actual" value={`${totalPowerKw.toFixed(1)} kW`} />
            <KpiCard title="FP (prom.)" value={avgPf > 0 ? avgPf.toFixed(3) : '—'} />
            <KpiCard title={`Energía (${rangeConfig.label})`} value={`${totalEnergyPeriod.toLocaleString('es-CL', { maximumFractionDigits: 0 })} kWh`} />
            <KpiCard
              title="Costo est."
              value={estimatedCost != null ? `$${estimatedCost.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : '—'}
            />
          </div>
          )}

          {/* Chart */}
          {aggQuery.isPending && (
            <div className="animate-pulse panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="h-4 w-40 rounded bg-raised" />
                <div className="h-6 w-32 rounded bg-raised" />
              </div>
              <div className="h-64 w-full rounded bg-raised" />
            </div>
          )}
          {!aggQuery.isPending && portfolioSeries.length > 0 && (
            <div className="panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[13px] font-medium text-foreground">{chartOptions.title.text}</h2>
                <PillToggle
                  options={CHART_VIEWS.map((v) => ({ key: v.key, label: v.label }))}
                  value={chartView}
                  onChange={setChartView}
                  size="sm"
                />
              </div>
              <StockChart options={chartOptions} loading={aggQuery.isFetching} />
            </div>
          )}
        </div>

        {/* Column 2: Ranking + Alerts stacked */}
        <div className="flex w-full flex-col gap-4 lg:w-80">
          {/* Ranking */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-foreground">Ranking intensidad</h2>
            {(buildingsQs.phase === 'loading' || latestQuery.isPending) ? (
              <div className="animate-pulse panel">
                <div className="h-8 rounded-t bg-raised" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 border-t border-border px-3 py-2">
                    <div className="h-4 w-4 rounded bg-raised" />
                    <div className="h-4 w-24 rounded bg-raised" />
                    <div className="ml-auto h-4 w-16 rounded bg-raised" />
                    <div className="h-4 w-10 rounded bg-raised" />
                  </div>
                ))}
              </div>
            ) : (
            <DataWidget
              phase={latestQuery.isPending ? 'loading' : buildingsQs.phase}
              error={buildingsQs.error ?? latestQuery.error}
              onRetry={() => { buildingsQuery.refetch(); latestQuery.refetch(); }}
              emptyTitle="Sin datos"
              emptyDescription="No hay edificios o lecturas agregadas."
            >
              <div className="max-h-[70vh] overflow-y-auto panel">
                <table className="min-w-full text-[13px]">
                  <thead className="sticky top-0 z-10 bg-surface text-left text-[11px] font-medium uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Edificio</th>
                      <th className="px-3 py-2 text-right">kW</th>
                      <th className="px-3 py-2 text-right">kW/med</th>
                    </tr>
                  </thead>
                  <TableStateBody
                    phase={buildingsQs.phase}
                    colSpan={4}
                    error={buildingsQs.error}
                    onRetry={() => { buildingsQuery.refetch(); aggQuery.refetch(); }}
                    emptyMessage="Sin datos de edificios."
                    skeletonWidths={['w-8', 'w-32', 'w-20', 'w-16']}
                  >
                    {ranking.map((row, idx) => (
                      <tr key={row.buildingId}>
                        <td className="px-3 py-1.5 text-muted">{idx + 1}</td>
                        <td className="px-3 py-1.5 font-medium">
                          <Link
                            to={`/dashboard/executive/${row.buildingId}`}
                            className="text-brand hover:underline"
                          >
                            {row.buildingName}
                          </Link>
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {row.totalEnergyKwh.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {row.intensity.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </TableStateBody>
                </table>
              </div>
              <p className="text-[11px] text-muted">
                Menor = menos consumo relativo (por m² o por medidor).
              </p>
            </DataWidget>
            )}
          </div>

          {/* Critical alerts */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-foreground">
              Alertas críticas
              {criticalAlerts.length > 0 && (
                <span className="ml-1.5 text-[11px] font-normal text-muted">
                  ({criticalAlerts.length})
                </span>
              )}
            </h2>
            <DataWidget
              phase={activeAlertsQuery.isPending ? 'loading' : activeAlertsQuery.isError ? 'error' : 'ready'}
              error={activeAlertsQuery.error}
              onRetry={() => { activeAlertsQuery.refetch(); }}
              emptyTitle="Sin alertas críticas"
              emptyDescription="No hay alertas activas con severidad crítica."
            >
              <ul className="max-h-64 divide-y divide-border overflow-y-auto panel">
                {criticalAlerts.map((a) => (
                  <li
                    key={a.id}
                    className="cursor-pointer px-3 py-2 text-[13px] transition-colors hover:bg-surface"
                    onClick={() => navigate(`/alerts?highlight=${a.id}`)}
                  >
                    <span className="text-foreground">{a.message}</span>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {new Date(a.createdAt).toLocaleString('es-CL')}
                    </div>
                  </li>
                ))}
              </ul>
            </DataWidget>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: Readonly<{ title: string; value: string }>): ReactElement {
  return (
    <div className="flex-1 basis-32 panel px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted">{title}</p>
      <p className="mt-0.5 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
