import { useRef } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';

// Quitar etiqueta "Zoom" del range selector (solo texto; los botones se mantienen)
Highcharts.setOptions({
  lang: { rangeSelectorZoom: '' },
});

// Patch: guard against "Cannot read properties of undefined (reading 'hoverPoint')"
// https://github.com/highcharts/highcharts/issues/
const proto = Highcharts.Pointer.prototype as unknown as Record<string, unknown>;
const origClick = proto.onContainerClick as ((...args: unknown[]) => void) | undefined;
if (origClick && !(origClick as { __patched?: boolean }).__patched) {
  proto.onContainerClick = function (this: unknown, ...args: unknown[]) {
    try {
      return origClick.apply(this, args);
    } catch { /* swallow hoverPoint undefined */ }
  };
  (proto.onContainerClick as { __patched?: boolean }).__patched = true;
}

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
  xAxis: { lineColor: '#30363d', tickColor: '#30363d', labels: { style: { color: '#8b949e', fontSize: '11px' } }, minRange: 3600000 },
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
    buttonSpacing: 12,
    buttonTheme: {
      fill: '#21262d',
      stroke: '#30363d',
      'stroke-width': 1,
      r: 6,
      style: { color: '#c9d1d9', fontSize: '12px', fontWeight: '500' },
      states: {
        hover: { fill: '#30363d', style: { color: '#e6edf3' } },
        select: { fill: '#388bfd', stroke: '#388bfd', style: { color: '#ffffff' } },
      },
    },
    inputStyle: { color: '#e6edf3', backgroundColor: '#1e2530' },
    labelStyle: { color: '#8b949e', width: 0 },
    inputEnabled: false,
    buttons: [
      { type: 'day', count: 1, text: '1 Día' },
      { type: 'week', count: 1, text: '1 Semana' },
      { type: 'month', count: 1, text: '1 Mes' },
    ],
  },
};

interface StockChartProps {
  options: Highcharts.Options;
  className?: string;
  loading?: boolean;
  onRangeChange?: (min: number, max: number) => void;
}

export function StockChart({ options, className = '', loading, onRangeChange }: StockChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  // Config estable del rangeSelector: se fija en el primer render y no se vuelve a pasar,
  // para que chart.update() no pise el estado interno del botón seleccionado y los botones no se traben.
  const rangeSelectorConfigRef = useRef<Highcharts.RangeSelectorOptions | null>(null);
  if (rangeSelectorConfigRef.current === null) {
    rangeSelectorConfigRef.current = {
      ...(darkTheme.rangeSelector as object),
      ...(options.rangeSelector as object),
      selected: 2,
    } as Highcharts.RangeSelectorOptions;
  }
  const rangeSelector = rangeSelectorConfigRef.current;

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
    rangeSelector,
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
    <div className={`relative overflow-hidden ${className}`}>
      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        constructorType="stockChart"
        options={merged}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-base/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}
    </div>
  );
}
