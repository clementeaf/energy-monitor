import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('highcharts/highstock', () => {
  const mock = { setOptions: vi.fn(), Pointer: { prototype: {} } };
  return { default: mock };
});
vi.mock('highcharts-react-official', () => ({
  HighchartsReact: () => <div data-testid="highcharts-mock" />,
}));
vi.mock('../../lib/chart-config', () => ({
  baseChartOptions: () => ({
    chart: {},
    title: {},
    xAxis: {},
    yAxis: {},
    tooltip: {},
    plotOptions: { series: {} },
    colors: ['#3D3BF3'],
  }),
  stockChartExtras: () => ({
    rangeSelector: {},
    navigator: {},
  }),
}));

import { StockChart } from './StockChart';

const minimalOptions: Highcharts.Options = {
  series: [{ type: 'line', data: [1, 2, 3] }],
};

describe('StockChart', () => {
  it('renders without crashing', () => {
    const { container } = render(<StockChart options={minimalOptions} />);
    expect(container).toBeTruthy();
    expect(screen.getByTestId('highcharts-mock')).toBeTruthy();
  });

  it('shows spinner overlay when loading=true', () => {
    const { container } = render(<StockChart options={minimalOptions} loading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('does not show spinner when loading=false', () => {
    const { container } = render(
      <StockChart options={minimalOptions} loading={false} />,
    );
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StockChart options={minimalOptions} className="stock-custom" />,
    );
    const wrapper = container.querySelector('.stock-custom');
    expect(wrapper).toBeTruthy();
  });
});
