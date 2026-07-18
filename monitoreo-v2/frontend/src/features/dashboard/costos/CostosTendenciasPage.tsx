import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { Chart } from '../../../components/charts/Chart';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useInvoicesQuery } from '../../../hooks/queries/useInvoicesQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { Building } from '../../../types/building';
import type { Invoice } from '../../../types/invoice';
import type { LatestReading } from '../../../types/reading';

/* ── Filter options ── */

interface SelectOption { key: string; label: string }

const DEFAULT_COUNTRY = 'CL';

const PERIODS: SelectOption[] = [
  { key: 'month', label: 'Mes actual' },
  { key: 'quarter', label: 'Trimestre actual' },
  { key: 'ytd', label: 'Año en curso' },
  { key: '12m', label: 'Últimos 12 meses' },
  { key: 'custom', label: 'Rango personalizado' },
];

const CURRENCIES: SelectOption[] = [
  { key: 'CLP', label: 'CLP' },
  { key: 'UF', label: 'UF' },
  { key: 'USD', label: 'USD' },
  { key: 'PEN', label: 'PEN' },
  { key: 'COP', label: 'COP' },
];

const GROUPING_OPTIONS: SelectOption[] = [
  { key: 'mall', label: 'Por mall' },
  { key: 'country', label: 'Por país' },
  { key: 'type', label: 'Por tipología' },
];

/* ── Currency conversion rates (placeholder) ── */
// ponytail: hardcoded rates, replace with API when available
const CURRENCY_RATES: Record<string, number> = {
  CLP: 1,
  UF: 0.0000268, // ~1 UF = 37,300 CLP
  USD: 0.00106,   // ~1 USD = 943 CLP
  PEN: 0.00397,   // ~1 PEN = 252 CLP
  COP: 4.26,      // ~1 COP = 0.235 CLP
};

/* ── Cost row per building ── */

interface CostRow {
  buildingId: string;
  buildingName: string;
  countryCode: string;
  consumptionMwh: number;
  totalCost: number;
  invoiceCount: number;
  avgPricePerMwh: number;
  variationPct: number | null; // ponytail: null until previous-period comparison available
}

function buildCostRows(
  buildings: Building[],
  invoices: Invoice[],
  readings: LatestReading[],
  currencyRate: number,
): CostRow[] {
  const invoicesByBuilding = new Map<string, Invoice[]>();
  invoices
    .filter((inv) => inv.status !== 'voided')
    .forEach((inv) => {
      const list = invoicesByBuilding.get(inv.buildingId) ?? [];
      list.push(inv);
      invoicesByBuilding.set(inv.buildingId, list);
    });

  const readingsByBuilding = new Map<string, LatestReading[]>();
  readings.forEach((r) => {
    const list = readingsByBuilding.get(r.building_id) ?? [];
    list.push(r);
    readingsByBuilding.set(r.building_id, list);
  });

  return buildings.map((building) => {
    const bInvoices = invoicesByBuilding.get(building.id) ?? [];
    const bReadings = readingsByBuilding.get(building.id) ?? [];
    const totalCostClp = bInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const totalCost = totalCostClp * currencyRate;
    const consumptionMwh = bReadings.reduce((sum, r) => sum + Number(r.energy_kwh_total || 0), 0) / 1000;
    const avgPricePerMwh = consumptionMwh > 0 ? totalCost / consumptionMwh : 0;

    return {
      buildingId: building.id,
      buildingName: building.name,
      countryCode: building.countryCode ?? 'CL',
      consumptionMwh,
      totalCost,
      invoiceCount: bInvoices.length,
      avgPricePerMwh,
      variationPct: null,
    };
  });
}

/* ── Monthly cost aggregation for chart ── */

interface MonthlyBucket {
  month: string; // YYYY-MM
  cost: number;
  mwh: number;
}

