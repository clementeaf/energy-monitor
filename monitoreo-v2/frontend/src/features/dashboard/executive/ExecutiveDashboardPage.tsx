import { useMemo, useState, type ReactElement } from 'react';
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
  dateRangeFromPreset,
  meterToBuildingMap,
  rankBuildingsByIntensity,
  sumEnergyByBuilding,
  countMetersByBuilding,
} from '../dashboardAggregations';

type RangePreset = '7d' | '30d' | '90d';

/**
 * Dashboard ejecutivo multi-edificio: KPIs, tendencias y ranking de intensidad.
 * @returns Vista principal de la ruta `/dashboard/executive`
 */
export function ExecutiveDashboardPage(): ReactElement {
  const [preset, setPreset] = useState<RangePreset>('30d');
  const { from, to } = useMemo(() => dateRangeFromPreset(preset), [preset]);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const aggQuery = useAggregatedReadingsQuery(
    { from, to, interval: 'daily' },
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
    const energyData = portfolioSeries.map((p) => [
      new Date(p.bucket).getTime(),
      p.energyKwh,
    ]);
    const demandData = portfolioSeries.map((p) => [
      new Date(p.bucket).getTime(),
      p.demandKw,
    ]);
    const costData =
      refEnergyRate != null
        ? portfolioSeries.map((p) => [
            new Date(p.bucket).getTime(),
            p.energyKwh * refEnergyRate,
          ])
        : [];

    const series: SeriesOptionsType[] = [
      {
        type: 'column',
        name: 'Consumo (kWh)',
        data: energyData,
        yAxis: 0,
      },
      {
        type: 'line',
        name: 'Demanda agregada (kW)',
        data: demandData,
        yAxis: 1,
      },
    ];
    if (refEnergyRate != null && costData.length > 0) {
      series.push({
        type: 'line',
        name: 'Costo estimado (CLP)',
        data: costData,
        yAxis: 2,
        dashStyle: 'ShortDash',
      });
    }

    return {
      title: { text: 'Tendencias del portfolio' },
      yAxis: [
        { title: { text: 'Energía (kWh)' } },
        { title: { text: 'Potencia (kW)' }, opposite: true },
        ...(refEnergyRate != null
          ? [{ title: { text: 'Costo (CLP)' }, opposite: true, offset: 60 }]
          : []),
      ],
      series,
    };
  }, [portfolioSeries, refEnergyRate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard ejecutivo</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vista consolidada multi-edificio. Costo estimado usa tarifa activa (primer bloque
            disponible) cuando existe configuración.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Edificios" value={String(buildings.length)} />
        <KpiCard title="Medidores (última lectura)" value={String(latestReadings.length)} />
        <KpiCard title="Potencia actual" value={`${totalPowerKw.toFixed(1)} kW`} />
        <KpiCard
          title="Factor de potencia (prom.)"
          value={avgPf > 0 ? avgPf.toFixed(3) : '—'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KpiCard
          title={`Energía periodo (${preset})`}
          value={`${totalEnergyPeriod.toLocaleString('es-CL', { maximumFractionDigits: 0 })} kWh`}
        />
        <KpiCard
          title="Costo estimado (periodo)"
          value={
            estimatedCost != null
              ? `$${estimatedCost.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
              : 'Sin tarifa'
          }
        />
        <KpiCard title="Alertas críticas activas" value={String(criticalAlerts.length)} />
      </div>

      {portfolioSeries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700">Consumo, demanda y costo</h2>
          <StockChart
            options={chartOptions}
            loading={aggQuery.isFetching}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700">Ranking por intensidad energética</h2>
          <DataWidget
            phase={buildingsQs.phase === 'loading' || aggQuery.isPending ? 'loading' : buildingsQs.phase}
            error={buildingsQs.error ?? aggQuery.error}
            onRetry={() => {
              void buildingsQuery.refetch();
              void aggQuery.refetch();
            }}
            emptyTitle="Sin datos"
            emptyDescription="No hay edificios o lecturas agregadas en el periodo."
          >
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Edificio</th>
                    <th className="px-4 py-2 text-right">kWh periodo</th>
                    <th className="px-4 py-2 text-right">Intensidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ranking.map((row, idx) => (
                    <tr key={row.buildingId}>
                      <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">{row.buildingName}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.totalEnergyKwh.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.intensity.toFixed(2)} {row.intensityUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">
              Intensidad menor implica menor consumo relativo (por m² o por medidor si no hay área).
            </p>
          </DataWidget>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700">Alertas críticas</h2>
          <DataWidget
            phase={activeAlertsQuery.isPending ? 'loading' : activeAlertsQuery.isError ? 'error' : 'ready'}
            error={activeAlertsQuery.error}
            onRetry={() => { void activeAlertsQuery.refetch(); }}
            emptyTitle="Sin alertas críticas"
            emptyDescription="No hay alertas activas con severidad crítica."
          >
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {criticalAlerts.slice(0, 12).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-2 px-4 py-2 text-sm">
                  <span className="text-gray-900">{a.message}</span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleString('es-CL')}
                  </span>
                </li>
              ))}
            </ul>
          </DataWidget>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }): ReactElement {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
