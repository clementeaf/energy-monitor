import { useRef, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const monochromeTheme: Highcharts.Options = {
  colors: ['#333', '#666', '#999', '#bbb', '#ddd'],
  chart: {
    backgroundColor: '#fff',
    style: { fontFamily: 'ui-sans-serif, system-ui, sans-serif' },
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 0,
    height: 280,
  },
  title: { style: { color: '#000', fontSize: '14px', fontWeight: 'bold' } },
  xAxis: { lineColor: '#e0e0e0', tickColor: '#e0e0e0', labels: { style: { color: '#666', fontSize: '11px' } } },
  yAxis: { gridLineColor: '#f0f0f0', labels: { style: { color: '#666', fontSize: '11px' } }, title: { style: { color: '#999', fontSize: '11px' } } },
  legend: { itemStyle: { color: '#333', fontSize: '11px' } },
  tooltip: { backgroundColor: '#fff', borderColor: '#e0e0e0', style: { color: '#333' } },
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
    ...monochromeTheme,
    ...options,
    chart: { ...monochromeTheme.chart, ...options.chart },
    title: { ...monochromeTheme.title, ...options.title },
    xAxis: { ...monochromeTheme.xAxis as object, ...options.xAxis as object },
    yAxis: { ...monochromeTheme.yAxis as object, ...options.yAxis as object },
    tooltip: { ...monochromeTheme.tooltip, ...options.tooltip },
    plotOptions: {
      ...monochromeTheme.plotOptions,
      ...options.plotOptions,
      series: {
        ...monochromeTheme.plotOptions?.series,
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
