import { useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { baseChartOptions, axisLabelFormatter, getSeriesColors } from '../../lib/chart-config';
import { WidgetErrorBoundary } from '../ui/WidgetErrorBoundary';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChartMode = 'column' | 'line' | 'area' | 'pie';

interface MonthlyChartProps {
  data: { label: string; value: number | null }[];
  seriesName: string;
  unit: string;
  /** Optional currency prefix for axis labels (e.g. "$"). */
  currency?: string;
  /** Controlled chart mode. If omitted, internal toggle is shown. */
  mode?: ChartMode;
  onModeChange?: (mode: ChartMode) => void;
  /** Available modes for the toggle. Defaults to all four. */
  modes?: ChartMode[];
}

// ---------------------------------------------------------------------------
// Mode labels
// ---------------------------------------------------------------------------

const MODE_LABELS: Record<ChartMode, string> = {
  column: 'Barra',
  line: 'Línea',
  area: 'Área',
  pie: 'Torta',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MonthlyChartInner({
  data,
  seriesName,
  unit,
  currency,
  mode: controlledMode,
  onModeChange,
  modes = ['column', 'line', 'area', 'pie'],
}: MonthlyChartProps) {
  const [internalMode, setInternalMode] = useState<ChartMode>('column');
  const mode = controlledMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;
  const showToggle = controlledMode === undefined;

  const categories = data.map((d) => d.label);
  const values = data.map((d) => d.value);

  const options = useMemo<Highcharts.Options>(() => {
    const base = baseChartOptions();
    const primary = base.colors?.[0] ?? '#3D3BF3';

    if (mode === 'pie') {
      const pieColors = getSeriesColors();
      return {
        chart: { height: 260, backgroundColor: 'transparent' },
        title: { text: undefined },
        tooltip: {
          useHTML: true,
          ...base.tooltip,
          pointFormatter(this: Highcharts.Point) {
            const val = currency
              ? `${currency}${(this.y ?? 0).toLocaleString('es-CL')}`
              : `${(this.y ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })}`;
            return `<b>${val} ${currency ? '' : unit}</b> (${Highcharts.numberFormat(this.percentage!, 1)}%)`;
          },
        },
        plotOptions: {
          pie: {
            borderWidth: 0,
            dataLabels: {
              enabled: true,
              format: '{point.name}',
              style: { fontSize: '11px', color: '#1F2937', textOutline: 'none' },
            },
          },
        },
        series: [{
          type: 'pie',
          name: seriesName,
          data: data.map((d, i) => ({
            name: categories[i],
            y: d.value ?? 0,
            color: pieColors[i % pieColors.length],
          })),
        }],
        legend: { enabled: false },
        credits: { enabled: false },
      };
    }

    return {
      ...base,
      chart: { ...base.chart, type: mode, height: 300, backgroundColor: 'transparent', spacingBottom: 15 },
      title: { text: undefined },
      xAxis: {
        ...(base.xAxis as object),
        categories,
        crosshair: true,
      },
      yAxis: {
        ...(base.yAxis as object),
        min: 0,
        title: { text: unit, style: { color: primary, fontSize: '11px' } },
        labels: {
          formatter(this: Highcharts.AxisLabelsFormatterContextObject) {
            return axisLabelFormatter.call(this, currency);
          },
          style: (base.yAxis as Highcharts.YAxisOptions)?.labels?.style,
        },
      },
      tooltip: {
        ...base.tooltip,
        valuePrefix: currency,
        valueDecimals: currency ? 0 : 1,
      },
      series: [{ name: seriesName, type: mode, data: values, color: primary }],
      legend: { enabled: false },
    };
  }, [data, seriesName, unit, currency, mode, categories, values]);

  return (
    <div className="relative">
      {showToggle && modes.length > 1 && (
        <div className="absolute right-0 top-0 z-10 flex rounded-full border border-gray-200">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2.5 py-0.5 text-[11px] transition-colors first:rounded-l-full last:rounded-r-full ${
                mode === m
                  ? 'bg-[var(--color-primary,#3D3BF3)] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

/**
 * Gráfico mensual multi-modo; fallos de render no propagan fuera del bloque.
 */
export function MonthlyChart(props: MonthlyChartProps) {
  return (
    <WidgetErrorBoundary>
      <MonthlyChartInner {...props} />
    </WidgetErrorBoundary>
  );
}
