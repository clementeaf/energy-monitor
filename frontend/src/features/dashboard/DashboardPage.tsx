import { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import Highcharts from 'highcharts';
import { Card } from '../../components/ui/Card';
import { ColumnFilterDropdown } from '../../components/ui/ColumnFilterDropdown';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { DateFilterDropdown, type DateFilter } from '../../components/ui/DateFilterDropdown';
import { Drawer } from '../../components/ui/Drawer';
import { PillButton } from '../../components/ui/PillButton';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { RangeFilterDropdown, type NumericRange } from '../../components/ui/RangeFilterDropdown';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { TogglePills } from '../../components/ui/TogglePills';
import { useDashboardSummary, useDashboardPayments, useDashboardDocuments, useDashboardAllDocuments } from '../../hooks/queries/useDashboard';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { fetchBillingPdf } from '../../services/endpoints';
import { fmt, fmtClp, fmtAxis, fmtDate, monthName } from '../../lib/formatters';
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
  { label: 'Edificio', value: (r) => r.name, align: 'left', sortKey: (r) => r.name },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.totalKwh), total: (d) => fmt(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)), sortKey: (r) => r.totalKwh },
  { label: 'Ingreso ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalConIvaClp ?? 0), 0)), sortKey: (r) => r.totalConIvaClp },
  { label: 'Superficie (m²)', value: (r) => fmt(r.areaSqm), total: (d) => fmt(d.reduce((s, r) => s + (r.areaSqm ?? 0), 0)), sortKey: (r) => r.areaSqm },
  { label: 'Medidores', value: (r) => fmt(r.totalMeters), total: (d) => fmt(d.reduce((s, r) => s + r.totalMeters, 0)), sortKey: (r) => r.totalMeters },
];

const CURRENCY_OPTIONS = [
  { value: 'CLP', label: 'CLP ($)' },
  { value: 'USD', label: 'USD (US$)' },
  { value: 'COP', label: 'COP (COL$)' },
  { value: 'SOL', label: 'SOL (S/)' },
];

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'column', label: 'Barra' },
  { value: 'line', label: 'Línea' },
  { value: 'area', label: 'Área' },
  { value: 'pie', label: 'Torta' },
];

