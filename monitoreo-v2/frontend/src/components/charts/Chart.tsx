import { useRef, useEffect, useMemo } from 'react';
import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { baseChartOptions } from '../../lib/chart-config';
import { WidgetErrorBoundary } from '../ui/WidgetErrorBoundary';
import { ChartSkeleton } from '../ui/ChartSkeleton';

/** Extracted outside component — avoids SonarQube "this in functional component" */
function makePointEvents(onPointHover?: (index: number | null) => void) {
  return {
    mouseOver(this: Highcharts.Point) { onPointHover?.(this.index); },
    mouseOut() { onPointHover?.(null); },
  };
}

interface ChartProps {
  options: Highcharts.Options;
  className?: string;
  /** Show loading skeleton instead of chart. */
  loading?: boolean;
  /** Index of the point to programmatically highlight (hover sync). */
  highlightIndex?: number | null;
  /** Called when user hovers a point; null on mouse out. */
  onPointHover?: (index: number | null) => void;
}

function ChartInner({ options, className, loading, highlightIndex, onPointHover }: Readonly<ChartProps>) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const merged = useMemo<Highcharts.Options>(() => {
    const base = baseChartOptions();
    return {
      ...base,
      ...options,
      chart: { ...base.chart, height: 280, spacingTop: 16, ...options.chart },
      title: { ...base.title, ...options.title },
      xAxis: { ...(base.xAxis as object), ...(options.xAxis as object) },
      yAxis: Array.isArray(options.yAxis) ? options.yAxis : { ...(base.yAxis as object), ...(options.yAxis as object) },
      tooltip: { ...base.tooltip, ...options.tooltip },
      plotOptions: {
        ...base.plotOptions,
        ...options.plotOptions,
        series: {
          ...base.plotOptions?.series,
          ...options.plotOptions?.series,
          point: {
            events: makePointEvents(onPointHover),
          },
        },
      },
    };
  }, [options, onPointHover]);

  useEffect(() => {
    const chart = chartRef.current?.chart;
    if (!chart) return;
    if (highlightIndex == null) {
      chart.series[0]?.points?.forEach((p) => p.setState(''));
      chart.tooltip.hide();
      return;
    }
    const point = chart.series[0]?.points?.[highlightIndex];
    if (point) {
      point.setState('hover');
      chart.tooltip.refresh(point);
    }
  }, [highlightIndex]);

  if (loading) {
    const h = (merged.chart as { height?: number })?.height ?? 280;
    return <ChartSkeleton height={h} />;
  }

  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <HighchartsReact ref={chartRef} highcharts={Highcharts} options={merged} />
    </div>
  );
}

/**
 * Gráfico de líneas con Highcharts; fallos de render quedan acotados al bloque.
 */
export function Chart(props: ChartProps) {
  return (
    <WidgetErrorBoundary>
      <ChartInner {...props} />
    </WidgetErrorBoundary>
  );
}
