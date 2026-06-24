import { PageHeader } from '../../../components/ui/PageHeader';

/* ── Security summary data ── */

type VulnSeverity = 'critical' | 'high' | 'medium' | 'low';

interface VulnCount { severity: VulnSeverity; count: number }

const VULN_BADGE: Record<VulnSeverity, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};

// ponytail: static data — replace with security scanner API when available
const VULNS: VulnCount[] = [
  { severity: 'critical', count: 0 },
  { severity: 'high', count: 0 },
  { severity: 'medium', count: 2 },
  { severity: 'low', count: 5 },
];

interface TlsCert { service: string; daysRemaining: number }

const TLS_CERTS: TlsCert[] = [
  { service: 'API Gateway', daysRemaining: 245 },
  { service: 'CloudFront CDN', daysRemaining: 312 },
  { service: 'RDS PostgreSQL', daysRemaining: 180 },
];

const DAYS_COLOR: [number, string][] = [
  [30, 'text-red-600 font-medium'],
  [90, 'text-amber-600'],
];

function daysClass(days: number): string {
  return DAYS_COLOR.find(([threshold]) => days <= threshold)?.[1] ?? 'text-foreground';
}

type PamStatus = 'activo' | 'suspendido' | 'en revisión';

interface PamAccount { user: string; role: string; lastReview: string; nextReview: string; status: PamStatus }

const PAM_BADGE: Record<PamStatus, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  suspendido: 'bg-red-100 text-red-700',
  'en revisión': 'bg-amber-100 text-amber-700',
};

const PAM_ACCOUNTS: PamAccount[] = [
  { user: 'admin@globepower.cl', role: 'super_admin', lastReview: '2026-06-01', nextReview: '2026-09-01', status: 'activo' },
  { user: 'devops@globepower.cl', role: 'super_admin', lastReview: '2026-05-15', nextReview: '2026-08-15', status: 'activo' },
];

/* ── Page ── */

export function SeguridadPamPage() {
  const totalVulns = VULNS.reduce((sum, v) => sum + v.count, 0);

  const securityKpis = [
    { title: 'Vulnerabilidades', value: String(totalVulns), color: totalVulns > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { title: 'Parches pendientes', value: '0', color: 'text-emerald-600' },
    { title: 'Componentes actualizados', value: '100%', color: 'text-emerald-600' },
    { title: 'Cuentas PAM', value: String(PAM_ACCOUNTS.length), color: 'text-foreground' },
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
        {/* Vulnerabilities */}
        <div className="panel p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">Vulnerabilidades por severidad</h3>
          <div className="space-y-2">
            {VULNS.map((v) => (
              <div key={v.severity} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${VULN_BADGE[v.severity]}`}>
                  {v.severity.toUpperCase()}
                </span>
                <span className="text-[13px] font-semibold text-foreground">{v.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TLS Certificates */}
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
              {TLS_CERTS.map((cert) => (
                <tr key={cert.service}>
                  <td className="py-2 text-foreground">{cert.service}</td>
                  <td className={`py-2 text-right ${daysClass(cert.daysRemaining)}`}>{cert.daysRemaining}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAM Accounts */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Cuentas privilegiadas (PAM)</h3>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Última revisión</th>
              <th className="px-3 py-2">Próxima revisión</th>
              <th className="px-3 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PAM_ACCOUNTS.map((acc) => (
              <tr key={acc.user} className="transition-colors hover:bg-surface">
                <td className="px-3 py-2 font-medium text-foreground">{acc.user}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted">{acc.role}</td>
                <td className="px-3 py-2 text-[11px] text-muted">{acc.lastReview}</td>
                <td className="px-3 py-2 text-[11px] text-muted">{acc.nextReview}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${PAM_BADGE[acc.status]}`}>
                    {acc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
