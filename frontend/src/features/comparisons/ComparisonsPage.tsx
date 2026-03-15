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
import type { ComparisonRow } from '../../types';

const columns: Column<ComparisonRow>[] = [
  { label: 'Edificio', value: (r) => r.buildingName, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.totalKwh), total: (d) => fmt(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)) },
  { label: 'Gasto ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalConIvaClp ?? 0), 0)) },
  { label: 'Medidores', value: (r) => String(r.totalMeters), total: (d) => String(d.reduce((s, r) => s + r.totalMeters, 0)) },
];

type CompareMode = 'type' | 'name';

function ComparisonChart({ data, chartType }: { data: ComparisonRow[]; chartType: ChartType }) {
  const categories = data.map((d) => SHORT_BUILDING_NAMES[d.buildingName] ?? d.buildingName);
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
          const val = p.series.name === 'Consumo (kWh)'
            ? `${fmt(p.y!)} kWh`
            : fmtClp(p.y!);
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

const selectClass = 'rounded border border-pa-border bg-white px-2 py-1 text-xs text-pa-text outline-none focus:border-pa-blue';
const toggleBtn = (active: boolean) =>
  `rounded px-2 py-1 text-xs font-medium transition-colors ${active ? 'bg-pa-navy text-white' : 'bg-white text-pa-text-muted hover:text-pa-text'}`;

export function ComparisonsPage() {
  const { data: filters, isLoading: loadingFilters } = useComparisonFilters();

  const [mode, setMode] = useState<CompareMode>('type');
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [chartType, setChartType] = useState<ChartType>('column');

  // Set default month when filters load
  useEffect(() => {
    if (!filters) return;
    if (selectedMonth === undefined && filters.months.length > 0) {
      setSelectedMonth(filters.months[filters.months.length - 1]);
    }
  }, [filters, selectedMonth]);

  const typeIds = selectedTypeIds.map(Number);
  const typeQuery = useComparisonByStoreType(
    mode === 'type' ? typeIds : [],
    mode === 'type' ? selectedMonth : undefined,
  );
  const nameQuery = useComparisonByStoreName(
    mode === 'name' ? selectedNames : [],
    mode === 'name' ? selectedMonth : undefined,
  );

  const rows = mode === 'type' ? (typeQuery.data ?? []) : (nameQuery.data ?? []);
  const loadingRows = mode === 'type' ? typeQuery.isLoading : nameQuery.isLoading;

  const label = mode === 'type'
    ? selectedTypeIds.map((id) => filters?.storeTypes.find((st) => st.id === Number(id))?.name).filter(Boolean).join(', ') || 'Tipo de Tienda'
    : selectedNames.join(', ') || 'Tienda';
  const selectedMonthLabel = selectedMonth ? monthLabel(selectedMonth) : '';

  const typeOptions = (filters?.storeTypes ?? []).map((st) => ({ value: String(st.id), label: st.name }));
  const nameOptions = (filters?.storeNames ?? []).map((n) => ({ value: n, label: n }));

  const noSelection = mode === 'type' ? selectedTypeIds.length === 0 : selectedNames.length === 0;

  if (loadingFilters) {
    return <div className="p-4 text-[13px] text-pa-text-muted">Cargando filtros...</div>;
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          <button className={toggleBtn(mode === 'type')} onClick={() => setMode('type')}>Por Tipo</button>
          <button className={toggleBtn(mode === 'name')} onClick={() => setMode('name')}>Por Tienda</button>
        </div>

        {mode === 'type' ? (
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

        <select
          value={selectedMonth ?? ''}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={selectClass}
        >
          {filters?.months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-1">
          <button className={toggleBtn(chartType === 'column')} onClick={() => setChartType('column')}>Barra</button>
          <button className={toggleBtn(chartType === 'line')} onClick={() => setChartType('line')}>Línea</button>
          <button className={toggleBtn(chartType === 'area')} onClick={() => setChartType('area')}>Área</button>
        </div>
      </div>

      <Card className="min-h-0 flex-[3] flex flex-col">
        <SectionBanner title={`${label} — Consumo y Gasto por Edificio — ${selectedMonthLabel}`} inline className="mb-3" />
        <div className="min-h-0 flex-1">
          {noSelection
            ? <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">Selecciona al menos un {mode === 'type' ? 'tipo' : 'nombre'}</div>
            : loadingRows
              ? <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">Cargando...</div>
              : rows.length === 0
                ? <div className="flex h-full items-center justify-center text-[13px] text-pa-text-muted">Sin datos para esta seleccion y mes</div>
                : <ComparisonChart data={rows} chartType={chartType} />
          }
        </div>
      </Card>

      <Card className="min-h-0 flex-[2] flex flex-col">
        <SectionBanner title={`${label} — Detalle por Edificio — ${selectedMonthLabel}`} inline className="mb-3" />
        <div className="min-h-0 flex-1 overflow-auto">
          {noSelection
            ? <div className="p-4 text-[13px] text-pa-text-muted">Selecciona al menos un {mode === 'type' ? 'tipo' : 'nombre'}</div>
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
