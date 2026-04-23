import { useMemo, useState, type ReactElement } from 'react';
import { useAlertsQuery } from '../../hooks/queries/useAlertsQuery';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { Chart } from '../../components/charts/Chart';
import { DataWidget } from '../../components/ui/DataWidget';
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
export function AlertsHistoryPage(): ReactElement {
  const [buildingFilter, setBuildingFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Historial de Alertas y SLA</h1>
        <div className="flex gap-2">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos los edificios</option>
            {buildingsQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todas las severidades</option>
            <option value="critical">Critica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total alertas" value={String(alerts.length)} />
        <KpiCard title="Resueltas" value={String(globalSla.totalResolved)} color="text-green-600" />
        <KpiCard title="Activas" value={String(globalSla.totalActive)} color={globalSla.totalActive > 0 ? 'text-red-600' : 'text-gray-900'} />
        <KpiCard
          title={`SLA (≤${SLA_TARGET_HOURS}h)`}
          value={`${globalSla.slaPct.toFixed(1)}%`}
          color={globalSla.slaPct >= 90 ? 'text-green-600' : globalSla.slaPct >= 70 ? 'text-yellow-600' : 'text-red-600'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <KpiCard title="Tiempo medio resolución" value={`${globalSla.avgHours.toFixed(1)} h`} />
        <KpiCard title="Meses con datos" value={String(monthlySla.length)} />
      </div>

      {/* Charts */}
      {trendChartOptions && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Tendencia mensual</h2>
          <Chart options={trendChartOptions} />
        </div>
      )}

      {slaChartOptions && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Cumplimiento SLA mensual</h2>
          <Chart options={slaChartOptions} />
        </div>
      )}

      {/* Monthly table */}
      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { alertsQuery.refetch(); }}
        emptyTitle="Sin alertas"
        emptyDescription="No hay alertas con los filtros seleccionados."
      >
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
            <tbody className="divide-y divide-gray-200">
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
            </tbody>
          </table>
        </div>
      </DataWidget>
    </div>
  );
}

function KpiCard({ title, value, color = 'text-gray-900' }: Readonly<{ title: string; value: string; color?: string }>): ReactElement {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
