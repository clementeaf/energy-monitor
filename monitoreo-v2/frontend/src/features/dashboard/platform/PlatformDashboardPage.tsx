import { type ReactElement } from 'react';
import { usePlatformKpisQuery } from '../../../hooks/queries/usePlatformDashboardQuery';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import type { TenantSummary } from '../../../types/platform-dashboard';

export function PlatformDashboardPage(): ReactElement {
  const kpisQuery = usePlatformKpisQuery();
  const qs = useQueryState(kpisQuery, { isEmpty: (d) => !d });
  const kpis = kpisQuery.data;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-pa-text">Dashboard Plataforma</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DataWidget label="Empresas" value={kpis?.tenants ?? '—'} loading={qs.isLoading} />
        <DataWidget label="Edificios" value={kpis?.buildings ?? '—'} loading={qs.isLoading} />
        <DataWidget label="Medidores" value={kpis?.meters ?? '—'} loading={qs.isLoading} />
        <DataWidget label="Lecturas totales" value={kpis?.readings?.toLocaleString('es-CL') ?? '—'} loading={qs.isLoading} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <DataWidget label="Alertas activas" value={kpis?.activeAlerts ?? '—'} loading={qs.isLoading} />
        <DataWidget label="Medidores online" value={kpis?.onlineMeters ?? '—'} loading={qs.isLoading} />
        <DataWidget label="Medidores offline" value={kpis?.offlineMeters ?? '—'} loading={qs.isLoading} />
      </div>

      {/* Tenant summary table */}
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
            <tbody className="divide-y divide-pa-border">
              {qs.isLoading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-pa-text-muted">Cargando...</td></tr>
              )}
              {kpis?.tenantSummaries.map((t: TenantSummary) => (
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
              {kpis && kpis.tenantSummaries.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-pa-text-muted">Sin empresas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
