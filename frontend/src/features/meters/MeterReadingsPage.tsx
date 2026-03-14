import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsStock from 'highcharts/highstock';
import { Card } from '../../components/ui/Card';
import { MeterReadingsSkeleton } from '../../components/ui/Skeleton';
import { useMeterReadings } from '../../hooks/queries/useMeters';
import type { MeterReading } from '../../types';

type ChartResolution = 'daily' | '15min';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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
  powerKw:          { label: 'Potencia', unit: 'kW' },
  reactivePowerKvar:{ label: 'Potencia reactiva', unit: 'kVAr' },
  powerFactor:      { label: 'Factor de potencia', unit: '' },
  frequencyHz:      { label: 'Frecuencia', unit: 'Hz' },
  energyKwhTotal:   { label: 'Energía acumulada', unit: 'kWh' },
};

const metricKeys = Object.keys(readingMetrics) as ReadingMetricKey[];

function fmtNum(n: number | null, decimals = 2): string {
  if (n === null) return '—';
  return n.toLocaleString('es-CL', { maximumFractionDigits: decimals });
}

interface DaySummary {
  day: string; // YYYY-MM-DD
  label: string; // "01", "02", etc.
  count: number;
  avgPowerKw: number | null;
  peakPowerKw: number | null;
  totalEnergyKwh: number | null;
  avgPowerFactor: number | null;
  avgVoltageL1: number | null;
  avgCurrentL1: number | null;
  avgReactivePowerKvar: number | null;
  avgFrequencyHz: number | null;
}

function avgNonNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

function maxNonNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? Math.max(...valid) : null;
}

function sumNonNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) : null;
}

function groupByDay(readings: MeterReading[]): DaySummary[] {
  const groups = new Map<string, MeterReading[]>();
  for (const r of readings) {
    const day = r.timestamp.slice(0, 10);
    const arr = groups.get(day);
    if (arr) arr.push(r); else groups.set(day, [r]);
  }
  return Array.from(groups.entries()).map(([day, rows]) => ({
    day,
    label: day.slice(8, 10),
    count: rows.length,
    avgPowerKw: avgNonNull(rows.map((r) => r.powerKw)),
    peakPowerKw: maxNonNull(rows.map((r) => r.powerKw)),
    totalEnergyKwh: sumNonNull(rows.map((r) => r.energyKwhTotal)),
    avgPowerFactor: avgNonNull(rows.map((r) => r.powerFactor)),
    avgVoltageL1: avgNonNull(rows.map((r) => r.voltageL1)),
    avgCurrentL1: avgNonNull(rows.map((r) => r.currentL1)),
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

type DayCol = {
  label: string;
  value: (r: DaySummary) => string;
  total: (data: DaySummary[]) => string;
  align?: 'left' | 'right';
};

const dayColumns: DayCol[] = [
  { label: 'Día', value: (r) => r.label, total: () => 'Promedio mensual', align: 'left' },
  { label: 'Lecturas', value: (r) => String(r.count), total: (d) => String(d.reduce((s, r) => s + r.count, 0)) },
  { label: 'Pot. prom. (kW)', value: (r) => fmtNum(r.avgPowerKw), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgPowerKw))) },
  { label: 'Pot. peak (kW)', value: (r) => fmtNum(r.peakPowerKw), total: (d) => fmtNum(maxNonNull(d.map((r) => r.peakPowerKw))) },
  { label: 'Volt. L1 (V)', value: (r) => fmtNum(r.avgVoltageL1), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgVoltageL1))) },
  { label: 'Corr. L1 (A)', value: (r) => fmtNum(r.avgCurrentL1), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgCurrentL1))) },
  { label: 'React. (kVAr)', value: (r) => fmtNum(r.avgReactivePowerKvar), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgReactivePowerKvar))) },
  { label: 'FP', value: (r) => fmtNum(r.avgPowerFactor, 3), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgPowerFactor)), 3) },
  { label: 'Frec. (Hz)', value: (r) => fmtNum(r.avgFrequencyHz), total: (d) => fmtNum(avgNonNull(d.map((r) => r.avgFrequencyHz))) },
];

