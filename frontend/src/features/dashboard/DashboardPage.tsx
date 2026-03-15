import { useRef, useEffect, useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Drawer } from '../../components/ui/Drawer';
import { useDashboardSummary, useDashboardPayments, useDashboardDocuments } from '../../hooks/queries/useDashboard';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import type { BillingDocumentDetail, DashboardBuildingMonth, OverdueBucket } from '../../types';

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

function MonthDropdown({ months, value, onChange }: { months: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-pa-border bg-white px-3 py-1 text-[12px] font-semibold text-pa-navy transition-colors hover:border-pa-blue"
      >
        {monthLabel(value)}
        <svg className="h-3 w-3 shrink-0 text-pa-blue" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul className="absolute right-0 z-20 mt-1.5 max-h-60 w-36 overflow-y-auto rounded-xl border border-pa-border bg-white py-1 shadow-lg">
          {months.map((m) => (
            <li key={m}>
              <button
                onClick={() => { onChange(m); setOpen(false); }}
                className={`block w-full px-3 py-1.5 text-left text-[13px] transition-colors ${
                  m === value ? 'bg-pa-bg-alt font-semibold text-pa-navy' : 'text-pa-text-muted hover:bg-pa-bg-alt hover:text-pa-navy'
                }`}
              >
                {monthLabel(m)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
          style: { fontSize: '11px', color: '#6B7280' },
        },
        lineColor: '#E5E7EB',
        tickColor: '#E5E7EB',
      },
      yAxis: [
        {
          title: { text: 'Consumo (kWh)', style: { color: '#3D3BF3', fontSize: '11px' } },
          labels: {
            formatter() { return fmtAxis(this.value as number); },
            style: { color: '#6B7280', fontSize: '11px' },
          },
          gridLineColor: '#F3F4F6',
        },
        {
          title: { text: 'Gasto (CLP)', style: { color: '#E84C6F', fontSize: '11px' } },
          labels: {
            formatter() { return `$${fmtAxis(this.value as number)}`; },
            style: { color: '#6B7280', fontSize: '11px' },
          },
          opposite: true,
          gridLineWidth: 0,
        },
      ],
      legend: {
        itemStyle: { color: '#1F2937', fontSize: '12px' },
        itemHoverStyle: { color: '#3D3BF3' },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        style: { color: '#1F2937' },
        formatter() {
          const points = this.points!;
          let html = `<b style="color:#1B1464">${this.x}</b><br/>`;
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
        column: { borderRadius: 4, borderWidth: 0 },
        line: { marker: { radius: 4, symbol: 'circle' }, lineWidth: 2.5 },
      },
      series: [
        {
          type: chartType,
          name: 'Consumo (kWh)',
          data: consumo,
          color: '#3D3BF3',
          yAxis: 0,
        },
        {
          type: chartType,
          name: 'Gasto (CLP)',
          data: gasto,
          color: '#E84C6F',
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

const overdueCols: Column<OverdueBucket>[] = [
  { label: 'Período', value: (r) => r.range, align: 'left', className: 'whitespace-nowrap' },
  { label: 'Docs', value: (r) => String(r.count), total: (d) => String(d.reduce((s, r) => s + r.count, 0)) },
  { label: 'Monto', value: (r) => fmtClp(r.totalClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.totalClp, 0)) },
];

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const docCols: Column<BillingDocumentDetail>[] = [
  { label: 'Edificio', value: (r) => SHORT_NAMES[r.buildingName] ?? r.buildingName, align: 'left' },
  { label: 'N° Doc', value: (r) => r.docNumber, align: 'left' },
  { label: 'Vencimiento', value: (r) => fmtDate(r.dueDate), className: 'whitespace-nowrap' },
  { label: 'Neto', value: (r) => fmtClp(r.totalNetoClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalNetoClp ?? 0), 0)) },
  { label: 'IVA', value: (r) => fmtClp(r.ivaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.ivaClp ?? 0), 0)) },
  { label: 'Total', value: (r) => fmtClp(r.totalClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.totalClp, 0)) },
];

export function DashboardPage() {
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: payments } = useDashboardPayments();
  const [drawerPorVencer, setDrawerPorVencer] = useState(false);
  const [drawerVencidos, setDrawerVencidos] = useState(false);
  const { data: porVencerDocs } = useDashboardDocuments('por_vencer', drawerPorVencer);
  const { data: vencidosDocs } = useDashboardDocuments('vencido', drawerVencidos);

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
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Fila 1: gráfico + cards */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-6 lg:grid-cols-[5fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between rounded-lg bg-pa-bg-alt px-4 py-2.5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-pa-navy">Consumo y Gasto por Edificio</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-pa-border text-[12px]">
                <button
                  onClick={() => setChartType('column')}
                  className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${chartType === 'column' ? 'bg-pa-navy text-white' : 'text-pa-navy hover:bg-pa-navy/10'}`}
                >
                  Barra
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${chartType === 'line' ? 'bg-pa-navy text-white' : 'text-pa-navy hover:bg-pa-navy/10'}`}
                >
                  Línea
                </button>
              </div>
              <MonthDropdown months={months} value={selectedMonth} onChange={setSelectedMonth} />
            </div>
          </div>
          <ComboChart data={monthData} chartType={chartType} />
        </Card>

        <div className="flex flex-col gap-3">
          {[
            { label: 'Pagos Recibidos', value: payments ? fmtClp(payments.pagosRecibidos.totalClp) : '—', desc: `${payments?.pagosRecibidos.count ?? 0} documentos`, accent: 'text-pa-green', onVerMas: undefined },
            { label: 'Facturas por Vencer', value: payments ? fmtClp(payments.porVencer.totalClp) : '—', desc: `${payments?.porVencer.count ?? 0} documentos`, accent: 'text-pa-amber', onVerMas: () => setDrawerPorVencer(true) },
            { label: 'Facturas Vencidas', value: payments ? fmtClp(payments.vencidos.totalClp) : '—', desc: `${payments?.vencidos.count ?? 0} documentos`, accent: 'text-pa-coral', onVerMas: () => setDrawerVencidos(true) },
          ].map((c) => (
            <div
              key={c.label}
              className="flex flex-1 flex-col justify-center rounded-xl bg-white px-4 py-3"
            >
              <p className="text-xs font-medium text-pa-text-muted">{c.label}</p>
              <p className={`text-2xl font-bold ${c.accent}`}>{c.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-pa-text-muted">{c.desc}</p>
                {c.onVerMas && (
                  <button
                    onClick={c.onVerMas}
                    className="rounded-full border border-pa-blue px-2.5 py-0.5 text-[11px] font-medium text-pa-blue transition-colors hover:bg-pa-blue hover:text-white"
                  >
                    Ver más +
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fila 2: ambas tablas alineadas, misma altura */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-6 lg:grid-cols-[5fr_1fr]">
        <Card className="flex flex-col">
          <h2 className="mb-3 inline-block rounded-lg bg-pa-bg-alt px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-pa-navy">Consumo Mensual por Edificio — {monthLabel(selectedMonth)}</h2>
          <div className="min-h-0 flex-1">
            <DataTable
              data={monthData}
              columns={buildingCols}
              rowKey={(r) => r.name}
              footer
              maxHeight="max-h-full"
            />
          </div>
        </Card>

        <Card className="flex flex-col">
          <h2 className="mb-3 inline-block whitespace-nowrap rounded-lg bg-pa-bg-alt px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-pa-navy">Documentos Vencidos por Período</h2>
          <div className="min-h-0 flex-1">
            {payments ? (
              <DataTable
                data={payments.vencidosPorPeriodo}
                columns={overdueCols}
                rowKey={(r) => r.range}
                footer
                maxHeight="max-h-full"
              />
            ) : (
              <p className="text-sm text-muted/40">—</p>
            )}
          </div>
        </Card>
      </div>

      <Drawer open={drawerPorVencer} onClose={() => setDrawerPorVencer(false)} title="Documentos por Vencer" size="lg">
        {porVencerDocs ? (
          <DataTable
            data={porVencerDocs}
            columns={docCols}
            rowKey={(r) => r.docNumber}
            footer
          />
        ) : (
          <p className="text-sm text-muted">Cargando...</p>
        )}
      </Drawer>

      <Drawer open={drawerVencidos} onClose={() => setDrawerVencidos(false)} title="Documentos Vencidos" size="lg">
        {vencidosDocs ? (
          <DataTable
            data={vencidosDocs}
            columns={docCols}
            rowKey={(r) => r.docNumber}
            footer
          />
        ) : (
          <p className="text-sm text-muted">Cargando...</p>
        )}
      </Drawer>
    </div>
  );
}
