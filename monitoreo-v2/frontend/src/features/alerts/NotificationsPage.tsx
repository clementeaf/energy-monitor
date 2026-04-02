import { useState } from 'react';
import { DataWidget } from '../../components/ui/DataWidget';
import { useQueryState } from '../../hooks/useQueryState';
import { useNotificationLogsQuery } from '../../hooks/queries/useNotificationLogsQuery';
import type { NotificationLogQueryParams } from '../../types/notification-log';

const PAGE_SIZE = 50;

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-100 text-blue-800',
  webhook: 'bg-purple-100 text-purple-800',
  push: 'bg-green-100 text-green-800',
  whatsapp: 'bg-emerald-100 text-emerald-800',
  sms: 'bg-yellow-100 text-yellow-800',
};

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-800',
};

export function NotificationsPage() {
  const [filters, setFilters] = useState<NotificationLogQueryParams>({ limit: PAGE_SIZE, offset: 0 });
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const query = useNotificationLogsQuery(filters);
  const qs = useQueryState(query, {
    isEmpty: (data) => !data || data.data.length === 0,
  });

  const total = query.data?.total ?? 0;
  const currentPage = Math.floor((filters.offset ?? 0) / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const applyFilters = () => {
    setFilters({
      ...filters,
      offset: 0,
      channel: channelFilter || undefined,
      status: statusFilter || undefined,
    });
  };

  const goToPage = (page: number) => {
    setFilters({ ...filters, offset: (page - 1) * PAGE_SIZE });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Historial de Notificaciones</h1>

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">Canal</label>
          <select
            value={channelFilter}
            onChange={(e) => { setChannelFilter(e.target.value); }}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="email">Email</option>
            <option value="webhook">Webhook</option>
            <option value="push">Push</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="sent">Enviado</option>
            <option value="failed">Fallido</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-md bg-pa-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Filtrar
        </button>
      </div>

      <DataWidget phase={qs.phase} error={qs.error} refetch={qs.refetch}>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Canal</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Asunto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Destinatario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(query.data?.data ?? []).map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_COLORS[log.channel] ?? ''}`}>
                      {log.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[log.status] ?? ''}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate" title={log.subject}>{log.subject}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.recipient ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-red-600 max-w-xs truncate" title={log.errorMessage ?? ''}>
                    {log.errorMessage ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{total} registros</span>
          <div className="flex gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => { goToPage(currentPage - 1); }} className="rounded border px-3 py-1 disabled:opacity-50">Anterior</button>
            <span className="px-2 py-1">Pag {currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage === totalPages} onClick={() => { goToPage(currentPage + 1); }} className="rounded border px-3 py-1 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
