import { useRef, useEffect, useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useDashboardSummary } from '../../hooks/queries/useDashboard';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import type { DashboardBuildingMonth } from '../../types';

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function monthLabel(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

const fmt = (n: number | null) => (n != null ? n.toLocaleString('es-CL') : '—');
const fmtClp = (n: number | null) => (n != null ? `$${n.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : '—');

interface BuildingRow {
  name: string;
  totalKwh: number | null;
  totalConIvaClp: number | null;
  areaSqm: number | null;
  totalMeters: number;
}

const buildingCols: Column<BuildingRow>[] = [
  { label: 'Edificio', value: (r) => r.name, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.totalKwh), total: (d) => fmt(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)) },
  { label: 'Gasto ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalConIvaClp ?? 0), 0)) },
  { label: 'Superficie (m²)', value: (r) => fmt(r.areaSqm), total: (d) => fmt(d.reduce((s, r) => s + (r.areaSqm ?? 0), 0)) },
  { label: 'Medidores', value: (r) => fmt(r.totalMeters), total: (d) => fmt(d.reduce((s, r) => s + r.totalMeters, 0)) },
];


const SHORT_NAMES: Record<string, string> = {
  'Parque Arauco Kennedy': 'P. Arauco Kennedy',
  'Arauco Premium Outlet Buenaventura': 'Outlet Buenaventura',
  'Arauco Express Ciudad Empresarial': 'Express C. Empresarial',
  'Arauco Express El Carmen de Huechuraba': 'Express Huechuraba',
  'Arauco Estación': 'Arauco Estación',
};

function fmtAxis(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(val);
}

function ComboChart({ data, chartType }: { data: BuildingRow[]; chartType: 'column' | 'line' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const categories = data.map((b) => SHORT_NAMES[b.name] ?? b.name);
    const consumo = data.map((b) => b.totalKwh ?? 0);
    const gasto = data.map((b) => b.totalConIvaClp ?? 0);

    if (chartRef.current) {
      chartRef.current.xAxis[0].setCategories(categories, false);
      chartRef.current.series[0].update({ type: chartType } as Highcharts.SeriesOptionsType, false);
      chartRef.current.series[1].update({ type: chartType } as Highcharts.SeriesOptionsType, false);
      chartRef.current.series[0].setData(consumo, false);
      chartRef.current.series[1].setData(gasto, true);
      return;
    }

    chartRef.current = Highcharts.chart(containerRef.current, {
      chart: { height: 384, backgroundColor: 'transparent' },
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
              ? `${(p.y ?? 0).toLocaleString('es-CL')} kWh`
              : fmtClp(p.y ?? 0);
            html += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${val}</b><br/>`;
          }
          return html;
        },
      },
      plotOptions: {
        column: { borderRadius: 3, borderWidth: 0 },
        line: { marker: { radius: 3 } },
      },
      series: [
        {
          type: chartType,
          name: 'Consumo (kWh)',
          data: consumo,
          color: '#60a5fa',
          yAxis: 0,
        },
        {
          type: chartType,
          name: 'Gasto (CLP)',
          data: gasto,
          color: '#f59e0b',
          yAxis: 1,
        },
      ],
      credits: { enabled: false },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, chartType]);

  return <div ref={containerRef} />;
}

export function DashboardPage() {
  const { data: summary, isLoading } = useDashboardSummary();

  // Derive months and group by month
  const { months, byMonth } = useMemo(() => {
    if (!summary) return { months: [] as string[], byMonth: {} as Record<string, BuildingRow[]> };

    const grouped: Record<string, DashboardBuildingMonth[]> = {};
    for (const row of summary) {
      const key = row.month;
      (grouped[key] ??= []).push(row);
    }

    const sortedMonths = Object.keys(grouped).sort();
    const mapped: Record<string, BuildingRow[]> = {};
    for (const m of sortedMonths) {
      mapped[m] = grouped[m].map((r) => ({
        name: r.buildingName,
        totalKwh: r.totalKwh,
        totalConIvaClp: r.totalConIvaClp,
        areaSqm: r.areaSqm,
        totalMeters: r.totalMeters,
      }));
    }

    return { months: sortedMonths, byMonth: mapped };
  }, [summary]);

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [chartType, setChartType] = useState<'column' | 'line'>('column');

  // Set default to latest month once data loads
  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, selectedMonth]);

  if (isLoading) return <DashboardSkeleton />;

  const monthData = byMonth[selectedMonth] ?? [];

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto">
      {/* Fila 1: gráfico + cards */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[5fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">Consumo y Gasto por Edificio</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded border border-border text-xs">
                <button
                  onClick={() => setChartType('column')}
                  className={`px-2 py-1 transition-colors ${chartType === 'column' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text'}`}
                >
                  Barra
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`px-2 py-1 transition-colors ${chartType === 'line' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text'}`}
                >
                  Línea
                </button>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-muted"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
            </div>
          </div>
          <ComboChart data={monthData} chartType={chartType} />
        </Card>

        <div className="flex flex-col gap-2">
          {[
            { label: 'Pagos Recibidos', desc: 'Mes actual' },
            { label: 'Docs por Vencer', desc: 'Próximos 30 días' },
            { label: 'Docs Vencidos', desc: 'Total pendiente' },
          ].map((c) => (
            <Card key={c.label} className="flex-1 flex flex-col justify-center !py-2 !px-3">
              <p className="text-xs text-muted">{c.label}</p>
              <p className="text-xl font-bold text-muted/40">—</p>
              <p className="text-[10px] text-muted">{c.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Fila 2: ambas tablas alineadas, misma altura */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[5fr_1fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted">Consumo Mensual por Edificio — {monthLabel(selectedMonth)}</h2>
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
          <p className="text-sm text-muted/40">—</p>
        </Card>
      </div>
    </div>
  );
}
