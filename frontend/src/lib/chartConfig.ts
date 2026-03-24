export type ChartType = 'column' | 'line' | 'area' | 'pie';

const cssVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export const getChartColors = () => ({
  blue: cssVar('--color-pa-blue', '#3D3BF3'),
  coral: cssVar('--color-pa-coral', '#E84C6F'),
  navy: cssVar('--color-pa-navy', '#1B1464'),
  green: cssVar('--color-pa-green', '#2D9F5D'),
  amber: cssVar('--color-pa-amber', '#F5A623'),
  text: cssVar('--color-pa-text', '#1F2937'),
  border: cssVar('--color-pa-border', '#E5E7EB'),
});

export const getSeriesColors = () => {
  const c = getChartColors();
  return [c.blue, c.coral, c.green, c.amber, '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#10B981', '#A855F7', '#EF4444'];
};

// Backwards compat — static reference for simple cases
export const CHART_COLORS = {
  get blue() { return cssVar('--color-pa-blue', '#3D3BF3'); },
  get coral() { return cssVar('--color-pa-coral', '#E84C6F'); },
};

export const LIGHT_PLOT_OPTIONS: Highcharts.PlotOptions = {
  column: { borderRadius: 4, borderWidth: 0 },
  line: { marker: { radius: 4, symbol: 'circle' }, lineWidth: 2.5 },
  area: { marker: { radius: 3, symbol: 'circle' }, lineWidth: 2, fillOpacity: 0.15 },
};

export const LIGHT_TOOLTIP_STYLE: Partial<Highcharts.TooltipOptions> = {
  backgroundColor: '#FFFFFF',
  borderColor: '#E5E7EB',
  style: { color: '#1F2937' },
};
