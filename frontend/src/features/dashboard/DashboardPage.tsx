import { useRef, useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import {
  BUILDINGS_BY_MONTH,
  MONTHS,
  SUMMARY_CARDS,
  OVERDUE_BY_PERIOD,
  type BuildingMonthly,
  type OverduePeriod,
} from './mockData';

const fmt = (n: number) => n.toLocaleString('es-CL');
const fmtClp = (n: number) => `$${n.toLocaleString('es-CL')}`;

const buildingCols: Column<BuildingMonthly>[] = [
  { label: 'Edificio', value: (r) => r.name, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.consumoKwh), total: (d) => fmt(d.reduce((s, r) => s + r.consumoKwh, 0)) },
  { label: 'Gasto ($)', value: (r) => fmtClp(r.gastoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.gastoClp, 0)) },
  { label: 'Superficie (m²)', value: (r) => fmt(r.metros), total: (d) => fmt(d.reduce((s, r) => s + r.metros, 0)) },
  { label: 'Medidores', value: (r) => fmt(r.medidores), total: (d) => fmt(d.reduce((s, r) => s + r.medidores, 0)) },
];

const overdueCols: Column<OverduePeriod>[] = [
  { label: 'Período', value: (r) => r.range, align: 'left', className: 'whitespace-nowrap text-xs' },
  { label: 'Cant.', value: (r) => fmt(r.cantidad), total: (d) => fmt(d.reduce((s, r) => s + r.cantidad, 0)), className: 'text-xs' },
  { label: 'Saldo ($)', value: (r) => fmtClp(r.saldoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.saldoClp, 0)), className: 'text-xs' },
];

const SHORT_NAMES: Record<string, string> = {
  'Parque Arauco Kennedy': 'P. Arauco Kennedy',
  'Arauco Premium Outlet Buenaventura': 'Outlet Buenaventura',
  'Arauco Premium Outlet San Pedro': 'Outlet San Pedro',
  'Arauco Premium Outlet Curauma': 'Outlet Curauma',
  'Arauco Premium Outlet Coquimbo': 'Outlet Coquimbo',
  'Puerto Nuevo Antofagasta': 'P. Nuevo Antofagasta',
};

function fmtAxis(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(val);
}

function ComboChart({ data }: { data: BuildingMonthly[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const categories = data.map((b) => SHORT_NAMES[b.name] ?? b.name);
    const consumo = data.map((b) => b.consumoKwh);
    const gasto = data.map((b) => b.gastoClp);

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

export function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[MONTHS.length - 1]);
  const monthData = BUILDINGS_BY_MONTH[selectedMonth];

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto">
      {/* Fila 1: gráfico + cards */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[5fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">Consumo y Gasto por Edificio</h2>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-muted"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <ComboChart data={monthData} />
        </Card>

        <div className="flex flex-col gap-2">
          {SUMMARY_CARDS.map((c) => (
            <Card key={c.label} className="flex-1 flex flex-col justify-center !py-2 !px-3">
              <p className="text-xs text-muted">{c.label}</p>
              <p className="text-xl font-bold text-text">{c.value}</p>
              <p className="text-[10px] text-muted">{c.description}</p>
              <p className="mt-1 text-[10px] text-muted/60">Actualizado: {c.updatedAt}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Fila 2: ambas tablas alineadas, misma altura */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[5fr_1fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted">Consumo Mensual por Edificio — {selectedMonth}</h2>
          <DataTable
            data={monthData}
            columns={buildingCols}
            rowKey={(r) => r.name}
            footer
            maxHeight="max-h-[340px]"
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted">Documentos Vencidos por Período</h2>
          <DataTable
            data={OVERDUE_BY_PERIOD}
            columns={overdueCols}
            rowKey={(r) => r.range}
            footer
            maxHeight="max-h-[340px]"
          />
        </Card>
      </div>
    </div>
  );
}