function DailySummaryTable({ data }: { data: DaySummary[] }) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-border text-xs text-muted">
            {dayColumns.map((col) => (
              <th
                key={col.label}
                className={`whitespace-nowrap py-2 pr-6 font-medium ${col.align === 'left' ? 'text-left' : 'text-right'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.day} className="border-b border-border/50 text-text">
              {dayColumns.map((col) => (
                <td
                  key={col.label}
                  className={`whitespace-nowrap py-2 pr-6 tabular-nums ${col.align === 'left' ? '' : 'text-right'}`}
                >
                  {col.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-10 bg-white">
          <tr className="border-t border-border font-medium text-text">
            {dayColumns.map((col) => (
              <td
                key={col.label}
                className={`whitespace-nowrap py-2 pr-6 tabular-nums ${col.align === 'left' ? '' : 'text-right'}`}
              >
                {col.total(data)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function MeterReadingsPage() {
  const { meterId, month } = useParams<{ meterId: string; month: string }>();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<ReadingMetricKey>('powerKw');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [resolution, setResolution] = useState<ChartResolution>('daily');
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) setSelectorOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Parse month param (YYYY-MM) to from/to dates
  const { from, to, monthLabel } = useMemo(() => {
    const [y, m] = (month ?? '2026-01').split('-').map(Number);
    const fromDate = new Date(y, m - 1, 1);
    const toDate = new Date(y, m, 0); // last day of month
    const label = `${MONTH_NAMES[m - 1]} ${y}`;
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      monthLabel: label,
    };
  }, [month]);

  const { data: readings, isLoading } = useMeterReadings(meterId!, from, to);

  const hourlyData = useMemo(
    () => readings ? groupByHour(readings, metric) : [],
    [readings, metric],
  );

  const rawData: [number, number | null][] = useMemo(
    () => (readings ?? []).map((r) => [new Date(r.timestamp).getTime(), r[metric]]),
    [readings, metric],
  );

  if (isLoading) return <MeterReadingsSkeleton />;

  const meta = readingMetrics[metric];

  // Daily chart (Highcharts básico): 1 punto por hora
  const dailyChartOptions: Highcharts.Options = {
    chart: { type: 'line', height: 360, zooming: { type: 'x' } },
    title: { text: undefined },
    xAxis: {
      type: 'datetime',
      labels: { format: '{value:%e}' },
      tickInterval: 24 * 3600 * 1000,
      crosshair: true,
    },
    yAxis: { title: { text: meta.unit } },
    tooltip: {
      xDateFormat: '%d/%m',
      valueDecimals: 2,
      valueSuffix: meta.unit ? ` ${meta.unit}` : undefined,
    },
    series: [
      { name: meta.label, type: 'line', data: hourlyData, color: '#374151', marker: { enabled: false } },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // 15-min chart (Highcharts Stock, light theme): datos crudos con navigator
  const stockChartOptions: Highcharts.Options = {
    chart: { height: 360 },
    title: { text: undefined },
    xAxis: { crosshair: true, range: 2 * 24 * 3600 * 1000 },
    yAxis: { title: { text: meta.unit } },
    tooltip: {
      xDateFormat: '%d/%m %H:%M',
      valueDecimals: 2,
      valueSuffix: meta.unit ? ` ${meta.unit}` : undefined,
    },
    series: [
      { name: meta.label, type: 'line', data: rawData, color: '#374151', marker: { enabled: false } },
    ],
    navigator: { enabled: true },
    scrollbar: { enabled: false },
    rangeSelector: { enabled: false },
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1 text-sm text-muted hover:text-text"
          >
            &larr; Volver
          </button>
          <span className="text-sm font-semibold text-text">{meterId}</span>
          <span className="text-sm text-muted">&middot; {monthLabel}</span>
          <span className="text-xs text-muted">({readings?.length ?? 0} lecturas)</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {(hourlyData.length > 0 || rawData.length > 0) && (
          <Card>
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
                    {metricKeys.map((key) => (
                      <li key={key}>
                        <button
                          onClick={() => { setMetric(key); setSelectorOpen(false); }}
                          className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
                            key === metric ? 'bg-raised font-semibold text-text' : 'text-muted hover:bg-raised hover:text-text'
                          }`}
                        >
                          {readingMetrics[key].label}
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
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-text">Resumen diario</h2>
            <DailySummaryTable data={groupByDay(readings)} />
          </Card>
        )}
      </div>
    </div>
  );
}
