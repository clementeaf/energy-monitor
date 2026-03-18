import { useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { MONTH_NAMES_SHORT } from '../../lib/constants';
import { CHART_COLORS, LIGHT_PLOT_OPTIONS, LIGHT_TOOLTIP_STYLE, type ChartType } from '../../lib/chartConfig';
import { TogglePills } from '../ui/TogglePills';

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'column', label: 'Barra' },
  { value: 'line', label: 'Línea' },
  { value: 'area', label: 'Área' },
  { value: 'pie', label: 'Torta' },
];

const PIE_COLORS = ['#3D3BF3', '#E84C6F', '#2D9F5D', '#F5A623', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#10B981', '#A855F7', '#EF4444'];

function monthLabel(iso: string): string {
  const m = new Date(iso).getMonth();
  return MONTH_NAMES_SHORT[m] ?? iso;
}

interface MonthlyColumnChartProps {
  data: { month: string; value: number | null }[];
  label: string;
  unit: string;
  chartType?: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
}

export { CHART_TYPE_OPTIONS };

export function MonthlyColumnChart({ data, label, unit, chartType, onChartTypeChange }: MonthlyColumnChartProps) {
  const [internalMode, setInternalMode] = useState<ChartType>('column');
  const mode = chartType ?? internalMode;
  const setMode = onChartTypeChange ?? setInternalMode;
  const showInternalToggle = !onChartTypeChange;
  const isCurrency = unit === 'CLP ($)';
  const categories = data.map((d) => monthLabel(d.month));
  const values = data.map((d) => d.value);

  const isPie = mode === 'pie';

  const options: Highcharts.Options = isPie
    ? {
        chart: { height: 260, backgroundColor: 'transparent' },
        title: { text: undefined },
        tooltip: {
          useHTML: true,
          ...LIGHT_TOOLTIP_STYLE,
          pointFormatter() {
            const p = this as Highcharts.Point;
            const val = isCurrency ? `$${(p.y ?? 0).toLocaleString('es-CL')}` : `${(p.y ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })}`;
            return `<b>${val} ${isCurrency ? '' : unit}</b> (${Highcharts.numberFormat(p.percentage!, 1)}%)`;
          },
        },
        plotOptions: {
          pie: {
            borderWidth: 0,
            dataLabels: { enabled: true, format: '{point.name}', style: { fontSize: '11px', color: '#6B7280', textOutline: 'none' } },
          },
        },
        series: [{
          type: 'pie',
          name: label,
          data: data.map((d, i) => ({
            name: categories[i],
            y: d.value ?? 0,
            color: PIE_COLORS[i % PIE_COLORS.length],
          })),
        }],
        legend: { enabled: false },
        credits: { enabled: false },
      }
    : {
        chart: { type: mode, height: 300, backgroundColor: 'transparent', spacingBottom: 15 },
        title: { text: undefined },
        xAxis: {
          categories,
          crosshair: true,
          labels: { style: { fontSize: '11px', color: '#6B7280' } },
          lineColor: '#E5E7EB',
          tickColor: '#E5E7EB',
        },
        yAxis: {
          min: 0,
          title: { text: unit, style: { color: CHART_COLORS.blue, fontSize: '11px' } },
          labels: {
            formatter() {
              const v = this.value as number;
              if (isCurrency) {
                if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
                if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
                return `$${v}`;
              }
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
              return `${v}`;
            },
            style: { color: '#6B7280', fontSize: '11px' },
          },
          gridLineColor: '#F3F4F6',
        },
        tooltip: {
          valuePrefix: isCurrency ? '$' : undefined,
          valueDecimals: isCurrency ? 0 : 1,
          ...LIGHT_TOOLTIP_STYLE,
        },
        plotOptions: LIGHT_PLOT_OPTIONS,
        series: [
          { name: label, type: mode, data: values, color: CHART_COLORS.blue },
        ],
        legend: { enabled: false },
        credits: { enabled: false },
      };

  return (
    <div className="relative">
      {showInternalToggle && (
        <div className="absolute right-0 top-0 z-10">
          <TogglePills options={CHART_TYPE_OPTIONS} value={mode} onChange={setMode} />
        </div>
      )}
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
