import { useState, useMemo } from 'react';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery, useReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../hooks/queries/useAlertsQuery';
import { DataWidget } from '../../components/ui/DataWidget';
import { StockChart } from '../../components/charts/StockChart';
import { useQueryState } from '../../hooks/useQueryState';
import type { ReadingResolution } from '../../types/reading';

const pickResolution = (rangeMs: number): ReadingResolution => {
  if (rangeMs <= 86_400_000) return 'raw';        // <= 1d
  if (rangeMs <= 604_800_000) return '15min';      // <= 7d
  if (rangeMs <= 2_592_000_000) return '1h';       // <= 30d
  return '1d';
};

export function DashboardPage() {
  const buildingsQuery = useBuildingsQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const buildingsQs = useQueryState(buildingsQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const buildings = buildingsQuery.data ?? [];
  const latestReadings = latestQuery.data ?? [];
  const activeAlerts = alertsQuery.data ?? [];

  const totalMeters = latestReadings.length;
  const totalPowerKw = latestReadings.reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
  const avgPowerFactor = latestReadings.length > 0
    ? latestReadings.reduce((sum, r) => sum + Number(r.power_factor || 0), 0) / latestReadings.length
    : 0;

  // StockChart — first meter from latest readings as default
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);
  const chartMeterId = selectedMeterId ?? latestReadings[0]?.meter_id ?? null;

  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, [now]);

  const [chartRange, setChartRange] = useState({ from: defaultFrom, to: now.toISOString(), resolution: '1h' as ReadingResolution });

  const readingsQuery = useReadingsQuery(
    { meterId: chartMeterId ?? '', from: chartRange.from, to: chartRange.to, resolution: chartRange.resolution },
    !!chartMeterId,
  );

  const chartOptions = useMemo(() => {
    const readings = readingsQuery.data ?? [];
    const powerData = readings.map((r) => [new Date(r.timestamp).getTime(), Number(r.power_kw)]);
    const pfData = readings.map((r) => [new Date(r.timestamp).getTime(), r.power_factor ? Number(r.power_factor) : null]);

    const selectedName = latestReadings.find((r) => r.meter_id === chartMeterId)?.meter_name ?? 'Medidor';

    return {
      title: { text: selectedName },
      yAxis: [
        { title: { text: 'Potencia (kW)' }, opposite: false },
        { title: { text: 'Factor Potencia' }, opposite: true, min: 0, max: 1 },
      ],
      series: [
        { type: 'area' as const, name: 'Potencia (kW)', data: powerData, yAxis: 0 },
        { type: 'line' as const, name: 'Factor Potencia', data: pfData, yAxis: 1, dashStyle: 'ShortDash' as const },
      ],
    };
  }, [readingsQuery.data, chartMeterId, latestReadings]);

  const handleRangeChange = (min: number, max: number) => {
    const rangeMs = max - min;
    setChartRange({
      from: new Date(min).toISOString(),
      to: new Date(max).toISOString(),
      resolution: pickResolution(rangeMs),
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Edificios" value={String(buildings.length)} />
        <Card title="Medidores activos" value={String(totalMeters)} />
        <Card title="Potencia total" value={`${totalPowerKw.toFixed(1)} kW`} />
        <Card title="FP promedio" value={avgPowerFactor > 0 ? avgPowerFactor.toFixed(3) : '—'} />
      </div>

      {latestReadings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-700">Potencia en tiempo</h2>
            <select
              value={chartMeterId ?? ''}
              onChange={(e) => { setSelectedMeterId(e.target.value || null); }}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            >
              {latestReadings.map((r) => (
                <option key={r.meter_id} value={r.meter_id}>{r.meter_name}</option>
              ))}
            </select>
          </div>
          <StockChart
            options={chartOptions}
            loading={readingsQuery.isFetching}
            onRangeChange={handleRangeChange}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700">Alertas activas</h2>
          <DataWidget
            phase={alertsQuery.isPending ? 'loading' : alertsQuery.isError ? 'error' : activeAlerts.length === 0 ? 'empty' : 'ready'}
            error={alertsQuery.error}
            onRetry={() => { void alertsQuery.refetch(); }}
            emptyTitle="Sin alertas"
            emptyDescription="No hay alertas activas."
          >
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {activeAlerts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <SeverityDot severity={a.severity} />
                    <span className="ml-2 text-gray-900">{a.message}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString('es-CL')}</span>
                </li>
              ))}
            </ul>
          </DataWidget>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700">Edificios</h2>
          <DataWidget
            phase={buildingsQs.phase}
            error={buildingsQs.error}
            onRetry={() => { void buildingsQuery.refetch(); }}
            emptyTitle="Sin edificios"
            emptyDescription="No hay edificios registrados."
          >
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {buildings.map((b) => {
                const buildingReadings = latestReadings.filter((r) => r.building_id === b.id);
                const power = buildingReadings.reduce((s, r) => s + Number(r.power_kw || 0), 0);
                return (
                  <li key={b.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="font-medium text-gray-900">{b.name}</span>
                    <div className="text-right">
                      <span className="text-gray-700">{power.toFixed(1)} kW</span>
                      <span className="ml-2 text-xs text-gray-400">{buildingReadings.length} medidores</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </DataWidget>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: Readonly<{ title: string; value: string }>) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function SeverityDot({ severity }: Readonly<{ severity: string }>) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };
  return <span className={`inline-block size-2 rounded-full ${colors[severity] ?? 'bg-gray-400'}`} />;
}
