import { Chart } from '../../../components/ui/Chart';
import type { MonthlyConsumption } from '../../../types';

interface Props {
  data: MonthlyConsumption[];
  title?: string;
}

export function BuildingConsumptionChart({ data, title = 'Consumo Total por Mes' }: Props) {
  const options: Highcharts.Options = {
    chart: { type: 'line' },
    title: { text: title },
    xAxis: { categories: data.map((d) => d.month) },
    yAxis: { title: { text: 'kWh' } },
    series: [
      {
        name: 'Consumo',
        type: 'line',
        data: data.map((d) => d.consumption),
      },
    ],
  };

  return <Chart options={options} />;
}
