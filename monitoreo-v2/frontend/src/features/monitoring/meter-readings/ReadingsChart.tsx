import { useState, useMemo, useRef } from 'react';
import { Highcharts, HighchartsStock } from '../../../lib/highcharts-init';
import { HighchartsReact } from 'highcharts-react-official';
import { Card } from '../../../components/ui/Card';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { baseChartOptions } from '../../../lib/chart-config';
import type { Reading } from '../../../types/reading';
import type { Alert } from '../../../types/alert';
import {
  READING_METRICS, COMPOSITES, SELECTOR_ITEMS, PHASE_COLORS, PHASE_LABELS,
  isComposite, parseVal, groupByHour,
  type SelectorKey, type ReadingMetricField, type MetricMeta,
} from './meter-readings-utils';

interface ReadingsChartProps {
  readings: Reading[];
  alerts: Alert[];
}

type ChartRes = 'daily' | '15min';

export function ReadingsChart({ readings, alerts }: Readonly<ReadingsChartProps>) {
  const [metric, setMetric] = useState<SelectorKey>('power_kw');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [resolution, setResolution] = useState<ChartRes>('daily');
  const selectorRef = useRef<HTMLDivElement>(null);
  useClickOutside(selectorRef, () => setSelectorOpen(false), selectorOpen);

  const singleField: ReadingMetricField | null = isComposite(metric) ? null : metric;

  const hourlyData = useMemo(
    () => singleField ? groupByHour(readings, singleField) : [],
    [readings, singleField],
  );

  const rawData = useMemo(
    () => singleField ? readings.map((r): [number, number | null] => [new Date(r.timestamp).getTime(), parseVal(r[singleField])]) : [],
    [readings, singleField],
  );

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

  const alertPlotLines: Highcharts.XAxisPlotLinesOptions[] = useMemo(
    () => alerts.map((a) => ({ value: new Date(a.createdAt).getTime(), color: '#ef4444', width: 2, zIndex: 5 })),
    [alerts],
  );

  const composite = isComposite(metric) ? COMPOSITES[metric] : null;
  const meta: MetricMeta = composite ?? READING_METRICS[metric as ReadingMetricField];
  const multiSeries = !!composite;
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
    xAxis: { type: 'datetime', labels: { format: '{value:%e}', style: { fontSize: '11px', color: '#6B7280' } }, tickInterval: 24 * 3600 * 1000, crosshair: true, lineColor: '#E5E7EB', tickColor: '#E5E7EB' },
    yAxis: { title: { text: meta.unit, style: { color: '#6B7280', fontSize: '11px' } }, labels: { style: { fontSize: '11px', color: '#6B7280' } }, gridLineColor: '#F3F4F6' },
    tooltip: { backgroundColor: '#fff', borderColor: '#E5E7EB', style: { color: '#1F2937' }, xDateFormat: '%d/%m %H:00', valueDecimals: 2, valueSuffix: meta.unit ? ` ${meta.unit}` : undefined, shared: multiSeries },
    series: dailySeries,
    legend: { enabled: multiSeries, itemStyle: { color: '#6B7280', fontSize: '11px' } },
    credits: { enabled: false },
  };

  const stockChartOptions: Highcharts.Options = {
    chart: { height: 340, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: { crosshair: true, range: 2 * 24 * 3600 * 1000, plotLines: alertPlotLines, labels: { style: { fontSize: '11px', color: '#6B7280' } }, lineColor: '#E5E7EB', tickColor: '#E5E7EB' },
    yAxis: { title: { text: meta.unit, style: { color: '#6B7280', fontSize: '11px' } }, labels: { style: { fontSize: '11px', color: '#6B7280' } }, gridLineColor: '#F3F4F6', opposite: false },
    tooltip: { backgroundColor: '#fff', borderColor: '#E5E7EB', style: { color: '#1F2937' }, xDateFormat: '%d/%m %H:%M', valueDecimals: 2, valueSuffix: meta.unit ? ` ${meta.unit}` : undefined, shared: multiSeries },
    series: stockSeries,
    navigator: { enabled: true, xAxis: { plotLines: alertPlotLines } },
    scrollbar: { enabled: false },
    rangeSelector: { enabled: false },
    legend: { enabled: multiSeries, itemStyle: { color: '#6B7280', fontSize: '11px' } },
    credits: { enabled: false },
  };

  return (
    <Card className="shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <div ref={selectorRef} className="relative inline-block">
          <button type="button" onClick={() => setSelectorOpen((o) => !o)}
            className="flex items-center gap-1 text-sm font-semibold text-foreground transition-colors hover:text-muted">
            {meta.label}
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          {selectorOpen && (
            <ul className="absolute left-0 z-20 mt-1 w-56 overflow-y-auto rounded border border-border bg-background py-1 shadow-lg">
              {SELECTOR_ITEMS.map(({ key, label }) => (
                <li key={key}>
                  <button type="button" onClick={() => { setMetric(key); setSelectorOpen(false); }}
                    className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${key === metric ? 'bg-raised font-semibold text-foreground' : 'text-muted hover:bg-surface'}`}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
  );
}

function ResBtn({ label, active, onClick }: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded px-2 py-1 text-xs transition-colors ${active ? 'bg-raised font-semibold text-foreground' : 'text-muted hover:text-foreground'}`}>
      {label}
    </button>
  );
}
