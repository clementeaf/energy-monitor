import { Chart } from '../../../components/ui/Chart';
import type { MonthlyConsumption } from '../../../types';

interface Props {
  data: MonthlyConsumption[];
  title?: string;
}

export function BuildingConsumptionChart({ data, title = 'Consumo Total por Mes' }: Props) {
  const options: Highcharts.Options = {
    chart: { type: 'column' },
    title: { text: title },
    xAxis: { categories: data.map((d) => d.month) },
    yAxis: { title: { text: 'kWh' } },
    series: [
      {
        name: 'Consumo',
        type: 'column',
        data: data.map((d) => d.consumption),
        color: '#333',
      },
    ],
  };

  return <Chart options={options} />;
}
