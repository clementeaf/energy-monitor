import { useState } from 'react';
import { DataWidget } from '../../components/ui/DataWidget';
import { useQueryState } from '../../hooks/useQueryState';
import { useAlertsQuery, useAcknowledgeAlert, useResolveAlert } from '../../hooks/queries/useAlertsQuery';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import type { AlertStatus, AlertSeverity, AlertQueryParams } from '../../types/alert';

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

const STATUS_COLORS: Record<AlertStatus, string> = {
  active: 'bg-red-100 text-red-700',
  acknowledged: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  active: 'Activa',
  acknowledged: 'Reconocida',
  resolved: 'Resuelta',
};

export function AlertsPage() {
  const [filters, setFilters] = useState<AlertQueryParams>({});

  const buildingsQuery = useBuildingsQuery();
  const alertsQuery = useAlertsQuery(filters);
  const qs = useQueryState(alertsQuery, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });

  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();

  const updateFilter = (key: keyof AlertQueryParams, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) {
        (next as Record<string, string>)[key] = value;
      } else {
        delete (next as Record<string, string | undefined>)[key];
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Alertas</h1>

      <div className="flex flex-wrap gap-2">
        <select
          value={filters.status ?? ''}
          onChange={(e) => { updateFilter('status', e.target.value); }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="acknowledged">Reconocida</option>
          <option value="resolved">Resuelta</option>
        </select>

        <select
          value={filters.severity ?? ''}
          onChange={(e) => { updateFilter('severity', e.target.value); }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todas las severidades</option>
          <option value="critical">Critica</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>

        <select
          value={filters.buildingId ?? ''}
          onChange={(e) => { updateFilter('buildingId', e.target.value); }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los edificios</option>
          {(buildingsQuery.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { alertsQuery.refetch(); }}
        isFetching={alertsQuery.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin alertas"
        emptyDescription="No hay alertas que coincidan con los filtros seleccionados."
      >
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Severidad</Th>
                <Th>Tipo</Th>
                <Th>Mensaje</Th>
                <Th>Estado</Th>
                <Th>Fecha</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(alertsQuery.data ?? []).map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <Td>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[a.severity]}`}>
                      {a.severity}
                    </span>
                  </Td>
                  <Td>{a.alertTypeCode}</Td>
                  <Td className="max-w-xs truncate">{a.message}</Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </Td>
                  <Td>{new Date(a.createdAt).toLocaleString('es-CL')}</Td>
                  <Td>
                    <div className="flex gap-1">
                      {a.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => { acknowledgeMutation.mutate(a.id); }}
                          disabled={acknowledgeMutation.isPending}
                          className="rounded px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50"
                        >
                          Reconocer
                        </button>
                      )}
                      {a.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => { resolveMutation.mutate({ id: a.id }); }}
                          disabled={resolveMutation.isPending}
                          className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}
