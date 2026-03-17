import { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { useComparisonFilters, useComparisonByStoreType, useComparisonByStoreName } from '../../hooks/queries/useComparisons';
import { fmt, fmtClp, fmtAxis, monthLabel } from '../../lib/formatters';
import { SHORT_BUILDING_NAMES } from '../../lib/constants';
import { CHART_COLORS, LIGHT_PLOT_OPTIONS, LIGHT_TOOLTIP_STYLE, type ChartType } from '../../lib/chartConfig';
import { SectionBanner } from '../../components/ui/SectionBanner';
import { PillDropdown } from '../../components/ui/PillDropdown';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import type { ComparisonRow } from '../../types';

/* ── Criterios técnicos ── */
type TechMetricKey = 'totalKwh' | 'ddaMaxKw' | 'ddaMaxPuntaKw' | 'kwhTroncal' | 'kwhServPublico';

const TECH_METRICS: { key: TechMetricKey; label: string; unit: string; color: string }[] = [
  { key: 'totalKwh', label: 'Consumo', unit: 'kWh', color: '#3D3BF3' },
  { key: 'ddaMaxKw', label: 'Dda. Máx.', unit: 'kW', color: '#E84C6F' },
  { key: 'ddaMaxPuntaKw', label: 'Dda. Máx. Punta', unit: 'kW', color: '#2D9F5D' },
  { key: 'kwhTroncal', label: 'kWh Troncal', unit: 'kWh', color: '#F5A623' },
  { key: 'kwhServPublico', label: 'kWh Serv. Público', unit: 'kWh', color: '#6366F1' },
];

/* ── Columns ── */
const baseColumns: Column<ComparisonRow>[] = [
  { label: 'Edificio', value: (r) => r.buildingName, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.totalKwh), total: (d) => fmt(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)) },
  { label: 'Gasto ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalConIvaClp ?? 0), 0)) },
  { label: 'Medidores', value: (r) => String(r.totalMeters), total: (d) => String(d.reduce((s, r) => s + r.totalMeters, 0)) },
];

const techColumns: Column<ComparisonRow>[] = [
  { label: 'Edificio', value: (r) => r.buildingName, align: 'left' },
  ...TECH_METRICS.map((m) => ({
    label: `${m.label} (${m.unit})`,
    value: (r: ComparisonRow) => fmt(r[m.key]),
    total: (d: ComparisonRow[]) => fmt(d.reduce((s, r) => s + ((r[m.key] as number | null) ?? 0), 0)),
  })),
  { label: 'Medidores', value: (r: ComparisonRow) => String(r.totalMeters), total: (d: ComparisonRow[]) => String(d.reduce((s, r) => s + r.totalMeters, 0)) },
];

type CompareMode = 'type' | 'name';

const PIE_COLORS = ['#3D3BF3', '#E84C6F', '#2D9F5D', '#F5A623', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'];

/* ── Pie chart ── */
function ComparisonPieChart({ data, hideFinancial }: { data: ComparisonRow[]; hideFinancial?: boolean }) {
  const points = data.map((d, i) => ({
    name: SHORT_BUILDING_NAMES[d.buildingName] ?? d.buildingName,
    color: PIE_COLORS[i % PIE_COLORS.length],
    kwh: d.totalKwh ?? 0,
    clp: d.totalConIvaClp ?? 0,
  }));

  const options: Highcharts.Options = {
    chart: { height: null as unknown as number, backgroundColor: 'transparent' },
    title: { text: undefined },
    tooltip: {
      useHTML: true,
      ...LIGHT_TOOLTIP_STYLE,
      pointFormatter() {
        const p = this as Highcharts.Point;
        return p.series.name.includes('Gasto')
          ? `<b>${fmtClp(p.y!)}</b> (${Highcharts.numberFormat(p.percentage!, 1)}%)`
          : `<b>${fmt(p.y!)} kWh</b> (${Highcharts.numberFormat(p.percentage!, 1)}%)`;
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
        center: (hideFinancial ? ['50%', '50%'] : ['25%', '50%']) as [string, string],
        size: '80%',
        data: points.map((p) => ({ name: p.name, y: p.kwh, color: p.color })),
      },
      ...(!hideFinancial ? [{
        type: 'pie' as const,
        name: 'Gasto (CLP)',
        center: ['75%', '50%'] as [string, string],
        size: '80%',
        data: points.map((p) => ({ name: p.name, y: p.clp, color: p.color })),
      }] : []),
    ],
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { height: '100%' } }} />;
}

