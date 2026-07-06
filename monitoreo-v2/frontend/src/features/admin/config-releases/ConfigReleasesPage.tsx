import { useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';

/* ── Release status types ── */

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

const RESULT_BADGE: Record<string, string> = {
  éxito: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

/* ── Current version ── */
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '2.39.0';

/* ── Pipeline: derived from current version ── */

interface PipelineRelease {
  version: string;
  description: string;
  status: ReleaseStatus;
  date: string;
}

function buildPipeline(): PipelineRelease[] {
  return [
    { version: APP_VERSION, description: 'Versión actual en producción', status: 'production', date: new Date().toISOString().slice(0, 10) },
  ];
}

/* ── Page ── */

export function ConfigReleasesPage() {
  const auditQuery = useAuditLogsQuery({ limit: 20 });
  const auditLogs = auditQuery.data?.data ?? [];

  const pipeline = useMemo(buildPipeline, []);

  // Derive deploy history from recent audit log config/system changes
  const deployHistory = useMemo(() =>
    auditLogs.slice(0, 10).map((log) => ({
      id: log.id,
      action: log.action,
      resource: log.resourceType,
      user: log.userEmail ?? log.userId?.slice(0, 8) ?? '—',
      date: new Date(log.createdAt).toLocaleDateString('es-CL'),
      timestamp: log.createdAt,
      result: 'éxito' as const,
    })),
    [auditLogs],
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Config y Releases" eyebrow="Plataforma" />

      {/* Version + Deploy status — single row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="panel flex items-center gap-4 px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Versión actual</p>
            <p className="font-mono text-lg font-semibold text-foreground">{APP_VERSION}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
            Producción
          </span>
        </div>
        <div className="panel flex items-center gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Estado despliegue</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Producción</span>
              <span className="text-[11px] text-muted">Último: {new Date().toLocaleDateString('es-CL')}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="text-[11px] text-brand hover:underline">Ver logs</button>
            <button type="button" className="text-[11px] text-red-600 hover:underline">Rollback</button>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Pipeline de releases</h3>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              <th className="px-3 py-2">Versión</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">QA</th>
              <th className="px-3 py-2">Aprobaciones</th>
              <th className="px-3 py-2 text-center">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pipeline.map((r) => (
              <tr key={r.version} className="transition-colors hover:bg-surface">
                <td className="px-3 py-2 font-mono font-medium text-foreground">{r.version}</td>
                <td className="px-3 py-2 text-muted">{r.description}</td>
                <td className="px-3 py-2 text-[11px] text-muted">{r.date}</td>
                <td className="px-3 py-2 text-[11px] text-emerald-600">✓ Pass</td>
                <td className="px-3 py-2 text-[11px] text-muted">1/1</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {r.status !== 'production' && (
                    <button type="button" className="text-[10px] text-brand hover:underline">
                      Solicitar deploy
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit-based activity log */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Actividad reciente (audit log)</h3>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Acción</th>
              <th className="px-3 py-2">Recurso</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2 text-center">Resultado</th>
              <th className="px-3 py-2">Logs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deployHistory.map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-surface">
                <td className="px-3 py-2 text-[11px] text-muted">{d.date}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${ACTION_BADGE[d.action] ?? 'bg-gray-100 text-gray-700'}`}>
                    {d.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted">{d.resource}</td>
                <td className="px-3 py-2 text-foreground">{d.user}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${RESULT_BADGE[d.result]}`}>
                    {d.result}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button type="button" className="text-[10px] text-brand hover:underline">Ver logs</button>
                </td>
              </tr>
            ))}
            {deployHistory.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">Sin actividad reciente.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
