import { useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function monthLabel(iso: string): string {
  const m = new Date(iso).getMonth();
  return MONTH_LABELS[m] ?? iso;
}

type ChartMode = 'column' | 'line';

interface MonthlyColumnChartProps {
  data: { month: string; value: number | null }[];
  label: string;
  unit: string;
}

export function MonthlyColumnChart({ data, label, unit }: MonthlyColumnChartProps) {
  const [mode, setMode] = useState<ChartMode>('column');
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
      title: { text: unit, style: { color: '#3D3BF3', fontSize: '11px' } },
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
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E7EB',
      style: { color: '#1F2937' },
    },
    plotOptions: {
      column: { borderRadius: 4, borderWidth: 0 },
      line: { marker: { radius: 4, symbol: 'circle' }, lineWidth: 2.5 },
    },
    series: [
      { name: label, type: mode, data: values, color: '#3D3BF3' },
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
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
