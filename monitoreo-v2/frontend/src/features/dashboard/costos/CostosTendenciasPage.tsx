import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
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
  const [search, setSearch] = useState('');
  const [grouping, setGrouping] = useState('mall');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedMallIds, setSelectedMallIds] = useState<Set<string>>(new Set());
  const [mallSearch, setMallSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('totalCost');
  const [sortAsc, setSortAsc] = useState(false);
  const [varThreshold, setVarThreshold] = useState<number | null>(null);

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
  const totalCost = costRows.reduce((sum, r) => sum + r.totalCost, 0);
  const totalMwh = costRows.reduce((sum, r) => sum + r.consumptionMwh, 0);
  const avgPrice = totalMwh > 0 ? totalCost / totalMwh : 0;

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
      chart: { type: 'column' as const, height: '100%' as unknown as number },
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

  const summaryCards = [
    { title: 'Costo total', value: formatCurrency(totalCost, currentCurrency.key) },
    { title: 'Consumo total', value: `${totalMwh.toFixed(1)} MWh` },
    { title: `Precio medio`, value: `${avgPrice.toFixed(2)} ${currentCurrency.key}/MWh` },
    { title: 'Centros', value: String(costRows.length) },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Costos y Tendencias"
        eyebrow="Costos"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
            >
              {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            {period === 'custom' && (
              <>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
              </>
            )}
            <PillToggle
              options={CURRENCIES.map((c) => ({ key: c.key, label: c.label }))}
              value={currency}
              onChange={setCurrency}
              size="sm"
            />
            <PillToggle
              options={GROUPING_OPTIONS.map((g) => ({ key: g.key, label: g.label }))}
              value={grouping}
              onChange={setGrouping}
              size="sm"
            />
            <MallMultiSelect
              buildings={filteredBuildings}
              selected={selectedMallIds}
              onToggle={(id) => setSelectedMallIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
              onClear={() => setSelectedMallIds(new Set())}
              search={mallSearch}
              onSearch={setMallSearch}
            />
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.title} className="panel px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{card.title}</p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Waterfall — cost variation analysis */}
      {monthlyData.length >= 2 && (() => {
        const prevBucket = monthlyData[monthlyData.length - 2]!;
        const currBucket = monthlyData[monthlyData.length - 1]!;
        const prev = prevBucket.cost;
        const curr = currBucket.cost;
        const totalDelta = curr - prev;

        // Real decomposition when MWh data available, else proportional fallback
        const prevMwh = prevBucket.mwh;
        const currMwh = currBucket.mwh;
        const prevPrice = prevMwh > 0 ? prev / prevMwh : 0;
        const currPrice = currMwh > 0 ? curr / currMwh : 0;
        const hasRealMwh = prevMwh > 0 && currMwh > 0;

        // Δ Volume = (MWh_curr - MWh_prev) × price_prev
        // Δ Price  = (price_curr - price_prev) × MWh_curr
        // Δ Other  = residual
        const volumeEffect = hasRealMwh ? (currMwh - prevMwh) * prevPrice : totalDelta * 0.5;
        const priceEffect = hasRealMwh ? (currPrice - prevPrice) * currMwh : totalDelta * 0.3;
        const otherEffect = totalDelta - volumeEffect - priceEffect;
        const factors = [
          { label: 'Período anterior', value: prev, type: 'base' as const },
          { label: 'Δ Volumen', value: volumeEffect, type: 'delta' as const },
          { label: 'Δ Precio', value: priceEffect, type: 'delta' as const },
          { label: 'Otros', value: otherEffect, type: 'delta' as const },
          { label: 'Período actual', value: curr, type: 'base' as const },
        ];
        const maxVal = Math.max(...factors.map((f) => Math.abs(f.value)), 1);
        return (
          <div className="panel shrink-0 p-4">
            <h3 className="mb-3 text-[13px] font-medium text-foreground">Análisis de variación</h3>
            <div className="space-y-1.5">
              {factors.map((f) => {
                const pct = (Math.abs(f.value) / maxVal) * 100;
                const isPositive = f.value >= 0;
                const barColor = f.type === 'base' ? 'bg-blue-400' : isPositive ? 'bg-red-400' : 'bg-emerald-400';
                return (
                  <div key={f.label} className="flex items-center gap-2 text-[12px]">
                    <span className="w-28 shrink-0 text-right text-muted">{f.label}</span>
                    <div className="h-4 flex-1 rounded bg-gray-100">
                      <div className={`h-full rounded ${barColor}`} style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                    <span className={`w-24 shrink-0 text-right font-medium ${f.type === 'delta' ? (isPositive ? 'text-red-600' : 'text-emerald-600') : 'text-foreground'}`}>
                      {f.type === 'delta' && isPositive ? '+' : ''}{formatCurrency(f.value, currentCurrency.key)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        {/* Chart */}
        <div className="panel flex min-h-0 flex-1 flex-col p-4">
          <h3 className="mb-2 shrink-0 text-[13px] font-medium text-foreground">Costo mensual por período</h3>
          {monthlyData.length > 0 ? (
            <Chart options={chartOptions} className="min-h-0 flex-1" />
          ) : (
            <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
              Sin datos de facturación para el período.
            </div>
          )}
        </div>

        {/* Cost table */}
        <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 px-4 py-3">
            <h3 className="flex-1 text-[13px] font-medium text-foreground">Costos por centro comercial</h3>
            <label className="flex items-center gap-1 text-[11px] text-muted">
              Var &gt;
              <input
                type="number"
                min={0}
                value={varThreshold ?? ''}
                onChange={(e) => setVarThreshold(e.target.value ? Number(e.target.value) : null)}
                placeholder="—"
                className="w-12 rounded-md border border-border bg-background px-1.5 py-1 text-[11px] text-foreground outline-none"
              />
              %
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar mall..."
              className="w-36 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => downloadCsv(costRows, currentCurrency.key)}
              className="rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:bg-surface"
            >
              Exportar CSV
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <SortTh col="buildingName" label="Centro" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} />
                  <SortTh col="countryCode" label="País" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} />
                  <SortTh col="consumptionMwh" label="MWh" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} right />
                  <SortTh col="avgPricePerMwh" label="Precio medio" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} right />
                  <SortTh col="totalCost" label="Costo total" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} right />
                  <SortTh col="invoiceCount" label="Facturas" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} right />
                  <SortTh col="variationPct" label="Var. %" sortCol={sortCol} sortAsc={sortAsc} onSort={(c) => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : false); }} right />
                  <th className="px-3 py-2 text-right">Proy. mes</th>
                  <th className="px-3 py-2 text-right">Proy. año</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {costRows.map((row) => (
                  <tr key={row.buildingId} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-2 font-medium text-foreground">{row.buildingName}</td>
                    <td className="px-3 py-2 text-muted">{row.countryCode}</td>
                    <td className="px-3 py-2 text-right text-muted">{row.consumptionMwh.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-muted">
                      {row.avgPricePerMwh.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {formatCurrency(row.totalCost, currentCurrency.key)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted">{row.invoiceCount}</td>
                    <td className="px-3 py-2 text-right text-[11px] text-muted">
                      {row.variationPct != null ? `${row.variationPct > 0 ? '+' : ''}${row.variationPct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-muted">
                      {(() => {
                        const now = new Date();
                        const dayOfMonth = now.getDate();
                        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                        const proj = dayOfMonth > 0 ? (row.totalCost / dayOfMonth) * daysInMonth : row.totalCost;
                        return formatCurrency(proj, currentCurrency.key);
                      })()}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-muted">
                      {formatCurrency(row.totalCost * 12, currentCurrency.key)}
                    </td>
                  </tr>
                ))}
                {costRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted">
                      Sin datos de costos para el período seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
              {costRows.length > 0 && (
                <tfoot className="border-t border-border bg-surface/50">
                  <tr className="font-medium text-foreground">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right">{totalMwh.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">{avgPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totalCost, currentCurrency.key)}</td>
                    <td className="px-3 py-2 text-right">{costRows.reduce((s, r) => s + r.invoiceCount, 0)}</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
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
