import { useRef, useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { BRANDS, MONTHS, getStoreData, type StoreComparison } from './mockData';

const fmt = (n: number) => n.toLocaleString('es-CL');
const fmtClp = (n: number) => `$${n.toLocaleString('es-CL')}`;

const SHORT_NAMES: Record<string, string> = {
  'Parque Arauco Kennedy': 'P. Arauco Kennedy',
  'Arauco Premium Outlet Buenaventura': 'Outlet Buenaventura',
  'Puerto Nuevo Antofagasta': 'P. Nuevo Antofagasta',
};

function fmtAxis(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(val);
}

const columns: Column<StoreComparison>[] = [
  { label: 'Edificio', value: (r) => r.building, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.consumoKwh), total: (d) => fmt(d.reduce((s, r) => s + r.consumoKwh, 0)) },
  { label: 'Gasto ($)', value: (r) => fmtClp(r.gastoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.gastoClp, 0)) },
  { label: 'Superficie (m²)', value: (r) => fmt(r.metros), total: (d) => fmt(d.reduce((s, r) => s + r.metros, 0)) },
];

function ComparisonChart({ data }: { data: StoreComparison[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const categories = data.map((d) => SHORT_NAMES[d.building] ?? d.building);
    const consumo = data.map((d) => d.consumoKwh);
    const gasto = data.map((d) => d.gastoClp);

    if (chartRef.current) {
      chartRef.current.xAxis[0].setCategories(categories, false);
      chartRef.current.series[0].setData(consumo, false);
      chartRef.current.series[1].setData(gasto, true);
      return;
    }

    chartRef.current = Highcharts.chart(containerRef.current, {
      chart: { height: 320, backgroundColor: 'transparent' },
      title: { text: undefined },
      xAxis: {
        categories,
        labels: {
          rotation: -45,
          style: { fontSize: '10px', color: '#94a3b8' },
        },
        lineColor: '#334155',
      },
      yAxis: [
        {
          title: { text: 'Consumo (kWh)', style: { color: '#60a5fa' } },
          labels: {
            formatter() { return fmtAxis(this.value as number); },
            style: { color: '#94a3b8' },
          },
          gridLineColor: '#1e293b',
        },
        {
          title: { text: 'Gasto (CLP)', style: { color: '#f59e0b' } },
          labels: {
            formatter() { return `$${fmtAxis(this.value as number)}`; },
            style: { color: '#94a3b8' },
          },
          opposite: true,
          gridLineWidth: 0,
        },
      ],
      legend: {
        itemStyle: { color: '#94a3b8' },
        itemHoverStyle: { color: '#e2e8f0' },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        formatter() {
          const points = this.points!;
          let html = `<b>${this.x}</b><br/>`;
          for (const p of points) {
            const val = p.series.name === 'Consumo (kWh)'
              ? `${fmt(p.y!)} kWh`
              : fmtClp(p.y!);
            html += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${val}</b><br/>`;
          }
          return html;
        },
      },
      plotOptions: {
        column: { borderRadius: 3, borderWidth: 0 },
      },
      series: [
        {
          type: 'column',
          name: 'Consumo (kWh)',
          data: consumo,
          color: '#60a5fa',
          yAxis: 0,
        },
        {
          type: 'line',
          name: 'Gasto (CLP)',
          data: gasto,
          color: '#f59e0b',
          yAxis: 1,
          marker: { radius: 3 },
        },
      ],
      credits: { enabled: false },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  return <div ref={containerRef} />;
}

const selectClass = 'rounded border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-muted';

export function ComparisonsPage() {
  const [selectedBrand, setSelectedBrand] = useState<string>(BRANDS[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[MONTHS.length - 1]);

  const data = getStoreData(selectedBrand, selectedMonth);

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto">
      <div className="flex items-center gap-4">
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className={selectClass}
        >
          {BRANDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={selectClass}
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">
          {selectedBrand} — Consumo y Gasto por Edificio — {selectedMonth}
        </h2>
        <ComparisonChart data={data} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">
          {selectedBrand} — Detalle por Edificio — {selectedMonth}
        </h2>
        <DataTable
          data={data}
          columns={columns}
          rowKey={(r) => r.building}
          footer
          maxHeight="max-h-[340px]"
        />
      </Card>
    </div>
  );
}
