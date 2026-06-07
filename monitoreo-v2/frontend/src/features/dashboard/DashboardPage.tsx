import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { PillToggle } from '../../components/ui/PillToggle';
import { PageHeader } from '../../components/ui/PageHeader';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../hooks/queries/useAlertsQuery';
import { useInvoicesQuery } from '../../hooks/queries/useInvoicesQuery';
import { DataWidget } from '../../components/ui/DataWidget';
import { ChartSkeleton } from '../../components/ui/ChartSkeleton';
import { StockChart } from '../../components/charts/StockChart';
import { useQueryState } from '../../hooks/useQueryState';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { fmtClp } from '../../lib/formatters';
import type { ReadingResolution } from '../../types/reading';
import type { Invoice } from '../../types/invoice';

type RangePreset = 'day' | 'week' | 'month';
type ChartView = 'power' | 'pf';

const RANGE_PRESETS: { key: RangePreset; label: string; days: number; resolution: ReadingResolution }[] = [
  { key: 'day', label: 'Día', days: 1, resolution: 'raw' },
  { key: 'week', label: 'Semana', days: 7, resolution: '1h' },
  { key: 'month', label: 'Mes', days: 30, resolution: '1d' },
];

const CHART_VIEWS: { key: ChartView; label: string }[] = [
  { key: 'power', label: 'Potencia' },
  { key: 'pf', label: 'Factor Potencia' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { isTecnico, isFilteredMode, needsSelection, operatorMeterIds, operatorBuildingIds } = useOperatorFilter();
  const [preset, setPreset] = useState<RangePreset>('week');
  const [chartView, setChartView] = useState<ChartView>('power');
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);

  const rangeConfig = RANGE_PRESETS.find((r) => r.key === preset)!;
  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - rangeConfig.days);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [rangeConfig.days]);

  const buildingsQuery = useBuildingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const allBuildings = buildingsQuery.data ?? [];
  const buildings = useMemo(() => {
    if (!isFilteredMode || !operatorBuildingIds) return allBuildings;
    return allBuildings.filter((b) => operatorBuildingIds.has(b.id));
  }, [allBuildings, isFilteredMode, operatorBuildingIds]);
  const firstBuildingId = buildings[0]?.id ?? '';

  // Fast path: meters list from `meters` table (no DISTINCT ON readings)
  const metersQuery = useMetersQuery(firstBuildingId || undefined);
  const allMeters = metersQuery.data ?? [];
  const meters = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return allMeters;
    return allMeters.filter((m) => operatorMeterIds.has(m.id));
  }, [allMeters, isFilteredMode, operatorMeterIds]);

  // KPIs: latest readings (heavier, runs in parallel — doesn't block chart)
  const allLatestQuery = useLatestReadingsQuery();

  // Billing KPIs
  const invoicesQuery = useInvoicesQuery();
  const invoices = invoicesQuery.data ?? [];
  const billingKpis = useMemo(() => computeBillingKpis(invoices), [invoices]);

  const buildingsQs = useQueryState(buildingsQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const rawLatestReadings = allLatestQuery.data ?? [];
  const allLatestReadings = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawLatestReadings;
    return rawLatestReadings.filter((r) => operatorMeterIds.has(r.meter_id));
  }, [rawLatestReadings, isFilteredMode, operatorMeterIds]);

  const rawAlerts = alertsQuery.data ?? [];
  const activeAlerts = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawAlerts;
    return rawAlerts.filter((a) => a.meterId && operatorMeterIds.has(a.meterId));
  }, [rawAlerts, isFilteredMode, operatorMeterIds]);

  // Chart meter: from meters table (fast) — no waterfall through latest readings
  const chartMeterId = selectedMeterId ?? meters[0]?.id ?? null;

  const readingsQuery = useReadingsQuery(
    { meterId: chartMeterId ?? '', from, to, resolution: rangeConfig.resolution },
    !!chartMeterId && !isTecnico && !needsSelection,
  );

  const chartOptions = useMemo(() => {
    const readings = readingsQuery.data ?? [];
    const base = {
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
    };

    if (chartView === 'power') {
      return {
        ...base,
        title: { text: 'Potencia' },
        yAxis: [{ title: { text: 'Potencia (kW)' } }],
        series: [{
          type: 'area' as const,
          name: 'Potencia (kW)',
          data: readings.map((r) => [new Date(r.timestamp).getTime(), Number(r.power_kw)]),
        }],
      };
    }

    return {
      ...base,
      title: { text: 'Factor de potencia' },
      yAxis: [{ title: { text: 'Factor Potencia' }, min: 0, max: 1 }],
      series: [{
        type: 'line' as const,
        name: 'Factor Potencia',
        data: readings.map((r) => [new Date(r.timestamp).getTime(), r.power_factor ? Number(r.power_factor) : null]),
      }],
    };
  }, [readingsQuery.data, chartView]);

  // Técnico: no dashboard financiero
  if (isTecnico) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground">Dashboard no disponible</p>
          <p className="mt-1 text-sm text-muted">
            El dashboard financiero no está disponible en modo técnico.
          </p>
        </div>
      </div>
    );
  }

  // Filtered mode without operator selected
  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground">Selecciona un operador</p>
          <p className="mt-1 text-sm text-muted">
            Usa el selector en la barra lateral para elegir un operador y ver su dashboard.
          </p>
        </div>
      </div>
    );
  }

  const totalMeters = allLatestReadings.length;
  const totalPowerKw = allLatestReadings.reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
  const avgPowerFactor = allLatestReadings.length > 0
    ? allLatestReadings.reduce((sum, r) => sum + Number(r.power_factor || 0), 0) / allLatestReadings.length
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        eyebrow="Dashboard"
        actions={
          <PillToggle
            options={RANGE_PRESETS.map((r) => ({
              key: r.key,
              label: r.label,
              disabled: meters.length === 0,
            }))}
            value={preset}
            onChange={setPreset}
            size="sm"
          />
        }
      />

      {/* 2-column layout: KPIs+Chart | Alerts+Buildings */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Column 1: KPIs + Chart */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* KPI row */}
          <div className="flex flex-wrap gap-3">
            <KpiCard title="Edificios" value={String(buildings.length)} />
            <KpiCard title="Medidores" value={String(totalMeters)} />
            <KpiCard title="Potencia total" value={`${totalPowerKw.toFixed(1)} kW`} />
            <KpiCard title="FP promedio" value={avgPowerFactor > 0 ? avgPowerFactor.toFixed(3) : '—'} />
            <KpiCard title="Pagadas" value={fmtClp(billingKpis.paid)} color="text-emerald-600" />
            <KpiCard title="Por cobrar" value={fmtClp(billingKpis.pending)} color="text-amber-600" />
            <KpiCard title="Vencidas" value={fmtClp(billingKpis.overdue)} color={billingKpis.overdue > 0 ? 'text-red-600' : undefined} />
          </div>

          {/* Chart */}
          <div className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">{chartOptions.title.text}</h2>
                {meters.length > 0 ? (
                  <DropdownSelect
                    options={meters.map((m) => ({ value: m.id, label: m.name }))}
                    value={chartMeterId ?? ''}
                    onChange={(val) => setSelectedMeterId(val || null)}
                    className="w-44"
                  />
                ) : (
                  <div className="h-6 w-32 animate-pulse rounded-lg bg-raised" />
                )}
              </div>
              <PillToggle
                options={CHART_VIEWS.map((v) => ({
                  key: v.key,
                  label: v.label,
                  disabled: meters.length === 0,
                }))}
                value={chartView}
                onChange={setChartView}
                size="sm"
              />
            </div>
            {metersQuery.isLoading ? (
              <ChartSkeleton />
            ) : meters.length > 0 ? (
              <StockChart options={chartOptions} loading={readingsQuery.isFetching} />
            ) : (
              <div className="flex h-[380px] items-center justify-center rounded-lg border border-dashed border-border bg-surface/80">
                <p className="text-sm text-muted">Sin medidores para esta empresa.</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Alerts + Buildings stacked */}
        <div className="flex w-full flex-col gap-4 lg:w-80">
          {/* Alerts */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-foreground">
              Alertas activas
              {activeAlerts.length > 0 && (
                <span className="ml-1.5 text-[11px] font-normal text-muted">
                  ({activeAlerts.length})
                </span>
              )}
            </h2>
            <DataWidget
              phase={alertsQuery.isPending ? 'loading' : alertsQuery.isError ? 'error' : activeAlerts.length === 0 ? 'empty' : 'ready'}
              error={alertsQuery.error}
              onRetry={() => { alertsQuery.refetch(); }}
              emptyTitle="Sin alertas"
              emptyDescription="No hay alertas activas."
            >
              <ul className="panel max-h-48 divide-y divide-border overflow-y-auto">
                {activeAlerts.map((a) => (
                  <li
                    key={a.id}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 text-[13px] transition-colors hover:bg-surface"
                    onClick={() => navigate(`/alerts?highlight=${a.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <SeverityDot severity={a.severity} />
                      <span className="text-foreground">{a.message}</span>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted">
                      {new Date(a.createdAt).toLocaleDateString('es-CL')}
                    </span>
                  </li>
                ))}
              </ul>
            </DataWidget>
          </div>

          {/* Buildings */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-foreground">Edificios</h2>
            <DataWidget
              phase={buildingsQs.phase}
              error={buildingsQs.error}
              onRetry={() => { buildingsQuery.refetch(); }}
              emptyTitle="Sin edificios"
              emptyDescription="No hay edificios registrados."
            >
              <ul className="panel max-h-52 divide-y divide-border overflow-y-auto">
                {buildings.map((b) => {
                  const buildingReadings = allLatestReadings.filter((r) => r.building_id === b.id);
                  const power = buildingReadings.reduce((s, r) => s + Number(r.power_kw || 0), 0);
                  return (
                    <li key={b.id} className="flex items-center justify-between px-3 py-2 text-[13px]">
                      <span className="font-medium text-foreground">{b.name}</span>
                      <div className="text-right">
                        <span className="text-foreground">{power.toFixed(1)} kW</span>
                        <span className="ml-2 text-[11px] text-muted">{buildingReadings.length} med.</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </DataWidget>
          </div>

          {/* Overdue invoices */}
          {billingKpis.overdueInvoices.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-[13px] font-medium text-foreground">
                Facturas vencidas
                <span className="ml-1.5 text-[11px] font-normal text-red-500">
                  ({billingKpis.overdueInvoices.length})
                </span>
              </h2>
              <ul className="panel max-h-48 divide-y divide-border overflow-y-auto">
                {billingKpis.overdueInvoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 text-[13px] transition-colors hover:bg-surface"
                    onClick={() => navigate(`/buildings/${inv.buildingId}`)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{inv.invoiceNumber}</span>
                      <span className="text-[11px] text-muted">{inv.periodStart.slice(0, 7)}</span>
                    </div>
                    <span className="shrink-0 text-[12px] font-medium text-red-600">
                      {fmtClp(inv.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Billing KPI helpers ── */

interface BillingKpis {
  paid: number;
  pending: number;
  overdue: number;
  overdueInvoices: Invoice[];
}

function computeBillingKpis(invoices: Invoice[]): BillingKpis {
  const now = new Date();
  let paid = 0;
  let pending = 0;
  let overdue = 0;
  const overdueInvoices: Invoice[] = [];

  for (const inv of invoices) {
    if (inv.status === 'voided') continue;
    const total = parseFloat(inv.total) || 0;

    if (inv.status === 'paid') {
      paid += total;
      continue;
    }

    // Non-paid: check if overdue (periodEnd in the past)
    const periodEnd = new Date(inv.periodEnd);
    if (periodEnd < now) {
      overdue += total;
      overdueInvoices.push(inv);
    } else {
      pending += total;
    }
  }

  // Sort overdue by amount desc
  overdueInvoices.sort((a, b) => (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0));

  return { paid, pending, overdue, overdueInvoices };
}

function KpiCard({ title, value, color }: Readonly<{ title: string; value: string; color?: string }>) {
  return (
    <div className="panel min-w-[7.5rem] flex-1 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{title}</p>
      <p className={`mt-1 text-lg font-semibold tracking-tight ${color ?? 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function SeverityDot({ severity }: Readonly<{ severity: string }>) {
  const colors: Record<string, string> = {
    critical: 'bg-danger',
    high: 'bg-warning',
    medium: 'bg-yellow-500',
    low: 'bg-brand',
  };
  return <span className={`inline-block size-2 rounded-full ${colors[severity] ?? 'bg-subtle'}`} />;
}