const PIE_COLORS = ['#3D3BF3', '#E84C6F', '#2D9F5D', '#F5A623', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'];

function ComboChart({ data, chartType, metric = 'consumo' }: { data: BuildingRow[]; chartType: ChartType; metric?: 'consumo' | 'gasto' }) {
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

    const isConsumo = metric === 'consumo';
    const seriesName = isConsumo ? 'Consumo (kWh)' : 'Ingreso (CLP)';
    const seriesColor = isConsumo ? CHART_COLORS.blue : CHART_COLORS.coral;
    const seriesData = isConsumo ? consumo : gasto;

    if (chartType === 'pie') {
      const points = data.map((b, i) => ({
        name: names[i],
        y: isConsumo ? (b.totalKwh ?? 0) : (b.totalConIvaClp ?? 0),
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));

      chartRef.current = Highcharts.chart({
        chart: { height: null as unknown as number, borderRadius: 12, renderTo: containerRef.current! },
        title: { text: undefined },
        tooltip: {
          useHTML: true,
          ...LIGHT_TOOLTIP_STYLE,
          pointFormatter() {
            const p = this as Highcharts.Point;
            const val = isConsumo
              ? `${(p.y ?? 0).toLocaleString('es-CL')} kWh`
              : fmtClp(p.y ?? 0);
            return `<b>${val}</b> (${Highcharts.numberFormat(p.percentage!, 1)}%)`;
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
            name: seriesName,
            data: points,
          },
        ],
        credits: { enabled: false },
      });
    } else {
      chartRef.current = Highcharts.chart({
        chart: { height: null as unknown as number, backgroundColor: '#ffffff', borderRadius: 12, renderTo: containerRef.current!, spacingBottom: 20 },
        title: { text: undefined },
        xAxis: {
          categories: names,
          labels: { rotation: -30, style: { fontSize: '11px', color: '#6B7280' }, overflow: 'allow', padding: 5 },
          lineColor: '#E5E7EB',
          tickColor: '#E5E7EB',
        },
        yAxis: {
          title: { text: seriesName, style: { color: seriesColor, fontSize: '11px' } },
          tickInterval: isConsumo ? 2_000_000 : 500_000_000,
          labels: {
            formatter() {
              const v = this.value as number;
              return isConsumo ? fmtAxis(v) : `$${fmtAxis(v)}`;
            },
            style: { color: '#6B7280', fontSize: '11px' },
          },
          gridLineColor: '#F3F4F6',
        },
        legend: {
          itemStyle: { color: '#1F2937', fontSize: '12px' },
          itemHoverStyle: { color: seriesColor },
        },
        tooltip: {
          shared: true,
          useHTML: true,
          ...LIGHT_TOOLTIP_STYLE,
          formatter() {
            const points = this.points!;
            let html = `<b style="color:#1B1464">${this.x}</b><br/>`;
            for (const p of points) {
              const val = isConsumo
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
            name: seriesName,
            data: seriesData,
            color: seriesColor,
          },
        ],
        credits: { enabled: false },
      });
    }

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, chartType, metric]);

  return <div ref={containerRef} className="h-full" />;
}

const overdueCols: Column<OverdueBucket>[] = [
  { label: 'Período', value: (r) => r.range, align: 'left' },
  { label: 'Docs', value: (r) => String(r.count), total: (d) => String(d.reduce((s, r) => s + r.count, 0)) },
  { label: 'Monto', value: (r) => fmtClp(r.totalClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.totalClp, 0)) },
];

