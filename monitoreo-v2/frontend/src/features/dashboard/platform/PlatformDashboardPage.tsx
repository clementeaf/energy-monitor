import { type ReactElement } from 'react';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import { usePlatformKpisQuery } from '../../../hooks/queries/usePlatformDashboardQuery';
import type { TenantSummary } from '../../../types/platform-dashboard';

function KpiCard({ title, value, loading }: { title: string; value: string | number; loading: boolean }) {
  return (
    <div className="rounded-lg border border-pa-border bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase text-pa-text-muted">{title}</p>
      {loading ? (
        <div className="mt-0.5 h-5 w-16 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className="mt-0.5 text-lg font-bold text-pa-text">{value}</p>
      )}
    </div>
  );
}

export function PlatformDashboardPage(): ReactElement {
  const query = usePlatformKpisQuery();
  const { data: kpis, isPending } = query;
  const qs = useQueryState(query, { isEmpty: (d) => !d || d.tenantSummaries.length === 0 });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-pa-text">Dashboard Plataforma</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <KpiCard title="Empresas" value={kpis?.tenants ?? '—'} loading={isPending} />
        <KpiCard title="Edificios" value={kpis?.buildings ?? '—'} loading={isPending} />
        <KpiCard title="Medidores" value={kpis?.meters ?? '—'} loading={isPending} />
        <KpiCard title="Lecturas totales" value={kpis?.readings?.toLocaleString('es-CL') ?? '—'} loading={isPending} />
        <KpiCard title="Alertas activas" value={kpis?.activeAlerts ?? '—'} loading={isPending} />
        <KpiCard title="Online" value={kpis?.onlineMeters ?? '—'} loading={isPending} />
        <KpiCard title="Offline" value={kpis?.offlineMeters ?? '—'} loading={isPending} />
      </div>

      <div className="rounded-xl border border-pa-border bg-white">
        <div className="border-b border-pa-border px-4 py-3">
          <h2 className="text-sm font-semibold text-pa-text">Resumen por empresa</h2>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="text-left text-xs font-medium uppercase text-pa-text-muted">
                <th className="px-4 py-2">Empresa</th>
                <th className="px-4 py-2 text-right">Edificios</th>
                <th className="px-4 py-2 text-right">Medidores</th>
                <th className="px-4 py-2 text-right">Alertas activas</th>
              </tr>
            </thead>
            <TableStateBody
              phase={qs.phase}
              colSpan={4}
              error={qs.error}
              onRetry={() => { query.refetch(); }}
              emptyMessage="Sin empresas registradas."
              skeletonWidths={['w-32', 'w-16', 'w-16', 'w-20']}
            >
              {(kpis?.tenantSummaries ?? []).map((t: TenantSummary) => (
                <tr key={t.tenantId} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-pa-text">{t.tenantName}</td>
                  <td className="px-4 py-2.5 text-right">{t.buildings}</td>
                  <td className="px-4 py-2.5 text-right">{t.meters}</td>
                  <td className="px-4 py-2.5 text-right">
                    {t.activeAlerts > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        {t.activeAlerts}
                      </span>
                    ) : (
                      <span className="text-pa-text-muted">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </TableStateBody>
          </table>
        </div>
      </div>
    </div>
  );
}
