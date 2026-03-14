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
    chart: { type: mode, height: 360 },
    title: { text: undefined },
    xAxis: { categories, crosshair: true },
    yAxis: {
      title: { text: unit },
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
      },
    },
    tooltip: {
      valuePrefix: isCurrency ? '$' : undefined,
      valueDecimals: isCurrency ? 0 : 1,
    },
    plotOptions: {
      column: { borderRadius: 3 },
      line: { marker: { radius: 4 } },
    },
    series: [
      { name: label, type: mode, data: values, color: '#374151' },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 z-10 flex gap-1">
        <button
          onClick={() => setMode('column')}
          className={`rounded px-2 py-1 text-xs transition-colors ${mode === 'column' ? 'bg-raised font-semibold text-text' : 'text-muted hover:text-text'}`}
        >
          Barra
        </button>
        <button
          onClick={() => setMode('line')}
          className={`rounded px-2 py-1 text-xs transition-colors ${mode === 'line' ? 'bg-raised font-semibold text-text' : 'text-muted hover:text-text'}`}
        >
          Línea
        </button>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
