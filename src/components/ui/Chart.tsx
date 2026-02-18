import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const monochromeTheme: Highcharts.Options = {
  colors: ['#333', '#666', '#999', '#bbb', '#ddd'],
  chart: {
    backgroundColor: '#fff',
    style: { fontFamily: 'ui-sans-serif, system-ui, sans-serif' },
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 0,
  },
  title: { style: { color: '#000', fontSize: '16px', fontWeight: 'bold' } },
  xAxis: { lineColor: '#e0e0e0', tickColor: '#e0e0e0', labels: { style: { color: '#666' } } },
  yAxis: { gridLineColor: '#f0f0f0', labels: { style: { color: '#666' } }, title: { style: { color: '#999' } } },
  legend: { itemStyle: { color: '#333' } },
  tooltip: { backgroundColor: '#fff', borderColor: '#e0e0e0', style: { color: '#333' } },
  plotOptions: { series: { borderWidth: 0 } },
  credits: { enabled: false },
};

interface ChartProps {
  options: Highcharts.Options;
  className?: string;
}

export function Chart({ options, className = '' }: ChartProps) {
  const merged: Highcharts.Options = {
    ...monochromeTheme,
    ...options,
    chart: { ...monochromeTheme.chart, ...options.chart },
    title: { ...monochromeTheme.title, ...options.title },
    xAxis: { ...monochromeTheme.xAxis as object, ...options.xAxis as object },
    yAxis: { ...monochromeTheme.yAxis as object, ...options.yAxis as object },
    tooltip: { ...monochromeTheme.tooltip, ...options.tooltip },
  };

  return (
    <div className={className}>
      <HighchartsReact highcharts={Highcharts} options={merged} />
    </div>
  );
}
