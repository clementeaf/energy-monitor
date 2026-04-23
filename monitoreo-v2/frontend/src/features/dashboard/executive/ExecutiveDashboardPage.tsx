import { useMemo, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router';
import type { SeriesOptionsType } from 'highcharts';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useTariffsQuery, useTariffBlocksQuery } from '../../../hooks/queries/useTariffsQuery';
import { StockChart } from '../../../components/charts/StockChart';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import {
  aggregatePortfolioByBucket,
  meterToBuildingMap,
  rankBuildingsByIntensity,
  sumEnergyByBuilding,
  countMetersByBuilding,
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
  const [preset, setPreset] = useState<RangePreset>('month');
  const [chartView, setChartView] = useState<ChartView>('energy');

  const rangeConfig = RANGE_PRESETS.find((r) => r.key === preset)!;
  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - rangeConfig.days);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [rangeConfig.days]);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const aggQuery = useAggregatedReadingsQuery(
    { from, to, interval: rangeConfig.interval },
    true,
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

  const meterById = useMemo(() => meterToBuildingMap(meters), [meters]);
  const metersByBuilding = useMemo(() => countMetersByBuilding(meters), [meters]);

  const energyByBuilding = useMemo(
    () => sumEnergyByBuilding(aggRows, meterById),
    [aggRows, meterById],
  );

  const ranking = useMemo(
    () => rankBuildingsByIntensity(energyByBuilding, buildings, metersByBuilding),
    [energyByBuilding, buildings, metersByBuilding],
  );

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-pa-text">Dashboard ejecutivo</h1>
          <p className="mt-0.5 text-[13px] text-pa-text-muted">
            Vista consolidada multi-edificio
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-pa-border bg-white p-0.5">
          {RANGE_PRESETS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => { setPreset(r.key); }}
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

      {/* 2-column layout: Cards+Chart | Ranking+Alerts */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Column 1: KPIs + Chart */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* KPI row */}
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

          {/* Chart */}
          {portfolioSeries.length > 0 && (
            <div className="rounded-lg border border-pa-border bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[13px] font-medium text-pa-text">{chartOptions.title.text}</h2>
                <div className="flex gap-1 rounded-lg border border-pa-border bg-surface p-0.5">
                  {CHART_VIEWS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setChartView(v.key)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        chartView === v.key
                          ? 'bg-white text-pa-blue'
                          : 'text-pa-text-muted hover:text-pa-text'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <StockChart options={chartOptions} loading={aggQuery.isFetching} />
            </div>
          )}
        </div>

        {/* Column 2: Ranking + Alerts stacked */}
        <div className="flex w-full flex-col gap-4 lg:w-80">
          {/* Ranking */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-pa-text">Ranking intensidad</h2>
            <DataWidget
              phase={buildingsQs.phase === 'loading' || aggQuery.isPending ? 'loading' : buildingsQs.phase}
              error={buildingsQs.error ?? aggQuery.error}
              onRetry={() => { buildingsQuery.refetch(); aggQuery.refetch(); }}
              emptyTitle="Sin datos"
              emptyDescription="No hay edificios o lecturas agregadas."
            >
              <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-pa-border bg-white">
                <table className="min-w-full text-[13px]">
                  <thead className="sticky top-0 z-10 bg-surface text-left text-[11px] font-medium uppercase text-pa-text-muted">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Edificio</th>
                      <th className="px-3 py-2 text-right">kWh</th>
                      <th className="px-3 py-2 text-right">Int.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pa-border">
                    {ranking.map((row, idx) => (
                      <tr key={row.buildingId}>
                        <td className="px-3 py-1.5 text-pa-text-muted">{idx + 1}</td>
                        <td className="px-3 py-1.5 font-medium">
                          <Link
                            to={`/dashboard/executive/${row.buildingId}`}
                            className="text-pa-blue hover:underline"
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
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-pa-text-muted">
                Menor = menos consumo relativo (por m² o por medidor).
              </p>
            </DataWidget>
          </div>

          {/* Critical alerts */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-pa-text">
              Alertas críticas
              {criticalAlerts.length > 0 && (
                <span className="ml-1.5 text-[11px] font-normal text-pa-text-muted">
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
              <ul className="max-h-64 divide-y divide-pa-border overflow-y-auto rounded-lg border border-pa-border bg-white">
                {criticalAlerts.map((a) => (
                  <li
                    key={a.id}
                    className="cursor-pointer px-3 py-2 text-[13px] transition-colors hover:bg-gray-50"
                    onClick={() => navigate(`/alerts?highlight=${a.id}`)}
                  >
                    <span className="text-pa-text">{a.message}</span>
                    <div className="mt-0.5 text-[11px] text-pa-text-muted">
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
    <div className="flex-1 basis-32 rounded-lg border border-pa-border bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium text-pa-text-muted">{title}</p>
      <p className="mt-0.5 text-base font-semibold text-pa-text">{value}</p>
    </div>
  );
}
