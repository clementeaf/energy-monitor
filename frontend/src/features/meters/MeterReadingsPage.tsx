import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { PillButton } from '../../components/ui/PillButton';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsStock from 'highcharts/highstock';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { MeterReadingsSkeleton } from '../../components/ui/Skeleton';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useMeterInfo, useMeterReadings } from '../../hooks/queries/useMeters';
import { useAlerts } from '../../hooks/queries/useAlerts';
import { fmtNum } from '../../lib/formatters';
import { MONTH_NAMES_FULL } from '../../lib/constants';
import { CHART_COLORS, LIGHT_TOOLTIP_STYLE, LIGHT_PLOT_OPTIONS } from '../../lib/chartConfig';
import { avgNonNull, maxNonNull, sumNonNull } from '../../lib/aggregations';
import type { Alert, MeterReading } from '../../types';

type ChartResolution = 'daily' | '15min';

type ReadingMetricKey = keyof Omit<MeterReading, 'meterId' | 'timestamp'>;

interface MetricMeta {
  label: string;
  unit: string;
}

const readingMetrics: Record<ReadingMetricKey, MetricMeta> = {
  voltageL1:        { label: 'Voltaje L1', unit: 'V' },
  voltageL2:        { label: 'Voltaje L2', unit: 'V' },
  voltageL3:        { label: 'Voltaje L3', unit: 'V' },
  currentL1:        { label: 'Corriente L1', unit: 'A' },
  currentL2:        { label: 'Corriente L2', unit: 'A' },
  currentL3:        { label: 'Corriente L3', unit: 'A' },
  powerKw:          { label: 'Potencia Activa', unit: 'kW' },
  reactivePowerKvar:{ label: 'Potencia reactiva', unit: 'kVAr' },
  powerFactor:      { label: 'Factor de potencia', unit: '' },
  frequencyHz:      { label: 'Frecuencia', unit: 'Hz' },
  energyKwhTotal:   { label: 'Energía acumulada', unit: 'kWh' },
};

// Composite metrics that show 3 series (L1, L2, L3) in one chart
type CompositeMetric = 'voltage' | 'current';
type SelectorMetric = ReadingMetricKey | CompositeMetric;

const compositeMetrics: Record<CompositeMetric, { label: string; unit: string; keys: [ReadingMetricKey, ReadingMetricKey, ReadingMetricKey] }> = {
  voltage: { label: 'Voltaje', unit: 'V', keys: ['voltageL1', 'voltageL2', 'voltageL3'] },
  current: { label: 'Corriente', unit: 'A', keys: ['currentL1', 'currentL2', 'currentL3'] },
};

const PHASE_COLORS = ['#374151', '#2563eb', '#f59e0b'] as const;
const PHASE_LABELS = ['L1', 'L2', 'L3'] as const;

interface SelectorItem { key: SelectorMetric; label: string }
const selectorItems: SelectorItem[] = [
  { key: 'powerKw', label: 'Potencia Activa' },
  { key: 'voltage', label: 'Voltaje' },
  { key: 'current', label: 'Corriente' },
  { key: 'reactivePowerKvar', label: 'Potencia reactiva' },
  { key: 'powerFactor', label: 'Factor de potencia' },
  { key: 'frequencyHz', label: 'Frecuencia' },
  { key: 'energyKwhTotal', label: 'Energía acumulada' },
];

function isComposite(m: SelectorMetric): m is CompositeMetric {
  return m === 'voltage' || m === 'current';
}

