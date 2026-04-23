import { useState } from 'react';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import { useAuditLogsQuery } from '../../../hooks/queries/useAuditLogsQuery';
import type { AuditLogQueryParams } from '../../../types/audit-log';

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
    });
  };

  const goToPage = (page: number) => {
    setFilters({ ...filters, offset: (page - 1) * PAGE_SIZE });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">{config.title}</h1>

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">Accion</label>
          <input
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); }}
            placeholder="POST, DELETE..."
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">User ID</label>
          <input
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); }}
            placeholder="UUID del usuario"
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Filtrar
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <Th>Fecha</Th>
              <Th>Usuario</Th>
              <Th>Accion</Th>
              <Th>Recurso</Th>
              <Th>ID Recurso</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={6}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay registros de auditoria."
            skeletonWidths={['w-28', 'w-32', 'w-20', 'w-24', 'w-20', 'w-24']}
          >
            {(query.data?.data ?? []).map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <Td>{new Date(log.createdAt).toLocaleString('es-CL')}</Td>
                <Td>{log.userEmail ?? log.userId ?? '—'}</Td>
                <Td>
                  <MethodBadge action={log.action} />
                </Td>
                <Td>{log.resourceType ?? '—'}</Td>
                <Td className="max-w-[120px] truncate" title={log.resourceId ?? undefined}>
                  {log.resourceId ? log.resourceId.slice(0, 8) + '...' : '—'}
                </Td>
                <Td>{log.ipAddress ?? '—'}</Td>
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <span className="text-sm text-gray-500">{total} registros</span>
          <div className="flex gap-1">
            <PageBtn disabled={currentPage <= 1} onClick={() => { goToPage(currentPage - 1); }}>Anterior</PageBtn>
            <span className="px-3 py-1 text-sm text-gray-700">
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
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[method] ?? 'bg-gray-100 text-gray-600'}`}>
      {action}
    </span>
  );
}

function Th({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '', title }: Readonly<{ children: React.ReactNode; className?: string; title?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`} title={title}>{children}</td>;
}

function PageBtn({ children, disabled, onClick }: Readonly<{ children: React.ReactNode; disabled: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
