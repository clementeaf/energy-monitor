import { useRef, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useClickOutside } from '../../hooks/useClickOutside';
import Highcharts from 'highcharts';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Drawer } from '../../components/ui/Drawer';
import { PillButton } from '../../components/ui/PillButton';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { TogglePills } from '../../components/ui/TogglePills';
import { useDashboardSummary, useDashboardPayments, useDashboardDocuments, useDashboardAllDocuments } from '../../hooks/queries/useDashboard';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { fetchBillingPdf } from '../../services/endpoints';
import { fmt, fmtClp, fmtAxis, fmtDate, monthLabel } from '../../lib/formatters';
import { SHORT_BUILDING_NAMES } from '../../lib/constants';
import { CHART_COLORS, LIGHT_PLOT_OPTIONS, LIGHT_TOOLTIP_STYLE, type ChartType } from '../../lib/chartConfig';
import type { BillingDocumentDetail, DashboardBuildingMonth, OverdueBucket, PaymentSummary } from '../../types';

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
  { value: 'pie', label: 'Torta' },
];

const PIE_COLORS = ['#3D3BF3', '#E84C6F', '#2D9F5D', '#F5A623', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'];

function ComboChart({ data, chartType }: { data: BuildingRow[]; chartType: ChartType }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous chart on every re-render to handle pie ↔ non-pie transitions
    chartRef.current?.destroy();
    chartRef.current = null;

    const names = data.map((b) => SHORT_BUILDING_NAMES[b.name] ?? b.name);
    const consumo = data.map((b) => b.totalKwh ?? 0);
    const gasto = data.map((b) => b.totalConIvaClp ?? 0);

    if (chartType === 'pie') {
      const points = data.map((b, i) => ({
        name: names[i],
        color: PIE_COLORS[i % PIE_COLORS.length],
        kwh: b.totalKwh ?? 0,
        clp: b.totalConIvaClp ?? 0,
      }));

      chartRef.current = Highcharts.chart({
        chart: { height: 384, backgroundColor: 'transparent', renderTo: containerRef.current! },
        title: { text: undefined },
        tooltip: {
          useHTML: true,
          ...LIGHT_TOOLTIP_STYLE,
          pointFormatter() {
            const p = this as Highcharts.Point;
            return p.series.name === 'Consumo (kWh)'
              ? `<b>${(p.y ?? 0).toLocaleString('es-CL')} kWh</b> (${Highcharts.numberFormat(p.percentage!, 1)}%)`
              : `<b>${fmtClp(p.y ?? 0)}</b> (${Highcharts.numberFormat(p.percentage!, 1)}%)`;
          },
        },
        plotOptions: {
          pie: {
            borderWidth: 0,
            dataLabels: { enabled: true, format: '{point.name}', style: { fontSize: '11px', color: '#6B7280', textOutline: 'none' } },
          },
        },
        series: [
          {
            type: 'pie',
            name: 'Consumo (kWh)',
            center: ['25%', '50%'],
            size: '80%',
            data: points.map((p) => ({ name: p.name, y: p.kwh, color: p.color })),
          },
          {
            type: 'pie',
            name: 'Gasto (CLP)',
            center: ['75%', '50%'],
            size: '80%',
            data: points.map((p) => ({ name: p.name, y: p.clp, color: p.color })),
          },
        ],
        credits: { enabled: false },
      });
    } else {
      chartRef.current = Highcharts.chart({
        chart: { height: 384, backgroundColor: 'transparent', renderTo: containerRef.current! },
        title: { text: undefined },
        xAxis: {
          categories: names,
          labels: { rotation: -45, style: { fontSize: '11px', color: '#6B7280' } },
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
            type: chartType as 'column' | 'line' | 'area',
            name: 'Consumo (kWh)',
            data: consumo,
            color: CHART_COLORS.blue,
            yAxis: 0,
          },
          {
            type: chartType as 'column' | 'line' | 'area',
            name: 'Gasto (CLP)',
            data: gasto,
            color: CHART_COLORS.coral,
            yAxis: 1,
          },
        ],
        credits: { enabled: false },
      });
    }

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
      a.download = `${row.operatorName}-${row.month.slice(0, 7)}.pdf`;
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

const OVERDUE_PERIODS = [
  { value: 'all', label: 'Todos' },
  { value: '1-30', label: '1-30 días' },
  { value: '31-60', label: '31-60 días' },
  { value: '61-90', label: '61-90 días' },
  { value: '90+', label: '90+ días' },
];

const PERIOD_PREFIXES = ['1-30', '31-60', '61-90', '90+'];

const PERIOD_RANGES: Record<string, (days: number) => boolean> = {
  '1-30': (d) => d >= 1 && d <= 30,
  '31-60': (d) => d >= 31 && d <= 60,
  '61-90': (d) => d >= 61 && d <= 90,
  '90+': (d) => d > 90,
};

/** Maps backend range label (e.g. "1-30 días") to filter value ("1-30"). */
function rangeToPeriodValue(range: string): string {
  return PERIOD_PREFIXES.find((p) => range.startsWith(p)) ?? 'all';
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86_400_000));
}

