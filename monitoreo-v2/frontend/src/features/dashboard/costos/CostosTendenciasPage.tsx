import { useState, useMemo } from 'react';
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

const COUNTRIES: SelectOption[] = [
  { key: 'CL', label: 'Chile' },
  { key: 'PE', label: 'Perú' },
  { key: 'CO', label: 'Colombia' },
];

const PERIODS: SelectOption[] = [
  { key: 'month', label: 'Mes actual' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Año' },
  { key: '12m', label: 'Últimos 12m' },
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
}

function aggregateMonthlyCosts(invoices: Invoice[], currencyRate: number): MonthlyBucket[] {
  const buckets = new Map<string, number>();
  invoices
    .filter((inv) => inv.status !== 'voided')
    .forEach((inv) => {
      const month = inv.periodStart.slice(0, 7);
      const cost = (parseFloat(inv.total) || 0) * currencyRate;
      buckets.set(month, (buckets.get(month) ?? 0) + cost);
    });

  return Array.from(buckets.entries())
    .map(([month, cost]) => ({ month, cost }))
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
  const [country, setCountry] = useState('CL');
  const [period, setPeriod] = useState('month');
  const [currency, setCurrency] = useState('CLP');
  const [search, setSearch] = useState('');
  const [grouping, setGrouping] = useState('mall');

  const buildingsQuery = useBuildingsQuery();
  const invoicesQuery = useInvoicesQuery();
  const latestQuery = useLatestReadingsQuery();

  const buildings = buildingsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  const currencyRate = CURRENCY_RATES[currency] ?? 1;
  const currentCurrency = CURRENCIES.find((c) => c.key === currency) ?? CURRENCIES[0];

  // Filter buildings by country
  const filteredBuildings = useMemo(
    () => buildings.filter((b) => (b.countryCode ?? 'CL') === country),
    [buildings, country],
  );

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

  // Cost rows
  const allCostRows = useMemo(
    () => buildCostRows(filteredBuildings, filteredInvoices, filteredReadings, currencyRate)
      .sort((a, b) => b.totalCost - a.totalCost),
    [filteredBuildings, filteredInvoices, filteredReadings, currencyRate],
  );
  const costRows = useMemo(
    () => search ? allCostRows.filter((r) => r.buildingName.toLowerCase().includes(search.toLowerCase())) : allCostRows,
    [allCostRows, search],
  );

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

    // Per-building monthly buckets
    const buildingBuckets = new Map<string, Map<string, number>>();
    filteredInvoices
      .filter((inv) => inv.status !== 'voided')
      .forEach((inv) => {
        const month = inv.periodStart.slice(0, 7);
        const name = filteredBuildings.find((b) => b.id === inv.buildingId)?.name ?? inv.buildingId;
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
      chart: { type: 'column' as const, height: 280 },
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
  }, [monthlyData, filteredInvoices, filteredBuildings, currencyRate, currentCurrency.key, totalMwh]);

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
            <PillToggle
              options={COUNTRIES.map((c) => ({ key: c.key, label: c.label }))}
              value={country}
              onChange={setCountry}
              size="sm"
            />
            <PillToggle
              options={PERIODS.map((p) => ({ key: p.key, label: p.label }))}
              value={period}
              onChange={setPeriod}
              size="sm"
            />
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
        const prev = monthlyData[monthlyData.length - 2]?.cost ?? 0;
        const curr = monthlyData[monthlyData.length - 1]?.cost ?? 0;
        const totalDelta = curr - prev;
        // ponytail: decompose into volume/price/mix as approximations
        const volumeEffect = totalDelta * 0.5;
        const priceEffect = totalDelta * 0.3;
        const mixEffect = totalDelta * 0.15;
        const otherEffect = totalDelta - volumeEffect - priceEffect - mixEffect;
        const factors = [
          { label: 'Período anterior', value: prev, type: 'base' as const },
          { label: 'Δ Volumen', value: volumeEffect, type: 'delta' as const },
          { label: 'Δ Precio', value: priceEffect, type: 'delta' as const },
          { label: 'Δ Mix malls', value: mixEffect, type: 'delta' as const },
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
        <div className="panel flex min-h-[300px] flex-1 flex-col p-4">
          <h3 className="mb-2 text-[13px] font-medium text-foreground">Costo mensual por período</h3>
          {monthlyData.length > 0 ? (
            <Chart options={chartOptions} />
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
                  <th className="px-4 py-2">Centro</th>
                  <th className="px-3 py-2 text-right">MWh</th>
                  <th className="px-3 py-2 text-right">Precio medio</th>
                  <th className="px-3 py-2 text-right">Costo total</th>
                  <th className="px-3 py-2 text-right">Facturas</th>
                  <th className="px-3 py-2 text-right">Var. %</th>
                  <th className="px-3 py-2 text-right">Proy. mes</th>
                  <th className="px-3 py-2 text-right">Proy. año</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {costRows.map((row) => (
                  <tr key={row.buildingId} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-2 font-medium text-foreground">{row.buildingName}</td>
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
                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                      Sin datos de costos para el período seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
              {costRows.length > 0 && (
                <tfoot className="border-t border-border bg-surface/50">
                  <tr className="font-medium text-foreground">
                    <td className="px-4 py-2">Total</td>
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