interface DaySummary {
  day: string; // YYYY-MM-DD
  label: string; // "01", "02", etc.
  count: number;
  alertCount: number;
  avgPowerKw: number | null;
  peakPowerKw: number | null;
  totalEnergyKwh: number | null;
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

function groupByDay(readings: MeterReading[], alerts: Alert[] = []): DaySummary[] {
  const groups = new Map<string, MeterReading[]>();
  for (const r of readings) {
    const day = r.timestamp.slice(0, 10);
    const arr = groups.get(day);
    if (arr) arr.push(r); else groups.set(day, [r]);
  }
  // Alertas por día
  const alertsByDay = new Map<string, number>();
  for (const a of alerts) {
    const day = a.timestamp.slice(0, 10);
    alertsByDay.set(day, (alertsByDay.get(day) ?? 0) + 1);
  }
  return Array.from(groups.entries()).map(([day, rows]) => ({
    day,
    label: day.slice(8, 10),
    count: rows.length,
    alertCount: alertsByDay.get(day) ?? 0,
    avgPowerKw: avgNonNull(rows.map((r) => r.powerKw)),
    peakPowerKw: maxNonNull(rows.map((r) => r.powerKw)),
    totalEnergyKwh: sumNonNull(rows.map((r) => r.energyKwhTotal)),
    avgPowerFactor: avgNonNull(rows.map((r) => r.powerFactor)),
    avgVoltageL1: avgNonNull(rows.map((r) => r.voltageL1)),
    avgVoltageL2: avgNonNull(rows.map((r) => r.voltageL2)),
    avgVoltageL3: avgNonNull(rows.map((r) => r.voltageL3)),
    avgCurrentL1: avgNonNull(rows.map((r) => r.currentL1)),
    avgCurrentL2: avgNonNull(rows.map((r) => r.currentL2)),
    avgCurrentL3: avgNonNull(rows.map((r) => r.currentL3)),
    avgReactivePowerKvar: avgNonNull(rows.map((r) => r.reactivePowerKvar)),
    avgFrequencyHz: avgNonNull(rows.map((r) => r.frequencyHz)),
  }));
}

function groupByHour(readings: MeterReading[], metric: ReadingMetricKey): [number, number | null][] {
  const groups = new Map<number, (number | null)[]>();
  for (const r of readings) {
    const d = new Date(r.timestamp);
    const hourTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
    const arr = groups.get(hourTs);
    if (arr) arr.push(r[metric]); else groups.set(hourTs, [r[metric]]);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, vals]) => [ts, avgNonNull(vals)]);
}

// Column groups: null = single column (no group header), { label, colSpan } = grouped
const DAY_COLUMN_GROUPS: (import('../../components/ui/DataTable').ColumnGroup | null)[] = [
  null, // Día
  null, // Lecturas
  null, // Incidencias
  null, // Pot. prom.
  null, // Pot. peak
  { label: 'Voltaje (V)', colSpan: 3 },  // L1, L2, L3
  { label: 'Corriente (A)', colSpan: 3 }, // L1, L2, L3
  null, // React.
  null, // FP
  null, // Frec.
];

function buildDayColumns(meterId: string): Column<DaySummary>[] {
  return [
    { label: 'Día', value: (r) => r.label, total: () => 'Total mensual', align: 'left' },
    { label: 'Lecturas', value: (r) => String(r.count), total: (d) => String(d.reduce((s, r) => s + r.count, 0)) },
    {
      label: 'Incidencias',
      value: (r) => r.alertCount > 0
        ? <Link to={`/alerts?meter_id=${meterId}&date=${r.day}`} className="text-red-500 underline hover:text-red-400">{r.alertCount}</Link>
        : '—',
      total: (d) => String(d.reduce((s, r) => s + r.alertCount, 0)),
    },
    { label: 'Pot. prom. (kW)', value: (r) => fmtNum(r.avgPowerKw), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgPowerKw))) },
    { label: 'Pot. peak (kW)', value: (r) => fmtNum(r.peakPowerKw), total: (d) => fmtNum(maxNonNull(d.map((r) => r.peakPowerKw))) },
    { label: 'L1', value: (r) => fmtNum(r.avgVoltageL1), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgVoltageL1))) },
    { label: 'L2', value: (r) => fmtNum(r.avgVoltageL2), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgVoltageL2))) },
    { label: 'L3', value: (r) => fmtNum(r.avgVoltageL3), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgVoltageL3))) },
    { label: 'L1', value: (r) => fmtNum(r.avgCurrentL1), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgCurrentL1))) },
    { label: 'L2', value: (r) => fmtNum(r.avgCurrentL2), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgCurrentL2))) },
    { label: 'L3', value: (r) => fmtNum(r.avgCurrentL3), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgCurrentL3))) },
    { label: 'React. (kVAr)', value: (r) => fmtNum(r.avgReactivePowerKvar), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgReactivePowerKvar))) },
    { label: 'FP', value: (r) => fmtNum(r.avgPowerFactor, 3), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgPowerFactor)), 3) },
    { label: 'Frec. (Hz)', value: (r) => fmtNum(r.avgFrequencyHz), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgFrequencyHz))) },
  ];
}

