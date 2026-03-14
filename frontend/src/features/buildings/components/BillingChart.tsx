import { MonthlyColumnChart } from '../../../components/charts/MonthlyColumnChart';
import type { BillingMonthlySummary } from '../../../types';
import type { BillingMetricKey } from './billingMetrics';
import { billingMetrics } from './billingMetrics';

interface BillingChartProps {
  data: BillingMonthlySummary[];
  metric: BillingMetricKey;
}

export function BillingChart({ data, metric }: BillingChartProps) {
  const meta = billingMetrics[metric];
  const chartData = data.map((d) => ({
    month: d.month,
    value: (d as unknown as Record<string, number>)[metric],
  }));

  return <MonthlyColumnChart data={chartData} label={meta.label} unit={meta.unit} />;
}
