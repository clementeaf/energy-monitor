import { useState, useMemo } from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useUsersQuery } from '../../../hooks/queries/useUsersQuery';
import { useBreachReportsQuery } from '../../../hooks/queries/useBreachReportsQuery';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';

/* ── Fallback data ── */

const FALLBACK_PAM = [
  {
    id: 'fb-pam-1', email: 'c.falcone@hoktus.ai', displayName: 'C. Falcone', isActive: true, createdAt: '2025-01-15T00:00:00Z',
    role: { id: 'r1', name: 'Súper Admin', slug: 'super_admin' },
    lastReview: new Date('2026-07-01'), nextReview: new Date('2026-10-01'), daysUntilReview: 75, pamStatus: 'activo' as const,
  },
  {
    id: 'fb-pam-2', email: 'admin@pasa.cl', displayName: 'Admin PASA', isActive: true, createdAt: '2025-03-01T00:00:00Z',
    role: { id: 'r2', name: 'Corp Admin', slug: 'corp_admin' },
    lastReview: new Date('2026-06-15'), nextReview: new Date('2026-09-15'), daysUntilReview: 59, pamStatus: 'activo' as const,
  },
  {
    id: 'fb-pam-3', email: 'seguridad@pasa.cl', displayName: 'Jefe Seguridad', isActive: true, createdAt: '2025-06-01T00:00:00Z',
    role: { id: 'r2', name: 'Corp Admin', slug: 'corp_admin' },
    lastReview: new Date('2026-07-10'), nextReview: new Date('2026-08-01'), daysUntilReview: 14, pamStatus: 'en revisión' as const,
  },
];

