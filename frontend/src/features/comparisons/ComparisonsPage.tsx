import { useEffect, useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useComparisonFilters, useComparisonByStore, useComparisonByStoreType } from '../../hooks/queries/useComparisons';
import { fmt, fmtClp, fmtAxis, monthLabel } from '../../lib/formatters';
import { SHORT_BUILDING_NAMES } from '../../lib/constants';
import { CHART_COLORS, LIGHT_PLOT_OPTIONS, LIGHT_TOOLTIP_STYLE } from '../../lib/chartConfig';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { PillDropdownMulti } from '../../components/ui/PillDropdownMulti';
import { TogglePills } from '../../components/ui/TogglePills';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { useAppStore } from '../../store/useAppStore';
import type { ComparisonRow, ComparisonStoreRow } from '../../types';

const SERIES_COLORS = [CHART_COLORS.blue, CHART_COLORS.coral, '#2D9F5D', '#F5A623', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#10B981', '#6D28D9', '#DC2626'];

type ViewMode = 'store' | 'center';

/* ── Columns ── */
const storeColumns = (moneyLabel: string): Column<ComparisonStoreRow>[] => [
  { label: 'Tienda', value: (r) => r.storeName, align: 'left' },
  { label: 'Activo Inmobiliario', value: (r) => SHORT_BUILDING_NAMES[r.buildingName] ?? r.buildingName, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.totalKwh), total: (d) => fmt(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)) },
  { label: `${moneyLabel} ($)`, value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalConIvaClp ?? 0), 0)) },
  { label: 'Medidores', value: (r) => String(r.totalMeters), total: (d) => String(d.reduce((s, r) => s + r.totalMeters, 0)) },
];

const centerColumns = (moneyLabel: string): Column<ComparisonRow>[] => [
  { label: 'Activo Inmobiliario', value: (r) => SHORT_BUILDING_NAMES[r.buildingName] ?? r.buildingName, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.totalKwh), total: (d) => fmt(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)) },
  { label: `${moneyLabel} ($)`, value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalConIvaClp ?? 0), 0)) },
  { label: 'Medidores', value: (r) => String(r.totalMeters), total: (d) => String(d.reduce((s, r) => s + r.totalMeters, 0)) },
];

/* ── Dual chart (Consumo + Ingreso) ── */
function DualChart({ categories, consumoData, ingresoData, hideFinancial, moneyLabel }: {
  categories: string[];
  consumoData: number[];
  ingresoData: number[];
  hideFinancial: boolean;
  moneyLabel: string;
}) {
  const consumoOptions: Highcharts.Options = {
    chart: { type: 'column', height: 260, backgroundColor: 'transparent' },
    title: { text: 'Consumo (Mwh)', align: 'left', style: { fontSize: '13px', fontWeight: 'bold', color: '#1B1464' } },
    xAxis: {
      categories,
      labels: { rotation: categories.length > 10 ? -45 : 0, style: { fontSize: '10px', color: '#6B7280' } },
      lineColor: '#E5E7EB',
    },
    yAxis: {
      title: { text: undefined },
      labels: { formatter() { return fmtAxis(this.value as number); }, style: { color: '#6B7280', fontSize: '11px' } },
      gridLineColor: '#F3F4F6',
    },
    tooltip: {
      useHTML: true, ...LIGHT_TOOLTIP_STYLE,
      formatter() { return `<b>${this.x}</b><br/>Consumo: <b>${fmt(this.y!)} Mwh</b>`; },
    },
    plotOptions: LIGHT_PLOT_OPTIONS,
    series: [{ type: 'column', name: 'Consumo', data: consumoData, color: CHART_COLORS.blue, showInLegend: false }],
    credits: { enabled: false },
  };

  const ingresoOptions: Highcharts.Options = {
    chart: { type: 'column', height: 260, backgroundColor: 'transparent' },
    title: { text: `${moneyLabel} (CLP)`, align: 'left', style: { fontSize: '13px', fontWeight: 'bold', color: '#1B1464' } },
    xAxis: {
      categories,
      labels: { rotation: categories.length > 10 ? -45 : 0, style: { fontSize: '10px', color: '#6B7280' } },
      lineColor: '#E5E7EB',
    },
    yAxis: {
      title: { text: undefined },
      labels: { formatter() { return `$${fmtAxis(this.value as number)}`; }, style: { color: '#6B7280', fontSize: '11px' } },
      gridLineColor: '#F3F4F6',
    },
    tooltip: {
      useHTML: true, ...LIGHT_TOOLTIP_STYLE,
      formatter() { return `<b>${this.x}</b><br/>${moneyLabel}: <b>${fmtClp(this.y!)}</b>`; },
    },
    plotOptions: LIGHT_PLOT_OPTIONS,
    series: [{ type: 'column', name: moneyLabel, data: ingresoData, color: CHART_COLORS.coral, showInLegend: false }],
    credits: { enabled: false },
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
      <HighchartsReact highcharts={Highcharts} options={consumoOptions} />
      {!hideFinancial && <HighchartsReact highcharts={Highcharts} options={ingresoOptions} />}
    </div>
  );
}

