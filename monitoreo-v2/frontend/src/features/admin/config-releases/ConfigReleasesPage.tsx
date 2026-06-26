import { useState, useMemo } from 'react';
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

/* ── Current version from package.json (injected at build) ── */
// ponytail: __APP_VERSION__ could be defined in vite.config; fallback to hardcoded
const APP_VERSION = '2.29.0';

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

/* ── Diff viewer types ── */

type DiffLineType = 'added' | 'removed' | 'context';
type DiffViewMode = 'unified' | 'side-by-side';

interface DiffLine {
  type: DiffLineType;
  content: string;
  lineOld?: number;
  lineNew?: number;
}

interface ConfigDiff {
  file: string;
  lines: DiffLine[];
}

const DIFF_LINE_STYLE: Record<DiffLineType, string> = {
  added: 'bg-emerald-50 text-emerald-800',
  removed: 'bg-red-50 text-red-800',
  context: 'text-muted',
};

const DIFF_LINE_PREFIX: Record<DiffLineType, string> = {
  added: '+',
  removed: '-',
  context: ' ',
};

/**
 * Derive config diffs from audit log UPDATE entries.
 * ponytail: real IaC diff would come from a git-based API; here we derive
 * structured diffs from audit log changes to show the UI pattern.
 */
function deriveConfigDiffs(auditLogs: Array<{ action: string; resourceType: string; resourceId?: string; changes?: Record<string, unknown>; createdAt: string }>): ConfigDiff[] {
  const updateLogs = auditLogs.filter((l) => l.action === 'UPDATE');
  if (updateLogs.length === 0) return [];

  return updateLogs.map((log) => {
    const file = `config/${log.resourceType}${log.resourceId ? `/${log.resourceId.slice(0, 8)}` : ''}.json`;
    const changes = log.changes ?? {};
    const lines: DiffLine[] = [
      { type: 'context', content: `// ${log.resourceType} configuration`, lineOld: 1, lineNew: 1 },
      { type: 'context', content: '{', lineOld: 2, lineNew: 2 },
    ];

    let lineNum = 3;
    Object.entries(changes).forEach(([key, value]) => {
      const oldVal = typeof value === 'object' && value !== null && 'old' in value ? (value as { old: unknown }).old : undefined;
      const newVal = typeof value === 'object' && value !== null && 'new' in value ? (value as { new: unknown }).new : value;

      if (oldVal !== undefined) {
        lines.push({ type: 'removed', content: `  "${key}": ${JSON.stringify(oldVal)},`, lineOld: lineNum });
        lines.push({ type: 'added', content: `  "${key}": ${JSON.stringify(newVal)},`, lineNew: lineNum });
      } else {
        lines.push({ type: 'added', content: `  "${key}": ${JSON.stringify(newVal)},`, lineNew: lineNum });
      }
      lineNum++;
    });

    // If no structured changes, show a generic change line
    if (Object.keys(changes).length === 0) {
      lines.push({ type: 'removed', content: `  // ${log.resourceType} — valor anterior`, lineOld: 3 });
      lines.push({ type: 'added', content: `  // ${log.resourceType} — valor actualizado`, lineNew: 3 });
    }

    lines.push({ type: 'context', content: '}', lineOld: lineNum, lineNew: lineNum });
    return { file, lines };
  });
}

/* ── Page ── */

