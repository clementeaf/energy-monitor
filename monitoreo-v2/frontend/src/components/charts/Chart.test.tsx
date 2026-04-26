import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('highcharts', () => ({ default: { setOptions: vi.fn() } }));
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
}));

import { Chart } from './Chart';

const minimalOptions: Highcharts.Options = {
  series: [{ type: 'line', data: [1, 2, 3] }],
};

describe('Chart', () => {
  it('renders without crashing', () => {
    const { container } = render(<Chart options={minimalOptions} />);
    expect(container).toBeTruthy();
  });

  it('shows ChartSkeleton when loading=true', () => {
    const { container } = render(<Chart options={minimalOptions} loading />);
    // ChartSkeleton renders a div with shimmer animation and y-axis labels
    expect(container.querySelector('[class*="shimmer"]')).toBeTruthy();
    // Should NOT render the highcharts mock
    expect(screen.queryByTestId('highcharts-mock')).toBeNull();
  });

  it('does not show ChartSkeleton when loading=false', () => {
    render(<Chart options={minimalOptions} loading={false} />);
    expect(screen.getByTestId('highcharts-mock')).toBeTruthy();
  });

  it('does not show ChartSkeleton when loading is undefined', () => {
    render(<Chart options={minimalOptions} />);
    expect(screen.getByTestId('highcharts-mock')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Chart options={minimalOptions} className="my-custom-class" />,
    );
    const wrapper = container.querySelector('.my-custom-class');
    expect(wrapper).toBeTruthy();
  });
});
