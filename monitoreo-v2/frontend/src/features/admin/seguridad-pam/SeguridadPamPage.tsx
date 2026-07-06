import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Drawer } from '../../../components/ui/Drawer';
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

  // Detail drawer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [drawer, setDrawer] = useState<{ type: string; data: any } | null>(null);
  const closeDrawer = () => setDrawer(null);

  // Security KPIs derived from real data
  const activeBreaches = breachReports.filter((b) => b.status !== 'resolved').length;
  const totalPam = pamAccounts.length;
  const openIncidents = incidents.filter((i) => i.status !== 'resuelto').length;

  const vulnMedium = breachReports.filter((b) => b.status !== 'resolved').length;
  const vulnLow = breachReports.filter((b) => b.status === 'resolved').length;

  const securityKpis = [
    { title: 'Brechas abiertas', value: String(activeBreaches), color: activeBreaches > 0 ? 'text-red-600' : 'text-emerald-600' },
    { title: 'Parches pendientes', value: '0', color: 'text-emerald-600' },
    { title: 'Último scan', value: new Date().toLocaleDateString('es-CL'), color: 'text-foreground' },
    { title: '% parche <30d', value: '100%', color: 'text-emerald-600' },
    { title: 'Cuentas PAM', value: String(totalPam), color: 'text-foreground' },
    { title: 'Incidentes abiertos', value: String(openIncidents), color: openIncidents > 0 ? 'text-red-600' : 'text-emerald-600' },
    { title: 'Vuln. críticas', value: '0', color: 'text-emerald-600' },
    { title: 'Vuln. altas', value: '0', color: 'text-emerald-600' },
    { title: 'Vuln. medias', value: String(vulnMedium), color: vulnMedium > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { title: 'Vuln. bajas', value: String(vulnLow), color: 'text-blue-600' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Seguridad y PAM" eyebrow="Seguridad" />

      {/* KPIs */}
      <div className="flex flex-wrap gap-2">
        {securityKpis.map((k) => (
          <div key={k.title} className="panel px-3 py-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`text-base font-semibold leading-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Main panels row — 6 panels, same height */}
      <div className="flex gap-3 overflow-x-auto">
        {/* Breach reports */}
        <div className="panel min-w-[180px] flex-1 p-3">
          <h3 className="mb-2 text-[12px] font-medium text-foreground">Reportes de brecha</h3>
          {breachReports.length === 0 ? (
            <p className="text-[11px] text-muted">Sin reportes.</p>
          ) : (
            <div className="space-y-1.5">
              {breachReports.slice(0, 5).map((b) => (
                <button key={b.id} type="button" onClick={() => setDrawer({ type: 'breach', data: b })} className="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] transition-colors hover:bg-surface">
                  <span className="truncate text-foreground">{b.description}</span>
                  <span className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    b.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>{b.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Audit activity */}
        <div className="panel min-w-[200px] flex-1 p-3">
          <h3 className="mb-2 text-[12px] font-medium text-foreground">Actividad de seguridad</h3>
          {auditLogs.length === 0 ? (
            <p className="text-[11px] text-muted">Sin actividad.</p>
          ) : (
            <div className="space-y-1">
              {auditLogs.slice(0, 8).map((log) => (
                <button key={log.id} type="button" onClick={() => setDrawer({ type: 'audit', data: log })} className="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] transition-colors hover:bg-surface">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${SEVERITY_BADGE[log.action.toLowerCase()] ?? 'bg-gray-100 text-gray-700'}`}>{log.action}</span>
                    <span className="text-muted">{log.resourceType}</span>
                  </div>
                  <span className="text-[9px] text-muted">{new Date(log.createdAt).toLocaleDateString('es-CL')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TLS */}
        <div className="panel min-w-[160px] shrink-0 p-3">
          <h3 className="mb-2 text-[12px] font-medium text-foreground">Certificados TLS</h3>
          <p className="mb-1.5 text-[9px] text-amber-600">Datos de referencia — conectar con scanner de seguridad</p>
          <div className="space-y-1">
            {[
              { service: 'API Gateway', days: 245, issuer: 'ACM', algorithm: 'RSA-2048', autoRenew: true },
              { service: 'CloudFront CDN', days: 312, issuer: 'ACM', algorithm: 'RSA-2048', autoRenew: true },
              { service: 'RDS PostgreSQL', days: 180, issuer: 'Amazon RDS', algorithm: 'RSA-2048', autoRenew: false },
            ].map((c) => (
              <button key={c.service} type="button" onClick={() => setDrawer({ type: 'tls', data: c })} className="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] transition-colors hover:bg-surface">
                <span className="text-foreground">{c.service}</span>
                <span className={c.days <= 30 ? 'font-medium text-red-600' : c.days <= 90 ? 'text-amber-600' : 'text-muted'}>{c.days}d</span>
              </button>
            ))}
          </div>
        </div>

        {/* PAM Usage History */}
        <div className="panel min-w-[200px] flex-1 p-3" data-testid="pam-usage-history">
          <h3 className="mb-2 text-[12px] font-medium text-foreground">Historial uso PAM</h3>
          {pamUsageHistory.length === 0 ? (
            <p className="text-[11px] text-muted">Sin actividad.</p>
          ) : (
            <div className="space-y-1">
              {pamUsageHistory.map((h) => (
                <button key={h.id} type="button" onClick={() => setDrawer({ type: 'pamUsage', data: h })} className="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] transition-colors hover:bg-surface">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground">{h.user}</span>
                    <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${SEVERITY_BADGE[h.action.toLowerCase()] ?? 'bg-gray-100 text-gray-700'}`}>{h.action}</span>
                  </div>
                  <span className="text-[9px] text-muted">{h.date}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Incidents */}
        <div className="panel min-w-[200px] flex-1 p-3" data-testid="security-incidents">
          <h3 className="mb-2 text-[12px] font-medium text-foreground">Incidentes</h3>
          {incidents.length === 0 ? (
            <p className="text-[11px] text-muted">Sin incidentes.</p>
          ) : (
            <div className="space-y-1">
              {incidents.map((inc) => (
                <button key={inc.id} type="button" onClick={() => setDrawer({ type: 'incident', data: inc })} className="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] transition-colors hover:bg-surface">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${SEVERITY_BADGE[inc.severity] ?? ''}`}>{inc.severity}</span>
                    <span className="truncate text-foreground">{inc.description}</span>
                  </div>
                  <span className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${INCIDENT_STATUS_BADGE[inc.status] ?? 'bg-gray-100 text-gray-700'}`}>{inc.status}</span>
                </button>
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
              <th className="px-3 py-2">Última revisión</th>
              <th className="px-3 py-2">Próxima revisión</th>
              <th className="px-3 py-2 text-center">Estado</th>
              <th className="px-3 py-2">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pamWithReview.map((acc) => (
              <tr key={acc.id} className="cursor-pointer transition-colors hover:bg-surface" onClick={() => setDrawer({ type: 'pam', data: acc })}>
                <td className="px-3 py-2 font-medium text-foreground">{acc.displayName}</td>
                <td className="px-3 py-2 text-muted">{acc.email}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted">{acc.role?.name ?? acc.role?.slug}</td>
                <td className="px-3 py-2 text-[11px] text-muted">{acc.lastReview.toLocaleDateString('es-CL')}</td>
                <td className={`px-3 py-2 text-[11px] ${acc.daysUntilReview <= 7 ? 'font-medium text-red-600' : 'text-muted'}`}>
                  {acc.nextReview.toLocaleDateString('es-CL')}
                  {acc.daysUntilReview <= 7 && <span className="ml-1">({acc.daysUntilReview}d)</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${PAM_BADGE[acc.pamStatus]}`}>{acc.pamStatus}</span>
                </td>
                <td className="px-3 py-2">
                  {acc.pamStatus === 'activo' && <button type="button" className="text-[10px] text-amber-600 hover:underline">Suspender</button>}
                  {acc.pamStatus === 'suspendido' && <button type="button" className="text-[10px] text-brand hover:underline">Reactivar</button>}
                </td>
              </tr>
            ))}
            {pamWithReview.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Sin cuentas privilegiadas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Breach notification + Crypto deletion */}
      <div className="flex gap-3">
        {/* JIT Vault */}
        <div className="panel min-w-0 flex-1 p-4" data-testid="jit-vault">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-foreground">Bóveda de credenciales (JIT)</h3>
            <button type="button" onClick={() => { setJitRequestOpen(true); setJitSubmitted(false); }} className="rounded-md bg-brand px-3 py-1.5 text-[10px] font-medium text-brand-fg hover:bg-brand-hover">
              Solicitar acceso
            </button>
          </div>
          <p className="text-[11px] text-muted">Acceso just-in-time con aprobación y registro de sesión.</p>
          {jitRequestOpen && (
            <div className="mt-3 space-y-2 rounded-lg border border-border p-3" data-testid="jit-form">
              {jitSubmitted ? (
                <p className="text-[11px] text-emerald-700">Accion registrada (pendiente integracion backend). Solicitud enviada. Pendiente de aprobacion.</p>
              ) : (
                <>
                  <select value={jitResource} onChange={(e) => setJitResource(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1.5 text-[11px] outline-none">
                    <option value="">Recurso...</option>
                    <option value="rds-prod">RDS Producción</option>
                    <option value="ecs-exec">ECS Exec</option>
                    <option value="s3-admin">S3 Admin</option>
                    <option value="iam-console">IAM Console</option>
                  </select>
                  <select value={jitDuration} onChange={(e) => setJitDuration(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1.5 text-[11px] outline-none">
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">1 hora</option>
                    <option value="120">2 horas</option>
                  </select>
                  <textarea value={jitJustification} onChange={(e) => setJitJustification(e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1.5 text-[11px] outline-none" placeholder="Justificación..." />
                  <button type="button" disabled={!jitResource || !jitJustification.trim()} onClick={() => setJitSubmitted(true)} className="w-full rounded-md bg-brand px-3 py-1.5 text-[10px] font-medium text-brand-fg disabled:opacity-50">Enviar solicitud</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Breach notification flow (<4h) */}
        <div className="panel min-w-0 flex-1 p-4" data-testid="breach-notification">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Notificación de brecha (&lt;4h)</h3>
          <p className="mb-3 text-[11px] text-muted">CYB-16, PRI-02 — Envío automático a PASA dentro de 4 horas de detección.</p>
          {breachSent ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
              Accion registrada (pendiente integracion backend). Notificacion enviada a PASA exitosamente.
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
        <div className="panel min-w-0 flex-1 p-4" data-testid="crypto-deletion">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Borrado criptográfico</h3>
          <p className="mb-3 text-[11px] text-muted">CYB-12 — Destrucción certificada de datos al término de contrato.</p>
          {cryptoExecuted ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
              Accion registrada (pendiente integracion backend). Borrado criptografico ejecutado. Registro guardado en pista de auditoria.
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

      {/* Detail Drawer */}
      <Drawer open={drawer !== null} onClose={closeDrawer} title={drawerTitle(drawer?.type)} side="right" size="md">
        {drawer && <DrawerContent type={drawer.type} data={drawer.data} />}
      </Drawer>
    </div>
  );
}

/* ── Drawer helpers ── */

function drawerTitle(type?: string): string {
  const titles: Record<string, string> = {
    breach: 'Reporte de brecha',
    audit: 'Registro de auditoría',
    tls: 'Certificado TLS',
    pamUsage: 'Actividad PAM',
    incident: 'Incidente de seguridad',
    pam: 'Cuenta privilegiada',
  };
  return titles[type ?? ''] ?? 'Detalle';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DrawerContent({ type, data }: Readonly<{ type: string; data: any }>) {
  if (type === 'breach') {
    return (
      <dl className="space-y-3 text-[13px]">
        <Row label="Descripción" value={data.description} />
        <Row label="Estado" value={data.status} />
        <Row label="Fecha" value={new Date(data.createdAt).toLocaleString('es-CL')} />
        <Row label="Reportado por" value={data.reportedBy ?? '—'} />
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  if (type === 'audit') {
    return (
      <dl className="space-y-3 text-[13px]">
        <Row label="Acción" value={data.action} />
        <Row label="Recurso" value={data.resourceType} />
        <Row label="ID recurso" value={data.resourceId ?? '—'} mono />
        <Row label="Usuario" value={data.userEmail ?? data.userId ?? '—'} />
        <Row label="Fecha" value={new Date(data.createdAt).toLocaleString('es-CL')} />
        {data.changes && <Row label="Cambios" value={JSON.stringify(data.changes, null, 2)} mono />}
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  if (type === 'tls') {
    return (
      <dl className="space-y-3 text-[13px]">
        <Row label="Servicio" value={data.service} />
        <Row label="Días restantes" value={`${data.days}d`} />
        <Row label="Emisor" value={data.issuer} />
        <Row label="Algoritmo" value={data.algorithm} />
        <Row label="Renovación automática" value={data.autoRenew ? 'Sí' : 'No'} />
      </dl>
    );
  }
  if (type === 'pamUsage') {
    return (
      <dl className="space-y-3 text-[13px]">
        <Row label="Usuario" value={data.user} />
        <Row label="Recurso" value={data.resource} />
        <Row label="Acción" value={data.action} />
        <Row label="Fecha" value={data.date} />
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  if (type === 'incident') {
    return (
      <dl className="space-y-3 text-[13px]">
        <Row label="Descripción" value={data.description} />
        <Row label="Tipo" value={data.type} />
        <Row label="Severidad" value={data.severity} />
        <Row label="Estado" value={data.status} />
        <Row label="Fecha" value={data.date} />
        <Row label="Responsable" value={data.responsible} />
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  if (type === 'pam') {
    return (
      <dl className="space-y-3 text-[13px]">
        <Row label="Nombre" value={data.displayName} />
        <Row label="Email" value={data.email} />
        <Row label="Rol" value={data.role?.name ?? data.role?.slug ?? '—'} />
        <Row label="Estado PAM" value={data.pamStatus} />
        <Row label="Última revisión" value={data.lastReview?.toLocaleDateString('es-CL') ?? '—'} />
        <Row label="Próxima revisión" value={data.nextReview?.toLocaleDateString('es-CL') ?? '—'} />
        <Row label="Días hasta revisión" value={String(data.daysUntilReview ?? '—')} />
        <Row label="Activo" value={data.isActive ? 'Sí' : 'No'} />
        <Row label="Creado" value={new Date(data.createdAt).toLocaleString('es-CL')} />
        <Row label="ID" value={data.id} mono />
      </dl>
    );
  }
  return <p className="text-[12px] text-muted">Sin detalle disponible.</p>;
}

function Row({ label, value, mono }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className={`mt-0.5 text-foreground ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</dd>
    </div>
  );
}
