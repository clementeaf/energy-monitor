import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import Highcharts from 'highcharts';
import HighchartsStock from 'highcharts/highstock';
import { HighchartsReact } from 'highcharts-react-official';
import { Card } from '../../../components/ui/Card';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useMeterQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { baseChartOptions } from '../../../lib/chart-config';
import { fmtNum, MONTH_NAMES_FULL } from '../../../lib/formatters';
import type { Reading } from '../../../types/reading';

/* ── Metric definitions ── */

type ReadingField = keyof Omit<Reading, 'id' | 'meter_id' | 'timestamp'>;

interface MetricMeta { label: string; unit: string }

const READING_METRICS: Record<ReadingField, MetricMeta> = {
  voltage_l1:          { label: 'Voltaje L1', unit: 'V' },
  voltage_l2:          { label: 'Voltaje L2', unit: 'V' },
  voltage_l3:          { label: 'Voltaje L3', unit: 'V' },
  current_l1:          { label: 'Corriente L1', unit: 'A' },
  current_l2:          { label: 'Corriente L2', unit: 'A' },
  current_l3:          { label: 'Corriente L3', unit: 'A' },
  power_kw:            { label: 'Potencia Activa', unit: 'kW' },
  reactive_power_kvar: { label: 'Potencia Reactiva', unit: 'kVAr' },
  power_factor:        { label: 'Factor de Potencia', unit: '' },
  frequency_hz:        { label: 'Frecuencia', unit: 'Hz' },
  energy_kwh_total:    { label: 'Energia Acumulada', unit: 'kWh' },
  thd_voltage_pct:     { label: 'THD Voltaje', unit: '%' },
  thd_current_pct:     { label: 'THD Corriente', unit: '%' },
  phase_imbalance_pct: { label: 'Desbalance de Fase', unit: '%' },
};

type CompositeKey = 'voltage' | 'current';
type SelectorKey = ReadingField | CompositeKey;

const COMPOSITES: Record<CompositeKey, { label: string; unit: string; keys: [ReadingField, ReadingField, ReadingField] }> = {
  voltage: { label: 'Voltaje', unit: 'V', keys: ['voltage_l1', 'voltage_l2', 'voltage_l3'] },
  current: { label: 'Corriente', unit: 'A', keys: ['current_l1', 'current_l2', 'current_l3'] },
};

const SELECTOR_ITEMS: { key: SelectorKey; label: string }[] = [
  { key: 'power_kw', label: 'Potencia Activa' },
  { key: 'voltage', label: 'Voltaje' },
  { key: 'current', label: 'Corriente' },
  { key: 'reactive_power_kvar', label: 'Potencia Reactiva' },
  { key: 'power_factor', label: 'Factor de Potencia' },
  { key: 'frequency_hz', label: 'Frecuencia' },
  { key: 'energy_kwh_total', label: 'Energia Acumulada' },
];

const PHASE_COLORS = ['#374151', '#2563eb', '#f59e0b'] as const;
const PHASE_LABELS = ['L1', 'L2', 'L3'] as const;

function isComposite(k: SelectorKey): k is CompositeKey {
  return k === 'voltage' || k === 'current';
}

type ChartRes = 'daily' | '15min';

/* ── Helpers ── */

function parseVal(v: string | null): number | null {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function avgNonNull(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
}

function maxNonNull(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length > 0 ? Math.max(...nums) : null;
}

function groupByHour(readings: Reading[], field: ReadingField): [number, number | null][] {
  const groups = new Map<number, (number | null)[]>();
  for (const r of readings) {
    const d = new Date(r.timestamp);
    const hourTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
    const arr = groups.get(hourTs);
    const val = parseVal(r[field]);
    if (arr) arr.push(val); else groups.set(hourTs, [val]);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, vals]) => [ts, avgNonNull(vals)]);
}

interface DaySummary {
  day: string;
  label: string;
  count: number;
  alertCount: number;
  avgPowerKw: number | null;
  peakPowerKw: number | null;
  avgPowerFactor: number | null;
  avgVoltageL1: number | null;
  avgVoltageL2: number | null;
  avgVoltageL3: number | null;
  avgCurrentL1: number | null;
  avgCurrentL2: number | null;
  avgCurrentL3: number | null;
  avgReactivePowerKvar: number | null;
  avgFrequencyHz: number | null;
}

