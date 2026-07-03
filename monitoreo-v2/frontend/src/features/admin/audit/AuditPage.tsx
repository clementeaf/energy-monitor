import React, { useState } from 'react';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';
import type { AuditLogQueryParams } from '../../../types/audit-log';
import { PageHeader } from '../../../components/ui/PageHeader';

const PAGE_SIZE = 50;

export type AuditViewMode = 'all' | 'changes' | 'access';

export interface AuditPageProps {
  /** Pre-filter mode: 'changes' for config edits, 'access' for login/logout */
  mode?: AuditViewMode;
}

const MODE_CONFIG: Record<AuditViewMode, { title: string; resourceType?: string; defaultAction?: string }> = {
  all: { title: 'Auditoria' },
  changes: { title: 'Log de Cambios', resourceType: undefined, defaultAction: 'PATCH' },
  access: { title: 'Log de Accesos', defaultAction: 'LOGIN' },
};

export function AuditPage({ mode = 'all' }: AuditPageProps = {}) {
  const config = MODE_CONFIG[mode];
  const [filters, setFilters] = useState<AuditLogQueryParams>({
    limit: PAGE_SIZE,
    offset: 0,
    action: config.defaultAction,
    resourceType: config.resourceType,
  });
  const [actionFilter, setActionFilter] = useState(config.defaultAction ?? '');
  const [userFilter, setUserFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const query = useAuditLogsQuery(filters);
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.data.length === 0,
  });

  const total = query.data?.total ?? 0;
  const currentPage = Math.floor((filters.offset ?? 0) / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const applyFilters = () => {
    setFilters({
      ...filters,
      offset: 0,
      action: actionFilter || undefined,
      userId: userFilter || undefined,
      resourceType: resourceFilter || undefined,
    });
  };

  const exportCsv = () => {
    const logs = query.data?.data ?? [];
    const header = 'Fecha,Usuario,Acción,Recurso,ID Recurso,IP';
    const csv = [header, ...logs.map((l) => `${l.createdAt},${l.userEmail ?? l.userId ?? ''},${l.action},${l.resourceType ?? ''},${l.resourceId ?? ''},${l.ipAddress ?? ''}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const goToPage = (page: number) => {
    setFilters({ ...filters, offset: (page - 1) * PAGE_SIZE });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={config.title} eyebrow="Administración" />

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-muted">Tipo acción</label>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="mt-1 rounded-md border border-border px-3 py-2 text-sm">
            <option value="">Todas</option>
            <option value="GET">Consulta</option>
            <option value="POST">Creación</option>
            <option value="PATCH">Modificación</option>
            <option value="DELETE">Eliminación</option>
            <option value="LOGIN">Login</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted">Recurso</label>
          <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)} className="mt-1 rounded-md border border-border px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option value="meters">Medidores</option>
            <option value="readings">Lecturas</option>
            <option value="alerts">Alarmas</option>
            <option value="users">Usuarios</option>
            <option value="cnr">CNR</option>
            <option value="config">Configuración</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted">User ID</label>
          <input
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); }}
            placeholder="UUID del usuario"
            className="mt-1 rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted">Desde</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 rounded-md border border-border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted">Hasta</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 rounded-md border border-border px-3 py-2 text-sm" />
        </div>
        <button type="button" onClick={applyFilters} className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90">
          Filtrar
        </button>
        <button type="button" onClick={exportCsv} className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface">
          Exportar CSV
        </button>
      </div>

      <div className="max-h-[70vh] overflow-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Fecha</Th>
              <Th>Usuario</Th>
              <Th>Accion</Th>
              <Th>Recurso</Th>
              <Th>ID Recurso</Th>
              <Th>Cambio</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={7}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay registros de auditoria."
            skeletonWidths={['w-28', 'w-32', 'w-20', 'w-24', 'w-20', 'w-20', 'w-24']}
          >
            {(query.data?.data ?? []).map((log) => (
              <tr key={log.id} className="hover:bg-surface">
                <Td>{new Date(log.createdAt).toLocaleString('es-CL')}</Td>
                <Td>{log.userEmail ?? log.userId ?? '—'}</Td>
                <Td>
                  <MethodBadge action={log.action} />
                </Td>
                <Td>{log.resourceType ?? '—'}</Td>
                <Td className="max-w-[120px] truncate" title={log.resourceId ?? undefined}>
                  {log.resourceId ? log.resourceId.slice(0, 8) + '...' : '—'}
                </Td>
                <Td className="max-w-[150px] truncate text-[11px]">
                  {(log as Record<string, unknown>).changes ? String((log as Record<string, unknown>).changes) : '—'}
                </Td>
                <Td>{log.ipAddress ?? '—'}</Td>
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>

      {/* Activity summary: heatmap + top 10 */}
      {(() => {
        const logs = query.data?.data ?? [];
        // Heatmap: actions per day of week × hour
        const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        logs.forEach((l) => {
          const d = new Date(l.createdAt);
          const day = (d.getDay() + 6) % 7; // Mon=0
          const hour = d.getHours();
          heatmap[day][hour]++;
        });
        const maxHeat = Math.max(1, ...heatmap.flat());

        // Top 10 users
        const userCounts = new Map<string, number>();
        logs.forEach((l) => {
          const user = l.userEmail ?? l.userId ?? 'unknown';
          userCounts.set(user, (userCounts.get(user) ?? 0) + 1);
        });
        const top10 = Array.from(userCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel p-4">
              <h3 className="mb-3 text-[13px] font-medium text-foreground">Actividad por día y hora</h3>
              <div className="overflow-x-auto">
                <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `auto repeat(24, 1fr)` }}>
                  <div />
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="text-center text-[8px] text-subtle">{h}</div>
                  ))}
                  {DAYS.map((day, di) => (
                    <React.Fragment key={day}>
                      <div className="pr-1 text-right text-[9px] text-muted">{day}</div>
                      {heatmap[di].map((count, hi) => {
                        const intensity = count / maxHeat;
                        const bg = count === 0 ? '#f3f4f6' : `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`;
                        return <div key={hi} className="h-3 w-3 rounded-sm" style={{ backgroundColor: bg }} title={`${day} ${hi}:00 — ${count} acciones`} />;
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <div className="panel p-4">
              <h3 className="mb-3 text-[13px] font-medium text-foreground">Top 10 usuarios por actividad</h3>
              {top10.length > 0 ? (
                <ul className="space-y-1.5">
                  {top10.map(([user, count], i) => (
                    <li key={user} className="flex items-center justify-between text-[12px]">
                      <span className="text-foreground"><span className="mr-2 text-muted">{i + 1}.</span>{user}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-muted">Sin datos de actividad.</p>
              )}
            </div>
          </div>
        );
      })()}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <span className="text-sm text-muted">{total} registros</span>
          <div className="flex gap-1">
            <PageBtn disabled={currentPage <= 1} onClick={() => { goToPage(currentPage - 1); }}>Anterior</PageBtn>
            <span className="px-3 py-1 text-sm text-foreground">
              {currentPage} / {totalPages}
            </span>
            <PageBtn disabled={currentPage >= totalPages} onClick={() => { goToPage(currentPage + 1); }}>Siguiente</PageBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function MethodBadge({ action }: Readonly<{ action: string }>) {
  const method = action.split(' ')[0] ?? action;
  const colors: Record<string, string> = {
    POST: 'bg-green-50 text-green-700',
    PATCH: 'bg-yellow-50 text-yellow-700',
    PUT: 'bg-yellow-50 text-yellow-700',
    DELETE: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[method] ?? 'bg-raised text-muted'}`}>
      {action}
    </span>
  );
}

function Th({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '', title }: Readonly<{ children: React.ReactNode; className?: string; title?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`} title={title}>{children}</td>;
}

function PageBtn({ children, disabled, onClick }: Readonly<{ children: React.ReactNode; disabled: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-border px-3 py-1 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-40"
    >
      {children}
    </button>
  );
}
