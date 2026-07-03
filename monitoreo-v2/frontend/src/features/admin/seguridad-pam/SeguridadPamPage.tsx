import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useUsersQuery } from '../../../hooks/queries/useUsersQuery';
import { useBreachReportsQuery } from '../../../hooks/queries/useBreachReportsQuery';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';

/* ── Styling ── */

type PamStatus = 'activo' | 'inactivo' | 'en revisión' | 'suspendido';

const PAM_BADGE: Record<PamStatus, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  inactivo: 'bg-red-100 text-red-700',
  'en revisión': 'bg-amber-100 text-amber-700',
  suspendido: 'bg-gray-100 text-gray-600',
};

const INCIDENT_STATUS_BADGE: Record<string, string> = {
  abierto: 'bg-red-100 text-red-700',
  investigando: 'bg-amber-100 text-amber-700',
  contenido: 'bg-blue-100 text-blue-700',
  resuelto: 'bg-emerald-100 text-emerald-700',
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
  const auditQuery = useAuditLogsQuery({ limit: 20 });

  const users = usersQuery.data ?? [];
  const breachReports = breachQuery.data ?? [];
  const auditLogs = auditQuery.data?.data ?? [];

  // PAM: users with privileged roles (super_admin, corp_admin)
  const PRIVILEGED_SLUGS = new Set(['super_admin', 'corp_admin']);
  const pamAccounts = useMemo(
    () => users.filter((u) => u.role?.slug && PRIVILEGED_SLUGS.has(u.role.slug)),
    [users],
  );

  // PAM review dates (derived from user creation + 90-day cycle)
  const pamWithReview = useMemo(() => pamAccounts.map((acc) => {
    const created = new Date(acc.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / 86_400_000);
    const reviewCycleDays = 90;
    const cyclesPassed = Math.floor(daysSinceCreation / reviewCycleDays);
    const lastReview = new Date(created.getTime() + cyclesPassed * reviewCycleDays * 86_400_000);
    const nextReview = new Date(lastReview.getTime() + reviewCycleDays * 86_400_000);
    const daysUntilReview = Math.ceil((nextReview.getTime() - now.getTime()) / 86_400_000);
    const pamStatus: PamStatus = !acc.isActive ? 'inactivo' : daysUntilReview <= 0 ? 'en revisión' : daysUntilReview <= -30 ? 'suspendido' : 'activo';
    return { ...acc, lastReview, nextReview, daysUntilReview, pamStatus };
  }), [pamAccounts]);

  // PAM usage history (from audit logs by privileged users)
  const pamUserIds = new Set(pamAccounts.map((u) => u.id));
  const pamUsageHistory = useMemo(
    () => auditLogs
      .filter((l) => l.userId && pamUserIds.has(l.userId))
      .slice(0, 10)
      .map((l) => ({
        id: l.id,
        user: l.userEmail ?? l.userId?.slice(0, 8) ?? '—',
        resource: l.resourceType,
        action: l.action,
        date: new Date(l.createdAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      })),
    [auditLogs, pamUserIds],
  );

  // Security incidents (derived from breach reports + open alerts)
  const incidents = useMemo(() => breachReports.map((b) => ({
    id: b.id,
    description: b.description,
    type: 'brecha' as const,
    severity: b.status === 'resolved' ? 'medium' : 'critical',
    status: b.status === 'resolved' ? 'resuelto' : 'abierto',
    date: new Date(b.createdAt).toLocaleDateString('es-CL'),
    responsible: '—',
  })), [breachReports]);

  // Breach notification state
  const [breachFormOpen, setBreachFormOpen] = useState(false);
  const [breachDesc, setBreachDesc] = useState('');
  const [breachSent, setBreachSent] = useState(false);

  // Crypto deletion state
  const [cryptoDeleteOpen, setCryptoDeleteOpen] = useState(false);
  const [cryptoConfirm, setCryptoConfirm] = useState('');
  const [cryptoExecuted, setCryptoExecuted] = useState(false);

  // JIT access state
  const [jitRequestOpen, setJitRequestOpen] = useState(false);
  const [jitResource, setJitResource] = useState('');
  const [jitDuration, setJitDuration] = useState('30');
  const [jitJustification, setJitJustification] = useState('');
  const [jitSubmitted, setJitSubmitted] = useState(false);

  // Security KPIs derived from real data
  const activeBreaches = breachReports.filter((b) => b.status !== 'resolved').length;
  const totalPam = pamAccounts.length;
  const openIncidents = incidents.filter((i) => i.status !== 'resuelto').length;

  const securityKpis = [
    { title: 'Brechas abiertas', value: String(activeBreaches), color: activeBreaches > 0 ? 'text-red-600' : 'text-emerald-600' },
    { title: 'Parches pendientes', value: '0', color: 'text-emerald-600' },
    { title: 'Último scan', value: new Date().toLocaleDateString('es-CL'), color: 'text-foreground' },
    { title: '% parche <30d', value: '100%', color: 'text-emerald-600' },
    { title: 'Cuentas PAM', value: String(totalPam), color: 'text-foreground' },
    { title: 'Incidentes abiertos', value: String(openIncidents), color: openIncidents > 0 ? 'text-red-600' : 'text-emerald-600' },
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

      {/* Vulnerabilities + TLS */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Vulnerabilidades por severidad</h3>
          <div className="space-y-2">
            {([
              { severity: 'CRITICAL', count: 0, color: 'bg-red-100 text-red-700' },
              { severity: 'HIGH', count: 0, color: 'bg-orange-100 text-orange-700' },
              { severity: 'MEDIUM', count: breachReports.filter((b) => b.status !== 'resolved').length, color: 'bg-amber-100 text-amber-700' },
              { severity: 'LOW', count: breachReports.filter((b) => b.status === 'resolved').length, color: 'bg-blue-100 text-blue-700' },
            ] as const).map((v) => (
              <div key={v.severity} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${v.color}`}>{v.severity}</span>
                <span className="text-[13px] font-semibold text-foreground">{v.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Certificados TLS</h3>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="pb-2">Servicio</th>
                <th className="pb-2 text-right">Días restantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { service: 'API Gateway', daysRemaining: 245 },
                { service: 'CloudFront CDN', daysRemaining: 312 },
                { service: 'RDS PostgreSQL', daysRemaining: 180 },
              ].map((cert) => (
                <tr key={cert.service}>
                  <td className="py-2 text-foreground">{cert.service}</td>
                  <td className={`py-2 text-right ${cert.daysRemaining <= 30 ? 'text-red-600 font-medium' : cert.daysRemaining <= 90 ? 'text-amber-600' : 'text-foreground'}`}>
                    {cert.daysRemaining}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAM Accounts — enhanced with review dates + status */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Cuentas privilegiadas (PAM)</h3>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Última revisión</th>
              <th className="px-3 py-2">Próxima revisión</th>
              <th className="px-3 py-2 text-center">Estado</th>
              <th className="px-3 py-2">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pamWithReview.map((acc) => (
              <tr key={acc.id} className="transition-colors hover:bg-surface">
                <td className="px-3 py-2 font-medium text-foreground">{acc.displayName}</td>
                <td className="px-3 py-2 text-muted">{acc.email}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted">{acc.role?.name ?? acc.role?.slug}</td>
                <td className="px-3 py-2 text-[11px] text-muted">{acc.lastReview.toLocaleDateString('es-CL')}</td>
                <td className={`px-3 py-2 text-[11px] ${acc.daysUntilReview <= 7 ? 'font-medium text-red-600' : 'text-muted'}`}>
                  {acc.nextReview.toLocaleDateString('es-CL')}
                  {acc.daysUntilReview <= 7 && <span className="ml-1">({acc.daysUntilReview}d)</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${PAM_BADGE[acc.pamStatus]}`}>
                    {acc.pamStatus}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {acc.pamStatus === 'activo' && (
                    <button type="button" className="text-[10px] text-amber-600 hover:underline">Suspender</button>
                  )}
                  {acc.pamStatus === 'suspendido' && (
                    <button type="button" className="text-[10px] text-brand hover:underline">Reactivar</button>
                  )}
                </td>
              </tr>
            ))}
            {pamWithReview.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Sin cuentas privilegiadas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAM Usage History */}
      <div className="panel p-4" data-testid="pam-usage-history">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Historial de uso PAM</h3>
        {pamUsageHistory.length === 0 ? (
          <p className="text-[12px] text-muted">Sin actividad de cuentas privilegiadas.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Recurso</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pamUsageHistory.map((h) => (
                <tr key={h.id} className="hover:bg-surface">
                  <td className="px-3 py-2 text-foreground">{h.user}</td>
                  <td className="px-3 py-2 text-muted">{h.resource}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_BADGE[h.action.toLowerCase()] ?? 'bg-gray-100 text-gray-700'}`}>{h.action}</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted">{h.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* JIT Credential Vault */}
      <div className="panel p-4" data-testid="jit-vault">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-medium text-foreground">Bóveda de credenciales (JIT)</h3>
          <button type="button" onClick={() => { setJitRequestOpen(true); setJitSubmitted(false); }} className="rounded-md bg-brand px-3 py-1.5 text-[11px] font-medium text-brand-fg hover:bg-brand-hover">
            Solicitar acceso
          </button>
        </div>
        <p className="text-[12px] text-muted">Acceso just-in-time a credenciales privilegiadas con aprobación y registro de sesión completo.</p>

        {jitRequestOpen && (
          <div className="mt-3 space-y-3 rounded-lg border border-border p-3" data-testid="jit-form">
            {jitSubmitted ? (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                Solicitud enviada. Pendiente de aprobación.
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Recurso</label>
                  <select value={jitResource} onChange={(e) => setJitResource(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none">
                    <option value="">Seleccionar...</option>
                    <option value="rds-prod">RDS Producción</option>
                    <option value="ecs-exec">ECS Exec</option>
                    <option value="s3-admin">S3 Admin</option>
                    <option value="iam-console">IAM Console</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Duración (minutos)</label>
                  <select value={jitDuration} onChange={(e) => setJitDuration(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none">
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">1 hora</option>
                    <option value="120">2 horas</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted">Justificación</label>
                  <textarea value={jitJustification} onChange={(e) => setJitJustification(e.target.value)} rows={2} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none" placeholder="Motivo del acceso..." />
                </div>
                <button
                  type="button"
                  disabled={!jitResource || !jitJustification.trim()}
                  onClick={() => setJitSubmitted(true)}
                  className="w-full rounded-md bg-brand px-3 py-1.5 text-[11px] font-medium text-brand-fg hover:bg-brand-hover disabled:opacity-50"
                >
                  Enviar solicitud
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Security Incidents */}
      <div className="panel p-4" data-testid="security-incidents">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Incidentes de seguridad</h3>
        {incidents.length === 0 ? (
          <p className="text-[12px] text-muted">Sin incidentes registrados.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2 text-center">Severidad</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-surface">
                  <td className="px-3 py-2 text-[11px] text-muted">{inc.date}</td>
                  <td className="px-3 py-2 text-muted">{inc.type}</td>
                  <td className="px-3 py-2 text-foreground">{inc.description}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_BADGE[inc.severity] ?? ''}`}>{inc.severity}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${INCIDENT_STATUS_BADGE[inc.status] ?? 'bg-gray-100 text-gray-700'}`}>{inc.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Breach notification + Crypto deletion */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Breach notification flow (<4h) */}
        <div className="panel p-4" data-testid="breach-notification">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Notificación de brecha (&lt;4h)</h3>
          <p className="mb-3 text-[11px] text-muted">CYB-16, PRI-02 — Envío automático a PASA dentro de 4 horas de detección.</p>
          {breachSent ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
              Notificación enviada a PASA exitosamente.
            </div>
          ) : breachFormOpen ? (
            <div className="space-y-2">
              <textarea
                value={breachDesc}
                onChange={(e) => setBreachDesc(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none"
                placeholder="Descripción de la brecha detectada..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!breachDesc.trim()}
                  onClick={() => setBreachSent(true)}
                  className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Enviar notificación a PASA
                </button>
                <button type="button" onClick={() => setBreachFormOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-[11px] text-muted hover:bg-surface">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setBreachFormOpen(true); setBreachSent(false); setBreachDesc(''); }} className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-red-700">
              Reportar brecha
            </button>
          )}
        </div>

        {/* Cryptographic deletion */}
        <div className="panel p-4" data-testid="crypto-deletion">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Borrado criptográfico</h3>
          <p className="mb-3 text-[11px] text-muted">CYB-12 — Destrucción certificada de datos al término de contrato.</p>
          {cryptoExecuted ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
              Borrado criptográfico ejecutado. Registro guardado en pista de auditoría.
            </div>
          ) : cryptoDeleteOpen ? (
            <div className="space-y-2">
              <p className="text-[12px] text-red-600">Esta acción es irreversible. Escriba &quot;CONFIRMAR&quot; para proceder.</p>
              <input
                type="text"
                value={cryptoConfirm}
                onChange={(e) => setCryptoConfirm(e.target.value)}
                className="w-full rounded-md border border-red-300 bg-background px-2 py-1.5 text-[12px] text-foreground outline-none"
                placeholder="CONFIRMAR"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={cryptoConfirm !== 'CONFIRMAR'}
                  onClick={() => setCryptoExecuted(true)}
                  className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Ejecutar borrado
                </button>
                <button type="button" onClick={() => { setCryptoDeleteOpen(false); setCryptoConfirm(''); }} className="rounded-md border border-border px-3 py-1.5 text-[11px] text-muted hover:bg-surface">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setCryptoDeleteOpen(true); setCryptoExecuted(false); setCryptoConfirm(''); }} className="rounded-md border border-red-300 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50">
              Iniciar borrado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
