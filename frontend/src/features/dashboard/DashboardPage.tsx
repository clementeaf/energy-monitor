import { useRef, useEffect, useState, useMemo } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
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
import { fetchBillingPdf } from '../../services/endpoints';
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

function DownloadPdfButton({ row }: { row: BillingDocumentDetail }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const blob = await fetchBillingPdf(row.operatorName, row.buildingName, row.month);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.operatorName}-${row.month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail — could add toast later
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-pa-blue hover:text-pa-navy disabled:opacity-40"
      title="Descargar PDF"
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M6 21h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function ColumnFilterDropdown({
  label,
  items,
  visible,
  onToggle,
}: {
  label: string;
  items: string[];
  visible: Set<string>;
  onToggle: (item: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const allSelected = items.length === visible.size;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 whitespace-nowrap font-medium transition-colors hover:text-text"
      >
        {label}
        <svg className="h-3 w-3 shrink-0 opacity-40" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
        {!allSelected && (
          <span className="ml-0.5 text-[10px] text-blue-600">{visible.size}</span>
        )}
      </button>

      {open && (
        <ul className="absolute left-0 z-30 mt-1 w-52 max-h-64 overflow-y-auto rounded border border-border bg-white py-1 shadow-lg">
          <li className="border-b border-border/50">
            <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-raised">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) onToggle(items[0]);
                  else items.forEach((i) => { if (!visible.has(i)) onToggle(i); });
                }}
                className="h-3.5 w-3.5 rounded border-border accent-blue-600"
              />
              <span className="text-text">Todo</span>
            </label>
          </li>
          {items.map((item) => {
            const checked = visible.has(item);
            return (
              <li key={item}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-raised">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item)}
                    className="h-3.5 w-3.5 rounded border-border accent-blue-600"
                  />
                  <span className={checked ? 'text-text' : 'text-muted'}>{item}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DocTableWithFilter({ data }: { data: BillingDocumentDetail[] }) {
  const buildings = useMemo(() => [...new Set(data.map((r) => r.buildingName))].sort(), [data]);
  const [visibleBuildings, setVisibleBuildings] = useState<Set<string>>(() => new Set(buildings));

  // Sync filter when data changes (e.g. drawer re-opened)
  useEffect(() => {
    setVisibleBuildings(new Set(buildings));
  }, [buildings]);

  function handleToggle(b: string) {
    setVisibleBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(b)) {
        if (next.size > 1) next.delete(b);
      } else {
        next.add(b);
      }
      return next;
    });
  }

  const filtered = data.filter((r) => visibleBuildings.has(r.buildingName));

  const columns: Column<BillingDocumentDetail>[] = useMemo(() => [
    {
      label: 'Edificio',
      value: (r) => r.buildingName,
      align: 'left' as const,
      headerRender: () => (
        <ColumnFilterDropdown label="Edificio" items={buildings} visible={visibleBuildings} onToggle={handleToggle} />
      ),
    },
    { label: 'Operador', value: (r) => r.operatorName, align: 'left' as const },
    { label: 'N° Doc', value: (r) => r.docNumber, align: 'left' as const },
    { label: 'Vencimiento', value: (r) => fmtDate(r.dueDate), className: 'whitespace-nowrap' },
    { label: 'Neto', value: (r) => fmtClp(r.totalNetoClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalNetoClp ?? 0), 0)) },
    { label: 'IVA', value: (r) => fmtClp(r.ivaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.ivaClp ?? 0), 0)) },
    { label: 'Total', value: (r) => fmtClp(r.totalClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.totalClp, 0)) },
    { label: 'PDF', value: (r) => <DownloadPdfButton row={r} />, className: 'w-10' },
  ], [buildings, visibleBuildings]);

  return (
    <div className="h-full">
      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => r.docNumber}
        footer
        maxHeight="max-h-full"
      />
    </div>
  );
}

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
          <DocTableWithFilter data={porVencerDocs} />
        ) : (
          <p className="text-sm text-muted">Cargando...</p>
        )}
      </Drawer>

      <Drawer open={drawerVencidos} onClose={() => setDrawerVencidos(false)} title="Documentos Vencidos" size="lg">
        {vencidosDocs ? (
          <DocTableWithFilter data={vencidosDocs} />
        ) : (
          <p className="text-sm text-muted">Cargando...</p>
        )}
      </Drawer>
    </div>
  );
}
