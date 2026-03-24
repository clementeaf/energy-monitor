import { useEffect, useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useComparisonFilters, useComparisonByStore } from '../../hooks/queries/useComparisons';
import { fmt, fmtClp, fmtAxis, monthLabel } from '../../lib/formatters';
import { SHORT_BUILDING_NAMES } from '../../lib/constants';
import { LIGHT_PLOT_OPTIONS, LIGHT_TOOLTIP_STYLE, getSeriesColors, getChartColors } from '../../lib/chartConfig';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { PillDropdownMulti } from '../../components/ui/PillDropdownMulti';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { useAppStore } from '../../store/useAppStore';
import type { ComparisonStoreRow } from '../../types';

const MAX_BUILDINGS = 3;
const MAX_STORES = 20;
const MAX_TYPES = 10;
const MAX_CHART_BARS = 20;

const getColors = () => getSeriesColors();

interface GroupedChartData {
  categories: string[]; // store names (eje X)
  buildings: string[];  // building short names (series)
  consumo: number[][];  // [buildingIdx][storeIdx] → Mwh
  ingreso: number[][];  // [buildingIdx][storeIdx] → CLP
}

/* ── Grouped dual chart ── */
function GroupedDualChart({ data, hideFinancial, moneyLabel }: {
  data: GroupedChartData;
  hideFinancial: boolean;
  moneyLabel: string;
}) {
  const { categories, buildings, consumo, ingreso } = data;
  const singleBuilding = buildings.length === 1;

  const shared: Partial<Highcharts.Options> = {
    chart: { type: 'column', height: 280, backgroundColor: 'transparent' },
    plotOptions: LIGHT_PLOT_OPTIONS,
    credits: { enabled: false },
    legend: singleBuilding
      ? { enabled: false }
      : { itemStyle: { color: '#6B7280', fontSize: '11px' }, itemHoverStyle: { color: '#1E3A5F' } },
  };
  const xAxis: Highcharts.XAxisOptions = {
    categories,
    labels: { rotation: categories.length > 8 ? -45 : 0, style: { fontSize: '10px', color: '#6B7280' } },
    lineColor: '#E5E7EB',
  };

  const consumoSeries: Highcharts.SeriesColumnOptions[] = buildings.map((bldg, i) => ({
    type: 'column',
    name: bldg,
    data: consumo[i],
    color: singleBuilding ? getColors()[0] : getColors()[i % getColors().length],
  }));

  const ingresoSeries: Highcharts.SeriesColumnOptions[] = buildings.map((bldg, i) => ({
    type: 'column',
    name: bldg,
    data: ingreso[i],
    color: singleBuilding ? getColors()[1] : getColors()[i % getColors().length],
  }));

  return (
    <div className={`grid min-h-0 flex-1 gap-4 ${hideFinancial ? 'grid-cols-1' : 'grid-cols-2'}`}>
      <HighchartsReact highcharts={Highcharts} options={{
        ...shared,
        title: { text: 'Consumo (Mwh)', align: 'left', style: { fontSize: '13px', fontWeight: 'bold', color: getChartColors().navy } },
        xAxis,
        yAxis: { title: { text: undefined }, labels: { formatter() { return fmtAxis(this.value as number); }, style: { color: '#6B7280', fontSize: '11px' } }, gridLineColor: '#F3F4F6' },
        tooltip: {
          shared: true, useHTML: true, ...LIGHT_TOOLTIP_STYLE,
          formatter() {
            let html = `<b>${this.x}</b><br/>`;
            for (const p of this.points!) {
              html += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${fmt(p.y!)} Mwh</b><br/>`;
            }
            return html;
          },
        },
        series: consumoSeries,
      } satisfies Highcharts.Options} />
      {!hideFinancial && (
        <HighchartsReact highcharts={Highcharts} options={{
          ...shared,
          title: { text: `${moneyLabel} (CLP)`, align: 'left', style: { fontSize: '13px', fontWeight: 'bold', color: getChartColors().navy } },
          xAxis,
          yAxis: { title: { text: undefined }, labels: { formatter() { return `$${fmtAxis(this.value as number)}`; }, style: { color: '#6B7280', fontSize: '11px' } }, gridLineColor: '#F3F4F6' },
          tooltip: {
            shared: true, useHTML: true, ...LIGHT_TOOLTIP_STYLE,
            formatter() {
              let html = `<b>${this.x}</b><br/>`;
              for (const p of this.points!) {
                html += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${fmtClp(p.y!)}</b><br/>`;
              }
              return html;
            },
          },
          series: ingresoSeries,
        } satisfies Highcharts.Options} />
      )}
    </div>
  );
}

