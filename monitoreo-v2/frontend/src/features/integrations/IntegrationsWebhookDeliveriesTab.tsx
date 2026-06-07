import { useState } from 'react';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { Th, Td } from '../../components/ui/TablePrimitives';
import { useQueryState } from '../../hooks/useQueryState';
import { usePermissions } from '../../hooks/usePermissions';
import { useWebhookDeliveryLogsQuery } from '../../hooks/queries/useWebhookDeliveryLogsQuery';
import type { WebhookDeliveryStatus } from '../../types/webhook-delivery-log';

/**
 * Paginated webhook delivery attempt logs.
 */
export function IntegrationsWebhookDeliveriesTab() {
  const { has } = usePermissions();
  const canRead = has('webhooks', 'read');
  const [statusFilter, setStatusFilter] = useState<WebhookDeliveryStatus | ''>('');

  const query = useWebhookDeliveryLogsQuery(
    { status: statusFilter || undefined, limit: 50 },
    { enabled: canRead },
  );
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined || d.data.length === 0 });

  if (!canRead) {
    return <div className="py-12 text-center text-muted">No tiene permisos para ver entregas de webhooks.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <DropdownSelect
          options={[
            { value: '', label: 'Todos los estados' },
            { value: 'sent', label: 'Enviado' },
            { value: 'failed', label: 'Fallido' },
          ]}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v as WebhookDeliveryStatus | ''); }}
          className="w-44"
        />
        <span className="text-sm text-muted">{query.data?.total ?? 0} entregas</span>
      </div>

      <div className="overflow-x-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Evento</Th>
              <Th>URL</Th>
              <Th>Estado</Th>
              <Th>HTTP</Th>
              <Th>Intentos</Th>
              <Th>Fecha</Th>
            </tr>
          </thead>
          <TableStateBody phase={qs.phase} colSpan={6} emptyMessage="No hay logs de entrega.">
            {(query.data?.data ?? []).map((log) => (
              <tr key={log.id} className="hover:bg-surface">
                <Td>{log.eventType}</Td>
                <Td className="max-w-[200px] truncate text-xs" title={log.url}>{log.url}</Td>
                <Td className={log.status === 'failed' ? 'text-danger' : 'text-success'}>{log.status === 'sent' ? 'OK' : 'Fallo'}</Td>
                <Td>{log.httpStatus ?? '—'}</Td>
                <Td>{log.attemptCount}</Td>
                <Td>{new Date(log.createdAt).toLocaleString('es-CL')}</Td>
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>
    </div>
  );
}
