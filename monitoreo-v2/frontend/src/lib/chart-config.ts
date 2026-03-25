import Highcharts from 'highcharts';

// ---------------------------------------------------------------------------
// Color palette — reads CSS variables at call time so it reacts to theme changes
// ---------------------------------------------------------------------------

const cssVar = (name: string, fallback: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export const getColors = () => ({
  primary: cssVar('--color-primary', '#3D3BF3'),
  secondary: cssVar('--color-secondary', '#1E1E2F'),
  text: cssVar('--color-chart-text', '#1F2937'),
  textMuted: cssVar('--color-chart-text-muted', '#6B7280'),
  border: cssVar('--color-chart-border', '#E5E7EB'),
  grid: cssVar('--color-chart-grid', '#F3F4F6'),
  bg: cssVar('--color-chart-bg', '#ffffff'),
});

export const getSeriesColors = (): string[] => {
  const c = getColors();
  return [
    c.primary, '#E84C6F', '#2D9F5D', '#F5A623', '#6366F1',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#10B981',
    '#A855F7', '#EF4444',
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
