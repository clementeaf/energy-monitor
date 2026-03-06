import { useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsTreemap from 'highcharts/modules/treemap';
import type { HierarchyChildSummary } from '../../../types';

// Initialize treemap module - handle both ESM default and CJS exports
const initTreemap = (HighchartsTreemap as unknown as { default?: (H: typeof Highcharts) => void }).default ?? HighchartsTreemap;
if (typeof initTreemap === 'function') initTreemap(Highcharts);

interface Props {
  children: HierarchyChildSummary[];
  onDrill: (nodeId: string) => void;
}

export function DrilldownTreemap({ children, onDrill }: Props) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const maxKwh = Math.max(...children.map((c) => c.totalKwh), 1);

  const data = children.map((c) => ({
    name: c.name,
    value: Math.max(c.totalKwh, 0.01),
    colorValue: c.totalKwh / maxKwh,
    nodeId: c.id,
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
    title: { text: 'Consumo por nodo', style: { color: '#e6edf3', fontSize: '13px', fontWeight: 'bold' } },
    credits: { enabled: false },
    colorAxis: {
      minColor: '#3dc9b0',
      maxColor: '#f85149',
      labels: { style: { color: '#8b949e' } },
    },
    tooltip: {
      backgroundColor: '#1e2530',
      borderColor: '#30363d',
      style: { color: '#e6edf3' },
      pointFormat: '<b>{point.name}</b><br/>kWh: {point.value:.1f}',
    },
    series: [
      {
        type: 'treemap',
        layoutAlgorithm: 'squarified',
        data,
        dataLabels: {
          enabled: true,
          format: '{point.name}',
          style: { color: '#e6edf3', fontSize: '11px', textOutline: 'none' },
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
