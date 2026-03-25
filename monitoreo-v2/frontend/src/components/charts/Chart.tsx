import { useRef, useEffect, useMemo } from 'react';
import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { baseChartOptions } from '../../lib/chart-config';

interface ChartProps {
  options: Highcharts.Options;
  className?: string;
  /** Index of the point to programmatically highlight (hover sync). */
  highlightIndex?: number | null;
  /** Called when user hovers a point; null on mouse out. */
  onPointHover?: (index: number | null) => void;
}

export function Chart({ options, className, highlightIndex, onPointHover }: ChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const merged = useMemo<Highcharts.Options>(() => {
    const base = baseChartOptions();
    return {
      ...base,
      ...options,
      chart: { ...base.chart, height: 280, ...options.chart },
      title: { ...base.title, ...options.title },
      xAxis: { ...(base.xAxis as object), ...(options.xAxis as object) },
      yAxis: { ...(base.yAxis as object), ...(options.yAxis as object) },
      tooltip: { ...base.tooltip, ...options.tooltip },
      plotOptions: {
        ...base.plotOptions,
        ...options.plotOptions,
        series: {
          ...base.plotOptions?.series,
          ...options.plotOptions?.series,
          point: {
            events: {
              mouseOver(this: Highcharts.Point) { onPointHover?.(this.index); },
              mouseOut() { onPointHover?.(null); },
            },
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

  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <HighchartsReact ref={chartRef} highcharts={Highcharts} options={merged} />
    </div>
  );
}