export function ConfigReleasesPage() {
  const auditQuery = useAuditLogsQuery({ limit: 20 });
  const auditLogs = auditQuery.data?.data ?? [];

  const pipeline = useMemo(buildPipeline, []);

  // Diff viewer state
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>('unified');
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);

  // Derive config diffs from audit logs
  const configDiffs = useMemo(() => deriveConfigDiffs(auditLogs as Array<{ action: string; resourceType: string; resourceId?: string; changes?: Record<string, unknown>; createdAt: string }>), [auditLogs]);

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

      {/* Current version */}
      <div className="panel flex items-center gap-4 px-4 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Versión actual</p>
          <p className="font-mono text-lg font-semibold text-foreground">{APP_VERSION}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
          Producción
        </span>
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
              <th className="px-3 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pipeline.map((r) => (
              <tr key={r.version} className="transition-colors hover:bg-surface">
                <td className="px-3 py-2 font-mono font-medium text-foreground">{r.version}</td>
                <td className="px-3 py-2 text-muted">{r.description}</td>
                <td className="px-3 py-2 text-[11px] text-muted">{r.date}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Configuración como código — Diff viewer */}
      <div className="panel p-4" data-testid="diff-viewer-section">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-medium text-foreground">Configuración como código</h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDiffViewMode('unified')}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                diffViewMode === 'unified' ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface'
              }`}
            >
              Unificado
            </button>
            <button
              type="button"
              onClick={() => setDiffViewMode('side-by-side')}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                diffViewMode === 'side-by-side' ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface'
              }`}
            >
              Lado a lado
            </button>
          </div>
        </div>

        {configDiffs.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted">Sin cambios de configuración detectados.</p>
        ) : (
          <div className="space-y-3">
            {configDiffs.map((diff) => {
              const isExpanded = expandedDiff === diff.file;
              const addedCount = diff.lines.filter((l) => l.type === 'added').length;
              const removedCount = diff.lines.filter((l) => l.type === 'removed').length;

              return (
                <div key={diff.file} className="overflow-hidden rounded-lg border border-border">
                  {/* File header */}
                  <button
                    type="button"
                    onClick={() => setExpandedDiff(isExpanded ? null : diff.file)}
                    className="flex w-full items-center gap-2 bg-surface px-3 py-2 text-left text-[12px] transition-colors hover:bg-surface/80"
                  >
                    <span className="font-mono font-medium text-foreground">{diff.file}</span>
                    <span className="ml-auto flex items-center gap-2 text-[10px]">
                      {addedCount > 0 && <span className="font-medium text-emerald-600">+{addedCount}</span>}
                      {removedCount > 0 && <span className="font-medium text-red-600">-{removedCount}</span>}
                      <span className="text-muted">{isExpanded ? '▼' : '▶'}</span>
                    </span>
                  </button>

                  {/* Diff body */}
                  {isExpanded && (
                    <div className="overflow-auto" data-testid="diff-content">
                      {diffViewMode === 'unified' ? (
                        <UnifiedDiffView lines={diff.lines} />
                      ) : (
                        <SideBySideDiffView lines={diff.lines} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
              </tr>
            ))}
            {deployHistory.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">Sin actividad reciente.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Unified Diff View ── */

function UnifiedDiffView({ lines }: Readonly<{ lines: DiffLine[] }>) {
  return (
    <pre className="text-[11px] leading-5">
      {lines.map((line, i) => (
        <div key={i} className={`px-3 ${DIFF_LINE_STYLE[line.type]}`}>
          <span className="mr-2 inline-block w-4 select-none text-right text-[10px] opacity-50">
            {line.lineOld ?? ''}
          </span>
          <span className="mr-2 inline-block w-4 select-none text-right text-[10px] opacity-50">
            {line.lineNew ?? ''}
          </span>
          <span className="mr-1 select-none opacity-60">{DIFF_LINE_PREFIX[line.type]}</span>
          {line.content}
        </div>
      ))}
    </pre>
  );
}

/* ── Side-by-Side Diff View ── */

function SideBySideDiffView({ lines }: Readonly<{ lines: DiffLine[] }>) {
  // Split lines into left (old) and right (new) columns
  const leftLines = lines.filter((l) => l.type === 'removed' || l.type === 'context');
  const rightLines = lines.filter((l) => l.type === 'added' || l.type === 'context');
  const maxLen = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="grid grid-cols-2 divide-x divide-border text-[11px] leading-5">
      {/* Old */}
      <pre>
        {Array.from({ length: maxLen }).map((_, i) => {
          const line = leftLines[i];
          if (!line) return <div key={i} className="px-3">&nbsp;</div>;
          return (
            <div key={i} className={`px-3 ${DIFF_LINE_STYLE[line.type]}`}>
              <span className="mr-2 inline-block w-4 select-none text-right text-[10px] opacity-50">
                {line.lineOld ?? ''}
              </span>
              <span className="mr-1 select-none opacity-60">{DIFF_LINE_PREFIX[line.type]}</span>
              {line.content}
            </div>
          );
        })}
      </pre>
      {/* New */}
      <pre>
        {Array.from({ length: maxLen }).map((_, i) => {
          const line = rightLines[i];
          if (!line) return <div key={i} className="px-3">&nbsp;</div>;
          return (
            <div key={i} className={`px-3 ${DIFF_LINE_STYLE[line.type]}`}>
              <span className="mr-2 inline-block w-4 select-none text-right text-[10px] opacity-50">
                {line.lineNew ?? ''}
              </span>
              <span className="mr-1 select-none opacity-60">{DIFF_LINE_PREFIX[line.type]}</span>
              {line.content}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
