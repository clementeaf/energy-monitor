import type { Meta, StoryObj } from '@storybook/react';
import { MonthlyChart } from './MonthlyChart';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const KWH = [12400, 11800, 13200, 10900, 14500, 15100, 13800, 12600, 11200, 14800, 16200, 15500];
const CLP = [2_340_000, 2_180_000, 2_560_000, 1_980_000, 2_720_000, 2_890_000, 2_650_000, 2_410_000, 2_100_000, 2_780_000, 3_050_000, 2_940_000];

const toData = (values: number[]) => values.map((v, i) => ({ label: MONTHS[i], value: v }));

const meta: Meta<typeof MonthlyChart> = {
  title: 'Charts/MonthlyChart',
  component: MonthlyChart,
};

export default meta;
type Story = StoryObj<typeof MonthlyChart>;

export const Kwh: Story = {
  args: {
    data: toData(KWH),
    seriesName: 'Consumo',
    unit: 'kWh',
  },
};

export const Currency: Story = {
  args: {
    data: toData(CLP),
    seriesName: 'Gasto',
    unit: 'CLP',
    currency: '$',
  },
};

export const OnlyBarAndPie: Story = {
  args: {
    data: toData(KWH),
    seriesName: 'Consumo',
    unit: 'kWh',
    modes: ['column', 'pie'],
  },
};
