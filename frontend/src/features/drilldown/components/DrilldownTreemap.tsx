import { useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsTreemap from 'highcharts/modules/treemap';
import type { HierarchyChildSummary } from '../../../types';

// Initialize treemap module - handle both ESM default and CJS exports
const initTreemap = (HighchartsTreemap as unknown as { default?: (H: typeof Highcharts) => void }).default ?? HighchartsTreemap;
if (typeof initTreemap === 'function') initTreemap(Highcharts);

const COLORS = ['#388bfd', '#3dc9b0', '#d29922', '#f78166', '#f85149', '#a371f7', '#79c0ff', '#56d364'];

interface Props {
  children: HierarchyChildSummary[];
  onDrill: (nodeId: string) => void;
}

export function DrilldownTreemap({ children, onDrill }: Props) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const totalKwh = children.reduce((s, c) => s + c.totalKwh, 0) || 1;
  const sorted = [...children].sort((a, b) => b.totalKwh - a.totalKwh);

  const data = sorted.map((c, i) => ({
    name: c.name,
    value: Math.max(c.totalKwh, 0.01),
    color: COLORS[i % COLORS.length],
    nodeId: c.id,
    pct: ((c.totalKwh / totalKwh) * 100).toFixed(1),
    kwh: c.totalKwh.toFixed(0),
  }));

  const options: Highcharts.Options = {
    chart: {
      backgroundColor: '#161b22',
      style: { fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif" },
      borderColor: '#30363d',
      borderWidth: 1,
      borderRadius: 8,
      height: 300,
    },
    title: { text: 'Distribución de consumo', style: { color: '#e6edf3', fontSize: '13px', fontWeight: 'bold' } },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: '#1e2530',
      borderColor: '#30363d',
      style: { color: '#e6edf3' },
      formatter: function () {
        const p = this.point as unknown as { kwh: string; pct: string };
        return `<b>${this.point.name}</b><br/>${p.kwh} kWh<br/>${p.pct}% del total`;
      },
    },
    series: [
      {
        type: 'treemap',
        layoutAlgorithm: 'squarified',
        data,
        dataLabels: {
          enabled: true,
          format: '{point.name}<br/>{point.kwh} kWh',
          style: { color: '#e6edf3', fontSize: '11px', fontWeight: 'normal', textOutline: '1px #000' },
        },
        cursor: 'pointer',
        point: {
          events: {
            click: function () {
              const p = this as unknown as { nodeId?: string };
              if (p.nodeId) onDrill(p.nodeId);
            },
          },
        },
      },
    ],
  };

  return (
    <div className="overflow-hidden">
      <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} />
    </div>
  );
}
