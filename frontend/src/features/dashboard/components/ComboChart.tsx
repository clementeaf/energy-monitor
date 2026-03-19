import { useRef, useEffect } from 'react';
import Highcharts from 'highcharts';
import { fmtClp, fmtAxis } from '../../../lib/formatters';
import { SHORT_BUILDING_NAMES } from '../../../lib/constants';
import { CHART_COLORS, LIGHT_PLOT_OPTIONS, LIGHT_TOOLTIP_STYLE, type ChartType } from '../../../lib/chartConfig';

interface BuildingRow {
  name: string;
  totalKwh: number | null;
  totalConIvaClp: number | null;
  areaSqm: number | null;
  totalMeters: number;
}

const PIE_COLORS = ['#3D3BF3', '#E84C6F', '#2D9F5D', '#F5A623', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'];

export function ComboChart({ data, chartType, metric = 'consumo', viewMode = 'anual' }: { data: BuildingRow[]; chartType: ChartType; metric?: 'consumo' | 'gasto'; viewMode?: 'anual' | 'mensual' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current?.destroy();
    chartRef.current = null;

    const names = data.map((b) => SHORT_BUILDING_NAMES[b.name] ?? b.name);
    const consumo = data.map((b) => Math.round((b.totalKwh ?? 0) / 1000));
    const gasto = data.map((b) => b.totalConIvaClp ?? 0);
    const consumoUnit = 'Mwh';

    const isConsumo = metric === 'consumo';
    const seriesName = 'Activos Inmobiliarios';
    const seriesColor = isConsumo ? CHART_COLORS.blue : CHART_COLORS.coral;
    const seriesData = isConsumo ? consumo : gasto;

    if (chartType === 'pie') {
      const points = data.map((b, i) => ({
        name: names[i],
        y: isConsumo ? Math.round((b.totalKwh ?? 0) / 1000) : (b.totalConIvaClp ?? 0),
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));

      chartRef.current = Highcharts.chart({
        chart: { height: null as unknown as number, borderRadius: 12, renderTo: containerRef.current! },
        title: { text: undefined },
        tooltip: {
          useHTML: true,
          ...LIGHT_TOOLTIP_STYLE,
          pointFormatter() {
            const p = this as Highcharts.Point;
            const val = isConsumo
              ? `${(p.y ?? 0).toLocaleString('es-CL')} ${consumoUnit}`
              : fmtClp(p.y ?? 0);
            return `<b>${val}</b> (${Highcharts.numberFormat(p.percentage!, 1)}%)`;
          },
        },
        plotOptions: {
          pie: {
            borderWidth: 0,
            dataLabels: { enabled: true, format: '{point.name}', style: { fontSize: '11px', color: '#6B7280', textOutline: 'none' } },
          },
        },
        series: [
          {
            type: 'pie',
            name: seriesName,
            data: points,
          },
        ],
        credits: { enabled: false },
      });
    } else {
      chartRef.current = Highcharts.chart({
        chart: { height: null as unknown as number, backgroundColor: '#ffffff', borderRadius: 12, renderTo: containerRef.current!, spacingBottom: 20 },
        title: { text: undefined },
        xAxis: {
          categories: names,
          labels: { rotation: -30, style: { fontSize: '11px', color: '#6B7280' }, overflow: 'allow', padding: 5 },
          lineColor: '#E5E7EB',
          tickColor: '#E5E7EB',
        },
        yAxis: {
          title: { text: isConsumo ? `Consumo (${consumoUnit})` : 'Ingreso (CLP)', style: { color: seriesColor, fontSize: '11px' } },
          tickAmount: 5,
          labels: {
            formatter() {
              const v = this.value as number;
              return isConsumo ? v.toLocaleString('es-CL') : `$${fmtAxis(v)}`;
            },
            style: { color: '#6B7280', fontSize: '11px' },
          },
          gridLineColor: '#F3F4F6',
        },
        legend: { enabled: false },
        tooltip: {
          shared: true,
          useHTML: true,
          ...LIGHT_TOOLTIP_STYLE,
          formatter() {
            const points = this.points!;
            let html = `<b style="color:#1B1464">${this.x}</b><br/>`;
            for (const p of points) {
              const val = isConsumo
                ? `${(p.y ?? 0).toLocaleString('es-CL')} ${consumoUnit}`
                : fmtClp(p.y ?? 0);
              html += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${val}</b><br/>`;
            }
            return html;
          },
        },
        plotOptions: LIGHT_PLOT_OPTIONS,
        series: [
          {
            type: chartType as 'column' | 'line' | 'area',
            name: seriesName,
            data: seriesData,
            color: seriesColor,
          },
        ],
        credits: { enabled: false },
      });
    }

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, chartType, metric, viewMode]);

  return <div ref={containerRef} className="h-full" />;
}
