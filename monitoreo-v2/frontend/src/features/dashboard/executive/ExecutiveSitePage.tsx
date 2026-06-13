import { useMemo, useState, type ReactElement } from 'react';
import { useParams, Link } from 'react-router';
import type { SeriesOptionsType } from 'highcharts';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useTariffsQuery, useTariffBlocksQuery } from '../../../hooks/queries/useTariffsQuery';
import { StockChart } from '../../../components/charts/StockChart';
import { DataWidget } from '../../../components/ui/DataWidget';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import { aggregatePortfolioByBucket, dateRangeFromPreset } from '../dashboardAggregations';
import { APP_ROUTES } from '../../../app/routes';
import { PageHeader } from '../../../components/ui/PageHeader';

type RangePreset = '7d' | '30d' | '90d';

/**
 * Dashboard ejecutivo de un edificio individual: KPIs, tendencias y medidores.
 * Ruta: `/dashboard/executive/:siteId`
 */
export function ExecutiveSitePage(): ReactElement {
  const { siteId } = useParams<{ siteId: string }>();
  const [preset, setPreset] = useState<RangePreset>('30d');
  const { from, to } = useMemo(() => dateRangeFromPreset(preset), [preset]);

  const buildingsQuery = useBuildingsQuery();
  const building = useMemo(
    () => (buildingsQuery.data ?? []).find((b) => b.id === siteId),
    [buildingsQuery.data, siteId],
  );

  const metersQuery = useMetersQuery(siteId);
  const latestQuery = useLatestReadingsQuery({ buildingId: siteId });
  const aggQuery = useAggregatedReadingsQuery(
    {
      from,
      to,
      interval: 'daily',
      groupBy: 'building',
      buildingId: siteId,
    },
    !!siteId,
  );
  const activeAlertsQuery = useAlertsQuery({ status: 'active', buildingId: siteId });
  const tariffsQuery = useTariffsQuery(siteId);
  const firstTariffId = tariffsQuery.data?.find((t) => t.isActive)?.id ?? tariffsQuery.data?.[0]?.id ?? null;
  const tariffBlocksQuery = useTariffBlocksQuery(firstTariffId);

  const latestQs = useQueryState(latestQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const meters = metersQuery.data ?? [];
  const latestReadings = latestQuery.data ?? [];
  const aggRows = aggQuery.data ?? [];
  const activeAlerts = activeAlertsQuery.data ?? [];

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
    return latestReadings.reduce((s, r) => s + Number(r.power_factor ?? 0), 0) / latestReadings.length;
  }, [latestReadings]);

  const peakDemandKw = useMemo(() => {
    let peak = 0;
    for (const r of aggRows) {
      const v = Number(r.max_power_kw ?? 0);
      if (v > peak) peak = v;
    }
    return peak;
  }, [aggRows]);

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
      { type: 'column', name: 'Consumo (kWh)', data: energyData, yAxis: 0 },
      { type: 'line', name: 'Demanda (kW)', data: demandData, yAxis: 1 },
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
      title: { text: `Consumo y demanda — ${building?.name ?? 'Edificio'}` },
      yAxis: [
        { title: { text: 'Energía (kWh)' } },
        { title: { text: 'Potencia (kW)' }, opposite: true },
        ...(refEnergyRate != null
          ? [{ title: { text: 'Costo (CLP)' }, opposite: true, offset: 60 }]
          : []),
      ],
      series,
    };
  }, [portfolioSeries, refEnergyRate, building?.name]);

  if (!siteId) {
    return <p className="p-6 text-muted">Edificio no especificado.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header con breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-1 text-xs text-subtle">
            <Link to={APP_ROUTES.executive} className="hover:text-muted">Dashboard Ejecutivo</Link>
            <span className="mx-1">/</span>
            <span className="text-muted">{building?.name ?? '...'}</span>
          </nav>
          <PageHeader title={building?.name ?? 'Cargando...'} eyebrow="Dashboard" />
          {building?.address && (
            <p className="mt-0.5 text-sm text-muted">{building.address}</p>
          )}
        </div>
        <div className="flex gap-1 panel p-1">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setPreset(p); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                preset === p
                  ? 'bg-brand/15 text-brand'
                  : 'text-muted hover:bg-surface'
              }`}
            >
              {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards fila 1 */}
      {metersQuery.isPending || latestQuery.isPending ? (
        <div className="animate-pulse grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-background p-4 shadow-sm ring-1 ring-border">
              <div className="h-3 w-20 rounded bg-raised" />
              <div className="mt-2 h-6 w-24 rounded bg-raised" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard title="Medidores" value={String(meters.length)} />
          <KpiCard title="Potencia actual" value={`${totalPowerKw.toFixed(1)} kW`} />
          <KpiCard title="Demanda peak" value={`${peakDemandKw.toFixed(1)} kW`} />
          <KpiCard
            title="Factor de potencia"
            value={avgPf > 0 ? avgPf.toFixed(3) : '—'}
          />
          <KpiCard
            title="Área"
            value={building?.areaSqm ? `${Number(building.areaSqm).toLocaleString('es-CL')} m²` : '—'}
          />
        </div>
      )}

      {/* KPI cards fila 2 */}
      {aggQuery.isPending ? (
        <div className="animate-pulse grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-background p-4 shadow-sm ring-1 ring-border">
              <div className="h-3 w-28 rounded bg-raised" />
              <div className="mt-2 h-6 w-32 rounded bg-raised" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      )}

      {/* Chart tendencias */}
      {aggQuery.isPending ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-40 rounded bg-raised" />
          <div className="h-64 w-full rounded bg-raised" />
        </div>
      ) : portfolioSeries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Consumo, demanda y costo</h2>
          <StockChart options={chartOptions} loading={aggQuery.isFetching} />
        </div>
      )}

      {/* Tabla medidores del edificio */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">
          Medidores ({latestReadings.length} con última lectura)
        </h2>
        {latestQuery.isPending ? (
          <div className="animate-pulse panel">
            <div className="h-8 rounded-t bg-raised" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 border-t border-border px-4 py-2">
                <div className="h-4 w-32 rounded bg-raised" />
                <div className="ml-auto h-4 w-16 rounded bg-raised" />
                <div className="h-4 w-16 rounded bg-raised" />
                <div className="h-4 w-16 rounded bg-raised" />
                <div className="h-4 w-12 rounded bg-raised" />
              </div>
            ))}
          </div>
        ) : (
        <DataWidget
          phase={latestQuery.isPending ? 'loading' : latestQuery.isError ? 'error' : 'ready'}
          error={latestQuery.error}
          onRetry={() => { latestQuery.refetch(); }}
          emptyTitle="Sin lecturas"
          emptyDescription="No hay lecturas recientes para los medidores de este edificio."
        >
          <div className="max-h-[70vh] overflow-auto panel">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface text-left text-xs font-medium uppercase text-muted">
                <tr>
                  <th className="px-4 py-2">Medidor</th>
                  <th className="px-4 py-2 text-right">Potencia (kW)</th>
                  <th className="px-4 py-2 text-right">Voltaje L1 (V)</th>
                  <th className="px-4 py-2 text-right">Corriente L1 (A)</th>
                  <th className="px-4 py-2 text-right">FP</th>
                  <th className="px-4 py-2 text-right">Energía total (kWh)</th>
                  <th className="px-4 py-2">Última lectura</th>
                </tr>
              </thead>
              <TableStateBody
                phase={latestQs.phase}
                colSpan={7}
                error={latestQs.error}
                onRetry={() => { latestQuery.refetch(); }}
                emptyMessage="Sin lecturas recientes."
                skeletonWidths={['w-28', 'w-20', 'w-20', 'w-20', 'w-16', 'w-24', 'w-28']}
              >
                {latestReadings.map((r) => (
                  <tr key={r.meter_id}>
                    <td className="px-4 py-2 font-medium text-foreground">{r.meter_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(r.power_kw)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(r.voltage_l1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(r.current_l1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(r.power_factor, 3)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(r.energy_kwh_total, 0)}</td>
                    <td className="px-4 py-2 text-xs text-muted">
                      {new Date(r.timestamp).toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </TableStateBody>
            </table>
          </div>
        </DataWidget>
        )}
      </div>

      {/* Alertas críticas */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Alertas críticas</h2>
          <ul className="divide-y divide-border panel">
            {criticalAlerts.slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-2 px-4 py-2 text-sm">
                <span className="text-foreground">{a.message}</span>
                <span className="shrink-0 text-xs text-subtle">
                  {new Date(a.createdAt).toLocaleString('es-CL')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value }: Readonly<{ title: string; value: string }>): ReactElement {
  return (
    <div className="rounded-lg bg-background p-4 shadow-sm ring-1 ring-border">
      <p className="text-xs font-medium text-muted">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function fmt(val: string | null, decimals = 1): string {
  if (val == null) return '—';
  const n = Number(val);
  return Number.isNaN(n) ? '—' : n.toLocaleString('es-CL', { maximumFractionDigits: decimals });
}
