import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { Chart } from '../../../components/charts/Chart';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useInvoicesQuery } from '../../../hooks/queries/useInvoicesQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useOperatorFilter } from '../../../hooks/useOperatorFilter';
import { CostTable } from './CostTable';
import {
  COUNTRY_OPTIONS,
  PERIODS,
  CURRENCIES,
  GROUPING_OPTIONS,
  CURRENCY_RATES,
  FALLBACK_MONTHLY_DATA,
  FALLBACK_COST_ROWS,
  buildCostRows,
  aggregateMonthlyCosts,
  type MonthlyBucket,
} from './costos-utils';

type CostTab = 'tendencia' | 'waterfall' | 'tabla' | 'proyeccion';

const TABS: { key: CostTab; label: string }[] = [
  { key: 'tendencia', label: 'Tendencia mensual' },
  { key: 'waterfall', label: 'Variación de costo' },
  { key: 'tabla', label: 'Tabla por mall' },
  { key: 'proyeccion', label: 'Proyecciones' },
];

export function CostosTendenciasPage() {
  const [country, setCountry] = useState('all');
  const [mall, setMall] = useState('all');
  const [period, setPeriod] = useState('year');
  const [currency, setCurrency] = useState('UF');
  const [grouping, setGrouping] = useState('country');
  const [activeTab, setActiveTab] = useState<CostTab>('tendencia');

  const { isFilteredMode, needsSelection, operatorBuildingIds } = useOperatorFilter();

  const buildingsQuery = useBuildingsQuery();
  const invoicesQuery = useInvoicesQuery();
  const latestQuery = useLatestReadingsQuery();

  const rawBuildings = buildingsQuery.data ?? [];
  const buildings = useMemo(() => {
    if (!isFilteredMode || !operatorBuildingIds) return rawBuildings;
    return rawBuildings.filter((b) => operatorBuildingIds.has(b.id));
  }, [rawBuildings, isFilteredMode, operatorBuildingIds]);
  const invoices = invoicesQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  const currencyRate = CURRENCY_RATES[currency] ?? 1;
  const currencyKey = CURRENCIES.find((c) => c.key === currency)?.key ?? 'UF';

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground">Selecciona un edificio</p>
          <p className="mt-1 text-sm text-muted">Usa el selector en la barra superior para elegir un edificio.</p>
        </div>
      </div>
    );
  }

  const filteredBuildings = country === 'all' ? buildings : buildings.filter((b) => (b.countryCode ?? 'CL') === country);
  const finalBuildings = mall !== 'all' ? filteredBuildings.filter((b) => b.id === mall) : filteredBuildings;
  const buildingIds = new Set(finalBuildings.map((b) => b.id));
  const filteredInvoices = invoices.filter((inv) => buildingIds.has(inv.buildingId));
  const filteredReadings = readings.filter((r) => buildingIds.has(r.building_id));

  const costRows = buildCostRows(finalBuildings, filteredInvoices, filteredReadings, currencyRate);
  const effectiveCostRows = costRows.length > 0 ? costRows : FALLBACK_COST_ROWS.map((r) => ({
    ...r,
    totalCost: r.totalCost * currencyRate,
    avgPricePerMwh: r.avgPricePerMwh * currencyRate,
  }));

  const rawMonthlyData = aggregateMonthlyCosts(filteredInvoices, currencyRate);
  const monthlyData = rawMonthlyData.length > 0
    ? rawMonthlyData
    : FALLBACK_MONTHLY_DATA.map((d) => ({ ...d, cost: d.cost * currencyRate }));

  const totalMwh = effectiveCostRows.reduce((sum, r) => sum + r.consumptionMwh, 0);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="Costos y Tendencias"
        description="Análisis de costos energéticos con proyecciones y descomposición"
      />

      {/* Filters */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-[11px] text-muted">
        <span className="font-semibold text-foreground">Filtros:</span>
        <span className="flex items-center gap-1">
          País
          <DropdownSelect options={COUNTRY_OPTIONS.map((c) => ({ value: c.key, label: c.label }))} value={country} onChange={setCountry} />
        </span>
        <span className="flex items-center gap-1">
          Mall
          <DropdownSelect options={[{ value: 'all', label: 'Todos' }, ...buildings.map((b) => ({ value: b.id, label: b.name }))]} value={mall} onChange={setMall} />
        </span>
        <span className="flex items-center gap-1">
          Período
          <DropdownSelect options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} value={period} onChange={setPeriod} />
        </span>
        <span className="flex items-center gap-1">
          Moneda
          <DropdownSelect options={CURRENCIES.map((c) => ({ value: c.key, label: c.label }))} value={currency} onChange={setCurrency} />
        </span>
        {activeTab === 'tendencia' && (
          <span className="flex items-center gap-1">
            Agrupación
            <DropdownSelect options={GROUPING_OPTIONS.map((g) => ({ value: g.key, label: g.label }))} value={grouping} onChange={setGrouping} />
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-[12px] font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-brand text-brand'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'tendencia' && (
          <TendenciaTab
            monthlyData={monthlyData}
            filteredInvoices={filteredInvoices}
            filteredBuildings={finalBuildings}
            currencyRate={currencyRate}
            currencyKey={currencyKey}
            totalMwh={totalMwh}
            grouping={grouping}
          />
        )}
        {activeTab === 'waterfall' && (
          <WaterfallTab monthlyData={monthlyData} />
        )}
        {activeTab === 'tabla' && (
          <CostTable rows={effectiveCostRows} currencyKey={currencyKey} />
        )}
        {activeTab === 'proyeccion' && (
          <ProjectionTab monthlyData={monthlyData} />
        )}
      </div>
    </div>
  );
}

