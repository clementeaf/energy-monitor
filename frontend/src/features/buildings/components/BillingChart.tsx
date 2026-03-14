import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { BillingMonthlySummary } from '../../../types';
import type { BillingMetricKey } from './billingMetrics';
import { billingMetrics } from './billingMetrics';

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
  metric: BillingMetricKey;
}

export function BillingChart({ data, metric }: BillingChartProps) {
  const meta = billingMetrics[metric];
  const categories = data.map((d) => monthLabel(d.month));
  const values = data.map((d) => (d as unknown as Record<string, number>)[metric]);

  const isCurrency = meta.unit === 'CLP ($)';

  const options: Highcharts.Options = {
    chart: { type: 'column', height: 360 },
    title: { text: undefined },
    xAxis: { categories, crosshair: true },
    yAxis: {
      title: { text: meta.unit },
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
    },
    series: [
      { name: meta.label, type: 'column', data: values, color: '#374151' },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
