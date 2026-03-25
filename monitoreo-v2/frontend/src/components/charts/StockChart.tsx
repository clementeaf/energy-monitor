import { useRef, useMemo } from 'react';
import Highcharts from 'highcharts/highstock';
import { HighchartsReact } from 'highcharts-react-official';
import { baseChartOptions, stockChartExtras } from '../../lib/chart-config';

// Remove "Zoom" label from range selector
Highcharts.setOptions({ lang: { rangeSelectorZoom: '' } });

// Guard against "Cannot read properties of undefined (reading 'hoverPoint')"
const proto = Highcharts.Pointer.prototype as unknown as Record<string, unknown>;
const origClick = proto.onContainerClick as ((...args: unknown[]) => void) | undefined;
if (origClick && !(origClick as { __patched?: boolean }).__patched) {
  proto.onContainerClick = function (this: unknown, ...args: unknown[]) {
    try { return origClick.apply(this, args); } catch { /* safe */ }
  };
  (proto.onContainerClick as { __patched?: boolean }).__patched = true;
}

interface StockChartProps {
  options: Highcharts.Options;
  className?: string;
  loading?: boolean;
  /** Called after user changes the visible range (zoom / range selector). */
  onRangeChange?: (min: number, max: number) => void;
}

export function StockChart({ options, className, loading, onRangeChange }: StockChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Lock range selector config on first render so chart.update() doesn't
  // reset the selected button state.
  const rangeSelectorRef = useRef<Highcharts.RangeSelectorOptions | null>(null);
  if (rangeSelectorRef.current === null) {
    const extras = stockChartExtras();
    rangeSelectorRef.current = {
      ...(extras.rangeSelector as object),
      ...(options.rangeSelector as object),
      selected: 2,
    } as Highcharts.RangeSelectorOptions;
  }

  const merged = useMemo<Highcharts.Options>(() => {
    const base = baseChartOptions();
    const extras = stockChartExtras();

    const xAxis: Highcharts.XAxisOptions = {
      ...(base.xAxis as object),
      ...(options.xAxis as object),
      minRange: 3600000,
      events: {
        ...(options.xAxis as Highcharts.XAxisOptions | undefined)?.events,
        afterSetExtremes: onRangeChange
          ? (e: Highcharts.AxisSetExtremesEventObject) => {
              if (e.min != null && e.max != null) onRangeChange(e.min, e.max);
            }
          : undefined,
      },
    };

    // Support dual-axis: if options.yAxis is an array, apply base styles to each
    const baseY = base.yAxis as Highcharts.YAxisOptions;
    const yAxis = Array.isArray(options.yAxis)
      ? options.yAxis.map((ax) => ({ ...baseY, ...ax }))
      : { ...baseY, ...(options.yAxis as object) };

    return {
      ...base,
      ...extras,
      ...options,
      chart: { ...base.chart, height: 380, ...options.chart },
      title: { ...base.title, ...options.title },
      xAxis,
      yAxis,
      tooltip: { ...base.tooltip, ...options.tooltip },
      navigator: { ...(extras.navigator as object), ...(options.navigator as object) },
      rangeSelector: rangeSelectorRef.current!,
      plotOptions: {
        ...base.plotOptions,
        ...options.plotOptions,
        series: { ...base.plotOptions?.series, ...options.plotOptions?.series },
      },
    };
  }, [options, onRangeChange]);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        constructorType="stockChart"
        options={merged}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary,#3D3BF3)] border-t-transparent" />
        </div>
      )}
    </div>
  );
}