function aggregateMonthlyCosts(invoices: Invoice[], currencyRate: number): MonthlyBucket[] {
  const buckets = new Map<string, { cost: number; mwh: number }>();
  invoices
    .filter((inv) => inv.status !== 'voided')
    .forEach((inv) => {
      const month = inv.periodStart.slice(0, 7);
      const cost = (parseFloat(inv.total) || 0) * currencyRate;
      const mwh = parseFloat((inv as unknown as Record<string, unknown>).consumptionKwh as string ?? '0') / 1000;
      const prev = buckets.get(month) ?? { cost: 0, mwh: 0 };
      buckets.set(month, { cost: prev.cost + cost, mwh: prev.mwh + mwh });
    });

  return Array.from(buckets.entries())
    .map(([month, v]) => ({ month, cost: v.cost, mwh: v.mwh }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/* ── Page ── */

function downloadCsv(rows: CostRow[], currency: string) {
  const header = 'Centro,MWh,Precio medio,Costo total,Facturas,Variación %';
  const csv = [header, ...rows.map((r) =>
    `${r.buildingName},${r.consumptionMwh.toFixed(1)},${r.avgPricePerMwh.toFixed(2)},${r.totalCost.toFixed(2)},${r.invoiceCount},${r.variationPct ?? '—'}`,
  )].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `costos_${currency}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CostosTendenciasPage() {
  const country = DEFAULT_COUNTRY;
  const [period, setPeriod] = useState('month');
  const [currency, setCurrency] = useState('CLP');
  const [search] = useState('');
  const [grouping, setGrouping] = useState('mall');
  const [selectedMallIds, setSelectedMallIds] = useState<Set<string>>(new Set());
  const [mallSearch, setMallSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('totalCost');
  const [sortAsc, setSortAsc] = useState(false);
  const [varThreshold] = useState<number | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const invoicesQuery = useInvoicesQuery();
  const latestQuery = useLatestReadingsQuery();

  const buildings = buildingsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  const currencyRate = CURRENCY_RATES[currency] ?? 1;
  const currentCurrency = CURRENCIES.find((c) => c.key === currency) ?? CURRENCIES[0];

  // Filter buildings by country + mall selection
  const filteredBuildings = useMemo(() => {
    let filtered = buildings.filter((b) => (b.countryCode ?? 'CL') === country);
    if (selectedMallIds.size > 0) filtered = filtered.filter((b) => selectedMallIds.has(b.id));
    return filtered;
  }, [buildings, country, selectedMallIds]);

  // Filter invoices to those buildings
  const buildingIds = useMemo(
    () => new Set(filteredBuildings.map((b) => b.id)),
    [filteredBuildings],
  );
  const filteredInvoices = useMemo(
    () => invoices.filter((inv) => buildingIds.has(inv.buildingId)),
    [invoices, buildingIds],
  );
  const filteredReadings = useMemo(
    () => readings.filter((r) => buildingIds.has(r.building_id)),
    [readings, buildingIds],
  );

  // Cost rows — sort + filter
  const allCostRows = useMemo(
    () => buildCostRows(filteredBuildings, filteredInvoices, filteredReadings, currencyRate),
    [filteredBuildings, filteredInvoices, filteredReadings, currencyRate],
  );
  const costRows = useMemo(() => {
    let rows = allCostRows;
    if (search) rows = rows.filter((r) => r.buildingName.toLowerCase().includes(search.toLowerCase()));
    if (varThreshold != null) rows = rows.filter((r) => r.variationPct != null && Math.abs(r.variationPct) > varThreshold);
    const sorted = [...rows];
    const getSortVal = (r: CostRow): number | string => {
      if (sortCol === 'buildingName') return r.buildingName;
      if (sortCol === 'countryCode') return r.countryCode;
      if (sortCol === 'consumptionMwh') return r.consumptionMwh;
      if (sortCol === 'avgPricePerMwh') return r.avgPricePerMwh;
      if (sortCol === 'invoiceCount') return r.invoiceCount;
      if (sortCol === 'variationPct') return r.variationPct ?? 0;
      return r.totalCost;
    };
    sorted.sort((a, b) => {
      const va = getSortVal(a);
      const vb = getSortVal(b);
      const cmp = typeof va === 'string' ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [allCostRows, search, varThreshold, sortCol, sortAsc]);

  // Summary KPIs
  const totalMwh = costRows.reduce((sum, r) => sum + r.consumptionMwh, 0);
  // Monthly chart data — stacked by building
  const monthlyData = useMemo(
    () => aggregateMonthlyCosts(filteredInvoices, currencyRate),
    [filteredInvoices, currencyRate],
  );

  // Stacked series per building + price line
  const chartOptions = useMemo(() => {
    const months = monthlyData.map((d) => d.month);

    // Per-group monthly buckets (mall / country / type)
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
    // Last 2 months projected — use reduced opacity via color alpha
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

    // Price line (avg cost/MWh per month)
    const priceLine = months.map((m) => {
      const bucket = monthlyData.find((d) => d.month === m);
      return bucket && totalMwh > 0 ? bucket.cost / (totalMwh / months.length) : 0;
    });

    return {
      chart: { type: 'column' as const, height: 160 },
      title: { text: '' },
      xAxis: { categories: months, crosshair: true },
      yAxis: [
        { title: { text: `Costo (${currentCurrency.key})` }, min: 0 },
        { title: { text: `${currentCurrency.key}/MWh` }, opposite: true, min: 0 },
      ],
      tooltip: {
        shared: true,
        headerFormat: '<b>{point.key}</b><br/>',
        pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.y:,.0f}</b><br/>' +
          '<span style="font-size:10px;color:#888">  Energía ~60% · Potencia ~25% · Distribución ~15%</span><br/>',
      },
      plotOptions: { column: { stacking: 'normal' as const } },
      series: [
        ...stackedSeries,
        {
          name: 'Precio medio',
          type: 'line' as const,
          yAxis: 1,
          data: priceLine,
          color: '#f97316',
          dashStyle: 'Dash' as const,
          marker: { radius: 3 },
        },
      ],
      legend: { enabled: stackedSeries.length > 1 },
    };
  }, [monthlyData, filteredInvoices, filteredBuildings, currencyRate, currentCurrency.key, totalMwh, grouping]);

  // Waterfall factors
  const waterfallFactors = useMemo(() => {
    if (monthlyData.length < 2) return null;
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
    return { vol, price, mix, prev, curr };
  }, [monthlyData]);

  // Projection bars (last 2 months extrapolated)
  const projectionBars = useMemo(() => {
    if (monthlyData.length < 3) return [];
    const last3 = monthlyData.slice(-3);
    const avgCost = last3.reduce((s, d) => s + d.cost, 0) / 3;
    const now = new Date();
    return [1, 2].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return { month: d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }), cost: avgCost };
    });
  }, [monthlyData]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="3.3 Costos y Tendencias"
        description="Análisis de costos energéticos por centro comercial con proyecciones y descomposición de variación"
      />

      {/* Filter banner */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-[11px] text-muted">
        <span className="font-semibold text-foreground">Filtros:</span>
        <span className="flex items-center gap-1">
          País
          <DropdownSelect options={[{ value: 'CL', label: 'Chile' }, { value: 'PE', label: 'Perú' }, { value: 'CO', label: 'Colombia' }]} value={country} onChange={() => {}} />
        </span>
        <span className="flex items-center gap-1">
          Período
          <DropdownSelect options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} value={period} onChange={setPeriod} />
        </span>
        <span className="flex items-center gap-1">
          Moneda
          <DropdownSelect options={CURRENCIES.map((c) => ({ value: c.key, label: c.label }))} value={currency} onChange={setCurrency} />
        </span>
        <span className="flex items-center gap-1">
          Agrupación
          <DropdownSelect options={GROUPING_OPTIONS.map((g) => ({ value: g.key, label: g.label }))} value={grouping} onChange={setGrouping} />
        </span>
        <MallMultiSelect
          buildings={filteredBuildings}
          selected={selectedMallIds}
          onToggle={(id) => setSelectedMallIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
          onClear={() => setSelectedMallIds(new Set())}
          search={mallSearch}
          onSearch={setMallSearch}
        />
      </div>

      {/* Row 1: Stacked bar chart + Waterfall */}
      <div className="flex shrink-0 gap-3">
        {/* Barras apiladas mensual — costo [UF] */}
        <div className="panel min-w-0 flex-1 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Barras apiladas mensual — costo [{currentCurrency.key}]</p>
          <p className="text-[9px] text-subtle">Línea eje secundario: precio medio [{currentCurrency.key}/MWh] · tooltip con desglose</p>
          {monthlyData.length > 0 ? (
            <Chart options={chartOptions} className="mt-1" />
          ) : (
            <div className="flex flex-1 items-center justify-center text-[11px] text-muted">Sin datos de facturación</div>
          )}
          <p className="mt-1 text-right text-[9px] text-subtle">[DAT-22, FIN-07]</p>
        </div>

        {/* Waterfall de variación de costo */}
        <div className="panel min-w-0 flex-1 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Waterfall de variación de costo</p>
          <p className="text-[9px] text-subtle">volumen · precio · mix de malls (verde baja, rojo sube)</p>
          {waterfallFactors ? (
            <div className="mt-2 flex min-h-0 flex-1 items-end gap-2">
              {[
                { label: 'Anterior', value: waterfallFactors.prev, color: 'bg-blue-400' },
                { label: 'Δ Volumen', value: waterfallFactors.vol, color: waterfallFactors.vol >= 0 ? 'bg-red-400' : 'bg-emerald-400' },
                { label: 'Δ Precio', value: waterfallFactors.price, color: waterfallFactors.price >= 0 ? 'bg-red-400' : 'bg-emerald-400' },
                { label: 'Mix', value: waterfallFactors.mix, color: waterfallFactors.mix >= 0 ? 'bg-red-300' : 'bg-emerald-300' },
                { label: 'Actual', value: waterfallFactors.curr, color: 'bg-blue-500' },
              ].map((bar) => {
                const maxVal = Math.max(waterfallFactors.prev, waterfallFactors.curr, 1);
                const pct = (Math.abs(bar.value) / maxVal) * 100;
                return (
                  <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div className={`w-full rounded-t ${bar.color}`} style={{ height: `${Math.max(4, pct)}%` }} />
                    </div>
                    <p className="text-[8px] text-muted">{bar.label}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[11px] text-muted">Requiere ≥2 meses</div>
          )}
          <p className="mt-1 text-right text-[9px] text-subtle">[DAT-22, FIN-07]</p>
        </div>
      </div>

      {/* Row 2: Tabla de costos por mall */}
      <div className="panel flex min-h-0 flex-col overflow-hidden p-3" style={{ flex: '0 1 35%' }}>
        <div className="flex shrink-0 items-center gap-2">
          <p className="flex-1 text-[10px] font-medium uppercase tracking-wider text-muted">Tabla de costos por mall (ordenable · exportable CSV/Excel)</p>
          <button
            type="button"
            onClick={() => downloadCsv(costRows, currentCurrency.key)}
            className="rounded-md border border-border px-2 py-1 text-[10px] text-muted hover:bg-surface"
          >
            Exportar CSV
          </button>
        </div>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                <SortTh col="buildingName" label="Mall" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} />
                <SortTh col="countryCode" label="País" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} />
                <SortTh col="consumptionMwh" label="Consumo [MWh]" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} right />
                <SortTh col="avgPricePerMwh" label={`Precio medio [${currentCurrency.key}/MWh]`} sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} right />
                <SortTh col="totalCost" label="Costo total" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} right />
                <SortTh col="variationPct" label="Variación %" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} right />
                <th className="px-3 py-1.5 text-right">Proyección cierre</th>
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {costRows.map((row, i) => (
                  <tr key={row.buildingId} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-3 py-1.5 font-medium text-foreground">{row.buildingName}</td>
                    <td className="px-3 py-1.5 text-muted">{row.countryCode}</td>
                    <td className="px-3 py-1.5 text-right text-muted">{row.consumptionMwh.toFixed(1)}</td>
                    <td className="px-3 py-1.5 text-right text-muted">{row.avgPricePerMwh.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-foreground">{formatCurrency(row.totalCost, currentCurrency.key)}</td>
                    <td className="px-3 py-1.5 text-right text-muted">{row.variationPct != null ? `${row.variationPct > 0 ? '+' : ''}${row.variationPct.toFixed(1)}%` : '—'}</td>
                    <td className="px-3 py-1.5 text-right text-muted">
                      {(() => { const now = new Date(); const d = now.getDate(); const dm = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); return formatCurrency(d > 0 ? (row.totalCost / d) * dm : row.totalCost, currentCurrency.key); })()}
                    </td>
                  </tr>
                ))}
                {costRows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">Sin datos de costos para el período seleccionado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[DAT-22, FIN-07, DAT-12]</p>
      </div>

      {/* Row 3: Proyecciones — 2 meses */}
      <div className="panel shrink-0 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Proyecciones — 2 meses</p>
        <p className="text-[9px] text-subtle">barras con trama diferente · base tendencia últimos 3 meses</p>
        <div className="mt-2 flex items-end gap-2" style={{ height: '60px' }}>
          {monthlyData.slice(-3).map((d) => {
            const maxCost = Math.max(1, ...monthlyData.map((m) => m.cost), ...projectionBars.map((p) => p.cost));
            const pct = (d.cost / maxCost) * 100;
            return (
              <div key={d.month} className="flex flex-1 flex-col items-center gap-0.5">
                <div className="w-full rounded-t bg-blue-400" style={{ height: `${Math.max(4, pct)}%` }} />
                <p className="text-[8px] text-muted">{d.month}</p>
              </div>
            );
          })}
          {projectionBars.map((p) => {
            const maxCost = Math.max(1, ...monthlyData.map((m) => m.cost), ...projectionBars.map((pb) => pb.cost));
            const pct = (p.cost / maxCost) * 100;
            return (
              <div key={p.month} className="flex flex-1 flex-col items-center gap-0.5">
                <div className="w-full rounded-t border-2 border-dashed border-amber-400 bg-amber-100" style={{ height: `${Math.max(4, pct)}%` }} />
                <p className="text-[8px] text-muted">{p.month}</p>
              </div>
            );
          })}
          <span className="ml-1 self-center text-[9px] text-muted">→ proyección</span>
        </div>
        <p className="mt-1 text-right text-[9px] text-subtle">[DAT-22, FIN-07]</p>
      </div>
    </div>
  );
}

/* ── Sortable table header ── */

function SortTh({ col, label, sortCol, sortAsc, onSort, right }: Readonly<{
  col: string; label: string; sortCol: string; sortAsc: boolean; onSort: (col: string) => void; right?: boolean;
}>) {
  const active = sortCol === col;
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2 transition-colors hover:text-foreground ${right ? 'text-right' : ''}`}
      onClick={() => onSort(col)}
    >
      {label} {active ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );
}

/* ── Mall multi-select dropdown ── */

function MallMultiSelect({ buildings, selected, onToggle, onClear, search, onSearch }: Readonly<{
  buildings: Building[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  search: string;
  onSearch: (v: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { ref.current && !ref.current.contains(e.target as Node) && setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const filtered = search
    ? buildings.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : buildings;

  const label = selected.size === 0 ? 'Todos los malls' : `${selected.size} mall${selected.size > 1 ? 's' : ''}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground"
      >
        {label}
        <svg className={`h-3 w-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-border bg-background shadow-lg">
          <div className="border-b border-border p-2">
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar mall..."
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {selected.size > 0 && (
              <li>
                <button type="button" onClick={onClear} className="w-full px-3 py-1.5 text-left text-[11px] text-brand hover:bg-surface">
                  Limpiar selección
                </button>
              </li>
            )}
            {filtered.map((b) => (
              <li key={b.id}>
                <label className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-[11px] text-foreground hover:bg-surface">
                  <input type="checkbox" checked={selected.has(b.id)} onChange={() => onToggle(b.id)} className="size-3 rounded border-border" />
                  {b.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function formatCurrency(value: number, currency: string): string {
  const FORMAT: Record<string, Intl.NumberFormatOptions> = {
    CLP: { style: 'decimal', maximumFractionDigits: 0 },
    UF: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
    USD: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  };
  const opts = FORMAT[currency] ?? FORMAT.CLP;
  const formatted = new Intl.NumberFormat('es-CL', opts).format(value);
  return `${formatted} ${currency}`;
}