export function MeterReadingsPage() {
  const { meterId, month } = useParams<{ meterId: string; month: string }>();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<SelectorMetric>('powerKw');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [resolution, setResolution] = useState<ChartResolution>('daily');
  const selectorRef = useRef<HTMLDivElement>(null);
  useClickOutside(selectorRef, () => setSelectorOpen(false), selectorOpen);

  // Parse month param (YYYY-MM) to from/to dates
  const { from, to, monthLabel } = useMemo(() => {
    const [y, m] = (month ?? '2026-01').split('-').map(Number);
    const fromDate = new Date(y, m - 1, 1);
    const toDate = new Date(y, m, 0); // last day of month
    const label = `${MONTH_NAMES_FULL[m - 1]} ${y}`;
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      monthLabel: label,
    };
  }, [month]);

  const { data: meterInfo } = useMeterInfo(meterId!);
  const { data: readings, isLoading } = useMeterReadings(meterId!, from, to);
  const { data: alerts } = useAlerts({ meter_id: meterId! });

  const singleMetricKey = isComposite(metric) ? null : metric;

  const hourlyData = useMemo(
    () => singleMetricKey && readings ? groupByHour(readings, singleMetricKey) : [],
    [readings, singleMetricKey],
  );

  const rawData: [number, number | null][] = useMemo(
    () => singleMetricKey ? (readings ?? []).map((r) => [new Date(r.timestamp).getTime(), r[singleMetricKey]]) : [],
    [readings, singleMetricKey],
  );

  // Multi-series data for composite metrics (voltage / current)
  const compositeHourlyData = useMemo(() => {
    if (!isComposite(metric) || !readings) return null;
    const { keys } = compositeMetrics[metric];
    return keys.map((k) => groupByHour(readings, k));
  }, [readings, metric]);

  const compositeRawData = useMemo(() => {
    if (!isComposite(metric) || !readings) return null;
    const { keys } = compositeMetrics[metric];
    return keys.map((k) => (readings ?? []).map((r): [number, number | null] => [new Date(r.timestamp).getTime(), r[k]]));
  }, [readings, metric]);

  // PlotLines de alertas para el navigator (debe estar antes del early return)
  const alertPlotLines: Highcharts.XAxisPlotLinesOptions[] = useMemo(
    () => (alerts ?? []).map((a) => ({
      value: new Date(a.timestamp).getTime(),
      color: '#ef4444',
      width: 2,
      zIndex: 5,
    })),
    [alerts],
  );

  // PlotLines clickeables para el xAxis principal del stock chart
  const alertPlotLinesMain = useMemo(
    () => (alerts ?? []).map((a) => {
      const ts = new Date(a.timestamp);
      const day = ts.toISOString().slice(0, 10);
      return {
        value: ts.getTime(),
        color: '#ef4444',
        width: 2,
        zIndex: 5,
        events: {
          click() { navigate(`/alerts?meter_id=${meterId}&date=${day}`); },
        },
      } as Highcharts.XAxisPlotLinesOptions;
    }),
    [alerts, meterId, navigate],
  );

  if (isLoading) return <MeterReadingsSkeleton />;

  const composite = isComposite(metric) ? compositeMetrics[metric] : null;
  const meta = composite ?? readingMetrics[metric as ReadingMetricKey];
  const multiSeries = !!composite;

  const dailySeries: Highcharts.SeriesOptionsType[] = multiSeries
    ? PHASE_LABELS.map((phase, i) => ({ name: phase, type: 'line' as const, data: compositeHourlyData![i], color: PHASE_COLORS[i], marker: { enabled: false } }))
    : [{ name: meta.label, type: 'line' as const, data: hourlyData, color: CHART_COLORS.blue, marker: { enabled: false } }];

  const stockSeries: Highcharts.SeriesOptionsType[] = multiSeries
    ? PHASE_LABELS.map((phase, i) => ({ name: phase, type: 'line' as const, data: compositeRawData![i], color: PHASE_COLORS[i], marker: { enabled: false } }))
    : [{ name: meta.label, type: 'line' as const, data: rawData, color: CHART_COLORS.blue, marker: { enabled: false } }];

  // Daily chart (Highcharts básico): 1 punto por hora
  const dailyChartOptions: Highcharts.Options = {
    chart: { type: 'line', height: 360, backgroundColor: 'transparent', zooming: { type: 'x' } },
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
      title: { text: meta.unit, style: { color: CHART_COLORS.blue, fontSize: '11px' } },
      labels: { style: { fontSize: '11px', color: '#6B7280' } },
      gridLineColor: '#F3F4F6',
    },
    tooltip: {
      ...LIGHT_TOOLTIP_STYLE,
      xDateFormat: '%d/%m',
      valueDecimals: 2,
      valueSuffix: meta.unit ? ` ${meta.unit}` : undefined,
      shared: multiSeries,
    },
    plotOptions: LIGHT_PLOT_OPTIONS,
    series: dailySeries,
    legend: { enabled: multiSeries, itemStyle: { color: '#6B7280', fontSize: '11px' }, itemHoverStyle: { color: '#1E3A5F' } },
    credits: { enabled: false },
  };

  // 15-min chart (Highcharts Stock, light theme): datos crudos con navigator
  const stockChartOptions: Highcharts.Options = {
    chart: { height: 360, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      crosshair: true,
      range: 2 * 24 * 3600 * 1000,
      plotLines: alertPlotLinesMain,
      labels: { style: { fontSize: '11px', color: '#6B7280' } },
      lineColor: '#E5E7EB',
      tickColor: '#E5E7EB',
    },
    yAxis: {
      title: { text: meta.unit, style: { color: CHART_COLORS.blue, fontSize: '11px' } },
      labels: { style: { fontSize: '11px', color: '#6B7280' } },
      gridLineColor: '#F3F4F6',
      opposite: false,
    },
    tooltip: {
      ...LIGHT_TOOLTIP_STYLE,
      xDateFormat: '%d/%m %H:%M',
      valueDecimals: 2,
      valueSuffix: meta.unit ? ` ${meta.unit}` : undefined,
      shared: multiSeries,
    },
    plotOptions: LIGHT_PLOT_OPTIONS,
    series: stockSeries,
    navigator: {
      enabled: true,
      xAxis: { plotLines: alertPlotLines },
    },
    scrollbar: { enabled: false },
    rangeSelector: { enabled: false },
    legend: { enabled: multiSeries, itemStyle: { color: '#6B7280', fontSize: '11px' }, itemHoverStyle: { color: '#1E3A5F' } },
    credits: { enabled: false },
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-3 ml-4 flex shrink-0 flex-wrap items-center gap-2 lg:gap-3">
        <PillButton onClick={() => navigate(`/meters/${encodeURIComponent(meterId!)}`)}>&larr; Volver</PillButton>
        <Link to="/buildings" className="text-[13px] text-pa-text-muted hover:text-pa-blue">Activos Inmobiliarios</Link>
        <span className="text-[11px] text-pa-text-muted">/</span>
        {meterInfo?.buildingName && (
          <>
            <Link to={`/buildings/${encodeURIComponent(meterInfo.buildingName)}`} className="text-[13px] text-pa-text-muted hover:text-pa-blue">{meterInfo.buildingName}</Link>
            <span className="text-[11px] text-pa-text-muted">/</span>
          </>
        )}
        <Link to={`/meters/${encodeURIComponent(meterId!)}`} className="text-[13px] text-pa-text-muted hover:text-pa-blue">{meterInfo?.storeName ?? '—'} ({meterId})</Link>
        <span className="text-[11px] text-pa-text-muted">/</span>
        <span className="text-[13px] font-bold uppercase tracking-wide text-pa-navy">{monthLabel}</span>
        <span className="text-[11px] text-pa-text-muted">({readings?.length ?? 0} lecturas)</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {(hourlyData.length > 0 || rawData.length > 0 || compositeRawData) && (
          <Card className="shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <div ref={selectorRef} className="relative inline-block">
                <button
                  onClick={() => setSelectorOpen((o) => !o)}
                  className="flex items-center gap-1 text-sm font-semibold text-text transition-colors hover:text-muted"
                >
                  {meta.label}
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {selectorOpen && (
                  <ul className="absolute left-0 z-20 mt-1 w-56 overflow-y-auto rounded border border-border bg-white py-1 shadow-lg">
                    {selectorItems.map(({ key, label }) => (
                      <li key={key}>
                        <button
                          onClick={() => { setMetric(key); setSelectorOpen(false); }}
                          className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
                            key === metric ? 'bg-raised font-semibold text-text' : 'text-muted hover:bg-raised hover:text-text'
                          }`}
                        >
                          {label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setResolution('daily')}
                  className={`rounded px-2 py-1 text-xs transition-colors ${resolution === 'daily' ? 'bg-raised font-semibold text-text' : 'text-muted hover:text-text'}`}
                >
                  Diario
                </button>
                <button
                  onClick={() => setResolution('15min')}
                  className={`rounded px-2 py-1 text-xs transition-colors ${resolution === '15min' ? 'bg-raised font-semibold text-text' : 'text-muted hover:text-text'}`}
                >
                  15 min
                </button>
              </div>
            </div>
            {resolution === 'daily' ? (
              <HighchartsReact highcharts={Highcharts} options={dailyChartOptions} />
            ) : (
              <HighchartsReact highcharts={HighchartsStock} constructorType="stockChart" options={stockChartOptions} />
            )}
          </Card>
        )}

        {readings && readings.length > 0 && (
          <Card className="flex min-h-0 flex-1 flex-col">
            <h2 className="mb-3 shrink-0 text-sm font-semibold text-text">Resumen diario</h2>
            <div className="min-h-0 flex-1">
              <DataTable data={groupByDay(readings, alerts ?? [])} columns={buildDayColumns(meterId!)} columnGroups={DAY_COLUMN_GROUPS} footer rowKey={(r) => r.day} maxHeight="max-h-[230px]" />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
