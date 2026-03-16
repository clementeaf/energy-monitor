import { useRef, useEffect, useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Drawer } from '../../components/ui/Drawer';
import { PillButton } from '../../components/ui/PillButton';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { TogglePills } from '../../components/ui/TogglePills';
import { useDashboardSummary, useDashboardPayments, useDashboardDocuments } from '../../hooks/queries/useDashboard';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { fmt, fmtClp, fmtAxis, fmtDate, monthLabel } from '../../lib/formatters';
import { SHORT_BUILDING_NAMES } from '../../lib/constants';
import { CHART_COLORS, LIGHT_PLOT_OPTIONS, LIGHT_TOOLTIP_STYLE, type ChartType } from '../../lib/chartConfig';
import type { BillingDocumentDetail, DashboardBuildingMonth, OverdueBucket } from '../../types';

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

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'column', label: 'Barra' },
  { value: 'line', label: 'Línea' },
  { value: 'area', label: 'Área' },
];

function ComboChart({ data, chartType }: { data: BuildingRow[]; chartType: ChartType }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const categories = data.map((b) => SHORT_BUILDING_NAMES[b.name] ?? b.name);
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
          title: { text: 'Consumo (kWh)', style: { color: CHART_COLORS.blue, fontSize: '11px' } },
          labels: {
            formatter() { return fmtAxis(this.value as number); },
            style: { color: '#6B7280', fontSize: '11px' },
          },
          gridLineColor: '#F3F4F6',
        },
        {
          title: { text: 'Gasto (CLP)', style: { color: CHART_COLORS.coral, fontSize: '11px' } },
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
        itemHoverStyle: { color: CHART_COLORS.blue },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        ...LIGHT_TOOLTIP_STYLE,
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
      plotOptions: LIGHT_PLOT_OPTIONS,
      series: [
        {
          type: chartType,
          name: 'Consumo (kWh)',
          data: consumo,
          color: CHART_COLORS.blue,
          yAxis: 0,
        },
        {
          type: chartType,
          name: 'Gasto (CLP)',
          data: gasto,
          color: CHART_COLORS.coral,
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

const docCols: Column<BillingDocumentDetail>[] = [
  { label: 'Operador', value: (r) => r.operatorName, align: 'left' },
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
  const [chartType, setChartType] = useState<ChartType>('column');

  // Set default to latest month once data loads
  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, selectedMonth]);

  if (isLoading) return <DashboardSkeleton />;

  const monthData = byMonth[selectedMonth] ?? [];
  const monthItems = months.map((m) => ({ value: m, label: monthLabel(m) }));

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Fila 1: gráfico + cards */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-6 lg:grid-cols-[5fr_1fr]">
        <Card>
          <SectionBanner title="Consumo y Gasto por Edificio" className="mb-3 justify-between">
            <div className="flex items-center gap-2">
              <TogglePills options={CHART_TYPE_OPTIONS} value={chartType} onChange={setChartType} />
              <PillDropdown
                items={monthItems}
                value={selectedMonth}
                onChange={setSelectedMonth}
                listWidth="w-36"
              />
            </div>
          </SectionBanner>
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
                  <PillButton onClick={c.onVerMas}>Ver más +</PillButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fila 2: ambas tablas alineadas, misma altura */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-6 lg:grid-cols-[5fr_1fr]">
        <Card className="flex flex-col">
          <SectionBanner title={`Consumo Mensual por Edificio — ${monthLabel(selectedMonth)}`} inline className="mb-3" />
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
          <SectionBanner title="Documentos Vencidos por Período" inline className="mb-3 whitespace-nowrap" />
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
