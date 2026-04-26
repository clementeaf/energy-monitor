import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('highcharts', () => ({
  default: { setOptions: vi.fn(), numberFormat: vi.fn(() => '0') },
}));
vi.mock('highcharts-react-official', () => ({
  HighchartsReact: () => <div data-testid="highcharts-mock" />,
}));
vi.mock('../../lib/chart-config', () => ({
  baseChartOptions: () => ({
    chart: {},
    title: {},
    xAxis: {},
    yAxis: { labels: {} },
    tooltip: {},
    plotOptions: { series: {} },
    colors: ['#3D3BF3'],
  }),
  axisLabelFormatter: vi.fn(() => ''),
  getSeriesColors: () => ['#3D3BF3', '#10B981', '#F59E0B', '#EF4444'],
}));

import { MonthlyChart } from './MonthlyChart';

const sampleData = [
  { label: 'Ene', value: 100 },
  { label: 'Feb', value: 200 },
  { label: 'Mar', value: 150 },
];

describe('MonthlyChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MonthlyChart data={sampleData} seriesName="Consumo" unit="kWh" />,
    );
    expect(container).toBeTruthy();
    expect(screen.getByTestId('highcharts-mock')).toBeTruthy();
  });

  it('shows mode toggle buttons by default', () => {
    render(
      <MonthlyChart data={sampleData} seriesName="Consumo" unit="kWh" />,
    );
    expect(screen.getByText('Barra')).toBeTruthy();
    expect(screen.getByText('Línea')).toBeTruthy();
    expect(screen.getByText('Área')).toBeTruthy();
    expect(screen.getByText('Torta')).toBeTruthy();
  });

  it('clicking mode button changes active state', () => {
    render(
      <MonthlyChart data={sampleData} seriesName="Consumo" unit="kWh" />,
    );
    const lineBtn = screen.getByText('Línea');
    fireEvent.click(lineBtn);
    // After clicking, the line button should have the active bg class
    expect(lineBtn.className).toContain('bg-[var(--color-primary');
    // The column button should no longer be active
    const colBtn = screen.getByText('Barra');
    expect(colBtn.className).not.toContain('bg-[var(--color-primary');
  });

  it('hides toggle when only one mode provided', () => {
    render(
      <MonthlyChart
        data={sampleData}
        seriesName="Consumo"
        unit="kWh"
        modes={['column']}
      />,
    );
    expect(screen.queryByText('Barra')).toBeNull();
    expect(screen.queryByText('Línea')).toBeNull();
  });

  it('hides toggle when mode is controlled externally', () => {
    render(
      <MonthlyChart
        data={sampleData}
        seriesName="Consumo"
        unit="kWh"
        mode="line"
        onModeChange={vi.fn()}
      />,
    );
    // Toggle should not render when mode is controlled
    expect(screen.queryByText('Barra')).toBeNull();
  });
});