/* ── Table columns ── */
const tableColumns = (moneyLabel: string): Column<ComparisonStoreRow>[] => [
  { label: 'Tienda', value: (r) => r.storeName, align: 'left' },
  { label: 'Edificio', value: (r) => SHORT_BUILDING_NAMES[r.buildingName] ?? r.buildingName, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.totalKwh), total: (d) => fmt(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)) },
  { label: `${moneyLabel} ($)`, value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalConIvaClp ?? 0), 0)) },
  { label: 'Medidores', value: (r) => String(r.totalMeters), total: (d) => String(d.reduce((s, r) => s + r.totalMeters, 0)) },
];

export function ComparisonsPage() {
  const { isTecnico, isMultiOp, selectedOperator, hasOperator } = useOperatorFilter();
  const userMode = useAppStore((s) => s.userMode);
  const moneyLabel = userMode === 'holding' ? 'Ingreso' : 'Gasto';

  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [selectedStoreNames, setSelectedStoreNames] = useState<string[]>([]);

  // Multi Operador: lock store to selected operator, no type filter
  const effectiveStoreNames = isMultiOp && hasOperator ? [selectedOperator!] : selectedStoreNames;

  // Global filters (buildings, months — always unscoped)
  const { data: globalFilters, isLoading: loadingFilters } = useComparisonFilters();
  // Scoped filters (stores, types — filtered by selected buildings)
  const scopedBuildings = useMemo(() =>
    selectedBuildings.length > 0 ? selectedBuildings : undefined,
  [selectedBuildings]);
  const { data: scopedFilters } = useComparisonFilters(scopedBuildings);

  // Reset store/type selections when building changes (old selections may not exist)
  useEffect(() => {
    if (!scopedFilters) return;
    const validNames = new Set(scopedFilters.storeNames);
    const validTypes = new Set(scopedFilters.storeTypes.map((st) => String(st.id)));
    setSelectedStoreNames((prev) => prev.filter((n) => validNames.has(n)));
    setSelectedTypeIds((prev) => prev.filter((id) => validTypes.has(id)));
  }, [scopedFilters]);

  useEffect(() => {
    if (globalFilters && selectedMonth === undefined && globalFilters.months.length > 0) {
      setSelectedMonth(globalFilters.months[globalFilters.months.length - 1]);
    }
  }, [globalFilters, selectedMonth]);

  const hasSelection = isMultiOp
    ? hasOperator
    : effectiveStoreNames.length > 0 || (selectedBuildings.length > 0 && selectedTypeIds.length > 0);
  const buildings = selectedBuildings.length > 0 ? selectedBuildings : undefined;
  const typeIds = !isMultiOp && selectedTypeIds.length > 0 ? selectedTypeIds.map(Number) : undefined;
  const storeNames = effectiveStoreNames.length > 0 ? effectiveStoreNames : undefined;

  const { data, isLoading } = useComparisonByStore(hasSelection ? selectedMonth : undefined, buildings, typeIds, storeNames);
  const rows = data ?? [];

  // Build grouped chart data: categories = unique store names, series = buildings
  const chartData = useMemo<GroupedChartData>(() => {
    if (rows.length === 0) return { categories: [], buildings: [], consumo: [], ingreso: [] };

    // Get unique store names sorted by total consumo (top N)
    const storeConsumo = new Map<string, number>();
    for (const r of rows) {
      storeConsumo.set(r.storeName, (storeConsumo.get(r.storeName) ?? 0) + (r.totalKwh ?? 0));
    }
    const sortedStores = [...storeConsumo.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CHART_BARS)
      .map(([name]) => name);

    // Get unique buildings present in filtered rows
    const buildingSet = new Set<string>();
    for (const r of rows) {
      if (sortedStores.includes(r.storeName)) buildingSet.add(r.buildingName);
    }
    const bldgList = [...buildingSet].sort();
    const bldgShort = bldgList.map((b) => SHORT_BUILDING_NAMES[b] ?? b);

    // Build lookup: `storeName|buildingName` → row
    const lookup = new Map<string, ComparisonStoreRow>();
    for (const r of rows) {
      lookup.set(`${r.storeName}|${r.buildingName}`, r);
    }

    // Build series data
    const consumo = bldgList.map((bldg) =>
      sortedStores.map((store) => {
        const r = lookup.get(`${store}|${bldg}`);
        return Math.round((r?.totalKwh ?? 0) / 1000);
      }),
    );
    const ingreso = bldgList.map((bldg) =>
      sortedStores.map((store) => {
        const r = lookup.get(`${store}|${bldg}`);
        return r?.totalConIvaClp ?? 0;
      }),
    );

    return { categories: sortedStores, buildings: bldgShort, consumo, ingreso };
  }, [rows]);

  const hasData = chartData.categories.length > 0;
  const isTruncated = rows.length > 0 && new Set(rows.map((r) => r.storeName)).size > MAX_CHART_BARS;
  const totalStores = new Set(rows.map((r) => r.storeName)).size;
  const selectedMonthLabel = selectedMonth ? monthLabel(selectedMonth) : '';

  const filters = scopedBuildings ? scopedFilters : globalFilters;
  const buildingOptions = (globalFilters?.buildingNames ?? []).map((b) => ({ value: b, label: SHORT_BUILDING_NAMES[b] ?? b }));
  const typeOptions = (filters?.storeTypes ?? []).map((st) => ({ value: String(st.id), label: st.name }));
  const storeNameOptions = (filters?.storeNames ?? []).map((n) => ({ value: n, label: n }));

  if (loadingFilters) {
    return <div className="p-4 text-[13px] text-pa-text-muted">Cargando filtros...</div>;
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Filters */}
      <div className="ml-4 flex flex-wrap items-center gap-3">
        {isMultiOp && hasOperator && (
          <span className="text-xs font-medium text-pa-navy">{selectedOperator}</span>
        )}

        <PillDropdownMulti
          items={buildingOptions}
          selected={selectedBuildings}
          onChange={(v) => setSelectedBuildings(v.slice(0, MAX_BUILDINGS))}
          placeholder="Edificios"
          listWidth="w-72"
          align="left"
        />

        {!isMultiOp && (
          <PillDropdownMulti
            items={storeNameOptions}
            selected={selectedStoreNames}
            onChange={(v) => setSelectedStoreNames(v.slice(0, MAX_STORES))}
            placeholder="Tiendas"
            listWidth="w-72"
            align="left"
          />
        )}

        {!isMultiOp && (
          <PillDropdownMulti
            items={typeOptions}
            selected={selectedTypeIds}
            onChange={(v) => setSelectedTypeIds(v.slice(0, MAX_TYPES))}
            placeholder="Tipos"
            listWidth="w-60"
            align="left"
          />
        )}

        <PillDropdown
          items={(globalFilters?.months ?? []).map((m) => ({ value: m, label: monthLabel(m) }))}
          value={selectedMonth ?? ''}
          onChange={setSelectedMonth}
          align="left"
        />
      </div>

      {/* Charts */}
      <Card className="min-h-0 flex-[3] flex flex-col">
        <SectionBanner
          title={`Comparativa por Tienda — ${selectedMonthLabel}${isTruncated ? ` (top ${MAX_CHART_BARS} de ${totalStores})` : ''}`}
          inline
          className="mb-3"
        />
        <div className="min-h-0 flex-1">
          {!hasSelection ? (
            <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">{isMultiOp ? 'Selecciona un operador en el sidebar' : 'Selecciona tiendas o un edificio con tipo de tienda'}</div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">Cargando...</div>
          ) : !hasData ? (
            <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">Sin datos para esta selección y mes</div>
          ) : (
            <GroupedDualChart
              data={chartData}
              hideFinancial={isTecnico}
              moneyLabel={moneyLabel}
            />
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="min-h-0 flex-[2] flex flex-col">
        <SectionBanner
          title={`Detalle por Tienda — ${selectedMonthLabel}`}
          inline
          className="mb-3"
        />
        <div className="min-h-0 flex-1 overflow-auto">
          {!hasSelection ? (
            <div className="p-4 text-[13px] text-pa-text-muted">{isMultiOp ? 'Selecciona un operador en el sidebar' : 'Selecciona tiendas o un edificio con tipo de tienda'}</div>
          ) : isLoading ? (
            <div className="p-4 text-[13px] text-pa-text-muted">Cargando...</div>
          ) : (
            <DataTable
              data={rows}
              columns={tableColumns(moneyLabel)}
              rowKey={(r) => `${r.storeName}|${r.buildingName}`}
              footer
            />
          )}
        </div>
      </Card>
    </div>
  );
}
