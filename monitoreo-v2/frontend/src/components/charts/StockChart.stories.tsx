import type { Meta, StoryObj } from '@storybook/react';
import { StockChart } from './StockChart';

function generateSeries(days: number, base: number, variance: number): [number, number][] {
  const now = Date.now();
  const interval = 15 * 60 * 1000;
  const points = (days * 24 * 60) / 15;
  const result: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const t = now - (points - i) * interval;
    const hour = new Date(t).getHours();
    const factor = hour >= 8 && hour <= 20 ? 1.4 : 0.7;
    result.push([t, Math.max(0, base * factor + (Math.random() - 0.5) * variance)]);
  }
  return result;
}

const SERIES_A = generateSeries(30, 120, 40);
const SERIES_B = generateSeries(30, 80, 25);

const meta: Meta<typeof StockChart> = {
  title: 'Charts/StockChart',
  component: StockChart,
};

export default meta;
type Story = StoryObj<typeof StockChart>;

export const SingleSeries: Story = {
  args: {
    options: {
      title: { text: 'Consumo en Tiempo Real' },
      yAxis: { title: { text: 'kW' } },
      series: [
        { name: 'Edificio A', type: 'line', data: SERIES_A, tooltip: { valueSuffix: ' kW', valueDecimals: 1 } },
      ],
    },
  },
};

export const MultiSeries: Story = {
  args: {
    options: {
      title: { text: 'Comparativa Edificios' },
      yAxis: { title: { text: 'kW' } },
      series: [
        { name: 'Edificio A', type: 'line', data: SERIES_A, tooltip: { valueSuffix: ' kW', valueDecimals: 1 } },
        { name: 'Edificio B', type: 'line', data: SERIES_B, tooltip: { valueSuffix: ' kW', valueDecimals: 1 } },
      ],
    },
  },
};

export const DualAxis: Story = {
  args: {
    options: {
      title: { text: 'Consumo vs Factor de Potencia' },
      yAxis: [
        { title: { text: 'kWh' } },
        { title: { text: 'Factor de Potencia' }, opposite: true, min: 0, max: 1 },
      ],
      series: [
        { name: 'Consumo', type: 'area', data: SERIES_A, yAxis: 0, tooltip: { valueSuffix: ' kWh', valueDecimals: 1 } },
        {
          name: 'PF', type: 'line', yAxis: 1, tooltip: { valueDecimals: 3 },
          data: SERIES_A.map(([t]) => [t, 0.85 + (Math.random() - 0.5) * 0.15] as [number, number]),
        },
      ],
    },
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    options: {
      title: { text: 'Cargando datos...' },
      yAxis: { title: { text: 'kW' } },
      series: [
        { name: 'Edificio A', type: 'line', data: SERIES_A, tooltip: { valueSuffix: ' kW', valueDecimals: 1 } },
      ],
    },
  },
};
