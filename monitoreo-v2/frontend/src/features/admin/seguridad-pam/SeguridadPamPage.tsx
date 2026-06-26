import { useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useUsersQuery } from '../../../hooks/queries/useUsersQuery';
import { useBreachReportsQuery } from '../../../hooks/queries/useBreachReportsQuery';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';

/* ── Styling ── */

type PamStatus = 'activo' | 'inactivo';

const PAM_BADGE: Record<PamStatus, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  inactivo: 'bg-red-100 text-red-700',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};

/* ── Page ── */

export function SeguridadPamPage() {
  const usersQuery = useUsersQuery();
  const breachQuery = useBreachReportsQuery();
  const auditQuery = useAuditLogsQuery({ limit: 10 });

  const users = usersQuery.data ?? [];
  const breachReports = breachQuery.data ?? [];
  const auditLogs = auditQuery.data?.data ?? [];

  // PAM: users with privileged roles (super_admin, corp_admin)
  const PRIVILEGED_SLUGS = new Set(['super_admin', 'corp_admin']);
  const pamAccounts = useMemo(
    () => users.filter((u) => u.role?.slug && PRIVILEGED_SLUGS.has(u.role.slug)),
    [users],
  );

  // Security KPIs derived from real data
  const activeBreaches = breachReports.filter((b) => b.status !== 'resolved').length;
  const totalPam = pamAccounts.length;
  const inactivePam = pamAccounts.filter((u) => !u.isActive).length;
  const recentActions = auditLogs.length;

  const securityKpis = [
    { title: 'Brechas abiertas', value: String(activeBreaches), color: activeBreaches > 0 ? 'text-red-600' : 'text-emerald-600' },
    { title: 'Cuentas PAM', value: String(totalPam), color: 'text-foreground' },
    { title: 'PAM inactivos', value: String(inactivePam), color: inactivePam > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { title: 'Acciones recientes', value: String(recentActions), color: 'text-foreground' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Seguridad y PAM" eyebrow="Seguridad" />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {securityKpis.map((k) => (
          <div key={k.title} className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`mt-0.5 text-lg font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Breach reports */}
        <div className="panel p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Reportes de brecha</h3>
          {breachReports.length === 0 ? (
            <p className="text-[12px] text-muted">Sin reportes de brecha registrados.</p>
          ) : (
            <div className="space-y-2">
              {breachReports.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{b.description}</p>
                    <p className="text-[10px] text-muted">{new Date(b.createdAt).toLocaleDateString('es-CL')}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    b.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent security-relevant audit actions */}
        <div className="panel p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Actividad de seguridad</h3>
          {auditLogs.length === 0 ? (
            <p className="text-[12px] text-muted">Sin actividad reciente.</p>
          ) : (
            <div className="space-y-1.5">
              {auditLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      SEVERITY_BADGE[log.action.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-muted">{log.resourceType}</span>
                  </div>
                  <span className="text-[10px] text-muted">{new Date(log.createdAt).toLocaleDateString('es-CL')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PAM Accounts */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Cuentas privilegiadas (PAM)</h3>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pamAccounts.map((acc) => (
              <tr key={acc.id} className="transition-colors hover:bg-surface">
                <td className="px-3 py-2 font-medium text-foreground">{acc.displayName}</td>
                <td className="px-3 py-2 text-muted">{acc.email}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted">{acc.role?.name ?? acc.role?.slug}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${PAM_BADGE[acc.isActive ? 'activo' : 'inactivo']}`}>
                    {acc.isActive ? 'activo' : 'inactivo'}
                  </span>
                </td>
              </tr>
            ))}
            {pamAccounts.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">Sin cuentas privilegiadas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