function PdfActions({ row }: { row: BillingDocumentDetail }) {
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function getBlob() {
    return fetchBillingPdf(row.operatorName, row.buildingName, row.month);
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.operatorName}-${row.month.slice(0, 7)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      const raw = await getBlob();
      const blob = raw.type === 'application/pdf' ? raw : new Blob([raw], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch {
      // silent fail
    } finally {
      setPreviewing(false);
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  const spinner = (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );

  return (
    <>
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={handleDownload}
          disabled={loading}
          className="text-pa-blue hover:text-pa-navy disabled:opacity-40 transition-colors"
          title="Descargar PDF"
        >
          {loading ? spinner : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
          )}
        </button>
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="text-pa-blue hover:text-pa-navy disabled:opacity-40 transition-colors"
          title="Previsualizar PDF"
        >
          {previewing ? spinner : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {previewUrl && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closePreview} aria-hidden="true" />
          <div className="relative z-10 flex h-[85vh] w-[70vw] flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-pa-border px-5 py-3">
              <span className="text-sm font-semibold text-pa-navy">{row.operatorName} — {row.month.slice(0, 7)}</span>
              <button onClick={closePreview} className="rounded p-1 text-muted hover:bg-gray-100 hover:text-text transition-colors" aria-label="Cerrar">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <iframe src={previewUrl} className="flex-1 rounded-b-xl" title="Previsualización PDF" />
          </div>
        </div>,
        document.body,
      )}
    </>
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
  // All unique values from full dataset
  const allBuildings = useMemo(() => [...new Set(data.map((r) => r.buildingName))].sort(), [data]);
  const allOperators = useMemo(() => [...new Set(data.map((r) => r.operatorName))].sort(), [data]);
  const allDocs = useMemo(() => [...new Set(data.map((r) => r.docNumber))].sort(), [data]);

  const [visibleBuildings, setVisibleBuildings] = useState<Set<string>>(() => new Set(allBuildings));
  const [visibleOperators, setVisibleOperators] = useState<Set<string>>(() => new Set(allOperators));
  const [visibleDocs, setVisibleDocs] = useState<Set<string>>(() => new Set(allDocs));
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' });
  const netoValues = useMemo(() => data.map((r) => r.totalNetoClp ?? 0), [data]);
  const netoMin = useMemo(() => Math.min(...netoValues), [netoValues]);
  const netoMax = useMemo(() => Math.max(...netoValues), [netoValues]);
  const [netoRange, setNetoRange] = useState<NumericRange>({ min: netoMin, max: netoMax });
  useEffect(() => { setNetoRange({ min: netoMin, max: netoMax }); }, [netoMin, netoMax]);

  const ivaValues = useMemo(() => data.map((r) => r.ivaClp ?? 0), [data]);
  const ivaMin = useMemo(() => Math.min(...ivaValues), [ivaValues]);
  const ivaMax = useMemo(() => Math.max(...ivaValues), [ivaValues]);
  const [ivaRange, setIvaRange] = useState<NumericRange>({ min: ivaMin, max: ivaMax });
  useEffect(() => { setIvaRange({ min: ivaMin, max: ivaMax }); }, [ivaMin, ivaMax]);

  const totalValues = useMemo(() => data.map((r) => r.totalClp), [data]);
  const totalMin = useMemo(() => Math.min(...totalValues), [totalValues]);
  const totalMax = useMemo(() => Math.max(...totalValues), [totalValues]);
  const [totalRange, setTotalRange] = useState<NumericRange>({ min: totalMin, max: totalMax });
  useEffect(() => { setTotalRange({ min: totalMin, max: totalMax }); }, [totalMin, totalMax]);
  const [period, setPeriod] = useState(initialPeriod ?? 'all');

  // Sync filters when full dataset changes
  const buildingsKey = allBuildings.join('\0');
  const operatorsKey = allOperators.join('\0');
  const docsKey = allDocs.join('\0');
  useEffect(() => { setVisibleBuildings(new Set(allBuildings)); }, [buildingsKey]);
  useEffect(() => { setVisibleOperators(new Set(allOperators)); }, [operatorsKey]);
  useEffect(() => { setVisibleDocs(new Set(allDocs)); }, [docsKey]);

  // When parent passes a new initialPeriod (e.g. opened from table row), apply it
  useEffect(() => {
    if (initialPeriod != null) setPeriod(initialPeriod);
  }, [initialPeriod]);

  function matchesDateFilter(dueDate: string): boolean {
    if (dateFilter.type === 'all') return true;
    const d = dueDate.slice(0, 10);
    if (dateFilter.type === 'exact') return d === dateFilter.date;
    return d >= dateFilter.from && d <= dateFilter.to;
  }

  function matchesNumeric(r: BillingDocumentDetail): boolean {
    return (r.totalNetoClp ?? 0) >= netoRange.min &&
      (r.totalNetoClp ?? 0) <= netoRange.max &&
      (r.ivaClp ?? 0) >= ivaRange.min &&
      (r.ivaClp ?? 0) <= ivaRange.max &&
      r.totalClp >= totalRange.min &&
      r.totalClp <= totalRange.max;
  }

  function matchesPeriodFilter(r: BillingDocumentDetail): boolean {
    return !showPeriodFilter || matchesPeriod(r.dueDate, period);
  }

  // Cascading: available options for each filter = values present in data filtered by ALL OTHER filters
  const availableBuildings = useMemo(() => {
    const subset = data.filter((r) =>
      visibleOperators.has(r.operatorName) && visibleDocs.has(r.docNumber) &&
      matchesDateFilter(r.dueDate) && matchesNumeric(r) && matchesPeriodFilter(r),
    );
    return [...new Set(subset.map((r) => r.buildingName))].sort();
  }, [data, visibleOperators, visibleDocs, dateFilter, netoRange, ivaRange, totalRange, period]);

  const availableOperators = useMemo(() => {
    const subset = data.filter((r) =>
      visibleBuildings.has(r.buildingName) && visibleDocs.has(r.docNumber) &&
      matchesDateFilter(r.dueDate) && matchesNumeric(r) && matchesPeriodFilter(r),
    );
    return [...new Set(subset.map((r) => r.operatorName))].sort();
  }, [data, visibleBuildings, visibleDocs, dateFilter, netoRange, ivaRange, totalRange, period]);

  const availableDocs = useMemo(() => {
    const subset = data.filter((r) =>
      visibleBuildings.has(r.buildingName) && visibleOperators.has(r.operatorName) &&
      matchesDateFilter(r.dueDate) && matchesNumeric(r) && matchesPeriodFilter(r),
    );
    return [...new Set(subset.map((r) => r.docNumber))].sort();
  }, [data, visibleBuildings, visibleOperators, dateFilter, netoRange, ivaRange, totalRange, period]);

  function handleToggleBuilding(b: string) {
    setVisibleBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }

  function handleToggleOperator(o: string) {
    setVisibleOperators((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });
  }

  function handleToggleDoc(d: string) {
    setVisibleDocs((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  const filtered = data.filter((r) =>
    visibleBuildings.has(r.buildingName) &&
    visibleOperators.has(r.operatorName) &&
    visibleDocs.has(r.docNumber) &&
    matchesDateFilter(r.dueDate) &&
    matchesNumeric(r) &&
    matchesPeriodFilter(r),
  );

  const columns: Column<BillingDocumentDetail>[] = useMemo(() => [
    {
      label: 'Edificio',
      value: (r) => r.buildingName,
      align: 'left' as const,
      sortKey: (r) => r.buildingName,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Edificio"
          items={availableBuildings}
          visible={visibleBuildings}
          onToggle={handleToggleBuilding}
          onSelectAll={() => setVisibleBuildings(new Set(availableBuildings))}
          onDeselectAll={() => setVisibleBuildings(new Set())}
        />
      ),
    },
    {
      label: 'Operador',
      value: (r) => r.operatorName,
      align: 'left' as const,
      sortKey: (r) => r.operatorName,
      headerRender: () => (
        <ColumnFilterDropdown
          label="Operador"
          items={availableOperators}
          visible={visibleOperators}
          onToggle={handleToggleOperator}
          onSelectAll={() => setVisibleOperators(new Set(availableOperators))}
          onDeselectAll={() => setVisibleOperators(new Set())}
        />
      ),
    },
    {
      label: 'N° Doc',
      value: (r) => r.docNumber,
      align: 'left' as const,
      sortKey: (r) => r.docNumber,
      headerRender: () => (
        <ColumnFilterDropdown
          label="N° Doc"
          items={availableDocs}
          visible={visibleDocs}
          onToggle={handleToggleDoc}
          onSelectAll={() => setVisibleDocs(new Set(availableDocs))}
          onDeselectAll={() => setVisibleDocs(new Set())}
        />
      ),
    },
    {
      label: 'Vencimiento',
      value: (r) => fmtDate(r.dueDate),
      className: 'whitespace-nowrap',
      sortKey: (r) => r.dueDate,
      headerRender: () => (
        <DateFilterDropdown
          label="Vencimiento"
          activeFilter={dateFilter}
          onChangeFilter={setDateFilter}
        />
      ),
    },
    {
      label: 'Neto',
      value: (r) => fmtClp(r.totalNetoClp),
      total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalNetoClp ?? 0), 0)),
      sortKey: (r) => r.totalNetoClp,
      headerRender: () => (
        <RangeFilterDropdown
          label="Neto"
          dataMin={netoMin}
          dataMax={netoMax}
          activeRange={netoRange}
          onChangeRange={setNetoRange}
          format={fmtClp}
        />
      ),
    },
    {
      label: 'IVA',
      value: (r) => fmtClp(r.ivaClp),
      total: (d) => fmtClp(d.reduce((s, r) => s + (r.ivaClp ?? 0), 0)),
      sortKey: (r) => r.ivaClp,
      headerRender: () => (
        <RangeFilterDropdown
          label="IVA"
          dataMin={ivaMin}
          dataMax={ivaMax}
          activeRange={ivaRange}
          onChangeRange={setIvaRange}
          format={fmtClp}
        />
      ),
    },
    {
      label: 'Total',
      value: (r) => fmtClp(r.totalClp),
      total: (d) => fmtClp(d.reduce((s, r) => s + r.totalClp, 0)),
      sortKey: (r) => r.totalClp,
      headerRender: () => (
        <RangeFilterDropdown
          label="Total"
          dataMin={totalMin}
          dataMax={totalMax}
          activeRange={totalRange}
          onChangeRange={setTotalRange}
          format={fmtClp}
        />
      ),
    },
    { label: 'PDF', value: (r) => <PdfActions row={r} />, align: 'center' as const, className: 'w-20' },
  ], [availableBuildings, visibleBuildings, availableOperators, visibleOperators, availableDocs, visibleDocs, dateFilter, netoMin, netoMax, netoRange, ivaMin, ivaMax, ivaRange, totalMin, totalMax, totalRange]);

  return (
    <div className="flex h-full flex-col gap-2">
      {showPeriodFilter && (
        <div className="flex gap-1">
          {OVERDUE_PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-pa-navy text-white'
                  : 'bg-gray-100 text-pa-text-muted hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
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
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [chartType, setChartType] = useState<ChartType>('column');
  const [currency, setCurrency] = useState('CLP');

  // Derive available years from months
  const years = useMemo(() => {
    const ySet = new Set(months.map((m) => String(new Date(m).getFullYear())));
    return [...ySet].sort();
  }, [months]);

  // Set default year to latest
  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  // Filter months by selected year
  const monthsForYear = useMemo(
    () => months.filter((m) => String(new Date(m).getFullYear()) === selectedYear),
    [months, selectedYear],
  );

  // Set default month to latest with most buildings in selected year
  useEffect(() => {
    if (monthsForYear.length > 0 && (!selectedMonth || !monthsForYear.includes(selectedMonth))) {
      let best = monthsForYear[monthsForYear.length - 1];
      let bestCount = 0;
      for (const m of monthsForYear) {
        const count = (byMonth[m] ?? []).length;
        if (count >= bestCount) { best = m; bestCount = count; }
      }
      setSelectedMonth(best);
    }
  }, [monthsForYear, selectedMonth]);

  if (isLoading) return <DashboardSkeleton />;

  const activeData = viewMode === 'anual' ? yearlyData : (byMonth[selectedMonth] ?? []);
  const monthItems = monthsForYear.map((m) => ({ value: m, label: monthName(m) }));

  if (isTecnico) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-pa-navy">Dashboard no disponible</p>
          <p className="mt-1 text-sm text-pa-text-muted">
            El dashboard financiero no está disponible en modo técnico.
          </p>
          <p className="mt-0.5 text-sm text-pa-text-muted">
            Navega a Activos Inmobiliarios, Comparativas o Monitoreo para ver datos de tu operación.
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
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      {/* Controles */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
        <TogglePills
          options={[{ value: 'anual' as const, label: 'Anual' }, { value: 'mensual' as const, label: 'Mensual' }]}
          value={viewMode}
          onChange={setViewMode}
        />
        <TogglePills options={CHART_TYPE_OPTIONS} value={chartType} onChange={setChartType} />
        {selectedOperator && <span className="text-[12px] text-pa-text-muted">— {selectedOperator}</span>}
      </div>
      {viewMode === 'mensual' && (
        <div className="flex shrink-0 items-center gap-3 px-1">
          <div className="flex shrink-0 gap-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedYear === y
                    ? 'bg-pa-navy text-white'
                    : 'bg-gray-100 text-pa-text-muted hover:bg-gray-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-pa-border" />
          <div className="flex gap-1 overflow-x-auto">
            {monthItems.map((m) => (
              <button
                key={m.value}
                onClick={() => setSelectedMonth(m.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedMonth === m.value
                    ? 'bg-pa-navy text-white'
                    : 'bg-gray-100 text-pa-text-muted hover:bg-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fila 1: gráficos + cards — misma altura */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-2 xl:grid-cols-[2fr_2fr_1fr]">
        <div className="flex flex-col overflow-hidden">
          <p className="mb-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-pa-navy">Consumo (kWh)</p>
          <div className="min-h-0 flex-1">
            <ComboChart data={activeData} chartType={chartType} metric="consumo" />
          </div>
        </div>
        <div className="flex flex-col overflow-hidden">
          <p className="mb-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-pa-navy">Ingreso (CLP)</p>
          <div className="min-h-0 flex-1">
            <ComboChart data={activeData} chartType={chartType} metric="gasto" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
          {[
            { label: isFilteredMode ? 'Pagos Realizados' : 'Pagos Recibidos', value: effectivePayments ? fmtClp(effectivePayments.pagosRecibidos.totalClp) : '—', desc: `${effectivePayments?.pagosRecibidos.count ?? 0} documentos`, accent: 'text-pa-green', onVerMas: undefined },
            { label: isFilteredMode ? 'Facturas Pendientes de Pago' : 'Facturas por Vencer', value: effectivePayments ? fmtClp(effectivePayments.porVencer.totalClp) : '—', desc: `${effectivePayments?.porVencer.count ?? 0} documentos`, accent: 'text-pa-amber', onVerMas: () => setDrawerPorVencer(true) },
            { label: isFilteredMode ? 'Facturas Atrasadas' : 'Facturas Vencidas', value: effectivePayments ? fmtClp(effectivePayments.vencidos.totalClp) : '—', desc: `${effectivePayments?.vencidos.count ?? 0} documentos`, accent: 'text-pa-coral', onVerMas: () => { setDrawerVencidosInitialPeriod(null); setDrawerVencidos(true); } },
          ].map((c) => (
            <div
              key={c.label}
              className="flex flex-1 flex-col rounded-xl border border-pa-navy/30 bg-white px-3 py-2 2xl:px-4 2xl:py-3"
            >
              <p className="text-[10px] font-medium text-pa-text-muted 2xl:text-xs">{c.label}</p>
              <p className={`flex-1 flex items-center text-base font-bold 2xl:text-xl ${c.accent}`}>{c.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-[9px] text-pa-text-muted 2xl:text-[11px]">{c.desc}</p>
                {c.onVerMas && (
                  <PillButton onClick={c.onVerMas}>Ver más +</PillButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fila 2: ambas tablas alineadas, misma altura */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-2 xl:grid-cols-[4fr_1fr]">
        <Card className="flex flex-col overflow-hidden !p-0">
          <SectionBanner
            title={viewMode === 'anual'
              ? `Consumo Anual por Activo Inmobiliario${selectedOperator ? ` — ${selectedOperator}` : ''}`
              : `Consumo Mensual por Activo Inmobiliario — ${monthName(selectedMonth)}${selectedOperator ? ` — ${selectedOperator}` : ''}`}
            inline
            className="mb-1"
          >
            <PillDropdown
              items={CURRENCY_OPTIONS}
              value={currency}
              onChange={setCurrency}
              listWidth="w-32"
            />
          </SectionBanner>
          <div className="min-h-0 flex-1 overflow-hidden">
            <DataTable
              data={activeData}
              columns={buildingCols}
              rowKey={(r) => r.name}
              onRowClick={(r) => navigate(`/buildings/${encodeURIComponent(r.name)}`)}
              footer
            />
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden !p-0">
          <SectionBanner title="Facturas Vencidas por Período" inline className="mb-1" />
          <div className="min-h-0 flex-1 overflow-hidden">
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
