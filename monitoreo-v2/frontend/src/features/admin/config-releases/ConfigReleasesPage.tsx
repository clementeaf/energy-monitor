import { PageHeader } from '../../../components/ui/PageHeader';

/* ── Release pipeline data ── */

type ReleaseStatus = 'development' | 'qa' | 'approval' | 'production';

interface Release {
  version: string;
  description: string;
  status: ReleaseStatus;
  date: string;
}

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

// ponytail: static pipeline data — replace with API when CI/CD integration ships
const RELEASES: Release[] = [
  { version: '2.24.0', description: 'Login simplificado, dashboard navigation', status: 'production', date: '2026-06-22' },
  { version: '2.25.0', description: 'Profile-based sidebar, gerencial pages', status: 'development', date: '2026-06-24' },
];

const DEPLOY_HISTORY = [
  { version: '2.24.0', date: '2026-06-22', responsible: 'CI/CD', result: 'éxito' as const },
  { version: '2.23.0', date: '2026-06-20', responsible: 'CI/CD', result: 'éxito' as const },
  { version: '2.22.0', date: '2026-06-18', responsible: 'CI/CD', result: 'éxito' as const },
];

const RESULT_BADGE: Record<string, string> = {
  éxito: 'bg-emerald-100 text-emerald-700',
  rollback: 'bg-red-100 text-red-700',
};

/* ── Page ── */

export function ConfigReleasesPage() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Config y Releases" eyebrow="Plataforma" />

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
            {RELEASES.map((r) => (
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

      {/* Deploy history */}
      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Historial de despliegues</h3>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              <th className="px-3 py-2">Versión</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Responsable</th>
              <th className="px-3 py-2 text-center">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {DEPLOY_HISTORY.map((d) => (
              <tr key={d.version} className="transition-colors hover:bg-surface">
                <td className="px-3 py-2 font-mono font-medium text-foreground">{d.version}</td>
                <td className="px-3 py-2 text-[11px] text-muted">{d.date}</td>
                <td className="px-3 py-2 text-muted">{d.responsible}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${RESULT_BADGE[d.result]}`}>
                    {d.result}
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
