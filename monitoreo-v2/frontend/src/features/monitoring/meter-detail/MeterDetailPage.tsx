import { useState, useMemo } from 'react';
import type Highcharts from 'highcharts';
import { useParams, useNavigate, Link } from 'react-router';
import { Card } from '../../../components/ui/Card';
import { MonthlyChart } from '../../../components/charts/MonthlyChart';
import { StockChart } from '../../../components/charts/StockChart';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import { useMeterQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useIotLatestQuery, useIotAlertsQuery, useIotTimeSeriesQuery } from '../../../hooks/queries/useIotReadingsQuery';
import { fmtNum, MONTH_NAMES_SHORT } from '../../../lib/formatters';

/* ── Metric definitions ── */

interface MetricMeta {
  label: string;
  unit: string;
  field: 'energy_delta_kwh' | 'avg_power_kw' | 'max_power_kw' | 'avg_power_factor' | 'avg_voltage_l1';
  decimals: number;
}

const METRICS: MetricMeta[] = [
  { label: 'Consumo', unit: 'kWh', field: 'energy_delta_kwh', decimals: 1 },
  { label: 'Potencia prom.', unit: 'kW', field: 'avg_power_kw', decimals: 2 },
  { label: 'Potencia peak', unit: 'kW', field: 'max_power_kw', decimals: 2 },
  { label: 'Factor potencia', unit: '', field: 'avg_power_factor', decimals: 3 },
  { label: 'Voltaje prom.', unit: 'V', field: 'avg_voltage_l1', decimals: 1 },
];

/* ── Date range: last 12 months ── */

