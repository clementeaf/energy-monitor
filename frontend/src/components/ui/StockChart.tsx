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

const lightTheme: Highcharts.Options = {
  colors: ['#009999', '#E84C6F', '#2D9F5D', '#F5A623', '#6366F1'],
  chart: {
    backgroundColor: '#ffffff',
    style: { fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif" },
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    height: 380,
  },
  title: { style: { color: '#1F2937', fontSize: '14px', fontWeight: 'bold' } },
  xAxis: { lineColor: '#E5E7EB', tickColor: '#E5E7EB', labels: { style: { color: '#6B7280', fontSize: '11px' } }, minRange: 3600000 },
  yAxis: { gridLineColor: '#F3F4F6', labels: { style: { color: '#6B7280', fontSize: '11px' } }, title: { style: { color: '#9CA3AF', fontSize: '11px' } } },
  legend: { enabled: true, itemStyle: { color: '#6B7280', fontSize: '11px' }, itemHoverStyle: { color: '#1F2937' }, itemHiddenStyle: { color: '#D1D5DB' } },
  tooltip: { backgroundColor: '#ffffff', borderColor: '#E5E7EB', style: { color: '#1F2937' } },
  plotOptions: { series: { borderWidth: 0 } },
  credits: { enabled: false },
  navigator: {
    height: 40,
    maskFill: 'rgba(0, 153, 153, 0.12)',
    outlineColor: '#E5E7EB',
    handles: { backgroundColor: '#009999', borderColor: '#ffffff' },
    xAxis: { gridLineColor: '#F3F4F6', labels: { style: { color: '#9CA3AF', fontSize: '10px' } } },
    series: { color: '#009999', lineWidth: 1 },
  },
  scrollbar: { enabled: false },
  rangeSelector: {
    enabled: true,
    buttonSpacing: 12,
    buttonTheme: {
      fill: '#F3F4F6',
      stroke: '#E5E7EB',
      'stroke-width': 1,
      r: 6,
      style: { color: '#374151', fontSize: '12px', fontWeight: '500' },
      states: {
        hover: { fill: '#E5E7EB', style: { color: '#1F2937' } },
        select: { fill: '#009999', stroke: '#009999', style: { color: '#ffffff' } },
      },
    },
    inputStyle: { color: '#1F2937', backgroundColor: '#F3F4F6' },
    labelStyle: { color: '#9CA3AF', width: 0 },
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
  variant?: 'dark' | 'light';
}

export function StockChart({ options, className = '', loading, onRangeChange, variant = 'dark' }: StockChartProps) {
  const baseTheme = variant === 'light' ? lightTheme : darkTheme;
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  // Config estable del rangeSelector: se fija en el primer render y no se vuelve a pasar,
  // para que chart.update() no pise el estado interno del botón seleccionado y los botones no se traben.
  const rangeSelectorConfigRef = useRef<Highcharts.RangeSelectorOptions | null>(null);
  if (rangeSelectorConfigRef.current === null) {
    rangeSelectorConfigRef.current = {
      ...(baseTheme.rangeSelector as object),
      ...(options.rangeSelector as object),
      selected: 2,
    } as Highcharts.RangeSelectorOptions;
  }
  const rangeSelector = rangeSelectorConfigRef.current;

  const xAxisWithEvent = {
    ...baseTheme.xAxis as object,
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
  const themeY = baseTheme.yAxis as Highcharts.YAxisOptions;
  const mergedYAxis = Array.isArray(options.yAxis)
    ? options.yAxis.map((ax) => ({ ...themeY, ...ax }))
    : { ...themeY, ...options.yAxis as object };

  const merged: Highcharts.Options = {
    ...baseTheme,
    ...options,
    chart: { ...baseTheme.chart, ...options.chart },
    title: { ...baseTheme.title, ...options.title },
    xAxis: xAxisWithEvent,
    yAxis: mergedYAxis,
    tooltip: { ...baseTheme.tooltip, ...options.tooltip },
    navigator: { ...baseTheme.navigator as object, ...options.navigator as object },
    rangeSelector,
    plotOptions: {
      ...baseTheme.plotOptions,
      ...options.plotOptions,
      series: {
        ...baseTheme.plotOptions?.series,
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
