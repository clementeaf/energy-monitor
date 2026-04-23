import { useState, useMemo } from 'react';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../hooks/queries/useAlertsQuery';
import { DataWidget } from '../../components/ui/DataWidget';
import { StockChart } from '../../components/charts/StockChart';
import { useQueryState } from '../../hooks/useQueryState';
import type { ReadingResolution } from '../../types/reading';

type RangePreset = 'day' | 'week' | 'month';
type ChartView = 'power' | 'pf';

const RANGE_PRESETS: { key: RangePreset; label: string; days: number; resolution: ReadingResolution }[] = [
  { key: 'day', label: 'Día', days: 1, resolution: 'raw' },
  { key: 'week', label: 'Semana', days: 7, resolution: '1h' },
  { key: 'month', label: 'Mes', days: 30, resolution: '1d' },
];

const CHART_VIEWS: { key: ChartView; label: string }[] = [
  { key: 'power', label: 'Potencia' },
  { key: 'pf', label: 'Factor Potencia' },
];

export function DashboardPage() {
  const [preset, setPreset] = useState<RangePreset>('week');
  const [chartView, setChartView] = useState<ChartView>('power');
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);

  const rangeConfig = RANGE_PRESETS.find((r) => r.key === preset)!;
  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - rangeConfig.days);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [rangeConfig.days]);

  const buildingsQuery = useBuildingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const buildings = buildingsQuery.data ?? [];
  const firstBuildingId = buildings[0]?.id ?? '';

  // Fast path: meters list from `meters` table (no DISTINCT ON readings)
  const metersQuery = useMetersQuery(firstBuildingId || undefined);
  const meters = metersQuery.data ?? [];

  // KPIs: latest readings (heavier, runs in parallel — doesn't block chart)
  const allLatestQuery = useLatestReadingsQuery();

  const buildingsQs = useQueryState(buildingsQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const allLatestReadings = allLatestQuery.data ?? [];
  const activeAlerts = alertsQuery.data ?? [];

  const totalMeters = allLatestReadings.length;
  const totalPowerKw = allLatestReadings.reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
  const avgPowerFactor = allLatestReadings.length > 0
    ? allLatestReadings.reduce((sum, r) => sum + Number(r.power_factor || 0), 0) / allLatestReadings.length
    : 0;

  // Chart meter: from meters table (fast) — no waterfall through latest readings
  const chartMeterId = selectedMeterId ?? meters[0]?.id ?? null;

  const readingsQuery = useReadingsQuery(
    { meterId: chartMeterId ?? '', from, to, resolution: rangeConfig.resolution },
    !!chartMeterId,
  );

  const chartOptions = useMemo(() => {
    const readings = readingsQuery.data ?? [];
    const base = {
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
    };

    if (chartView === 'power') {
      return {
        ...base,
        title: { text: 'Potencia' },
        yAxis: [{ title: { text: 'Potencia (kW)' } }],
        series: [{
          type: 'area' as const,
          name: 'Potencia (kW)',
          data: readings.map((r) => [new Date(r.timestamp).getTime(), Number(r.power_kw)]),
        }],
      };
    }

    return {
      ...base,
      title: { text: 'Factor de potencia' },
      yAxis: [{ title: { text: 'Factor Potencia' }, min: 0, max: 1 }],
      series: [{
        type: 'line' as const,
        name: 'Factor Potencia',
        data: readings.map((r) => [new Date(r.timestamp).getTime(), r.power_factor ? Number(r.power_factor) : null]),
      }],
    };
  }, [readingsQuery.data, chartView]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-lg font-semibold text-pa-text">Dashboard</h1>
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

      {/* 2-column layout: KPIs+Chart | Alerts+Buildings */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Column 1: KPIs + Chart */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* KPI row */}
          <div className="flex flex-wrap gap-3">
            <KpiCard title="Edificios" value={String(buildings.length)} />
            <KpiCard title="Medidores" value={String(totalMeters)} />
            <KpiCard title="Potencia total" value={`${totalPowerKw.toFixed(1)} kW`} />
            <KpiCard title="FP promedio" value={avgPowerFactor > 0 ? avgPowerFactor.toFixed(3) : '—'} />
          </div>

          {/* Chart */}
          <div className="rounded-lg border border-pa-border bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-medium text-pa-text">{chartOptions.title.text}</h2>
                {meters.length > 0 ? (
                  <select
                    value={chartMeterId ?? ''}
                    onChange={(e) => setSelectedMeterId(e.target.value || null)}
                    className="rounded-lg border border-pa-border px-2 py-1 text-[11px] text-pa-text-muted"
                  >
                    {meters.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="h-6 w-32 animate-pulse rounded-lg bg-gray-200" />
                )}
              </div>
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
            {meters.length > 0 ? (
              <StockChart options={chartOptions} loading={readingsQuery.isFetching} />
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </div>

        {/* Column 2: Alerts + Buildings stacked */}
        <div className="flex w-full flex-col gap-4 lg:w-80">
          {/* Alerts */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-pa-text">
              Alertas activas
              {activeAlerts.length > 0 && (
                <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-pa-coral text-[10px] font-bold text-white">
                  {activeAlerts.length}
                </span>
              )}
            </h2>
            <DataWidget
              phase={alertsQuery.isPending ? 'loading' : alertsQuery.isError ? 'error' : activeAlerts.length === 0 ? 'empty' : 'ready'}
              error={alertsQuery.error}
              onRetry={() => { alertsQuery.refetch(); }}
              emptyTitle="Sin alertas"
              emptyDescription="No hay alertas activas."
            >
              <ul className="max-h-48 divide-y divide-pa-border overflow-y-auto rounded-lg border border-pa-border bg-white">
                {activeAlerts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-3 py-2 text-[13px]">
                    <div className="flex items-center gap-2">
                      <SeverityDot severity={a.severity} />
                      <span className="text-pa-text">{a.message}</span>
                    </div>
                    <span className="shrink-0 text-[11px] text-pa-text-muted">
                      {new Date(a.createdAt).toLocaleDateString('es-CL')}
                    </span>
                  </li>
                ))}
              </ul>
            </DataWidget>
          </div>

          {/* Buildings */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-pa-text">Edificios</h2>
            <DataWidget
              phase={buildingsQs.phase}
              error={buildingsQs.error}
              onRetry={() => { buildingsQuery.refetch(); }}
              emptyTitle="Sin edificios"
              emptyDescription="No hay edificios registrados."
            >
              <ul className="max-h-52 divide-y divide-pa-border overflow-y-auto rounded-lg border border-pa-border bg-white">
                {buildings.map((b) => {
                  const buildingReadings = allLatestReadings.filter((r) => r.building_id === b.id);
                  const power = buildingReadings.reduce((s, r) => s + Number(r.power_kw || 0), 0);
                  return (
                    <li key={b.id} className="flex items-center justify-between px-3 py-2 text-[13px]">
                      <span className="font-medium text-pa-text">{b.name}</span>
                      <div className="text-right">
                        <span className="text-pa-text">{power.toFixed(1)} kW</span>
                        <span className="ml-2 text-[11px] text-pa-text-muted">{buildingReadings.length} med.</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </DataWidget>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: Readonly<{ title: string; value: string }>) {
  return (
    <div className="flex-1 basis-32 rounded-lg border border-pa-border bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium text-pa-text-muted">{title}</p>
      <p className="mt-0.5 text-base font-semibold text-pa-text">{value}</p>
    </div>
  );
}

function SeverityDot({ severity }: Readonly<{ severity: string }>) {
  const colors: Record<string, string> = {
    critical: 'bg-pa-coral',
    high: 'bg-pa-amber',
    medium: 'bg-yellow-500',
    low: 'bg-pa-blue',
  };
  return <span className={`inline-block size-2 rounded-full ${colors[severity] ?? 'bg-subtle'}`} />;
}

function ChartSkeleton() {
  return (
    <div className="relative h-[380px] overflow-hidden rounded bg-[#fafbfc]">
      {/* Shimmer sweep */}
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
        }}
      />

      {/* Y-axis area */}
      <div className="absolute bottom-8 left-0 top-2 flex w-12 flex-col justify-between py-1">
        {['120', '90', '60', '30', '0'].map((v) => (
          <span key={v} className="text-right text-[10px] text-gray-300">{v}</span>
        ))}
      </div>

      {/* Chart area */}
      <div className="absolute bottom-8 left-12 right-2 top-2">
        {/* Horizontal grid */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <div
            key={pct}
            className="absolute left-0 right-0 border-t border-gray-100"
            style={{ top: `${pct}%` }}
          />
        ))}

        {/* Candlestick-style bars */}
        <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 200 100">
          {/* Area fill under the line */}
          <defs>
            <linearGradient id="skel-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M0,68 C8,65 12,58 20,55 C28,52 32,60 40,54 C48,48 52,42 60,38 C68,34 72,40 80,36 C88,32 92,28 100,30 C108,32 112,26 120,24 C128,22 132,30 140,28 C148,26 152,20 160,22 C168,24 172,18 180,20 C188,22 192,28 200,26 L200,100 L0,100 Z"
            fill="url(#skel-grad)"
          />
          {/* Main line */}
          <path
            d="M0,68 C8,65 12,58 20,55 C28,52 32,60 40,54 C48,48 52,42 60,38 C68,34 72,40 80,36 C88,32 92,28 100,30 C108,32 112,26 120,24 C128,22 132,30 140,28 C148,26 152,20 160,22 C168,24 172,18 180,20 C188,22 192,28 200,26"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1.2"
          />
          {/* Volume bars at bottom */}
          {[4,12,20,28,36,44,52,60,68,76,84,92,100,108,116,124,132,140,148,156,164,172,180,188,196].map((x, i) => (
            <rect
              key={i}
              x={x - 2}
              width="4"
              y={100 - [8,12,6,14,10,18,8,15,11,7,16,9,13,10,17,8,12,14,6,11,15,9,13,7,10][i]}
              height={[8,12,6,14,10,18,8,15,11,7,16,9,13,10,17,8,12,14,6,11,15,9,13,7,10][i]}
              rx="1"
              fill="#e5e7eb"
              opacity="0.6"
            />
          ))}
        </svg>

        {/* Crosshair hint (vertical dashed line) */}
        <div className="absolute bottom-0 top-0 left-[62%] w-px border-l border-dashed border-gray-200" />
        <div className="absolute top-[36%] left-[62%] -translate-x-1/2 -translate-y-1/2">
          <div className="size-2 rounded-full border border-gray-300 bg-white" />
        </div>
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-12 right-2 flex justify-between px-1">
        {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((t) => (
          <span key={t} className="text-[10px] text-gray-300">{t}</span>
        ))}
      </div>
    </div>
  );
}