function getLast12MonthsRange() {
  const now = new Date();
  const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

/* ── Component ── */

export function MeterDetailPage() {
  const { meterId } = useParams<{ meterId: string }>();
  const navigate = useNavigate();
  const [selectedMetric, setSelectedMetric] = useState(0);

  const { from, to } = useMemo(getLast12MonthsRange, []);
  const meterQuery = useMeterQuery(meterId!);
  const buildingsQuery = useBuildingsQuery();
  const aggQuery = useAggregatedReadingsQuery(
    { meterId: meterId!, from, to, interval: 'monthly' },
    !!meterId,
  );
  const alertsQuery = useAlertsQuery({ meterId: meterId! });

  const meter = meterQuery.data;
  const isIot = meter?.metadata?.source === 'iot';
  const building = buildingsQuery.data?.find((b) => b.id === meter?.buildingId);
  const rows = aggQuery.data ?? [];
  const alertCount = alertsQuery.data?.length ?? 0;
  const iotLatest = useIotLatestQuery(meterId, isIot);
  const iotAlerts = useIotAlertsQuery(meterId, isIot);

  // IoT time series — last 7 days, main variables
  const iotTsRange = useMemo(() => {
    const to = new Date();
    const fr = new Date(to.getTime() - 7 * 24 * 3600_000);
    return { from: fr.toISOString(), to: to.toISOString() };
  }, []);
  const iotTs = useIotTimeSeriesQuery(
    { meterId: meterId!, from: iotTsRange.from, to: iotTsRange.to, variables: 'active_power_w,voltage_l1,current_l1,power_factor', resolution: 'hour' },
    isIot,
  );

  const meta = METRICS[selectedMetric];
  const isLoading = meterQuery.isPending || (isIot ? iotLatest.isPending : aggQuery.isPending);

  const aggQs = useQueryState(aggQuery, { isEmpty: (d) => !d || d.length === 0 });

  // Chart data
  const chartData = useMemo(() =>
    rows.map((r) => {
      const d = new Date(r.bucket);
      const label = `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      const raw = r[meta.field];
      return { label, value: raw != null ? parseFloat(raw) : null };
    }),
    [rows, meta.field],
  );

  // Summary row
  const summary = useMemo(() => {
    const vals = rows.map((r) => r[meta.field]).filter((v): v is string => v != null).map(parseFloat);
    if (vals.length === 0) return null;
    const total = vals.reduce((s, v) => s + v, 0);
    const avg = total / vals.length;
    const max = Math.max(...vals);
    return { total, avg, max };
  }, [rows, meta.field]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto">
      {/* Breadcrumb */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => navigate(building ? `/meters?buildingId=${building.id}` : '/meters')}
          className="rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:bg-surface"
        >
          &larr; Volver
        </button>
        <Link to="/buildings" className="text-[13px] text-muted hover:text-brand">Edificios</Link>
        <span className="text-[11px] text-subtle">/</span>
        {building && (
          <>
            <Link to={`/meters?buildingId=${building.id}`} className="text-[13px] text-muted hover:text-brand">
              {building.name}
            </Link>
            <span className="text-[11px] text-subtle">/</span>
          </>
        )}
        <span className="text-[13px] font-semibold text-foreground">
          {meter?.name ?? '—'} <span className="font-normal text-muted">({meter?.code ?? meterId})</span>
        </span>
        {(isIot ? (iotAlerts.data?.length ?? 0) : alertCount) > 0 && (
          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
            {isIot ? iotAlerts.data?.length : alertCount} alerta{(isIot ? (iotAlerts.data?.length ?? 0) : alertCount) > 1 ? 's' : ''}
          </span>
        )}
        {isIot && (
          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            IoT
          </span>
        )}
      </div>

      {/* Metric selector pills */}
      <div className="flex shrink-0 flex-wrap gap-1 px-1">
        {METRICS.map((m, i) => (
          <button
            key={m.field}
            type="button"
            onClick={() => setSelectedMetric(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              i === selectedMetric
                ? 'rounded-full bg-brand text-brand-fg shadow-sm'
                : 'border border-border text-muted hover:bg-surface'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* IoT live readings */}
      {isIot && iotLatest.data && iotLatest.data.length > 0 && (
        <Card className="shrink-0">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Lectura en vivo (IoT)</h2>
          <div className="flex flex-wrap gap-2">
            {iotLatest.data.map((r) => (
              <div key={r.variable_name} className="min-w-[100px] flex-1 rounded border border-border px-2 py-1.5">
                <div className="truncate text-[10px] font-medium uppercase text-muted">{formatVarName(r.variable_name)}</div>
                <div className="text-sm font-semibold text-foreground">{fmtNum(r.value, 2)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Chart */}
      {isIot ? (
        <IotChart data={iotTs.data} loading={iotTs.isPending} />
      ) : (
        chartData.length > 0 && (
          <Card className="shrink-0">
            <MonthlyChart
              data={chartData}
              seriesName={meta.label}
              unit={meta.unit}
              modes={['column', 'line', 'area']}
            />
          </Card>
        )
      )}

      {/* Monthly table */}
      <Card className="flex min-h-0 flex-1 flex-col" noPadding>
        <div className="px-6 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-foreground">Detalle mensual</h2>
        </div>
        <DataWidget
          phase={aggQs.phase === 'loading' ? 'ready' : aggQs.phase}
          error={aggQs.error}
          onRetry={() => { void aggQuery.refetch(); }}
          emptyTitle="Sin datos"
          emptyDescription="No hay lecturas mensuales para este medidor."
        >
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <table className="min-w-full divide-y divide-border">
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                <Th>Mes</Th>
                <Th>Consumo (kWh)</Th>
                <Th>Pot. prom. (kW)</Th>
                <Th>Pot. peak (kW)</Th>
                <Th>FP</Th>
                <Th>Voltaje (V)</Th>
                <Th>Lecturas</Th>
                <Th></Th>
              </tr>
            </thead>
            <TableStateBody
              phase={isLoading ? 'loading' : rows.length === 0 ? 'empty' : 'ready'}
              colSpan={8}
              emptyMessage="Sin datos de lecturas para este medidor."
              skeletonWidths={['w-16', 'w-20', 'w-20', 'w-20', 'w-16', 'w-20', 'w-16', 'w-12']}
            >
              {rows.map((r) => {
                const d = new Date(r.bucket);
                const monthKey = r.bucket.slice(0, 7); // YYYY-MM
                const label = `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
                return (
                  <tr key={r.bucket} className="hover:bg-surface">
                    <Td className="font-medium text-foreground">{label}</Td>
                    <Td>{fmtNum(r.energy_delta_kwh)}</Td>
                    <Td>{fmtNum(r.avg_power_kw, 2)}</Td>
                    <Td>{fmtNum(r.max_power_kw, 2)}</Td>
                    <Td>{fmtNum(r.avg_power_factor, 3)}</Td>
                    <Td>{fmtNum(r.avg_voltage_l1)}</Td>
                    <Td>{r.reading_count}</Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => navigate(`/monitoring/meter/${meterId}/readings/${monthKey}`)}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Ver &rarr;
                      </button>
                    </Td>
                  </tr>
                );
              })}
              {/* Summary footer */}
              {summary && rows.length > 0 && (
                <tr className="border-t-2 border-border bg-surface font-semibold">
                  <Td className="text-foreground">Total / Prom.</Td>
                  <Td>{fmtNum(rows.reduce((s, r) => s + parseFloat(r.energy_delta_kwh ?? '0'), 0))}</Td>
                  <Td>{fmtNum(summary.avg, 2)}</Td>
                  <Td>{fmtNum(summary.max, 2)}</Td>
                  <Td>
                    {fmtNum(
                      rows.map((r) => r.avg_power_factor).filter((v): v is string => v != null).map(parseFloat).reduce((s, v, _, a) => s + v / a.length, 0),
                      3,
                    )}
                  </Td>
                  <Td>
                    {fmtNum(
                      rows.map((r) => r.avg_voltage_l1).filter((v): v is string => v != null).map(parseFloat).reduce((s, v, _, a) => s + v / a.length, 0),
                    )}
                  </Td>
                  <Td>{rows.reduce((s, r) => s + parseInt(r.reading_count, 10), 0)}</Td>
                  <Td></Td>
                </tr>
              )}
            </TableStateBody>
          </table>
        </div>
        </DataWidget>
      </Card>
    </div>
  );
}

