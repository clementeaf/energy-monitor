import { useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { MONTH_NAMES_SHORT } from '../../lib/constants';
import { CHART_COLORS, LIGHT_PLOT_OPTIONS, LIGHT_TOOLTIP_STYLE, type ChartType } from '../../lib/chartConfig';

function monthLabel(iso: string): string {
  const m = new Date(iso).getMonth();
  return MONTH_NAMES_SHORT[m] ?? iso;
}

interface MonthlyColumnChartProps {
  data: { month: string; value: number | null }[];
  label: string;
  unit: string;
}

export function MonthlyColumnChart({ data, label, unit }: MonthlyColumnChartProps) {
  const [mode, setMode] = useState<ChartType>('column');
  const isCurrency = unit === 'CLP ($)';
  const categories = data.map((d) => monthLabel(d.month));
  const values = data.map((d) => d.value);

  const options: Highcharts.Options = {
    chart: { type: mode, height: 384, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      categories,
      crosshair: true,
      labels: { style: { fontSize: '11px', color: '#6B7280' } },
      lineColor: '#E5E7EB',
      tickColor: '#E5E7EB',
    },
    yAxis: {
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
      <div className="absolute right-0 top-0 z-10 flex rounded border border-border text-xs">
        <button
          onClick={() => setMode('column')}
          className={`px-2 py-1 transition-colors ${mode === 'column' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text'}`}
        >
          Barra
        </button>
        <button
          onClick={() => setMode('line')}
          className={`px-2 py-1 transition-colors ${mode === 'line' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text'}`}
        >
          Línea
        </button>
        <button
          onClick={() => setMode('area')}
          className={`px-2 py-1 transition-colors ${mode === 'area' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text'}`}
        >
          Área
        </button>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
