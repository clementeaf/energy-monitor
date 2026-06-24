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
];

/* ── Currency conversion rates (placeholder) ── */
// ponytail: hardcoded rates, replace with API when available
const CURRENCY_RATES: Record<string, number> = {
  CLP: 1,
  UF: 0.0000268, // ~1 UF = 37,300 CLP
  USD: 0.00106,   // ~1 USD = 943 CLP
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

export function CostosTendenciasPage() {
  const [country, setCountry] = useState('CL');
  const [period, setPeriod] = useState('month');
  const [currency, setCurrency] = useState('CLP');

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
  const costRows = useMemo(
    () => buildCostRows(filteredBuildings, filteredInvoices, filteredReadings, currencyRate)
      .sort((a, b) => b.totalCost - a.totalCost),
    [filteredBuildings, filteredInvoices, filteredReadings, currencyRate],
  );

  // Summary KPIs
  const totalCost = costRows.reduce((sum, r) => sum + r.totalCost, 0);
  const totalMwh = costRows.reduce((sum, r) => sum + r.consumptionMwh, 0);
  const avgPrice = totalMwh > 0 ? totalCost / totalMwh : 0;

  // Monthly chart data
  const monthlyData = useMemo(
    () => aggregateMonthlyCosts(filteredInvoices, currencyRate),
    [filteredInvoices, currencyRate],
  );

  const chartOptions = useMemo(() => ({
    chart: { type: 'column' as const, height: 280 },
    title: { text: '' },
    xAxis: {
      categories: monthlyData.map((d) => d.month),
      crosshair: true,
    },
    yAxis: {
      title: { text: `Costo (${currentCurrency.key})` },
      min: 0,
    },
    tooltip: {
      headerFormat: '<b>{point.key}</b><br/>',
      pointFormat: `Costo: {point.y:,.0f} ${currentCurrency.key}`,
    },
    series: [{
      name: 'Costo mensual',
      type: 'column' as const,
      data: monthlyData.map((d) => d.cost),
      color: 'var(--color-brand)',
    }],
    legend: { enabled: false },
  }), [monthlyData, currentCurrency.key]);

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
          <h3 className="shrink-0 px-4 py-3 text-[13px] font-medium text-foreground">
            Costos por centro comercial
          </h3>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-4 py-2">Centro</th>
                  <th className="px-3 py-2 text-right">MWh</th>
                  <th className="px-3 py-2 text-right">Precio medio</th>
                  <th className="px-3 py-2 text-right">Costo total</th>
                  <th className="px-3 py-2 text-right">Facturas</th>
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
                  </tr>
                ))}
                {costRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
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