function groupByDay(readings: Reading[], alertTimestamps: string[]): DaySummary[] {
  const groups = new Map<string, Reading[]>();
  for (const r of readings) {
    const day = r.timestamp.slice(0, 10);
    const arr = groups.get(day);
    if (arr) arr.push(r); else groups.set(day, [r]);
  }
  const alertsByDay = new Map<string, number>();
  for (const ts of alertTimestamps) {
    const day = ts.slice(0, 10);
    alertsByDay.set(day, (alertsByDay.get(day) ?? 0) + 1);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, rows]) => ({
      day,
      label: day.slice(8, 10),
      count: rows.length,
      alertCount: alertsByDay.get(day) ?? 0,
      avgPowerKw: avgNonNull(rows.map((r) => parseVal(r.power_kw))),
      peakPowerKw: maxNonNull(rows.map((r) => parseVal(r.power_kw))),
      avgPowerFactor: avgNonNull(rows.map((r) => parseVal(r.power_factor))),
      avgVoltageL1: avgNonNull(rows.map((r) => parseVal(r.voltage_l1))),
      avgVoltageL2: avgNonNull(rows.map((r) => parseVal(r.voltage_l2))),
      avgVoltageL3: avgNonNull(rows.map((r) => parseVal(r.voltage_l3))),
      avgCurrentL1: avgNonNull(rows.map((r) => parseVal(r.current_l1))),
      avgCurrentL2: avgNonNull(rows.map((r) => parseVal(r.current_l2))),
      avgCurrentL3: avgNonNull(rows.map((r) => parseVal(r.current_l3))),
      avgReactivePowerKvar: avgNonNull(rows.map((r) => parseVal(r.reactive_power_kvar))),
      avgFrequencyHz: avgNonNull(rows.map((r) => parseVal(r.frequency_hz))),
    }));
}

/* ── Component ── */

