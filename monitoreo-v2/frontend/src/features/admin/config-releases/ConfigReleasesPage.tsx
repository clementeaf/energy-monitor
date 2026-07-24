import { useMemo, useState } from 'react';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';

/* ── Types ── */

type ReleaseStatus = 'development' | 'qa' | 'approval' | 'production';

const STATUS_BADGE: Record<ReleaseStatus, string> = {
  development: 'bg-blue-100 text-blue-700',
  qa: 'bg-amber-100 text-amber-700',
  approval: 'bg-purple-100 text-purple-700',
  production: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  development: 'En desarrollo',
  qa: 'QA',
  approval: 'Aprobación',
  production: 'Producción',
};

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '2.44.0';

interface PipelineRelease {
  version: string;
  description: string;
  status: ReleaseStatus;
  testsQa: string;
  approvals: string;
  diff?: string[];
}

const PIPELINE: PipelineRelease[] = [
  {
    version: '2.45.0',
    description: 'Timescale Cloud migration + CAGG support',
    status: 'development',
    testsQa: '—',
    approvals: '0/2',
    diff: [
      '+ TimescaleDB Cloud endpoint configured',
      '+ Continuous aggregates enabled',
      '- Legacy SQL views removed',
    ],
  },
  {
    version: '2.44.1',
    description: 'Security patch: WAF rules update + Redis TTL fix',
    status: 'qa',
    testsQa: '113/113 ✓',
    approvals: '1/2',
    diff: [
      '+ WAF rate limit 2000→1500 req/5min',
      '+ Redis TTL extended for user-level blacklist',
    ],
  },
  {
    version: '2.44.0',
    description: 'UX pass + mapa indoor enriquecido + security hardening',
    status: 'approval',
    testsQa: '118/118 ✓',
    approvals: '1/1',
    diff: [
      '+ Redis ElastiCache Serverless provisionado',
      '+ AWS WAF energy-monitor-waf asociado a CloudFront',
      '+ JwtBlacklistService Redis-backed',
      '- max-h-[70vh] eliminados de 28 páginas',
    ],
  },
  {
    version: APP_VERSION,
    description: 'Versión actual en producción',
    status: 'production',
    testsQa: '118/118 ✓',
    approvals: '1/1',
  },
];

const DEPLOY_HISTORY_STATIC = [
  { version: APP_VERSION, date: '2026-07-13', responsible: 'c.falcone@hoktus.ai', result: 'éxito' },
  { version: '2.43.0', date: '2026-07-07', responsible: 'c.falcone@hoktus.ai', result: 'éxito' },
  { version: '2.42.0', date: '2026-07-06', responsible: 'c.falcone@hoktus.ai', result: 'éxito' },
  { version: '2.41.0', date: '2026-07-06', responsible: 'c.falcone@hoktus.ai', result: 'éxito' },
  { version: '2.40.0', date: '2026-07-06', responsible: 'c.falcone@hoktus.ai', result: 'éxito' },
  { version: '2.39.0', date: '2026-07-04', responsible: 'c.falcone@hoktus.ai', result: 'éxito' },
  { version: '2.38.0', date: '2026-07-03', responsible: 'c.falcone@hoktus.ai', result: 'éxito' },
  { version: '2.37.0', date: '2026-06-30', responsible: 'c.falcone@hoktus.ai', result: 'rollback' },
];

const IAC_DIFF = [
  { type: 'add', line: '+ resource "aws_rds_replica" { multi_az = true }' },
  { type: 'remove', line: '- instance_class = "db.r5.large"' },
  { type: 'add', line: '+ instance_class = "db.r5.xlarge"' },
  { type: 'neutral', line: '  availability_zones = ["us-east-1a", "us-east-1b"]' },
  { type: 'add', line: '+ backup_retention_period = 14' },
  { type: 'neutral', line: '  engine = "postgres"' },
  { type: 'neutral', line: '  engine_version = "16.2"' },
  { type: 'remove', line: '- storage_encrypted = false' },
  { type: 'add', line: '+ storage_encrypted = true' },
];

/* ── Page ── */

