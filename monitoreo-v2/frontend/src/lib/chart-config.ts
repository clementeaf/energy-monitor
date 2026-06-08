import type Highcharts from 'highcharts';

// ---------------------------------------------------------------------------
// Color palette — reads CSS variables at call time so it reacts to theme changes
// ---------------------------------------------------------------------------

const cssVar = (name: string, fallback: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export const getColors = () => ({
  primary: cssVar('--color-chart-1', cssVar('--color-brand', '#3a5b1e')),
  secondary: cssVar('--color-chart-2', cssVar('--color-brand-hover', '#272628')),
  text: cssVar('--color-chart-text', '#0a0a0a'),
  textMuted: cssVar('--color-chart-text-muted', '#6b6b6b'),
  border: cssVar('--color-chart-border', '#e5e5e5'),
  grid: cssVar('--color-chart-grid', '#fafafa'),
  bg: cssVar('--color-chart-bg', '#ffffff'),
});

export const getSeriesColors = (): string[] => {
  const c = getColors();
  return [
    c.primary,
    cssVar('--color-chart-3', '#6366f1'),
    cssVar('--color-chart-4', '#8b5cf6'),
    cssVar('--color-danger', '#ef4444'),
    cssVar('--color-success', '#10b981'),
    cssVar('--color-warning', '#f59e0b'),
    '#ec4899',
    '#14b8a6',
    '#f97316',
    c.secondary,
    '#a855f7',
    cssVar('--color-info', '#3b82f6'),
  ];
};

// ---------------------------------------------------------------------------
// Shared chart options — light, agnostic base
// ---------------------------------------------------------------------------

const FONT_FAMILY = "'Inter Variable', ui-sans-serif, system-ui, sans-serif";

export const baseChartOptions = (): Highcharts.Options => {
  const c = getColors();
  return {
    chart: {
      backgroundColor: c.bg,
      style: { fontFamily: FONT_FAMILY },
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 8,
    },
    title: { style: { color: c.text, fontSize: '14px', fontWeight: 'bold' } },
    xAxis: {
      lineColor: c.border,
      tickColor: c.border,
      labels: { style: { color: c.textMuted, fontSize: '11px' } },
    },
    yAxis: {
      gridLineColor: c.grid,
      labels: { style: { color: c.textMuted, fontSize: '11px' } },
      title: { style: { color: c.textMuted, fontSize: '11px' } },
    },
    legend: {
      enabled: true,
      itemStyle: { color: c.textMuted, fontSize: '11px' },
      itemHoverStyle: { color: c.text },
      itemHiddenStyle: { color: c.border },
    },
    tooltip: {
      backgroundColor: c.bg,
      borderColor: c.border,
      style: { color: c.text },
    },
    plotOptions: {
      series: { borderWidth: 0 },
      column: { borderRadius: 4, borderWidth: 0 },
      line: { marker: { radius: 4, symbol: 'circle' }, lineWidth: 2.5 },
      area: { marker: { radius: 3, symbol: 'circle' }, lineWidth: 2, fillOpacity: 0.15 },
    },
    credits: { enabled: false },
    colors: getSeriesColors(),
  };
};

// ---------------------------------------------------------------------------
// Stock chart additions (navigator, range selector)
// ---------------------------------------------------------------------------

export const stockChartExtras = (): Partial<Highcharts.Options> => {
  const c = getColors();
  return {
    navigator: {
      height: 40,
      maskFill: `${c.primary}1F`, // 12% opacity
      outlineColor: c.border,
      handles: { backgroundColor: c.primary, borderColor: c.bg },
      xAxis: {
        gridLineColor: c.grid,
        labels: { style: { color: c.textMuted, fontSize: '10px' } },
      },
      series: { color: c.primary, lineWidth: 1 },
    },
    scrollbar: { enabled: false },
    rangeSelector: {
      enabled: true,
      buttonSpacing: 12,
      buttonTheme: {
        fill: c.grid,
        stroke: c.border,
        'stroke-width': 1,
        r: 6,
        style: { color: c.text, fontSize: '12px', fontWeight: '500' },
        states: {
          hover: { fill: c.border, style: { color: c.text } },
          select: { fill: c.primary, stroke: c.primary, style: { color: '#ffffff' } },
        },
      },
      inputStyle: { color: c.text, backgroundColor: c.grid },
      labelStyle: { color: c.textMuted, width: 0 },
      inputEnabled: false,
      buttons: [
        { type: 'day', count: 1, text: '1d' },
        { type: 'week', count: 1, text: '1s' },
        { type: 'month', count: 1, text: '1m' },
      ],
    },
  };
};

// ---------------------------------------------------------------------------
// Axis label formatter for large numbers (K / M) with optional currency
// ---------------------------------------------------------------------------

export function axisLabelFormatter(this: Highcharts.AxisLabelsFormatterContextObject, currency?: string): string {
  const v = this.value as number;
  const prefix = currency ?? '';
  if (Math.abs(v) >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${prefix}${(v / 1_000).toFixed(0)}K`;
  return `${prefix}${v}`;
}
