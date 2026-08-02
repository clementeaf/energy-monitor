import { TableStateBody } from '../../components/ui/TableStateBody';
import { useQueryState } from '../../hooks/useQueryState';
import type { useIntegrationSyncLogsQuery } from '../../hooks/queries/useIntegrationsQuery';
import type { IntegrationSyncLog } from '../../types/integration';
import { SYNC_STATUS_LABELS } from './integration-utils';

interface SyncLogsPanelProps {
  query: ReturnType<typeof useIntegrationSyncLogsQuery>;
  logsPage: number;
  logsLimit: number;
  logsTotalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Renders paginated sync log rows with loading and error states.
 */
export function SyncLogsPanel({
  query,
  logsPage,
  logsLimit,
  logsTotalPages,
  onPageChange,
}: Readonly<SyncLogsPanelProps>) {
  const displayItems = query.data?.items ?? [];
  const qs = useQueryState(query, {
    isEmpty: () => displayItems.length === 0,
  });

  return (
    <>
      <div className="max-h-96 overflow-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="bg-surface text-left text-xs font-medium text-muted">
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Registros</th>
              <th className="px-3 py-2">Mensaje</th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={5}
            error={qs.error}
            onRetry={() => {
              query.refetch();
            }}
            emptyMessage="No hay sincronizaciones registradas"
            skeletonWidths={['w-24', 'w-24', 'w-16', 'w-16', 'w-28']}
          >
            {displayItems.map((log: IntegrationSyncLog) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-3 py-2 text-foreground">
                  {new Date(log.startedAt).toLocaleString('es-CL')}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-foreground">
                  {log.completedAt ? new Date(log.completedAt).toLocaleString('es-CL') : '—'}
                </td>
                <td className="px-3 py-2">{SYNC_STATUS_LABELS[log.status]}</td>
                <td className="px-3 py-2">{log.recordsSynced}</td>
                <td className="max-w-xs truncate text-muted" title={log.errorMessage ?? undefined}>
                  {log.errorMessage ?? '—'}
                </td>
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>
      {query.data != null && query.data.total > logsLimit && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted">
          <span>
            Pagina {logsPage} de {logsTotalPages} ({query.data.total} registros)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={logsPage <= 1}
              onClick={() => {
                onPageChange(Math.max(1, logsPage - 1));
              }}
              className="rounded border border-border px-3 py-1 hover:bg-surface disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={logsPage >= logsTotalPages}
              onClick={() => {
                onPageChange(Math.min(logsTotalPages, logsPage + 1));
              }}
              className="rounded border border-border px-3 py-1 hover:bg-surface disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}