function matchesPeriod(dueDate: string, period: string): boolean {
  return period === 'all' || (PERIOD_RANGES[period]?.(daysOverdue(dueDate)) ?? true);
}

function DocTableWithFilter({
  data,
  showPeriodFilter,
  initialPeriod,
}: {
  data: BillingDocumentDetail[];
  showPeriodFilter?: boolean;
  initialPeriod?: string | null;
}) {
  const buildings = useMemo(() => [...new Set(data.map((r) => r.buildingName))].sort(), [data]);
  const [visibleBuildings, setVisibleBuildings] = useState<Set<string>>(() => new Set(buildings));
  const [period, setPeriod] = useState(initialPeriod ?? 'all');

  // Sync filter when data changes (e.g. drawer re-opened)
  useEffect(() => {
    setVisibleBuildings(new Set(buildings));
  }, [buildings]);

  // When parent passes a new initialPeriod (e.g. opened from table row), apply it
  useEffect(() => {
    if (initialPeriod != null) setPeriod(initialPeriod);
  }, [initialPeriod]);

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

  const filtered = data.filter((r) => visibleBuildings.has(r.buildingName) && (!showPeriodFilter || matchesPeriod(r.dueDate, period)));

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
    <div className="flex h-full flex-col gap-2">
      {showPeriodFilter && (
        <div className="flex items-center gap-2">
          <PillDropdown
            items={OVERDUE_PERIODS}
            value={period}
            onChange={setPeriod}
            listWidth="w-36"
            align="left"
          />
        </div>
      )}
      <div className="min-h-0 flex-1">
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(r) => r.docNumber}
          footer
          maxHeight="max-h-full"
        />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { isFilteredMode, isTecnico, needsSelection, operatorBuildings, selectedOperator, selectedStoreName } = useOperatorFilter();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: payments } = useDashboardPayments();
  const [drawerPorVencer, setDrawerPorVencer] = useState(false);
  const [drawerVencidos, setDrawerVencidos] = useState(false);
  const [drawerVencidosInitialPeriod, setDrawerVencidosInitialPeriod] = useState<string | null>(null);
  const { data: porVencerDocs } = useDashboardDocuments('por_vencer', drawerPorVencer && !isFilteredMode);
  const { data: vencidosDocs } = useDashboardDocuments('vencido', drawerVencidos && !isFilteredMode);

  // In filtered modes, fetch all document statuses to compute payment cards client-side
  const { pagado: allPagado, porVencer: allPorVencer, vencido: allVencido } = useDashboardAllDocuments(isFilteredMode && !needsSelection);

  // Operator name used for filtering documents
  const filterOperatorName = selectedOperator ?? selectedStoreName ?? null;

  // Filter documents by operator name
  const filterDocs = useMemo(() => {
    return (docs: BillingDocumentDetail[] | undefined) => {
      if (!docs || !filterOperatorName) return docs;
      return docs.filter((d) => d.operatorName === filterOperatorName);
    };
  }, [filterOperatorName]);

  // Compute payment cards from filtered documents in filtered mode
  const filteredPayments: PaymentSummary | undefined = useMemo(() => {
    if (!isFilteredMode || !allPagado.data || !allPorVencer.data || !allVencido.data) return undefined;
    const pagDocs = filterDocs(allPagado.data) ?? [];
    const pvDocs = filterDocs(allPorVencer.data) ?? [];
    const vDocs = filterDocs(allVencido.data) ?? [];

    // Compute overdue buckets
    const buckets: Record<string, OverdueBucket> = {
      '1-30 días': { range: '1-30 días', count: 0, totalClp: 0 },
      '31-60 días': { range: '31-60 días', count: 0, totalClp: 0 },
      '61-90 días': { range: '61-90 días', count: 0, totalClp: 0 },
      '90+ días': { range: '90+ días', count: 0, totalClp: 0 },
    };
    for (const d of vDocs) {
      const days = daysOverdue(d.dueDate);
      let key: string;
      if (days <= 30) key = '1-30 días';
      else if (days <= 60) key = '31-60 días';
      else if (days <= 90) key = '61-90 días';
      else key = '90+ días';
      buckets[key].count++;
      buckets[key].totalClp += d.totalClp;
    }

    return {
      pagosRecibidos: { count: pagDocs.length, totalClp: pagDocs.reduce((s, d) => s + d.totalClp, 0) },
      porVencer: { count: pvDocs.length, totalClp: pvDocs.reduce((s, d) => s + d.totalClp, 0) },
      vencidos: { count: vDocs.length, totalClp: vDocs.reduce((s, d) => s + d.totalClp, 0) },
      vencidosPorPeriodo: Object.values(buckets).filter((b) => b.count > 0),
    };
  }, [isFilteredMode, allPagado.data, allPorVencer.data, allVencido.data, filterDocs]);

  // Effective payments — filtered or raw
  const effectivePayments = isFilteredMode ? filteredPayments : payments;

  // Filtered drawer docs in filtered mode
  const effectivePorVencerDocs = isFilteredMode ? filterDocs(allPorVencer.data) : porVencerDocs;
  const effectiveVencidosDocs = isFilteredMode ? filterDocs(allVencido.data) : vencidosDocs;

  // Filter summary rows by operatorBuildings when in filtered mode
  const filteredSummary = useMemo(() => {
    if (!summary) return undefined;
    if (!isFilteredMode || !operatorBuildings) return summary;
    return summary.filter((r) => operatorBuildings.has(r.buildingName));
  }, [summary, isFilteredMode, operatorBuildings]);

  // Derive months, group by month, and compute yearly totals
  const { months, byMonth, yearlyData } = useMemo(() => {
    if (!filteredSummary) return { months: [] as string[], byMonth: {} as Record<string, BuildingRow[]>, yearlyData: [] as BuildingRow[] };

    const grouped: Record<string, DashboardBuildingMonth[]> = {};
    for (const row of filteredSummary) {
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

    // Aggregate yearly totals per building
    const acc: Record<string, BuildingRow> = {};
    for (const row of filteredSummary) {
      const b = acc[row.buildingName] ??= { name: row.buildingName, totalKwh: 0, totalConIvaClp: 0, areaSqm: row.areaSqm, totalMeters: row.totalMeters };
      b.totalKwh = (b.totalKwh ?? 0) + (row.totalKwh ?? 0);
      b.totalConIvaClp = (b.totalConIvaClp ?? 0) + (row.totalConIvaClp ?? 0);
    }

    return { months: sortedMonths, byMonth: mapped, yearlyData: Object.values(acc) };
  }, [filteredSummary]);

  const [viewMode, setViewMode] = useState<'anual' | 'mensual'>('anual');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [chartType, setChartType] = useState<ChartType>('column');

  // Set default to latest month once data loads
  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, selectedMonth]);

  if (isLoading) return <DashboardSkeleton />;

  const activeData = viewMode === 'anual' ? yearlyData : (byMonth[selectedMonth] ?? []);
  const monthItems = months.map((m) => ({ value: m, label: monthLabel(m) }));

  if (isTecnico) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-pa-navy">Dashboard no disponible</p>
          <p className="mt-1 text-sm text-pa-text-muted">
            El dashboard financiero no está disponible en modo técnico.
          </p>
          <p className="mt-0.5 text-sm text-pa-text-muted">
            Navega a Edificios, Comparativas o Monitoreo para ver datos de tu operación.
          </p>
        </div>
      </div>
    );
  }

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-pa-navy">Selecciona un operador</p>
          <p className="mt-1 text-sm text-pa-text-muted">
            Usa el selector en la barra lateral para elegir un operador y ver su dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Fila 1: gráfico + cards */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-6 lg:grid-cols-[5fr_1fr]">
        <Card>
          <SectionBanner title={`Consumo y Gasto por Edificio${selectedOperator ? ` — ${selectedOperator}` : ''}`} className="mb-3 justify-between">
            <div className="flex items-center gap-2">
              <TogglePills
                options={[{ value: 'anual' as const, label: 'Anual' }, { value: 'mensual' as const, label: 'Mensual' }]}
                value={viewMode}
                onChange={setViewMode}
              />
              <TogglePills options={CHART_TYPE_OPTIONS} value={chartType} onChange={setChartType} />
              {viewMode === 'mensual' && (
                <PillDropdown
                  items={monthItems}
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  listWidth="w-36"
                />
              )}
            </div>
          </SectionBanner>
          <ComboChart data={activeData} chartType={chartType} />
        </Card>

        <div className="flex flex-col gap-3">
          {[
            { label: isFilteredMode ? 'Pagos Realizados' : 'Pagos Recibidos', value: effectivePayments ? fmtClp(effectivePayments.pagosRecibidos.totalClp) : '—', desc: `${effectivePayments?.pagosRecibidos.count ?? 0} documentos`, accent: 'text-pa-green', onVerMas: undefined },
            { label: isFilteredMode ? 'Facturas Pendientes de Pago' : 'Facturas por Vencer', value: effectivePayments ? fmtClp(effectivePayments.porVencer.totalClp) : '—', desc: `${effectivePayments?.porVencer.count ?? 0} documentos`, accent: 'text-pa-amber', onVerMas: () => setDrawerPorVencer(true) },
            { label: isFilteredMode ? 'Facturas Atrasadas' : 'Facturas Vencidas', value: effectivePayments ? fmtClp(effectivePayments.vencidos.totalClp) : '—', desc: `${effectivePayments?.vencidos.count ?? 0} documentos`, accent: 'text-pa-coral', onVerMas: () => { setDrawerVencidosInitialPeriod(null); setDrawerVencidos(true); } },
          ].map((c) => (
            <div
              key={c.label}
              className="flex flex-shrink-0 flex-col justify-center rounded-xl border border-pa-navy/30 bg-white py-6 px-3"
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
          <SectionBanner
            title={viewMode === 'anual'
              ? `Consumo Anual por Edificio${selectedOperator ? ` — ${selectedOperator}` : ''}`
              : `Consumo Mensual por Edificio — ${monthLabel(selectedMonth)}${selectedOperator ? ` — ${selectedOperator}` : ''}`}
            inline
            className="mb-3"
          />
          <div className="min-h-0 flex-1">
            <DataTable
              data={activeData}
              columns={buildingCols}
              rowKey={(r) => r.name}
              onRowClick={(r) => navigate(`/buildings/${encodeURIComponent(r.name)}`)}
              footer
              maxHeight="max-h-full"
            />
          </div>
        </Card>

        <Card className="flex flex-col">
          <SectionBanner title="Documentos Vencidos por Período" inline className="mb-3 whitespace-nowrap" />
          <div className="min-h-0 flex-1">
            {effectivePayments ? (
              <DataTable
                data={effectivePayments.vencidosPorPeriodo}
                columns={overdueCols}
                rowKey={(r) => r.range}
                onRowClick={(r) => {
                  setDrawerVencidosInitialPeriod(rangeToPeriodValue(r.range));
                  setDrawerVencidos(true);
                }}
                footer
                maxHeight="max-h-full"
              />
            ) : (
              <p className="text-sm text-muted/40">—</p>
            )}
          </div>
        </Card>
      </div>

      <Drawer open={drawerPorVencer} onClose={() => setDrawerPorVencer(false)} title="Facturas por Vencer" size="lg">
        {effectivePorVencerDocs ? (
          <DocTableWithFilter data={effectivePorVencerDocs} />
        ) : (
          <p className="text-sm text-muted">Cargando...</p>
        )}
      </Drawer>

      <Drawer open={drawerVencidos} onClose={() => setDrawerVencidos(false)} title="Facturas Vencidas" size="lg">
        {effectiveVencidosDocs ? (
          <DocTableWithFilter
            key={drawerVencidos ? (drawerVencidosInitialPeriod ?? 'all') : 'closed'}
            data={effectiveVencidosDocs}
            showPeriodFilter
            initialPeriod={drawerVencidosInitialPeriod}
          />
        ) : (
          <p className="text-sm text-muted">Cargando...</p>
        )}
      </Drawer>
    </div>
  );
}