/* ── IoT time-series chart ── */

const IOT_SERIES_CONFIG: Record<string, { label: string; unit: string; yAxis: number; color: string }> = {
  active_power_w: { label: 'Potencia (W)', unit: 'W', yAxis: 0, color: '#3D3BF3' },
  voltage_l1: { label: 'Voltaje L1 (V)', unit: 'V', yAxis: 1, color: '#10B981' },
  current_l1: { label: 'Corriente L1 (A)', unit: 'A', yAxis: 2, color: '#F59E0B' },
  power_factor: { label: 'Factor Potencia', unit: '', yAxis: 3, color: '#EF4444' },
};

interface IotTimeSeriesPoint { time: string; variable_name: string; value: number }

function IotChart({ data, loading }: Readonly<{ data?: IotTimeSeriesPoint[]; loading: boolean }>) {
  const options = useMemo<Highcharts.Options>(() => {
    const seriesMap = new Map<string, [number, number][]>();
    for (const p of data ?? []) {
      if (!IOT_SERIES_CONFIG[p.variable_name]) continue;
      let arr = seriesMap.get(p.variable_name);
      if (!arr) { arr = []; seriesMap.set(p.variable_name, arr); }
      arr.push([new Date(p.time).getTime(), p.value]);
    }

    const series: Highcharts.SeriesOptionsType[] = [];
    const yAxes: Highcharts.YAxisOptions[] = [];
    let axisIdx = 0;

    for (const [varName, points] of seriesMap) {
      const cfg = IOT_SERIES_CONFIG[varName];
      yAxes.push({
        title: { text: cfg.label, style: { color: cfg.color, fontSize: '11px' } },
        labels: { style: { color: cfg.color, fontSize: '10px' } },
        opposite: axisIdx % 2 === 1,
        visible: axisIdx < 2, // ponytail: show only first 2 axes, rest hidden to avoid clutter
      });
      series.push({
        type: 'line',
        name: cfg.label,
        data: points.sort((a, b) => a[0] - b[0]),
        yAxis: axisIdx,
        color: cfg.color,
        tooltip: { valueSuffix: cfg.unit ? ` ${cfg.unit}` : undefined },
      });
      axisIdx++;
    }

    return {
      chart: { height: 350, backgroundColor: 'transparent' },
      title: { text: undefined },
      xAxis: { type: 'datetime' },
      yAxis: yAxes.length > 0 ? yAxes : [{ title: { text: '' } }],
      series,
      legend: { enabled: true },
      credits: { enabled: false },
      rangeSelector: { selected: 1, buttons: [
        { type: 'day', count: 1, text: '1d' },
        { type: 'day', count: 3, text: '3d' },
        { type: 'all', text: '7d' },
      ]},
    };
  }, [data]);

  if (loading) {
    return <Card className="shrink-0"><div className="h-[350px] animate-pulse rounded bg-surface" /></Card>;
  }
  if (!data || data.length === 0) {
    return <Card className="shrink-0"><p className="py-8 text-center text-sm text-muted">Sin datos IoT para graficar</p></Card>;
  }

  return (
    <Card className="shrink-0">
      <h2 className="mb-2 text-sm font-semibold text-foreground">Tendencia IoT (7 días)</h2>
      <StockChart options={options} />
    </Card>
  );
}

const VAR_LABELS: Record<string, string> = {
  voltage_l1: 'Voltaje L1 (V)',
  voltage_l2: 'Voltaje L2 (V)',
  voltage_l3: 'Voltaje L3 (V)',
  current_l1: 'Corriente L1 (A)',
  current_l2: 'Corriente L2 (A)',
  current_l3: 'Corriente L3 (A)',
  active_power_w: 'Pot. Activa (W)',
  reactive_power_var: 'Pot. Reactiva (var)',
  apparent_power_va: 'Pot. Aparente (VA)',
  power_factor: 'Factor Potencia',
  frequency_hz: 'Frecuencia (Hz)',
};

function formatVarName(name: string): string {
  return VAR_LABELS[name] ?? name.replace(/_/g, ' ');
}

function Th({ children }: Readonly<{ children?: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children?: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}
