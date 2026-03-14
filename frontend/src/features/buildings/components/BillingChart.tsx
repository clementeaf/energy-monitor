import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { BillingMonthlySummary } from '../../../types';

const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function monthLabel(iso: string): string {
  const m = new Date(iso).getMonth();
  return MONTH_LABELS[m] ?? iso;
}

interface BillingChartProps {
  data: BillingMonthlySummary[];
}

export function BillingChart({ data }: BillingChartProps) {
  const categories = data.map((d) => monthLabel(d.month));
  const netoValues = data.map((d) => d.totalNetoClp);
  const ivaValues = data.map((d) => d.ivaClp);

  const options: Highcharts.Options = {
    chart: { type: 'column', height: 360 },
    title: { text: undefined },
    xAxis: { categories, crosshair: true },
    yAxis: {
      title: { text: 'CLP ($)' },
      labels: {
        formatter() {
          const v = this.value as number;
          if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
          if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
          return `$${v}`;
        },
      },
    },
    tooltip: {
      shared: true,
      valuePrefix: '$',
      valueDecimals: 0,
    },
    plotOptions: {
      column: { stacking: 'normal', borderRadius: 3 },
    },
    series: [
      { name: 'Neto', type: 'column', data: netoValues, color: '#374151' },
      { name: 'IVA', type: 'column', data: ivaValues, color: '#9ca3af' },
    ],
    legend: { enabled: true },
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
