import { useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { HierarchyChildSummary } from '../../../types';

interface Props {
  children: HierarchyChildSummary[];
  onDrill: (nodeId: string) => void;
}

export function DrilldownBars({ children, onDrill }: Props) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const totalKwh = children.reduce((s, c) => s + c.totalKwh, 0) || 1;
  const sorted = [...children].sort((a, b) => b.totalKwh - a.totalKwh);

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      backgroundColor: '#161b22',
      style: { fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif" },
      borderColor: '#30363d',
      borderWidth: 1,
      borderRadius: 8,
      height: 300,
    },
    title: { text: 'kWh por nodo', style: { color: '#e6edf3', fontSize: '13px', fontWeight: 'bold' } },
    credits: { enabled: false },
    xAxis: {
      categories: sorted.map((c) => c.name),
      lineColor: '#30363d',
      labels: { style: { color: '#8b949e', fontSize: '11px' } },
    },
    yAxis: {
      title: { text: 'kWh', style: { color: '#6e7681', fontSize: '11px' } },
      gridLineColor: '#1e2530',
      labels: { style: { color: '#8b949e', fontSize: '11px' } },
    },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: '#1e2530',
      borderColor: '#30363d',
      style: { color: '#e6edf3' },
      formatter: function () {
        const pct = ((Number(this.y) / totalKwh) * 100).toFixed(1);
        return `<b>${this.x}</b><br/>kWh: ${Number(this.y).toFixed(1)}<br/>${pct}% del total`;
      },
    },
    plotOptions: {
      bar: {
        cursor: 'pointer',
        borderWidth: 0,
        borderRadius: 3,
        colorByPoint: true,
        point: {
          events: {
            click: function () {
              const idx = this.index;
              onDrill(sorted[idx].id);
            },
          },
        },
      },
    },
    colors: ['#388bfd', '#3dc9b0', '#d29922', '#f78166', '#f85149', '#a371f7', '#79c0ff', '#56d364'],
    series: [
      {
        type: 'bar',
        name: 'kWh',
        data: sorted.map((c) => c.totalKwh),
      },
    ],
  };

  return (
    <div className="overflow-hidden">
      <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} />
    </div>
  );
}