/* ── Bar / Line / Area chart ── */
function ComparisonChart({ data, chartType, hideFinancial }: { data: ComparisonRow[]; chartType: ChartType; hideFinancial?: boolean }) {
  if (chartType === 'pie') return <ComparisonPieChart data={data} hideFinancial={hideFinancial} />;

  const categories = data.map((d) => SHORT_BUILDING_NAMES[d.buildingName] ?? d.buildingName);

  // Técnico: 5 series técnicas en un solo eje. Normal: Consumo + Gasto (doble eje).
  if (hideFinancial) {
    const options: Highcharts.Options = {
      chart: { height: null as unknown as number, backgroundColor: 'transparent' },
      title: { text: undefined },
      xAxis: {
        categories,
        crosshair: true,
        labels: { rotation: -45, style: { fontSize: '11px', color: '#6B7280' } },
        lineColor: '#E5E7EB',
        tickColor: '#E5E7EB',
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          formatter() { return fmtAxis(this.value as number); },
          style: { color: '#6B7280', fontSize: '11px' },
        },
        gridLineColor: '#F3F4F6',
      },
      legend: {
        itemStyle: { color: '#6B7280', fontSize: '11px' },
        itemHoverStyle: { color: '#1E3A5F' },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        ...LIGHT_TOOLTIP_STYLE,
        formatter() {
          const points = this.points!;
          let html = `<b>${this.x}</b><br/>`;
          for (const p of points) {
            html += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${fmt(p.y!)}</b><br/>`;
          }
          return html;
        },
      },
      plotOptions: LIGHT_PLOT_OPTIONS,
      series: TECH_METRICS.map((m) => ({
        type: chartType,
        name: `${m.label} (${m.unit})`,
        data: data.map((d) => (d[m.key] as number | null) ?? 0),
        color: m.color,
      })),
      credits: { enabled: false },
    };
    return <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { height: '100%' } }} />;
  }

  // Normal: Consumo + Gasto
  const consumo = data.map((d) => d.totalKwh ?? 0);
  const gasto = data.map((d) => d.totalConIvaClp ?? 0);

  const options: Highcharts.Options = {
    chart: { height: null as unknown as number, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      categories,
      crosshair: true,
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
      itemStyle: { color: '#6B7280', fontSize: '11px' },
      itemHoverStyle: { color: '#1E3A5F' },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      ...LIGHT_TOOLTIP_STYLE,
      formatter() {
        const points = this.points!;
        let html = `<b>${this.x}</b><br/>`;
        for (const p of points) {
          const val = p.series.name.includes('Gasto')
            ? fmtClp(p.y!)
            : `${fmt(p.y!)} kWh`;
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
        marker: { radius: 4 },
      },
    ],
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { height: '100%' } }} />;
}

const toggleBtn = (active: boolean) =>
  `rounded px-2 py-1 text-xs font-medium transition-colors ${active ? 'bg-pa-navy text-white' : 'bg-white text-pa-text-muted hover:text-pa-text'}`;

export function ComparisonsPage() {
  const { isFilteredMode, isTecnico, needsSelection, hasOperator, hasStore, selectedOperator, selectedStoreName } = useOperatorFilter();
  const { data: filters, isLoading: loadingFilters } = useComparisonFilters();

  const [mode, setMode] = useState<CompareMode>(isFilteredMode ? 'name' : 'type');
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [chartType, setChartType] = useState<ChartType>('column');

  const columns = isTecnico ? techColumns : baseColumns;

  // Set default month when filters load
  useEffect(() => {
    if (!filters) return;
    if (selectedMonth === undefined && filters.months.length > 0) {
      setSelectedMonth(filters.months[filters.months.length - 1]);
    }
  }, [filters, selectedMonth]);

  // In filtered modes, force name mode and pre-select operator/store
  const effectiveMode = isFilteredMode ? 'name' : mode;
  const effectiveNames = hasOperator ? [selectedOperator!] : hasStore && selectedStoreName ? [selectedStoreName] : isFilteredMode ? [] : selectedNames;

  const typeIds = selectedTypeIds.map(Number);
  const typeQuery = useComparisonByStoreType(
    effectiveMode === 'type' ? typeIds : [],
    effectiveMode === 'type' ? selectedMonth : undefined,
  );
  const nameQuery = useComparisonByStoreName(
    effectiveMode === 'name' ? effectiveNames : [],
    effectiveMode === 'name' ? selectedMonth : undefined,
  );

  const rows = effectiveMode === 'type' ? (typeQuery.data ?? []) : (nameQuery.data ?? []);
  const loadingRows = effectiveMode === 'type' ? typeQuery.isLoading : nameQuery.isLoading;

  const label = effectiveMode === 'type'
    ? selectedTypeIds.map((id) => filters?.storeTypes.find((st) => st.id === Number(id))?.name).filter(Boolean).join(', ') || 'Tipo de Tienda'
    : (effectiveNames.join(', ') || 'Tienda');
  const selectedMonthLabel = selectedMonth ? monthLabel(selectedMonth) : '';

  const typeOptions = (filters?.storeTypes ?? []).map((st) => ({ value: String(st.id), label: st.name }));
  const nameOptions = (filters?.storeNames ?? []).map((n) => ({ value: n, label: n }));

  const noSelection = isFilteredMode
    ? needsSelection
    : effectiveMode === 'type' ? selectedTypeIds.length === 0 : selectedNames.length === 0;

  const bannerTitle = isTecnico
    ? `${label} — Métricas Técnicas por Edificio — ${selectedMonthLabel}`
    : `${label} — Consumo y Gasto por Edificio — ${selectedMonthLabel}`;

  if (loadingFilters) {
    return <div className="p-4 text-[13px] text-pa-text-muted">Cargando filtros...</div>;
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="ml-4 flex items-center gap-4">
        {!isFilteredMode && (
          <div className="flex gap-1">
            <button className={toggleBtn(mode === 'type')} onClick={() => setMode('type')}>Por Tipo</button>
            <button className={toggleBtn(mode === 'name')} onClick={() => { setMode('name'); if (chartType === 'pie') setChartType('column'); }}>Por Tienda</button>
          </div>
        )}

        {isFilteredMode ? (
          <span className="text-xs font-medium text-pa-navy">{needsSelection ? 'Selecciona Edificio y Operador' : effectiveNames.join(', ')}</span>
        ) : effectiveMode === 'type' ? (
          <MultiSelect
            options={typeOptions}
            selected={selectedTypeIds}
            onChange={setSelectedTypeIds}
            placeholder="Tipo de tienda..."
          />
        ) : (
          <MultiSelect
            options={nameOptions}
            selected={selectedNames}
            onChange={setSelectedNames}
            placeholder="Nombre de tienda..."
          />
        )}

        <PillDropdown
          items={(filters?.months ?? []).map((m) => ({ value: m, label: monthLabel(m) }))}
          value={selectedMonth ?? ''}
          onChange={setSelectedMonth}
          align="left"
        />

        <div className="ml-auto flex gap-1">
          <button className={toggleBtn(chartType === 'column')} onClick={() => setChartType('column')}>Barra</button>
          <button className={toggleBtn(chartType === 'line')} onClick={() => setChartType('line')}>Línea</button>
          <button className={toggleBtn(chartType === 'area')} onClick={() => setChartType('area')}>Área</button>
          <button className={toggleBtn(chartType === 'pie')} onClick={() => setChartType('pie')}>Torta</button>
        </div>
      </div>

      <Card className="min-h-0 flex-[3] flex flex-col">
        <SectionBanner title={bannerTitle} inline className="mb-3" />
        <div className="min-h-0 flex-1">
          {noSelection
            ? <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">{isFilteredMode ? 'Selecciona Edificio y Operador' : `Selecciona al menos un ${effectiveMode === 'type' ? 'tipo' : 'nombre'}`}</div>
            : loadingRows
              ? <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">Cargando...</div>
              : rows.length === 0
                ? <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">Sin datos para esta seleccion y mes</div>
                : <ComparisonChart data={rows} chartType={chartType} hideFinancial={isTecnico} />
          }
        </div>
      </Card>

      <Card className="min-h-0 flex-[2] flex flex-col">
        <SectionBanner title={`${label} — Detalle por Edificio — ${selectedMonthLabel}`} inline className="mb-3" />
        <div className="min-h-0 flex-1 overflow-auto">
          {noSelection
            ? <div className="p-4 text-[13px] text-pa-text-muted">{isFilteredMode ? 'Selecciona Edificio y Operador' : `Selecciona al menos un ${effectiveMode === 'type' ? 'tipo' : 'nombre'}`}</div>
            : loadingRows
              ? <div className="p-4 text-[13px] text-pa-text-muted">Cargando...</div>
              : <DataTable
                  data={rows}
                  columns={columns}
                  rowKey={(r) => r.buildingName}
                  footer
                />
          }
        </div>
      </Card>
    </div>
  );
}
