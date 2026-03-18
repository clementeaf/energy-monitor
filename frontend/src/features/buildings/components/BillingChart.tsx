import { MonthlyColumnChart } from '../../../components/charts/MonthlyColumnChart';
import type { ChartType } from '../../../lib/chartConfig';
import type { BillingMonthlySummary } from '../../../types';
import type { BillingMetricKey } from './billingMetrics';
import { billingMetrics } from './billingMetrics';

interface BillingChartProps {
  data: BillingMonthlySummary[];
  metric: BillingMetricKey;
  chartType?: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
}

export function BillingChart({ data, metric, chartType, onChartTypeChange }: BillingChartProps) {
  const meta = billingMetrics[metric];
  const chartData = data.map((d) => ({
    month: d.month,
    value: (d as unknown as Record<string, number>)[metric],
  }));

  return <MonthlyColumnChart data={chartData} label={meta.label} unit={meta.unit} chartType={chartType} onChartTypeChange={onChartTypeChange} />;
}