export function MeterReadingsPage() {
  const { meterId, month } = useParams<{ meterId: string; month: string }>();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<SelectorKey>('power_kw');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [resolution, setResolution] = useState<ChartRes>('daily');
  const selectorRef = useRef<HTMLDivElement>(null);
  useClickOutside(selectorRef, () => setSelectorOpen(false), selectorOpen);

  // Parse month param (YYYY-MM)
  const { from, to, monthLabel } = useMemo(() => {
    const [y, m] = (month ?? '2026-01').split('-').map(Number);
    const fromDate = new Date(y, m - 1, 1);
    const toDate = new Date(y, m, 0);
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      monthLabel: `${MONTH_NAMES_FULL[m - 1]} ${y}`,
    };
  }, [month]);

  const meterQuery = useMeterQuery(meterId!);
  const buildingsQuery = useBuildingsQuery();
  const readingsQuery = useReadingsQuery({ meterId: meterId!, from, to }, !!meterId);
  const alertsQuery = useAlertsQuery({ meterId: meterId! });

  const meter = meterQuery.data;
  const building = buildingsQuery.data?.find((b) => b.id === meter?.buildingId);
  const readings = readingsQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const alertTimestamps = alerts.map((a) => a.createdAt);
  const isLoading = readingsQuery.isPending;

  const singleField: ReadingField | null = isComposite(metric) ? null : metric;

  // Hourly data for daily chart
  const hourlyData = useMemo(
    () => singleField ? groupByHour(readings, singleField) : [],
    [readings, singleField],
  );

  // Raw data for stock chart
  const rawData = useMemo(
    () => singleField ? readings.map((r): [number, number | null] => [new Date(r.timestamp).getTime(), parseVal(r[singleField])]) : [],
    [readings, singleField],
  );

  // Multi-series for composite metrics
  const compositeHourly = useMemo(() => {
    if (!isComposite(metric)) return null;
    return COMPOSITES[metric].keys.map((k) => groupByHour(readings, k));
  }, [readings, metric]);

  const compositeRaw = useMemo(() => {
    if (!isComposite(metric)) return null;
    return COMPOSITES[metric].keys.map((k) =>
      readings.map((r): [number, number | null] => [new Date(r.timestamp).getTime(), parseVal(r[k])]),
    );
  }, [readings, metric]);

  // Alert plotlines
  const alertPlotLines: Highcharts.XAxisPlotLinesOptions[] = useMemo(
    () => alerts.map((a) => ({
      value: new Date(a.createdAt).getTime(),
      color: '#ef4444',
      width: 2,
      zIndex: 5,
    })),
    [alerts],
  );

  const composite = isComposite(metric) ? COMPOSITES[metric] : null;
  const meta: MetricMeta = composite ?? READING_METRICS[metric as ReadingField];
  const multiSeries = !!composite;

  // Build chart options
  const base = baseChartOptions();

  const dailySeries: Highcharts.SeriesOptionsType[] = multiSeries
    ? PHASE_LABELS.map((phase, i) => ({ name: phase, type: 'line' as const, data: compositeHourly![i], color: PHASE_COLORS[i], marker: { enabled: false } }))
    : [{ name: meta.label, type: 'line' as const, data: hourlyData, color: base.colors?.[0] ?? '#3D3BF3', marker: { enabled: false } }];

  const stockSeries: Highcharts.SeriesOptionsType[] = multiSeries
    ? PHASE_LABELS.map((phase, i) => ({ name: phase, type: 'line' as const, data: compositeRaw![i], color: PHASE_COLORS[i], marker: { enabled: false } }))
    : [{ name: meta.label, type: 'line' as const, data: rawData, color: base.colors?.[0] ?? '#3D3BF3', marker: { enabled: false } }];

  const dailyChartOptions: Highcharts.Options = {
    chart: { type: 'line', height: 340, backgroundColor: 'transparent', zooming: { type: 'x' } },
    title: { text: undefined },
    xAxis: {
      type: 'datetime',
      labels: { format: '{value:%e}', style: { fontSize: '11px', color: '#6B7280' } },
      tickInterval: 24 * 3600 * 1000,
      crosshair: true,
      lineColor: '#E5E7EB',
      tickColor: '#E5E7EB',
    },
    yAxis: {
      title: { text: meta.unit, style: { color: '#6B7280', fontSize: '11px' } },
      labels: { style: { fontSize: '11px', color: '#6B7280' } },
      gridLineColor: '#F3F4F6',
    },
    tooltip: {
      backgroundColor: '#fff',
      borderColor: '#E5E7EB',
      style: { color: '#1F2937' },
      xDateFormat: '%d/%m %H:00',
      valueDecimals: 2,
      valueSuffix: meta.unit ? ` ${meta.unit}` : undefined,
      shared: multiSeries,
    },
    series: dailySeries,
    legend: { enabled: multiSeries, itemStyle: { color: '#6B7280', fontSize: '11px' } },
    credits: { enabled: false },
  };

  const stockChartOptions: Highcharts.Options = {
    chart: { height: 340, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      crosshair: true,
      range: 2 * 24 * 3600 * 1000,
      plotLines: alertPlotLines,
      labels: { style: { fontSize: '11px', color: '#6B7280' } },
      lineColor: '#E5E7EB',
      tickColor: '#E5E7EB',
    },
    yAxis: {
      title: { text: meta.unit, style: { color: '#6B7280', fontSize: '11px' } },
      labels: { style: { fontSize: '11px', color: '#6B7280' } },
      gridLineColor: '#F3F4F6',
      opposite: false,
    },
    tooltip: {
      backgroundColor: '#fff',
      borderColor: '#E5E7EB',
      style: { color: '#1F2937' },
      xDateFormat: '%d/%m %H:%M',
      valueDecimals: 2,
      valueSuffix: meta.unit ? ` ${meta.unit}` : undefined,
      shared: multiSeries,
    },
    series: stockSeries,
    navigator: { enabled: true, xAxis: { plotLines: alertPlotLines } },
    scrollbar: { enabled: false },
    rangeSelector: { enabled: false },
    legend: { enabled: multiSeries, itemStyle: { color: '#6B7280', fontSize: '11px' } },
    credits: { enabled: false },
  };

  // Day summary table
  const daySummaries = useMemo(() => groupByDay(readings, alertTimestamps), [readings, alertTimestamps]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-[340px] animate-pulse rounded-lg bg-gray-100" />
        <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => navigate(`/monitoring/meter/${meterId}`)}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          &larr; Volver
        </button>
        <Link to="/buildings" className="text-[13px] text-gray-500 hover:text-[var(--color-primary)]">Edificios</Link>
        <Sep />
        {building && (
          <>
            <Link to={`/meters?buildingId=${building.id}`} className="text-[13px] text-gray-500 hover:text-[var(--color-primary)]">
              {building.name}
            </Link>
            <Sep />
          </>
        )}
        <Link
          to={`/monitoring/meter/${meterId}`}
          className="text-[13px] text-gray-500 hover:text-[var(--color-primary)]"
        >
          {meter?.name ?? '—'} ({meter?.code ?? meterId})
        </Link>
        <Sep />
        <span className="text-[13px] font-semibold text-gray-900">{monthLabel}</span>
        <span className="text-[11px] text-gray-500">({readings.length} lecturas)</span>
      </div>

      {/* Chart card */}
      {readings.length > 0 && (
        <Card className="shrink-0">
          <div className="mb-3 flex items-center justify-between">
            {/* Metric selector dropdown */}
            <div ref={selectorRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setSelectorOpen((o) => !o)}
                className="flex items-center gap-1 text-sm font-semibold text-gray-900 transition-colors hover:text-gray-600"
              >
                {meta.label}
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {selectorOpen && (
                <ul className="absolute left-0 z-20 mt-1 w-56 overflow-y-auto rounded border border-gray-200 bg-white py-1 shadow-lg">
                  {SELECTOR_ITEMS.map(({ key, label }) => (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => { setMetric(key); setSelectorOpen(false); }}
                        className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
                          key === metric ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Resolution toggle */}
            <div className="flex gap-1">
              <ResBtn label="Diario" active={resolution === 'daily'} onClick={() => setResolution('daily')} />
              <ResBtn label="15 min" active={resolution === '15min'} onClick={() => setResolution('15min')} />
            </div>
          </div>
          {resolution === 'daily' ? (
            <HighchartsReact highcharts={Highcharts} options={dailyChartOptions} />
          ) : (
            <HighchartsReact highcharts={HighchartsStock} constructorType="stockChart" options={stockChartOptions} />
          )}
        </Card>
      )}

      {/* Day summary table */}
      {readings.length > 0 && (
        <Card className="flex min-h-0 flex-1 flex-col" noPadding>
          <div className="px-6 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-gray-900">Resumen diario</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <Th>Dia</Th>
                  <Th>Lecturas</Th>
                  <Th>Incidencias</Th>
                  <Th>Pot. prom. (kW)</Th>
                  <Th>Pot. peak (kW)</Th>
                  <Th colSpan={3}>Voltaje (V)</Th>
                  <Th colSpan={3}>Corriente (A)</Th>
                  <Th>React. (kVAr)</Th>
                  <Th>FP</Th>
                  <Th>Frec. (Hz)</Th>
                </tr>
                <tr>
                  <Th></Th><Th></Th><Th></Th><Th></Th><Th></Th>
                  <ThSub>L1</ThSub><ThSub>L2</ThSub><ThSub>L3</ThSub>
                  <ThSub>L1</ThSub><ThSub>L2</ThSub><ThSub>L3</ThSub>
                  <Th></Th><Th></Th><Th></Th>
                </tr>
              </thead>
              <TableStateBody
                phase={daySummaries.length === 0 ? 'empty' : 'ready'}
                colSpan={14}
                emptyMessage="Sin lecturas para este mes."
              >
                {daySummaries.map((d) => (
                  <tr key={d.day} className="hover:bg-gray-50">
                    <Td>{d.label}</Td>
                    <Td>{d.count}</Td>
                    <Td>
                      {d.alertCount > 0 ? (
                        <Link
                          to={`/alerts?meterId=${meterId}&date=${d.day}`}
                          className="text-red-500 underline hover:text-red-400"
                        >
                          {d.alertCount}
                        </Link>
                      ) : '—'}
                    </Td>
                    <Td>{fmtNum(d.avgPowerKw, 2)}</Td>
                    <Td>{fmtNum(d.peakPowerKw, 2)}</Td>
                    <Td>{fmtNum(d.avgVoltageL1)}</Td>
                    <Td>{fmtNum(d.avgVoltageL2)}</Td>
                    <Td>{fmtNum(d.avgVoltageL3)}</Td>
                    <Td>{fmtNum(d.avgCurrentL1)}</Td>
                    <Td>{fmtNum(d.avgCurrentL2)}</Td>
                    <Td>{fmtNum(d.avgCurrentL3)}</Td>
                    <Td>{fmtNum(d.avgReactivePowerKvar)}</Td>
                    <Td>{fmtNum(d.avgPowerFactor, 3)}</Td>
                    <Td>{fmtNum(d.avgFrequencyHz)}</Td>
                  </tr>
                ))}
                {/* Total footer */}
                {daySummaries.length > 0 && (
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <Td>Total</Td>
                    <Td>{daySummaries.reduce((s, d) => s + d.count, 0)}</Td>
                    <Td>{daySummaries.reduce((s, d) => s + d.alertCount, 0) || '—'}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgPowerKw)), 2)}</Td>
                    <Td>{fmtNum(maxNonNull(daySummaries.map((d) => d.peakPowerKw)), 2)}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgVoltageL1)))}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgVoltageL2)))}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgVoltageL3)))}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgCurrentL1)))}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgCurrentL2)))}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgCurrentL3)))}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgReactivePowerKvar)))}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgPowerFactor)), 3)}</Td>
                    <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgFrequencyHz)))}</Td>
                  </tr>
                )}
              </TableStateBody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Small sub-components ── */

function Sep() {
  return <span className="text-[11px] text-gray-400">/</span>;
}

function Th({ children, colSpan }: Readonly<{ children?: React.ReactNode; colSpan?: number }>) {
  return (
    <th colSpan={colSpan} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function ThSub({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-3 py-1 text-left text-[10px] font-medium text-gray-400">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-3 py-2.5 text-sm text-gray-700 ${className}`}>{children}</td>;
}

function ResBtn({ label, active, onClick }: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs transition-colors ${
        active ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-500 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
}