export function ConfigReleasesPage() {
  const auditQuery = useAuditLogsQuery({ limit: 20 });
  const auditLogs = auditQuery.data?.data ?? [];

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const deployHistory = useMemo(() => {
    if (auditLogs.length > 0) {
      return auditLogs.slice(0, 8).map((log, i) => ({
        version: DEPLOY_HISTORY_STATIC[i]?.version ?? APP_VERSION,
        date: new Date(log.createdAt).toLocaleDateString('es-CL'),
        responsible: log.userEmail ?? log.userId?.slice(0, 8) ?? '—',
        result: 'éxito',
      }));
    }
    return DEPLOY_HISTORY_STATIC;
  }, [auditLogs]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">7.5 Config y Releases</h1>
        <p className="text-[12px] text-muted">Pipeline de releases, control de despliegue e infraestructura como código</p>
      </div>

      {/* Row 1: Pipeline + Right column */}
      <div className="flex gap-4">
        {/* Left: Pipeline */}
        <div className="panel min-w-0 flex-1 p-4">
          <h3 className="text-[13px] font-semibold text-foreground">Pipeline de releases</h3>
          <p className="mb-3 text-[11px] text-muted">estado: En desarrollo → QA → Aprobación → Producción · fila expandible con diff y resultados de tests</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="sticky top-0 bg-white px-3 py-2">Versión</th>
                <th className="sticky top-0 bg-white px-3 py-2">Descripción de cambios</th>
                <th className="sticky top-0 bg-white px-3 py-2">Estado</th>
                <th className="sticky top-0 bg-white px-3 py-2">Tests QA</th>
                <th className="sticky top-0 bg-white px-3 py-2">Aprobaciones</th>
                <th className="sticky top-0 bg-white px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PIPELINE.map((r, i) => (
                <>
                  <tr
                    key={r.version}
                    className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setExpandedRow(expandedRow === r.version ? null : r.version)}
                  >
                    <td className="px-3 py-2 font-mono font-medium text-foreground">{r.version}</td>
                    <td className="px-3 py-2 text-[12px] text-muted">{r.description}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-[11px] ${r.testsQa.includes('✓') ? 'text-emerald-600' : 'text-muted'}`}>{r.testsQa}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{r.approvals}</td>
                    <td className="px-3 py-2 text-[10px] text-brand">
                      {r.diff ? (expandedRow === r.version ? '▲ cerrar' : '▼ diff') : ''}
                    </td>
                  </tr>
                  {expandedRow === r.version && r.diff && (
                    <tr key={`${r.version}-diff`}>
                      <td colSpan={6} className="bg-surface px-3 py-2">
                        <pre className="overflow-x-auto rounded border border-border bg-[#0d1117] p-3 text-[11px] leading-5">
                          {r.diff.map((line, li) => (
                            <div
                              key={li}
                              className={line.startsWith('+') ? 'text-emerald-400' : line.startsWith('-') ? 'text-red-400' : 'text-gray-400'}
                            >
                              {line}
                            </div>
                          ))}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: stacked */}
        <div className="min-w-0 flex-1 flex flex-col gap-4">
          {/* Control de despliegue */}
          <div className="panel p-4">
            <h3 className="text-[13px] font-semibold text-foreground">Control de despliegue</h3>
            <p className="mb-3 text-[11px] text-muted">GATE: requiere aprobación de al menos un rol PASA configurado</p>
            <ul className="mb-4 space-y-1.5 text-[12px] text-muted">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-brand">•</span>Etapas: build → deploy QA → aprobación → prod</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-brand">•</span>Logs de despliegue en tiempo real</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-brand">•</span>Rollback disponible a la versión anterior</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-brand">•</span>Ambientes QA/sandbox y Producción independientes</li>
            </ul>
            <div className="flex gap-2">
              <button type="button" className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand/90">
                Solicitar despliegue a producción
              </button>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted hover:bg-surface">
                Rollback
              </button>
            </div>
          </div>

          {/* Historial de despliegues */}
          <div className="panel p-4">
            <h3 className="text-[13px] font-semibold text-foreground">Historial de despliegues</h3>
            <p className="mb-3 text-[11px] text-muted">éxito / rollback · link a logs</p>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <th className="sticky top-0 bg-white px-3 py-2">Versión</th>
                  <th className="sticky top-0 bg-white px-3 py-2">Fecha</th>
                  <th className="sticky top-0 bg-white px-3 py-2">Responsable</th>
                  <th className="sticky top-0 bg-white px-3 py-2">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deployHistory.map((d, i) => (
                  <tr key={`${d.version}-${i}`} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-3 py-2 font-mono text-[12px] font-medium text-foreground">{d.version}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{d.date}</td>
                    <td className="px-3 py-2 text-[11px] text-muted">{d.responsible}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${d.result === 'éxito' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {d.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 2: IaC diff viewer */}
      <div className="panel p-4">
        <h3 className="text-[13px] font-semibold text-foreground">Configuración como código — diff viewer (IaC)</h3>
        <p className="mb-3 text-[11px] text-muted">cambios versionados en git · link al commit correspondiente</p>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[11px] text-muted font-mono">commit <span className="text-brand">a3f9c12</span></span>
          <span className="text-[11px] text-muted">·</span>
          <span className="text-[11px] text-muted">c.falcone@hoktus.ai</span>
          <span className="text-[11px] text-muted">·</span>
          <span className="text-[11px] text-muted">2026-07-13 09:41 CLT</span>
          <span className="text-[11px] text-muted">·</span>
          <span className="text-[11px] font-medium text-foreground">infra/rds-replica.tf</span>
          <button type="button" className="ml-auto text-[11px] text-brand hover:underline">Ver en git →</button>
        </div>
        <div className="flex gap-2 mb-2">
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">+5 adiciones</span>
          <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">-2 eliminaciones</span>
        </div>
        <pre className="overflow-x-auto rounded border border-border bg-[#0d1117] p-4 text-[11px] leading-6">
          {IAC_DIFF.map((line, i) => (
            <div
              key={i}
              className={line.type === 'add' ? 'text-emerald-400' : line.type === 'remove' ? 'text-red-400' : 'text-gray-400'}
            >
              {line.line}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
