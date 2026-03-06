import { StockChart } from '../../../components/ui/StockChart';
import type { ConsumptionPoint } from '../../../types';

interface Props {
  data: ConsumptionPoint[];
}

export function BuildingConsumptionChart({ data }: Props) {
  const options: Highcharts.Options = {
    title: { text: 'Potencia Total del Edificio' },
    yAxis: { title: { text: 'kW' }, min: 0 },
    series: [
      {
        name: 'Total (suma medidores)',
        type: 'area',
        color: '#3b82f6',
        fillOpacity: 0.15,
        data: data.map((d) => [new Date(d.timestamp).getTime(), d.totalPowerKw]),
      },
      {
        name: 'Pico instantáneo',
        type: 'line',
        color: '#ef4444',
        lineWidth: 1,
        dashStyle: 'ShortDot',
        data: data.map((d) => [new Date(d.timestamp).getTime(), d.peakPowerKw]),
      },
    ],
    tooltip: {
      xDateFormat: '%d/%m/%Y %H:%M',
      valueSuffix: ' kW',
      shared: true,
    },
    plotOptions: {
      area: { marker: { enabled: false } },
      line: { marker: { enabled: false } },
    },
  };

  return <StockChart options={options} />;
}
