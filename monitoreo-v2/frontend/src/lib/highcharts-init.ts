import HighchartsStock from 'highcharts/highstock';
import 'highcharts/highcharts-more';

const sharedOptions = {
  lang: { rangeSelectorZoom: '' },
  // Suppress HC warning; full a11y module needs separate init per bundle (core vs stock).
  accessibility: { enabled: false },
};

HighchartsStock.setOptions(sharedOptions);

// Single Highcharts instance (highstock includes core). highcharts-more must attach here.
export { HighchartsStock as Highcharts, HighchartsStock };