export function ComparisonsPage() {
  const { isTecnico } = useOperatorFilter();
  const userMode = useAppStore((s) => s.userMode);
  const isHolding = userMode === 'holding';
  const moneyLabel = isHolding ? 'Ingreso' : 'Gasto';

  const { data: filters, isLoading: loadingFilters } = useComparisonFilters();

  const [viewMode, setViewMode] = useState<ViewMode>('store');
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);

  // Default month
  useEffect(() => {
    if (!filters) return;
    if (selectedMonth === undefined && filters.months.length > 0) {
      setSelectedMonth(filters.months[filters.months.length - 1]);
    }
  }, [filters, selectedMonth]);

  // Queries
  const typeIds = selectedTypeIds.length > 0 ? selectedTypeIds.map(Number) : undefined;
  const buildings = selectedBuildings.length > 0 ? selectedBuildings : undefined;

  const storeQuery = useComparisonByStore(
    viewMode === 'store' ? selectedMonth : undefined,
    buildings,
    typeIds,
  );

  const centerQuery = useComparisonByStoreType(
    viewMode === 'center' ? (typeIds ?? []) : [],
    viewMode === 'center' ? selectedMonth : undefined,
  );

  // For "Por Centro" without type filter, we need all buildings
  const centerAllQuery = useComparisonByStore(
    viewMode === 'center' && !typeIds ? selectedMonth : undefined,
    buildings,
  );

  // Aggregate store data to center level when no type filter is used
  const centerRows = useMemo<ComparisonRow[]>(() => {
    if (viewMode !== 'center') return [];
    if (typeIds && centerQuery.data) return centerQuery.data;
    // Aggregate from store query
    const data = centerAllQuery.data;
    if (!data) return [];
    const map = new Map<string, ComparisonRow>();
    for (const r of data) {
      const existing = map.get(r.buildingName);
      if (existing) {
        existing.totalKwh = (existing.totalKwh ?? 0) + (r.totalKwh ?? 0);
        existing.totalConIvaClp = (existing.totalConIvaClp ?? 0) + (r.totalConIvaClp ?? 0);
        existing.totalMeters += r.totalMeters;
        existing.ddaMaxKw = (existing.ddaMaxKw ?? 0) + (r.ddaMaxKw ?? 0);
        existing.ddaMaxPuntaKw = (existing.ddaMaxPuntaKw ?? 0) + (r.ddaMaxPuntaKw ?? 0);
        existing.kwhTroncal = (existing.kwhTroncal ?? 0) + (r.kwhTroncal ?? 0);
        existing.kwhServPublico = (existing.kwhServPublico ?? 0) + (r.kwhServPublico ?? 0);
        existing.energiaClp = (existing.energiaClp ?? 0) + (r.energiaClp ?? 0);
      } else {
        map.set(r.buildingName, { ...r });
      }
    }
    return [...map.values()].sort((a, b) => a.buildingName.localeCompare(b.buildingName));
  }, [viewMode, typeIds, centerQuery.data, centerAllQuery.data]);

  const storeRows = storeQuery.data ?? [];
  const isLoading = viewMode === 'store' ? storeQuery.isLoading : (typeIds ? centerQuery.isLoading : centerAllQuery.isLoading);

  // Chart data
  const chartData = useMemo(() => {
    if (viewMode === 'store') {
      return {
        categories: storeRows.map((r) => r.storeName),
        consumo: storeRows.map((r) => Math.round((r.totalKwh ?? 0) / 1000)),
        ingreso: storeRows.map((r) => r.totalConIvaClp ?? 0),
      };
    }
    return {
      categories: centerRows.map((r) => SHORT_BUILDING_NAMES[r.buildingName] ?? r.buildingName),
      consumo: centerRows.map((r) => Math.round((r.totalKwh ?? 0) / 1000)),
      ingreso: centerRows.map((r) => r.totalConIvaClp ?? 0),
    };
  }, [viewMode, storeRows, centerRows]);

  const hasData = chartData.categories.length > 0;
  const selectedMonthLabel = selectedMonth ? monthLabel(selectedMonth) : '';

  // Filter options
  const buildingOptions = (filters?.buildingNames ?? []).map((b) => ({
    value: b,
    label: SHORT_BUILDING_NAMES[b] ?? b,
  }));
  const typeOptions = (filters?.storeTypes ?? []).map((st) => ({
    value: String(st.id),
    label: st.name,
  }));

  if (loadingFilters) {
    return <div className="p-4 text-[13px] text-pa-text-muted">Cargando filtros...</div>;
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Filters bar */}
      <div className="ml-4 flex flex-wrap items-center gap-3">
        <TogglePills
          options={[
            { value: 'store' as ViewMode, label: 'Por Tienda' },
            { value: 'center' as ViewMode, label: 'Por Centro' },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />

        <PillDropdownMulti
          items={buildingOptions}
          selected={selectedBuildings}
          onChange={setSelectedBuildings}
          placeholder="Todos los edificios"
          listWidth="w-72"
          align="left"
        />

        <PillDropdownMulti
          items={typeOptions}
          selected={selectedTypeIds}
          onChange={setSelectedTypeIds}
          placeholder="Todos los tipos"
          listWidth="w-60"
          align="left"
        />

        <PillDropdown
          items={(filters?.months ?? []).map((m) => ({ value: m, label: monthLabel(m) }))}
          value={selectedMonth ?? ''}
          onChange={setSelectedMonth}
          align="left"
        />
      </div>

      {/* Charts */}
      <Card className="min-h-0 flex-[3] flex flex-col">
        <SectionBanner
          title={`Comparativa ${viewMode === 'store' ? 'por Tienda' : 'por Centro'} — ${selectedMonthLabel}`}
          inline
          className="mb-3"
        />
        <div className="min-h-0 flex-1">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">Cargando...</div>
          ) : !hasData ? (
            <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">Sin datos para esta selección y mes</div>
          ) : (
            <DualChart
              categories={chartData.categories}
              consumoData={chartData.consumo}
              ingresoData={chartData.ingreso}
              hideFinancial={isTecnico}
              moneyLabel={moneyLabel}
            />
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="min-h-0 flex-[2] flex flex-col">
        <SectionBanner
          title={`Detalle ${viewMode === 'store' ? 'por Tienda' : 'por Centro'} — ${selectedMonthLabel}`}
          inline
          className="mb-3"
        />
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-[13px] text-pa-text-muted">Cargando...</div>
          ) : viewMode === 'store' ? (
            <DataTable
              data={storeRows}
              columns={storeColumns(moneyLabel)}
              rowKey={(r) => `${r.storeName}-${r.buildingName}`}
              footer
            />
          ) : (
            <DataTable
              data={centerRows}
              columns={centerColumns(moneyLabel)}
              rowKey={(r) => r.buildingName}
              footer
            />
          )}
        </div>
      </Card>
    </div>
  );
}