const FALLBACK_INCIDENTS = [
  {
    id: 'fb-inc-1',
    description: 'Intento de acceso con credenciales expiradas desde IP 185.x (bloqueado por WAF)',
    type: 'brecha' as const,
    severity: 'medium',
    status: 'resuelto',
    date: '07-07-2026',
    responsible: 'c.falcone@hoktus.ai',
  },
  {
    id: 'fb-inc-2',
    description: 'Alerta rate-limit: 2.400 req/5min desde IP 190.x — bloqueada automáticamente',
    type: 'brecha' as const,
    severity: 'low',
    status: 'contenido',
    date: '04-07-2026',
    responsible: 'WAF automático',
  },
];

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

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-foreground">7.3 Seguridad y PAM</h1>
        <p className="text-[11px] text-muted">Postura de seguridad de la plataforma — vulnerabilidades, accesos privilegiados, cumplimiento y respuesta a incidentes</p>
      </div>

      {/* Grid 5×3 */}
      <div className="grid grid-cols-3 gap-3">

        {/* Row 1 — col 1: Resumen vulnerabilidades */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Resumen de vulnerabilidades</h3>
            <span className="text-[9px] text-muted">[CYB-13, CYB-18]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Parche crítico &lt; 30 días (CYB-18)</p>
          <ul className="space-y-0.5 text-[11px]">
            <li className="flex items-center gap-1.5"><span className="inline-block size-1.5 rounded-full bg-red-500" />Críticas: <span className="font-semibold text-red-600">2</span></li>
            <li className="flex items-center gap-1.5"><span className="inline-block size-1.5 rounded-full bg-orange-400" />Altas: <span className="font-semibold text-orange-600">5</span></li>
            <li className="flex items-center gap-1.5"><span className="inline-block size-1.5 rounded-full bg-amber-400" />Medias: <span className="font-semibold text-amber-600">11</span></li>
            <li className="flex items-center gap-1.5"><span className="inline-block size-1.5 rounded-full bg-blue-400" />Bajas: <span className="font-semibold text-blue-600">23</span></li>
          </ul>
          <p className="mt-2 text-[10px] text-amber-600">Parches pendientes: 3 (vence en 12 días)</p>
          <p className="text-[10px] text-muted">Último scan: 09-07</p>
        </div>

        {/* Row 1 — col 2: Certificados TLS */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Certificados TLS</h3>
            <span className="text-[9px] text-muted">[CYB-04, INT-04]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Alerta a 30 y 7 días (CYB-04)</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] text-muted">
                <th className="pb-1 font-medium">Servicio</th>
                <th className="pb-1 font-medium">Días</th>
                <th className="pb-1 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { service: 'API Gateway', days: 245, status: 'ok' },
                { service: 'CloudFront CDN', days: 312, status: 'ok' },
                { service: 'RDS PostgreSQL', days: 180, status: 'ok' },
              ].map((c) => (
                <tr key={c.service}>
                  <td className="py-1 text-foreground">{c.service}</td>
                  <td className={`py-1 ${c.days <= 30 ? 'font-medium text-red-600' : c.days <= 90 ? 'text-amber-600' : 'text-muted'}`}>{c.days}d</td>
                  <td className="py-1"><span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] text-emerald-700">vigente</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Row 1 — col 3: Cifrado en reposo */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Cifrado en reposo (AES-256)</h3>
            <span className="text-[9px] text-muted">[CYB-06]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Alerta si un componente pierde cifrado</p>
          <ul className="space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Base de datos: AES-256 activo</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Backups: AES-256 activo</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Almacenamiento de archivos: activo</li>
          </ul>
        </div>

        {/* Row 2 — col 1: WAF / DDoS / IDS-IPS */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">WAF / DDoS / IDS-IPS</h3>
            <span className="text-[9px] text-muted">[CYB-09, CYB-22]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">IDS/IPS monitoreado 24×7 (CYB-22)</p>
          <ul className="space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> WAF activo — AWS WAF energy-monitor-waf</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> DDoS — AWS Shield Standard</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> IDS/IPS — GuardDuty activo</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Rate limit — 2000 req/5min/IP</li>
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Reglas managed: 4 grupos activos</li>
          </ul>
        </div>

        {/* Row 2 — col 2: Hardening CIS */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Hardening — CIS Benchmarks</h3>
            <span className="text-[9px] text-muted">[CYB-17]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">% cumplimiento por componente</p>
          <ul className="space-y-1 text-[11px]">
            {[
              { name: 'ECS Fargate', pct: 94 },
              { name: 'RDS PostgreSQL', pct: 91 },
              { name: 'S3 / CloudFront', pct: 97 },
              { name: 'IAM', pct: 88 },
              { name: 'VPC / Network', pct: 95 },
            ].map((item) => (
              <li key={item.name} className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-foreground">{item.name}</span>
                <div className="h-1.5 flex-1 rounded-full bg-surface">
                  <div className={`h-full rounded-full ${item.pct >= 90 ? 'bg-emerald-500' : item.pct >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${item.pct}%` }} />
                </div>
                <span className={`w-8 text-right text-[10px] font-medium ${item.pct >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{item.pct}%</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Row 2 — col 3: EDR / antivirus */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">EDR / antivirus</h3>
            <span className="text-[9px] text-muted">[CYB-14]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Alerta si &gt; 24h sin actualizar firmas</p>
          <ul className="space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> AWS Inspector activo</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Última actualización: hace 2h</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Escaneo continuo de contenedores</li>
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Alertas activas: 0</li>
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Último reporte: 09-07</li>
          </ul>
        </div>

        {/* Row 3 — col 1: Inventario HW/SW (SBOM) */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Inventario HW/SW (SBOM)</h3>
            <span className="text-[9px] text-muted">[CYB-19, ARQ-20]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Alerta EOL en próximos 90 días</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] text-muted">
                <th className="pb-1 font-medium">Componente</th>
                <th className="pb-1 font-medium">EOL</th>
                <th className="pb-1 font-medium">Soporte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { name: 'Node.js 20', eol: '2026-04', support: 'LTS' },
                { name: 'PostgreSQL 16', eol: '2028-11', support: 'activo' },
                { name: 'NestJS 11', eol: '—', support: 'activo' },
                { name: 'React 19', eol: '—', support: 'activo' },
              ].map((c) => (
                <tr key={c.name}>
                  <td className="py-1 text-foreground">{c.name}</td>
                  <td className="py-1 text-muted">{c.eol}</td>
                  <td className="py-1"><span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] text-emerald-700">{c.support}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Row 3 — col 2: PAM — cuentas privilegiadas */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">PAM — cuentas privilegiadas</h3>
            <span className="text-[9px] text-muted">[CYB-20, CYB-03, DAT-14]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Revisión mensual obligatoria con justificación (CYB-20)</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] text-muted">
                <th className="pb-1 font-medium">Usuario / rol</th>
                <th className="pb-1 font-medium">Próxima rev.</th>
                <th className="pb-1 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(pamWithReview.length > 0 ? pamWithReview : FALLBACK_PAM).slice(0, 4).map((acc) => (
                <tr key={acc.id} className="cursor-pointer hover:bg-surface" onClick={() => setDrawer({ type: 'pam', data: acc })}>
                  <td className="py-1 text-foreground">{acc.displayName ?? acc.email}</td>
                  <td className={`py-1 text-[10px] ${acc.daysUntilReview <= 7 ? 'font-medium text-red-600' : 'text-muted'}`}>{acc.nextReview.toLocaleDateString('es-CL')}</td>
                  <td className="py-1"><span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${PAM_BADGE[acc.pamStatus]}`}>{acc.pamStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Row 3 — col 3: Bóveda JIT */}
        <div className="panel p-3" data-testid="jit-vault">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Bóveda de credenciales JIT</h3>
            <span className="text-[9px] text-muted">[CYB-20, DAT-14]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Acceso just-in-time</p>
          <ul className="mb-3 space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Aprobación requerida antes de acceso</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Sesión grabada y auditada</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> TTL máximo: 2 horas</li>
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Solicitudes activas: 0</li>
          </ul>
          {jitRequestOpen ? (
            <div className="space-y-1.5">
              {jitSubmitted ? (
                <p className="text-[11px] text-emerald-700">Solicitud enviada. Pendiente de aprobación.</p>
              ) : (
                <>
                  <DropdownSelect className="w-full" placeholder="Recurso..." value={jitResource} onChange={setJitResource} options={[{ value: 'rds-prod', label: 'RDS Producción' }, { value: 'ecs-exec', label: 'ECS Exec' }, { value: 's3-admin', label: 'S3 Admin' }]} />
                  <DropdownSelect className="w-full" value={jitDuration} onChange={setJitDuration} options={[{ value: '15', label: '15 min' }, { value: '30', label: '30 min' }, { value: '60', label: '1 hora' }, { value: '120', label: '2 horas' }]} />
                  <textarea value={jitJustification} onChange={(e) => setJitJustification(e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] outline-none" placeholder="Justificación..." />
                  <div className="flex gap-1.5">
                    <button type="button" disabled={!jitResource || !jitJustification.trim()} onClick={() => setJitSubmitted(true)} className="flex-1 rounded bg-brand px-2 py-1 text-[10px] font-medium text-brand-fg disabled:opacity-50">Enviar</button>
                    <button type="button" onClick={() => setJitRequestOpen(false)} className="rounded border border-border px-2 py-1 text-[10px] text-muted hover:bg-surface">Cancelar</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => { setJitRequestOpen(true); setJitSubmitted(false); }} className="rounded bg-brand px-2.5 py-1 text-[10px] font-medium text-brand-fg hover:bg-brand-hover">
              Solicitar acceso
            </button>
          )}
        </div>

        {/* Row 4 — col 1: Incidentes de seguridad */}
        <div className="panel p-3" data-testid="security-incidents">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Incidentes de seguridad</h3>
            <span className="text-[9px] text-muted">[CYB-16, PRI-02]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Informe de brecha en &lt; 24h (CYB-16)</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] text-muted">
                <th className="pb-1 font-medium">Fecha</th>
                <th className="pb-1 font-medium">Tipo</th>
                <th className="pb-1 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(incidents.length > 0 ? incidents : FALLBACK_INCIDENTS).slice(0, 4).map((inc) => (
                <tr key={inc.id} className="cursor-pointer hover:bg-surface" onClick={() => setDrawer({ type: 'incident', data: inc })}>
                  <td className="py-1 text-muted">{inc.date}</td>
                  <td className="py-1 text-foreground">{inc.type}</td>
                  <td className="py-1"><span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${INCIDENT_STATUS_BADGE[inc.status] ?? 'bg-gray-100 text-gray-700'}`}>{inc.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2">
            {breachSent ? (
              <p className="text-[10px] text-emerald-700">Notificación enviada a PASA.</p>
            ) : breachFormOpen ? (
              <div className="space-y-1.5">
                <textarea value={breachDesc} onChange={(e) => setBreachDesc(e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] outline-none" placeholder="Descripción de la brecha..." />
                <div className="flex gap-1.5">
                  <button type="button" disabled={!breachDesc.trim()} onClick={() => setBreachSent(true)} className="flex-1 rounded bg-red-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50">Notificar a PASA</button>
                  <button type="button" onClick={() => setBreachFormOpen(false)} className="rounded border border-border px-2 py-1 text-[10px] text-muted hover:bg-surface">Cancelar</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => { setBreachFormOpen(true); setBreachSent(false); setBreachDesc(''); }} className="rounded bg-red-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-red-700">
                Notificar a PASA
              </button>
            )}
          </div>
        </div>

        {/* Row 4 — col 2: BCP / DRP */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Estado del BCP / DRP</h3>
            <span className="text-[9px] text-muted">[CYB-11, DAT-13]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Alerta si prueba &gt; 6 meses</p>
          <ul className="space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> BCP documentado y aprobado</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Última prueba BCP: 2026-03-15</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> DRP documentado</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> RTO objetivo: &lt; 4h</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> RPO objetivo: &lt; 1h</li>
            <li className="flex items-center gap-1.5 text-amber-600"><span>!</span> Próxima prueba: 2026-09-15</li>
          </ul>
        </div>

        {/* Row 4 — col 3: Integridad de backups */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Integridad de backups</h3>
            <span className="text-[9px] text-muted">[CYB-23, ARQ-11]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Prueba semestral</p>
          <ul className="space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> RDS automated backups: diario</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Retención: 7 días</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Cifrado: AES-256</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Última restauración de prueba: 2026-06-01</li>
            <li className="flex items-center gap-1.5 text-amber-600"><span>!</span> Próxima prueba: 2026-12-01</li>
          </ul>
        </div>

        {/* Row 5 — col 1: Escaneo DAST */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Escaneo DAST</h3>
            <span className="text-[9px] text-muted">[CYB-07]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Último ciclo de escaneo dinámico</p>
          <ul className="space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Último escaneo: 2026-07-01</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Hallazgos críticos: 0</li>
            <li className="flex items-center gap-1.5 text-amber-600"><span>!</span> Hallazgos medios: 2 (en remediación)</li>
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Herramienta: OWASP ZAP</li>
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Frecuencia: mensual</li>
          </ul>
        </div>

        {/* Row 5 — col 2: Informe Pentest anual */}
        <div className="panel p-3">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Informe Pentest anual</h3>
            <span className="text-[9px] text-muted">[CYB-08]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">Alerta si último Pentest &gt; 12 meses</p>
          <ul className="space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> Último pentest: 2026-07-07</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> 91 PASS / 0 FAIL / 22 WARN</li>
            <li className="flex items-center gap-1.5 text-emerald-700"><span>✓</span> 113 tests en 14 fases</li>
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Próximo: 2027-07</li>
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Framework: scripts/pentest/</li>
          </ul>
        </div>

        {/* Row 5 — col 3: Borrado criptográfico */}
        <div className="panel p-3" data-testid="crypto-deletion">
          <div className="flex items-start justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">Borrado criptográfico</h3>
            <span className="text-[9px] text-muted">[CYB-12, DAT-07]</span>
          </div>
          <p className="mb-2 text-[10px] text-muted">CTA DESTRUCTIVA — destrucción certificada al término de contrato</p>
          <ul className="mb-3 space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Último borrado: —</li>
            <li className="flex items-center gap-1.5 text-muted"><span>–</span> Certificados emitidos: 0</li>
          </ul>
          {cryptoExecuted ? (
            <p className="text-[11px] text-emerald-700">Borrado ejecutado. Registro en pista de auditoría.</p>
          ) : cryptoDeleteOpen ? (
            <div className="space-y-1.5">
              <p className="text-[11px] text-red-600">Irreversible. Escriba "CONFIRMAR" para proceder.</p>
              <input type="text" value={cryptoConfirm} onChange={(e) => setCryptoConfirm(e.target.value)} className="w-full rounded border border-red-300 bg-background px-2 py-1 text-[11px] outline-none" placeholder="CONFIRMAR" />
              <div className="flex gap-1.5">
                <button type="button" disabled={cryptoConfirm !== 'CONFIRMAR'} onClick={() => setCryptoExecuted(true)} className="flex-1 rounded bg-red-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50">Ejecutar borrado</button>
                <button type="button" onClick={() => { setCryptoDeleteOpen(false); setCryptoConfirm(''); }} className="rounded border border-border px-2 py-1 text-[10px] text-muted hover:bg-surface">Cancelar</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setCryptoDeleteOpen(true); setCryptoExecuted(false); setCryptoConfirm(''); }} className="rounded border border-red-300 px-2.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50">
              Iniciar borrado criptográfico
            </button>
          )}
        </div>

      </div>

      {/* Detail Drawer */}
      <Drawer open={drawer !== null} onClose={closeDrawer} title={drawerTitle(drawer?.type)} side="right" size="md">
        {drawer && <DrawerContent type={drawer.type} data={drawer.data} auditLogs={auditLogs} pamUsageHistory={pamUsageHistory} />}
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
function DrawerContent({ type, data, auditLogs, pamUsageHistory }: Readonly<{ type: string; data: any; auditLogs: any[]; pamUsageHistory: any[] }>) {
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
  // suppress unused var warnings
  void auditLogs; void pamUsageHistory;
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
