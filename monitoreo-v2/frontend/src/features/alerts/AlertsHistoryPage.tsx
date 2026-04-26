import { useMemo, useState, type ReactElement } from 'react';
import { useAlertsQuery } from '../../hooks/queries/useAlertsQuery';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { Chart } from '../../components/charts/Chart';
import { ChartSkeleton } from '../../components/ui/ChartSkeleton';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { useQueryState } from '../../hooks/useQueryState';
import type { Alert, AlertSeverity } from '../../types/alert';

interface MonthlySla {
  month: string;
  total: number;
  resolved: number;
  avgResolutionHours: number;
  slaPct: number;
}

const SLA_TARGET_HOURS = 24;

/**
 * Historial de alertas con métricas SLA.
 * Ruta: `/alerts/history`
 */
type ChartTab = 'trend' | 'sla';

export function AlertsHistoryPage(): ReactElement {
  const [buildingFilter, setBuildingFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [chartTab, setChartTab] = useState<ChartTab>('trend');

  const alertsQuery = useAlertsQuery({
    buildingId: buildingFilter || undefined,
    severity: (severityFilter || undefined) as AlertSeverity | undefined,
  });
  const buildingsQuery = useBuildingsQuery();
  const qs = useQueryState(alertsQuery, { isEmpty: (d) => !d || d.length === 0 });

  const alerts = alertsQuery.data ?? [];

  // Monthly SLA calculations
  const monthlySla = useMemo((): MonthlySla[] => {
    const byMonth = new Map<string, Alert[]>();
    for (const a of alerts) {
      const key = a.createdAt.slice(0, 7);
      const arr = byMonth.get(key) ?? [];
      arr.push(a);
      byMonth.set(key, arr);
    }

    const result: MonthlySla[] = [];
    for (const [month, list] of Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const resolved = list.filter((a) => a.status === 'resolved');
      const resolutionTimes = resolved
        .filter((a) => a.resolvedAt)
        .map((a) => (new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime()) / 3_600_000);

      const avgResolutionHours = resolutionTimes.length > 0
        ? resolutionTimes.reduce((s, v) => s + v, 0) / resolutionTimes.length
        : 0;

      const withinSla = resolutionTimes.filter((h) => h <= SLA_TARGET_HOURS).length;
      const slaPct = resolutionTimes.length > 0 ? (withinSla / resolutionTimes.length) * 100 : 100;

      result.push({
        month,
        total: list.length,
        resolved: resolved.length,
        avgResolutionHours,
        slaPct,
      });
    }
    return result;
  }, [alerts]);

  // Global SLA
  const globalSla = useMemo(() => {
    const resolved = alerts.filter((a) => a.status === 'resolved' && a.resolvedAt);
    if (resolved.length === 0) return { avgHours: 0, slaPct: 100, totalResolved: 0, totalActive: alerts.filter((a) => a.status === 'active').length };
    const times = resolved.map((a) => (new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime()) / 3_600_000);
    const avgHours = times.reduce((s, v) => s + v, 0) / times.length;
    const withinSla = times.filter((h) => h <= SLA_TARGET_HOURS).length;
    return {
      avgHours,
      slaPct: (withinSla / times.length) * 100,
      totalResolved: resolved.length,
      totalActive: alerts.filter((a) => a.status === 'active').length,
    };
  }, [alerts]);

  // Chart: monthly trend + avg resolution
  const trendChartOptions = useMemo(() => {
    if (monthlySla.length === 0) return null;
    return {
      chart: { height: 280 },
      title: { text: undefined },
      xAxis: { categories: monthlySla.map((m) => m.month), crosshair: true },
      yAxis: [
        { title: { text: 'Alertas' } },
        { title: { text: 'Horas resolución (prom.)' }, opposite: true },
      ],
      tooltip: { shared: true },
      series: [
        { type: 'column' as const, name: 'Total alertas', data: monthlySla.map((m) => m.total), yAxis: 0, color: 'var(--color-primary, #3D3BF3)' },
        { type: 'column' as const, name: 'Resueltas', data: monthlySla.map((m) => m.resolved), yAxis: 0, color: '#10b981' },
        { type: 'line' as const, name: 'Tiempo medio (h)', data: monthlySla.map((m) => Math.round(m.avgResolutionHours * 10) / 10), yAxis: 1, color: '#f59e0b' },
      ],
    };
  }, [monthlySla]);

  // Chart: SLA % per month
  const slaChartOptions = useMemo(() => {
    if (monthlySla.length === 0) return null;
    return {
      chart: { type: 'area' as const, height: 200 },
      title: { text: undefined },
      xAxis: { categories: monthlySla.map((m) => m.month) },
      yAxis: { title: { text: '% SLA cumplido' }, max: 100 },
      tooltip: { valueSuffix: '%', valueDecimals: 1 },
      plotOptions: { area: { fillOpacity: 0.2 } },
      series: [
        { type: 'area' as const, name: `SLA (≤${SLA_TARGET_HOURS}h)`, data: monthlySla.map((m) => Math.round(m.slaPct * 10) / 10), color: '#10b981' },
      ],
    };
  }, [monthlySla]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Historial de Alertas y SLA</h1>
        <div className="flex gap-2">
          <DropdownSelect
            options={[
              { value: '', label: 'Todos los edificios' },
              ...(buildingsQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={buildingFilter}
            onChange={(val) => setBuildingFilter(val)}
            className="w-48"
          />
          <DropdownSelect
            options={[
              { value: '', label: 'Todas las severidades' },
              { value: 'critical', label: 'Critica' },
              { value: 'high', label: 'Alta' },
              { value: 'medium', label: 'Media' },
              { value: 'low', label: 'Baja' },
            ]}
            value={severityFilter}
            onChange={(val) => setSeverityFilter(val)}
            className="w-56"
          />
        </div>
      </div>

      {/* KPI pills */}
      <div className="flex flex-wrap gap-2">
        <MiniKpi label="Total" value={String(alerts.length)} />
        <MiniKpi label="Resueltas" value={String(globalSla.totalResolved)} color="text-green-600" />
        <MiniKpi label="Activas" value={String(globalSla.totalActive)} color={globalSla.totalActive > 0 ? 'text-red-600' : undefined} />
        <MiniKpi label={`SLA (≤${SLA_TARGET_HOURS}h)`} value={`${globalSla.slaPct.toFixed(1)}%`} color={globalSla.slaPct >= 90 ? 'text-green-600' : globalSla.slaPct >= 70 ? 'text-yellow-600' : 'text-red-600'} />
        <MiniKpi label="Tiempo medio" value={`${globalSla.avgHours.toFixed(1)} h`} />
        <MiniKpi label="Meses" value={String(monthlySla.length)} />
      </div>

      {/* Chart with toggle */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            {chartTab === 'trend' ? 'Tendencia mensual' : 'Cumplimiento SLA mensual'}
          </h2>
          <div className="flex rounded-full border border-gray-200">
            <button
              type="button"
              onClick={() => setChartTab('trend')}
              className={`px-2.5 py-0.5 text-[11px] rounded-l-full transition-colors ${
                chartTab === 'trend' ? 'bg-[var(--color-primary,#3a5b1e)] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tendencia
            </button>
            <button
              type="button"
              onClick={() => setChartTab('sla')}
              className={`px-2.5 py-0.5 text-[11px] rounded-r-full transition-colors ${
                chartTab === 'sla' ? 'bg-[var(--color-primary,#3a5b1e)] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              SLA
            </button>
          </div>
        </div>
        {alertsQuery.isLoading ? (
          <ChartSkeleton height={280} />
        ) : (
          <>
            {chartTab === 'trend' && trendChartOptions && <Chart options={trendChartOptions} />}
            {chartTab === 'sla' && slaChartOptions && <Chart options={slaChartOptions} />}
          </>
        )}
      </div>

      {/* Monthly table */}
      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Mes</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Resueltas</th>
              <th className="px-4 py-2 text-right">Tiempo medio (h)</th>
              <th className="px-4 py-2 text-right">SLA %</th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={5}
            error={qs.error}
            onRetry={() => { alertsQuery.refetch(); }}
            emptyMessage="No hay alertas con datos SLA."
            skeletonWidths={['w-20', 'w-16', 'w-16', 'w-24', 'w-16']}
          >
            {monthlySla.map((row) => (
              <tr key={row.month} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{row.month}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.total}</td>
                <td className="px-4 py-2 text-right tabular-nums text-green-600">{row.resolved}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.avgResolutionHours.toFixed(1)}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  <span className={row.slaPct >= 90 ? 'text-green-600' : row.slaPct >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                    {row.slaPct.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, color }: Readonly<{ label: string; value: string; color?: string }>): ReactElement {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-[13px] font-semibold ${color ?? 'text-gray-900'}`}>{value}</span>
    </div>
  );
}
