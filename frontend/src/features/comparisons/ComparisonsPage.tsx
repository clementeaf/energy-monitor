import { useRef, useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { useComparisonFilters, useComparisonByStoreType, useComparisonByStoreName } from '../../hooks/queries/useComparisons';
import type { ComparisonRow } from '../../types';

const fmt = (n: number | null) => n !== null ? n.toLocaleString('es-CL') : '—';
const fmtClp = (n: number | null) => n !== null ? `$${n.toLocaleString('es-CL')}` : '—';

function fmtAxis(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(val);
}

function fmtMonth(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const m = d.toLocaleString('es-CL', { month: 'short' });
  return `${m.charAt(0).toUpperCase()}${m.slice(1)}-${String(d.getFullYear()).slice(2)}`;
}

const SHORT_NAMES: Record<string, string> = {
  'Parque Arauco Kennedy': 'P. Arauco Kennedy',
  'Arauco Premium Outlet Buenaventura': 'Outlet Buenaventura',
  'Arauco Express Ciudad Empresarial': 'Express C. Empresarial',
  'Arauco Express El Carmen de Huechuraba': 'Express Huechuraba',
};

const columns: Column<ComparisonRow>[] = [
  { label: 'Edificio', value: (r) => r.buildingName, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.totalKwh), total: (d) => fmt(d.reduce((s, r) => s + (r.totalKwh ?? 0), 0)) },
  { label: 'Gasto ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + (r.totalConIvaClp ?? 0), 0)) },
  { label: 'Medidores', value: (r) => String(r.totalMeters), total: (d) => String(d.reduce((s, r) => s + r.totalMeters, 0)) },
];

type ChartType = 'column' | 'line';
type CompareMode = 'type' | 'name';

function ComparisonChart({ data, chartType }: { data: ComparisonRow[]; chartType: ChartType }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const categories = data.map((d) => SHORT_NAMES[d.buildingName] ?? d.buildingName);
    const consumo = data.map((d) => d.totalKwh ?? 0);
    const gasto = data.map((d) => d.totalConIvaClp ?? 0);

    chartRef.current?.destroy();
    chartRef.current = null;

    chartRef.current = Highcharts.chart(containerRef.current, {
      chart: { height: 320, backgroundColor: 'transparent' },
      title: { text: undefined },
      xAxis: {
        categories,
        labels: {
          rotation: -45,
          style: { fontSize: '10px', color: '#94a3b8' },
        },
        lineColor: '#334155',
      },
      yAxis: [
        {
          title: { text: 'Consumo (kWh)', style: { color: '#60a5fa' } },
          labels: {
            formatter() { return fmtAxis(this.value as number); },
            style: { color: '#94a3b8' },
          },
          gridLineColor: '#1e293b',
        },
        {
          title: { text: 'Gasto (CLP)', style: { color: '#f59e0b' } },
          labels: {
            formatter() { return `$${fmtAxis(this.value as number)}`; },
            style: { color: '#94a3b8' },
          },
          opposite: true,
          gridLineWidth: 0,
        },
      ],
      legend: {
        itemStyle: { color: '#94a3b8' },
        itemHoverStyle: { color: '#e2e8f0' },
      },
      tooltip: {
        shared: true,
        useHTML: true,
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
      plotOptions: {
        column: { borderRadius: 3, borderWidth: 0 },
      },
      series: [
        {
          type: chartType,
          name: 'Consumo (kWh)',
          data: consumo,
          color: '#60a5fa',
          yAxis: 0,
          marker: chartType === 'line' ? { radius: 3 } : undefined,
        },
        {
          type: chartType === 'column' ? 'line' : 'column',
          name: 'Gasto (CLP)',
          data: gasto,
          color: '#f59e0b',
          yAxis: 1,
          marker: { radius: 3 },
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

const selectClass = 'rounded border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-muted';
const toggleBtn = (active: boolean) =>
  `rounded px-2 py-1 text-xs font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-surface text-muted hover:text-text'}`;

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
  const monthLabel = selectedMonth ? fmtMonth(selectedMonth) : '';

  const typeOptions = (filters?.storeTypes ?? []).map((st) => ({ value: String(st.id), label: st.name }));
  const nameOptions = (filters?.storeNames ?? []).map((n) => ({ value: n, label: n }));

  const noSelection = mode === 'type' ? selectedTypeIds.length === 0 : selectedNames.length === 0;

  if (loadingFilters) {
    return <div className="p-4 text-sm text-muted">Cargando filtros...</div>;
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto">
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
            <option key={m} value={m}>{fmtMonth(m)}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-1">
          <button className={toggleBtn(chartType === 'column')} onClick={() => setChartType('column')}>Barra</button>
          <button className={toggleBtn(chartType === 'line')} onClick={() => setChartType('line')}>Linea</button>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">
          {label} — Consumo y Gasto por Edificio — {monthLabel}
        </h2>
        {noSelection
          ? <div className="flex h-[320px] items-center justify-center text-sm text-muted">Selecciona al menos un {mode === 'type' ? 'tipo' : 'nombre'}</div>
          : loadingRows
            ? <div className="flex h-[320px] items-center justify-center text-sm text-muted">Cargando...</div>
            : rows.length === 0
              ? <div className="flex h-[320px] items-center justify-center text-sm text-muted">Sin datos para esta seleccion y mes</div>
              : <ComparisonChart data={rows} chartType={chartType} />
        }
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">
          {label} — Detalle por Edificio — {monthLabel}
        </h2>
        {noSelection
          ? <div className="p-4 text-sm text-muted">Selecciona al menos un {mode === 'type' ? 'tipo' : 'nombre'}</div>
          : loadingRows
            ? <div className="p-4 text-sm text-muted">Cargando...</div>
            : <DataTable
                data={rows}
                columns={columns}
                rowKey={(r) => r.buildingName}
                footer
                maxHeight="max-h-[340px]"
              />
        }
      </Card>
    </div>
  );
}