/* ── Tab: Tendencia mensual ── */

function TendenciaTab({ monthlyData, filteredInvoices, filteredBuildings, currencyRate, currencyKey, totalMwh, grouping }: Readonly<{
  monthlyData: MonthlyBucket[];
  filteredInvoices: { buildingId: string; periodStart: string; total: string; status: string }[];
  filteredBuildings: { id: string; name: string; countryCode: string | null }[];
  currencyRate: number;
  currencyKey: string;
  totalMwh: number;
  grouping: string;
}>) {
  const months = monthlyData.map((d) => d.month);

  const chartOptions = useMemo(() => {
    const buildingBuckets = new Map<string, Map<string, number>>();
    const groupKey = (buildingId: string): string => {
      const b = filteredBuildings.find((x) => x.id === buildingId);
      if (!b) return buildingId;
      if (grouping === 'country') return b.countryCode ?? 'CL';
      if (grouping === 'type') return (b as unknown as Record<string, unknown>).buildingType as string ?? 'General';
      return b.name;
    };
    filteredInvoices
      .filter((inv) => inv.status !== 'voided')
      .forEach((inv) => {
        const month = inv.periodStart.slice(0, 7);
        const name = groupKey(inv.buildingId);
        if (!buildingBuckets.has(name)) buildingBuckets.set(name, new Map());
        const bMap = buildingBuckets.get(name)!;
        bMap.set(month, (bMap.get(month) ?? 0) + (parseFloat(inv.total) || 0) * currencyRate);
      });

    const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const projectedStart = Math.max(0, months.length - 2);
    const stackedSeries = Array.from(buildingBuckets.entries()).map(([name, bMap], i) => ({
      name,
      type: 'column' as const,
      data: months.map((m, mi) => ({
        y: bMap.get(m) ?? 0,
        color: mi >= projectedStart ? (COLORS[i % COLORS.length] + '66') : COLORS[i % COLORS.length],
      })),
      color: COLORS[i % COLORS.length],
    }));

    const priceLine = months.map((m) => {
      const bucket = monthlyData.find((d) => d.month === m);
      return bucket && totalMwh > 0 ? bucket.cost / (totalMwh / months.length) : 0;
    });

    return {
      chart: { type: 'column' as const, height: 320 },
      title: { text: '' },
      xAxis: { categories: months, crosshair: true },
      yAxis: [
        { title: { text: `Costo (${currencyKey})` }, min: 0 },
        { title: { text: `${currencyKey}/MWh` }, opposite: true, min: 0 },
      ],
      tooltip: {
        shared: true,
        headerFormat: '<b>{point.key}</b><br/>',
        pointFormat: '<span style="color:{point.color}">●</span> {series.name}: <b>{point.y:,.0f}</b><br/>',
      },
      plotOptions: { column: { stacking: 'normal' as const } },
      series: [
        ...stackedSeries,
        { name: 'Precio medio', type: 'line' as const, yAxis: 1, data: priceLine, color: '#f97316', dashStyle: 'Dash' as const, marker: { radius: 3 } },
      ],
      legend: { enabled: stackedSeries.length > 1 },
    };
  }, [monthlyData, filteredInvoices, filteredBuildings, currencyRate, currencyKey, totalMwh, grouping, months]);

  return (
    <div className="panel p-4">
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Barras apiladas mensual — costo [{currencyKey}]</p>
      <p className="text-[11px] text-muted">Línea eje secundario: precio medio [{currencyKey}/MWh]</p>
      {monthlyData.length > 0 ? (
        <Chart options={chartOptions} className="mt-2" />
      ) : (
        <div className="flex h-40 items-center justify-center text-[11px] text-muted">Sin datos de facturación</div>
      )}
    </div>
  );
}

