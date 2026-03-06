import { useRef } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';

const darkTheme: Highcharts.Options = {
  colors: ['#388bfd', '#f78166', '#3dc9b0', '#d29922', '#f85149'],
  chart: {
    backgroundColor: '#161b22',
    style: { fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif" },
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 8,
    height: 380,
  },
  title: { style: { color: '#e6edf3', fontSize: '14px', fontWeight: 'bold' } },
  xAxis: { lineColor: '#30363d', tickColor: '#30363d', labels: { style: { color: '#8b949e', fontSize: '11px' } } },
  yAxis: { gridLineColor: '#1e2530', labels: { style: { color: '#8b949e', fontSize: '11px' } }, title: { style: { color: '#6e7681', fontSize: '11px' } } },
  legend: { enabled: true, itemStyle: { color: '#8b949e', fontSize: '11px' }, itemHoverStyle: { color: '#e6edf3' }, itemHiddenStyle: { color: '#484f58' } },
  tooltip: { backgroundColor: '#1e2530', borderColor: '#30363d', style: { color: '#e6edf3' } },
  plotOptions: { series: { borderWidth: 0 } },
  credits: { enabled: false },
  navigator: {
    height: 40,
    maskFill: 'rgba(56, 139, 253, 0.12)',
    outlineColor: '#30363d',
    handles: {
      backgroundColor: '#388bfd',
      borderColor: '#1e2530',
    },
    xAxis: {
      gridLineColor: '#1e2530',
      labels: { style: { color: '#6e7681', fontSize: '10px' } },
    },
    series: { color: '#388bfd', lineWidth: 1 },
  },
  scrollbar: { enabled: false },
  rangeSelector: {
    enabled: true,
    buttonTheme: {
      fill: '#1e2530',
      stroke: '#30363d',
      style: { color: '#8b949e', fontSize: '11px' },
      states: {
        hover: { fill: '#30363d', style: { color: '#e6edf3' } },
        select: { fill: '#388bfd', style: { color: '#ffffff' } },
      },
    },
    inputStyle: { color: '#e6edf3', backgroundColor: '#1e2530' },
    labelStyle: { color: '#8b949e' },
    inputEnabled: false,
    buttons: [
      { type: 'day', count: 1, text: '1d' },
      { type: 'week', count: 1, text: '1s' },
      { type: 'month', count: 1, text: '1m' },
      { type: 'all', text: 'Todo' },
    ],
    selected: 1,
  },
};

interface StockChartProps {
  options: Highcharts.Options;
  className?: string;
  onRangeChange?: (min: number, max: number) => void;
}

export function StockChart({ options, className = '', onRangeChange }: StockChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const xAxisWithEvent = {
    ...darkTheme.xAxis as object,
    ...options.xAxis as object,
    events: {
      ...(options.xAxis as Highcharts.XAxisOptions | undefined)?.events,
      afterSetExtremes: onRangeChange
        ? function (this: void, e: Highcharts.AxisSetExtremesEventObject) {
            if (e.min != null && e.max != null) onRangeChange(e.min, e.max);
          }
        : undefined,
    },
  };

  // yAxis: if options passes an array (dual-axis), apply theme styles to each axis
  const themeY = darkTheme.yAxis as Highcharts.YAxisOptions;
  const mergedYAxis = Array.isArray(options.yAxis)
    ? options.yAxis.map((ax) => ({ ...themeY, ...ax }))
    : { ...themeY, ...options.yAxis as object };

  const merged: Highcharts.Options = {
    ...darkTheme,
    ...options,
    chart: { ...darkTheme.chart, ...options.chart },
    title: { ...darkTheme.title, ...options.title },
    xAxis: xAxisWithEvent,
    yAxis: mergedYAxis,
    tooltip: { ...darkTheme.tooltip, ...options.tooltip },
    navigator: { ...darkTheme.navigator as object, ...options.navigator as object },
    rangeSelector: { ...darkTheme.rangeSelector as object, ...options.rangeSelector as object },
    plotOptions: {
      ...darkTheme.plotOptions,
      ...options.plotOptions,
      series: {
        ...darkTheme.plotOptions?.series,
        ...options.plotOptions?.series,
      },
    },
  };

  return (
    <div className={`overflow-hidden ${className}`}>
      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        constructorType="stockChart"
        options={merged}
      />
    </div>
  );
}
