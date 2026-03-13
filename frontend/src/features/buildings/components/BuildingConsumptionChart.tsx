import { useMemo } from 'react';
import { StockChart } from '../../../components/ui/StockChart';
import type { ConsumptionPoint } from '../../../types';

interface Props {
  data: ConsumptionPoint[];
  loading?: boolean;
  onRangeChange?: (min: number, max: number) => void;
}

/** Un punto placeholder para que el gráfico no quede vacío cuando no hay datos. */
function emptyPlaceholderPoint(): [number, number] {
  const t = Date.now();
  return [t, 0];
}

export function BuildingConsumptionChart({ data, loading, onRangeChange }: Props) {
  const hasData = data.length > 0;
  const placeholder = useMemo(() => emptyPlaceholderPoint(), []);

  const options: Highcharts.Options = useMemo(
    () => ({
      title: {
        text: 'Potencia Total del Edificio',
        ...(hasData ? {} : { style: { color: '#8b949e' } }),
      },
      subtitle: hasData
        ? undefined
        : {
            text: 'Sin datos de consumo en el período seleccionado',
            style: { color: '#8b949e', fontSize: '12px' },
          },
      yAxis: { title: { text: 'kW' }, min: 0 },
      series: [
        {
          name: 'Total (suma medidores)',
          type: 'area',
          color: '#3b82f6',
          fillOpacity: 0.15,
          data: hasData ? data.map((d) => [new Date(d.timestamp).getTime(), d.totalPowerKw]) : [placeholder],
        },
        {
          name: 'Pico instantáneo',
          type: 'line',
          color: '#ef4444',
          lineWidth: 1,
          dashStyle: 'ShortDot',
          data: hasData ? data.map((d) => [new Date(d.timestamp).getTime(), d.peakPowerKw]) : [placeholder],
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
    }),
    [data, hasData],
  );

  return <StockChart options={options} loading={loading} onRangeChange={onRangeChange} />;
}