/* ── Tab: Waterfall ── */

function WaterfallTab({ monthlyData }: Readonly<{ monthlyData: MonthlyBucket[] }>) {
  if (monthlyData.length < 2) {
    return <div className="flex h-40 items-center justify-center text-[11px] text-muted">Requiere ≥2 meses de datos</div>;
  }

  const prevB = monthlyData[monthlyData.length - 2];
  const currB = monthlyData[monthlyData.length - 1];
  const prev = prevB.cost;
  const curr = currB.cost;
  const delta = curr - prev;
  const hasReal = prevB.mwh > 0 && currB.mwh > 0;
  const prevP = prevB.mwh > 0 ? prev / prevB.mwh : 0;
  const currP = currB.mwh > 0 ? curr / currB.mwh : 0;
  const vol = hasReal ? (currB.mwh - prevB.mwh) * prevP : delta * 0.5;
  const price = hasReal ? (currP - prevP) * currB.mwh : delta * 0.3;
  const mix = delta - vol - price;

  const bars = [
    { label: 'Anterior', value: prev, color: 'bg-blue-400' },
    { label: 'Δ Volumen', value: vol, color: vol >= 0 ? 'bg-red-400' : 'bg-emerald-400' },
    { label: 'Δ Precio', value: price, color: price >= 0 ? 'bg-red-400' : 'bg-emerald-400' },
    { label: 'Mix', value: mix, color: mix >= 0 ? 'bg-red-300' : 'bg-emerald-300' },
    { label: 'Actual', value: curr, color: 'bg-blue-500' },
  ];
  const maxVal = Math.max(prev, curr, 1);

  return (
    <div className="panel p-4">
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Waterfall de variación de costo</p>
      <p className="text-[11px] text-muted">volumen · precio · mix de malls (verde baja, rojo sube)</p>
      <div className="mt-4 flex items-end gap-3" style={{ height: '200px' }}>
        {bars.map((bar) => {
          const pct = (Math.abs(bar.value) / maxVal) * 100;
          return (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end justify-center">
                <div className={`w-full rounded-t ${bar.color}`} style={{ height: `${Math.max(4, pct)}%` }} />
              </div>
              <p className="text-[10px] font-medium text-foreground">{bar.value >= 1000 ? `${(bar.value / 1000).toFixed(1)}k` : bar.value.toFixed(0)}</p>
              <p className="text-[9px] text-muted">{bar.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Tab: Proyecciones ── */

function ProjectionTab({ monthlyData }: Readonly<{ monthlyData: MonthlyBucket[] }>) {
  if (monthlyData.length < 3) {
    return <div className="flex h-40 items-center justify-center text-[11px] text-muted">Requiere ≥3 meses de datos</div>;
  }

  const last3 = monthlyData.slice(-3);
  const avgCost = last3.reduce((s, d) => s + d.cost, 0) / 3;
  const now = new Date();
  const projectionBars = [1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { month: d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }), cost: avgCost };
  });

  const allBars = [
    ...last3.map((d) => ({ month: d.month, cost: d.cost, projected: false })),
    ...projectionBars.map((p) => ({ month: p.month, cost: p.cost, projected: true })),
  ];
  const maxCost = Math.max(1, ...allBars.map((b) => b.cost));

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Proyecciones — 2 meses</p>
          <p className="text-[11px] text-muted">Base: tendencia últimos 3 meses</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-muted"><span className="inline-block h-2.5 w-4 rounded-sm bg-blue-400" /> Real</span>
          <span className="flex items-center gap-1 text-[10px] text-muted"><span className="inline-block h-2.5 w-4 rounded-sm border-2 border-dashed border-amber-400 bg-amber-50" /> Proyectado</span>
        </div>
      </div>
      <div className="mt-4 flex items-end gap-2" style={{ height: '200px' }}>
        {allBars.map((b) => {
          const pct = (b.cost / maxCost) * 100;
          const formatted = b.cost >= 1000 ? `${(b.cost / 1000).toFixed(0)}k` : b.cost.toFixed(0);
          return (
            <div key={b.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-foreground">{formatted}</span>
              <div
                className={`w-full rounded-t ${b.projected ? 'border-2 border-dashed border-amber-400 bg-amber-50' : 'bg-blue-400'}`}
                style={{ height: `${Math.max(6, pct)}%` }}
              />
              <span className="text-[9px] text-muted">{b.month.length > 7 ? b.month : b.month.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
