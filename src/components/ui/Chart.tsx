import { useRef, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const darkTheme: Highcharts.Options = {
  colors: ['#388bfd', '#f78166', '#3dc9b0', '#d29922', '#f85149'],
  chart: {
    backgroundColor: '#161b22',
    style: { fontFamily: 'ui-sans-serif, system-ui, sans-serif' },
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 0,
    height: 280,
  },
  title: { style: { color: '#e6edf3', fontSize: '14px', fontWeight: 'bold' } },
  xAxis: { lineColor: '#30363d', tickColor: '#30363d', labels: { style: { color: '#8b949e', fontSize: '11px' } } },
  yAxis: { gridLineColor: '#1e2530', labels: { style: { color: '#8b949e', fontSize: '11px' } }, title: { style: { color: '#6e7681', fontSize: '11px' } } },
  legend: { itemStyle: { color: '#8b949e', fontSize: '11px' } },
  tooltip: { backgroundColor: '#1e2530', borderColor: '#30363d', style: { color: '#e6edf3' } },
  plotOptions: { series: { borderWidth: 0 } },
  credits: { enabled: false },
};

interface ChartProps {
  options: Highcharts.Options;
  className?: string;
  onPointHover?: (index: number | null) => void;
  highlightIndex?: number | null;
}

export function Chart({ options, className = '', onPointHover, highlightIndex }: ChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const merged: Highcharts.Options = {
    ...darkTheme,
    ...options,
    chart: { ...darkTheme.chart, ...options.chart },
    title: { ...darkTheme.title, ...options.title },
    xAxis: { ...darkTheme.xAxis as object, ...options.xAxis as object },
    yAxis: { ...darkTheme.yAxis as object, ...options.yAxis as object },
    tooltip: { ...darkTheme.tooltip, ...options.tooltip },
    plotOptions: {
      ...darkTheme.plotOptions,
      ...options.plotOptions,
      series: {
        ...darkTheme.plotOptions?.series,
        ...options.plotOptions?.series,
        point: {
          events: {
            mouseOver: function (this: Highcharts.Point) {
              onPointHover?.(this.index);
            },
            mouseOut: function () {
              onPointHover?.(null);
            },
          },
        },
      },
    },
  };

  useEffect(() => {
    const chart = chartRef.current?.chart;
    if (!chart || highlightIndex == null) {
      chart?.series[0]?.points?.forEach((p) => p.setState(''));
      chart?.tooltip.hide();
      return;
    }
    const point = chart.series[0]?.points?.[highlightIndex];
    if (point) {
      point.setState('hover');
      chart.tooltip.refresh(point);
    }
  }, [highlightIndex]);

  return (
    <div className={`overflow-hidden ${className}`}>
      <HighchartsReact ref={chartRef} highcharts={Highcharts} options={merged} />
    </div>
  );
}
