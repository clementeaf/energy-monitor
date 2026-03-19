import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Drawer } from '../../components/ui/Drawer';
import { PillButton } from '../../components/ui/PillButton';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { TogglePills } from '../../components/ui/TogglePills';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { useDashboardSummary, useDashboardPayments, useDashboardDocuments, useDashboardAllDocuments } from '../../hooks/queries/useDashboard';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { fmt, fmtClp, monthName } from '../../lib/formatters';
import type { ChartType } from '../../lib/chartConfig';
import type { BillingDocumentDetail, DashboardBuildingMonth, OverdueBucket, PaymentSummary } from '../../types';
import { ComboChart } from './components/ComboChart';
import { ComparativaChart } from './components/ComparativaChart';
import { DocTableWithFilter } from './components/DocTableWithFilter';

interface BuildingRow {
  name: string;
  totalKwh: number | null;
  totalConIvaClp: number | null;
  areaSqm: number | null;
  totalMeters: number;
}

function getBuildingCols(mode: 'anual' | 'mensual'): Column<BuildingRow>[] {
  const isMensual = mode === 'mensual';
  const cLabel = isMensual ? 'Consumo (Mwh)' : 'Consumo (kWh)';
  const cDiv = isMensual ? 1000 : 1;
  const rcUnit = isMensual ? 'Mwh/m²' : 'kWh/m²';
  const rcLabel = `Rendimiento\nConsumo (${rcUnit})`;
  return [
    { label: 'Activos Inmobiliarios', value: (r) => r.name, align: 'left', sortKey: (r) => r.name },
    { label: cLabel, value: (r) => fmt(r.totalKwh != null ? Math.round(r.totalKwh / cDiv) : null), total: (d) => fmt(Math.round(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0) / cDiv)), sortKey: (r) => r.totalKwh },
    { label: 'Ingreso ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalConIvaClp ?? 0), 0)), sortKey: (r) => r.totalConIvaClp },
    { label: rcLabel, value: (r) => r.areaSqm ? ((r.totalKwh ?? 0) / cDiv / r.areaSqm).toFixed(3) : '—', total: (d) => { let sum = 0; for (const r of d) { if (r.areaSqm) sum += parseFloat(((r.totalKwh ?? 0) / cDiv / r.areaSqm).toFixed(3)); } return sum.toFixed(3); }, sortKey: (r) => r.areaSqm ? (r.totalKwh ?? 0) / cDiv / r.areaSqm : null },
    { label: 'Rendimiento\nIngreso ($/m²)', value: (r) => r.areaSqm ? fmtClp(Math.round((r.totalConIvaClp ?? 0) / r.areaSqm)) : '—', total: (d) => fmtClp(d.reduce((s, r) => s + (r.areaSqm ? Math.round((r.totalConIvaClp ?? 0) / r.areaSqm) : 0), 0)), sortKey: (r) => r.areaSqm ? (r.totalConIvaClp ?? 0) / r.areaSqm : null },
    { label: 'Superficie (m²)', value: (r) => fmt(r.areaSqm), total: (d) => fmt(d.reduce((s, r) => s + (r.areaSqm ?? 0), 0)), sortKey: (r) => r.areaSqm },
  ];
}

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
  { value: 'pie', label: 'Circular' },
];

const overdueCols: Column<OverdueBucket>[] = [
  { label: 'Período', value: (r) => r.range, align: 'left' },
  { label: 'Docs', value: (r) => String(r.count), total: (d) => String(d.reduce((s, r) => s + r.count, 0)) },
  { label: 'Monto', value: (r) => fmtClp(r.totalClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.totalClp, 0)) },
];

