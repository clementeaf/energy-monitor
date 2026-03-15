export type ChartType = 'column' | 'line' | 'area';

export const CHART_COLORS = {
  blue: '#3D3BF3',
  coral: '#E84C6F',
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
