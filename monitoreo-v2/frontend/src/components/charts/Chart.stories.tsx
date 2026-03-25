import type { Meta, StoryObj } from '@storybook/react';
import { Chart } from './Chart';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const VALUES = [12400, 11800, 13200, 10900, 14500, 15100, 13800, 12600, 11200, 14800, 16200, 15500];

const meta: Meta<typeof Chart> = {
  title: 'Charts/Chart',
  component: Chart,
};

export default meta;
type Story = StoryObj<typeof Chart>;

export const Column: Story = {
  args: {
    options: {
      chart: { height: 280 },
      title: { text: 'Potencia Promedio (kW)' },
      xAxis: { categories: MONTHS, crosshair: true },
      yAxis: { min: 0, title: { text: 'kW' } },
      series: [{ name: 'Potencia', type: 'column', data: VALUES }],
    },
  },
};

export const Line: Story = {
  args: {
    options: {
      chart: { height: 280 },
      title: { text: 'Consumo Mensual (kWh)' },
      xAxis: { categories: MONTHS },
      yAxis: { min: 0, title: { text: 'kWh' } },
      series: [{ name: 'Consumo', type: 'line', data: VALUES }],
    },
  },
};

export const MultiSeries: Story = {
  args: {
    options: {
      chart: { height: 300 },
      title: { text: 'Comparativa Edificios' },
      xAxis: { categories: MONTHS },
      yAxis: { min: 0, title: { text: 'kWh' } },
      series: [
        { name: 'Edificio A', type: 'column', data: VALUES },
        { name: 'Edificio B', type: 'column', data: VALUES.map((v) => v * 0.7) },
      ],
    },
  },
};