const PERIOD_PREFIXES = ['1-30', '31-60', '61-90', '90+'];
function rangeToPeriodValue(range: string): string {
  return PERIOD_PREFIXES.find((p) => range.startsWith(p)) ?? 'all';
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86_400_000));
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { isFilteredMode, isTecnico, needsSelection, operatorBuildings, selectedOperator, selectedStoreName } = useOperatorFilter();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: payments } = useDashboardPayments();
  const [drawerComparativa, setDrawerComparativa] = useState(false);
  const [drawerPorVencer, setDrawerPorVencer] = useState(false);
  const [drawerVencidos, setDrawerVencidos] = useState(false);
  const [drawerVencidosInitialPeriod, setDrawerVencidosInitialPeriod] = useState<string | null>(null);
  const { data: porVencerDocs } = useDashboardDocuments('por_vencer', drawerPorVencer && !isFilteredMode);
  const { data: vencidosDocs } = useDashboardDocuments('vencido', drawerVencidos && !isFilteredMode);

  const { pagado: allPagado, porVencer: allPorVencer, vencido: allVencido } = useDashboardAllDocuments(isFilteredMode && !needsSelection);

  const filterOperatorName = selectedOperator ?? selectedStoreName ?? null;

  const filterDocs = useMemo(() => {
    return (docs: BillingDocumentDetail[] | undefined) => {
      if (!docs || !filterOperatorName) return docs;
      return docs.filter((d) => d.operatorName === filterOperatorName);
    };
  }, [filterOperatorName]);

  const filteredPayments: PaymentSummary | undefined = useMemo(() => {
    if (!isFilteredMode || !allPagado.data || !allPorVencer.data || !allVencido.data) return undefined;
    const pagDocs = filterDocs(allPagado.data) ?? [];
    const pvDocs = filterDocs(allPorVencer.data) ?? [];
    const vDocs = filterDocs(allVencido.data) ?? [];

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

  const effectivePayments = isFilteredMode ? filteredPayments : payments;
  const effectivePorVencerDocs = isFilteredMode ? filterDocs(allPorVencer.data) : porVencerDocs;
  const effectiveVencidosDocs = isFilteredMode ? filterDocs(allVencido.data) : vencidosDocs;

  const filteredSummary = useMemo(() => {
    if (!summary) return undefined;
    if (!isFilteredMode || !operatorBuildings) return summary;
    return summary.filter((r) => operatorBuildings.has(r.buildingName));
  }, [summary, isFilteredMode, operatorBuildings]);

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
  const [tableView, setTableView] = useState<'consumo' | 'medioambiental'>('consumo');
  const [maYear, setMaYear] = useState('');
  const [maMonth, setMaMonth] = useState('');

  const years = useMemo(() => {
    const ySet = new Set(months.map((m) => String(new Date(m).getFullYear())));
    ySet.delete('2026');
    return [...ySet].sort();
  }, [months]);

  useEffect(() => {
    if (years.length > 0 && !selectedYear) setSelectedYear(years[years.length - 1]);
  }, [years, selectedYear]);

  const buildingCols = useMemo(() => getBuildingCols('mensual'), []);

  // Medioambiental year/month
  useEffect(() => {
    if (years.length > 0 && !maYear) setMaYear(years[years.length - 1]);
  }, [years, maYear]);

  const maMonthsForYear = useMemo(
    () => months.filter((m) => String(new Date(m).getFullYear()) === maYear),
    [months, maYear],
  );

  useEffect(() => {
    if (maMonthsForYear.length > 0 && (!maMonth || !maMonthsForYear.includes(maMonth))) {
      setMaMonth(maMonthsForYear[maMonthsForYear.length - 1]);
    }
  }, [maMonthsForYear, maMonth]);

  const maData = useMemo(() => byMonth[maMonth] ?? [], [byMonth, maMonth]);

  const maCols: Column<BuildingRow>[] = useMemo(() => [
    { label: 'Activos Inmobiliarios', value: (r) => r.name, align: 'left', sortKey: (r) => r.name, width: '250px', total: () => '\u00A0' },
  ], []);

  const monthsForYear = useMemo(
    () => months.filter((m) => String(new Date(m).getFullYear()) === selectedYear),
    [months, selectedYear],
  );

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

  const cards = [
    { label: isFilteredMode ? 'Pagos Realizados' : 'Pagos Recibidos', value: effectivePayments ? fmtClp(effectivePayments.pagosRecibidos.totalClp) : '—', desc: `${effectivePayments?.pagosRecibidos.count ?? 0} documentos`, accent: 'text-pa-green', onVerMas: undefined },
    { label: isFilteredMode ? 'Facturas Pendientes de Pago' : 'Facturas por Vencer', value: effectivePayments ? fmtClp(effectivePayments.porVencer.totalClp) : '—', desc: `${effectivePayments?.porVencer.count ?? 0} documentos`, accent: 'text-pa-amber', onVerMas: () => setDrawerPorVencer(true) },
    { label: isFilteredMode ? 'Facturas Atrasadas' : 'Facturas Vencidas', value: effectivePayments ? fmtClp(effectivePayments.vencidos.totalClp) : '—', desc: `${effectivePayments?.vencidos.count ?? 0} documentos`, accent: 'text-pa-coral', onVerMas: () => { setDrawerVencidosInitialPeriod(null); setDrawerVencidos(true); } },
  ];

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
        <button onClick={() => setDrawerComparativa(true)} className="shrink-0 rounded-full bg-pa-navy px-4 py-1 text-xs font-semibold text-white transition-colors hover:bg-pa-blue">
          Comparativa
        </button>
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

      {/* Fila 1: Gráficos + Cards */}
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex flex-[4] gap-2 overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <p className="mb-1 shrink-0 text-[11px] font-semibold tracking-wide text-pa-navy">Consumo (Mwh)</p>
            <div className="min-h-0 flex-1">
              <ComboChart data={activeData} chartType={chartType} metric="consumo" viewMode={viewMode} />
            </div>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <p className="mb-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-pa-navy">Ingreso (CLP)</p>
            <div className="min-h-0 flex-1">
              <ComboChart data={activeData} chartType={chartType} metric="gasto" viewMode={viewMode} />
            </div>
          </div>
        </div>
        <div className="w-px shrink-0 bg-pa-border" />
        <div className="flex flex-1 flex-col gap-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="flex flex-1 flex-col rounded-xl border border-pa-navy/30 bg-white px-3 py-2 2xl:px-4 2xl:py-3"
            >
              <p className="text-[10px] font-medium text-pa-text-muted 2xl:text-xs">{c.label}</p>
              <p className={`flex flex-1 items-center text-base font-bold 2xl:text-xl ${c.accent}`}>{c.value}</p>
              <p className="text-[8px] text-pa-text-muted/60 2xl:text-[10px]">Última actualización: 18 mar 2026</p>
              <div className="flex items-center justify-between">
                <p className="text-[9px] text-pa-text-muted 2xl:text-[11px]">{c.desc}</p>
                {c.onVerMas && <PillButton onClick={c.onVerMas}>Ver más +</PillButton>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fila 2: Tablas */}
      <div className="flex min-h-0 flex-1 gap-2">
        <Card className="flex flex-[4] flex-col overflow-hidden !p-0">
          <SectionBanner
            title={
              <TogglePills
                options={[
                  { value: 'consumo' as const, label: viewMode === 'anual'
                    ? `Consumo Anual por Activo Inmobiliario${selectedOperator ? ` — ${selectedOperator}` : ''}`
                    : `Consumo Mensual por Activo Inmobiliario — ${monthName(selectedMonth)}${selectedOperator ? ` — ${selectedOperator}` : ''}` },
                  { value: 'medioambiental' as const, label: 'Cifras Medioambientales' },
                ]}
                value={tableView}
                onChange={setTableView}
              />
            }
            inline
            className="mb-1 h-10"
          >
            {tableView === 'consumo' && (
              <PillDropdown
                items={CURRENCY_OPTIONS}
                value={currency}
                onChange={setCurrency}
                listWidth="w-32"
              />
            )}
            {tableView === 'medioambiental' && (
              <div className="ml-auto flex items-center gap-2">
                <PillDropdown
                  items={years.map((y) => ({ value: y, label: y }))}
                  value={maYear}
                  onChange={setMaYear}
                  listWidth="w-24"
                />
                <PillDropdown
                  items={maMonthsForYear.map((m) => ({ value: m, label: monthName(m) }))}
                  value={maMonth}
                  onChange={setMaMonth}
                  listWidth="w-36"
                />
              </div>
            )}
          </SectionBanner>
          <div className="min-h-0 flex-1 overflow-hidden">
            {tableView === 'consumo' ? (
              <DataTable
                data={activeData}
                columns={buildingCols}
                rowKey={(r) => r.name}
                onRowClick={(r) => navigate(`/buildings/${encodeURIComponent(r.name)}`)}
                footer
                maxHeight="max-h-full"
              />
            ) : (
              <DataTable
                data={maData}
                columns={maCols}
                rowKey={(r) => r.name}
                footer
                maxHeight="max-h-full"
              />
            )}
          </div>
        </Card>

        <div className="w-px shrink-0 bg-pa-border" />
        <Card className="flex flex-1 flex-col overflow-hidden !p-0">
          <SectionBanner title="Facturas Vencidas por Período" inline className="mb-1 h-10" />
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

      <Drawer open={drawerComparativa} onClose={() => setDrawerComparativa(false)} title="Comparativa" size="lg">
        <ComparativaChart data={filteredSummary} />
      </Drawer>
    </div>
  );
}
