import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const highlightRef = useRef<HTMLTableRowElement>(null);
  const [filters, setFilters] = useState<AlertQueryParams>({});

  // Scroll to highlighted row and clear param after 3s
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    const clearTimer = setTimeout(() => {
      setSearchParams({}, { replace: true });
    }, 3000);
    return () => { clearTimeout(timer); clearTimeout(clearTimer); };
  }, [highlightId, setSearchParams]);

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
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <DropdownSelect
          options={[
            { value: '', label: 'Todos los estados' },
            { value: 'active', label: 'Activa' },
            { value: 'acknowledged', label: 'Reconocida' },
            { value: 'resolved', label: 'Resuelta' },
          ]}
          value={filters.status ?? ''}
          onChange={(val) => { updateFilter('status', val); }}
          className="w-48"
        />

        <DropdownSelect
          options={[
            { value: '', label: 'Todas las severidades' },
            { value: 'critical', label: 'Critica' },
            { value: 'high', label: 'Alta' },
            { value: 'medium', label: 'Media' },
            { value: 'low', label: 'Baja' },
          ]}
          value={filters.severity ?? ''}
          onChange={(val) => { updateFilter('severity', val); }}
          className="w-48"
        />

        <DropdownSelect
          options={[
            { value: '', label: 'Todos los edificios' },
            ...(buildingsQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
          ]}
          value={filters.buildingId ?? ''}
          onChange={(val) => { updateFilter('buildingId', val); }}
          className="w-48"
        />
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <Th>Severidad</Th>
              <Th>Tipo</Th>
              <Th>Mensaje</Th>
              <Th>Estado</Th>
              <Th>Fecha</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={6}
            error={qs.error}
            onRetry={() => { alertsQuery.refetch(); }}
            emptyMessage="No hay alertas registradas."
            skeletonWidths={['w-20', 'w-24', 'w-32', 'w-20', 'w-28', 'w-24']}
          >
            {(alertsQuery.data ?? []).slice(0, 50).map((a) => (
              <tr
                key={a.id}
                ref={a.id === highlightId ? highlightRef : undefined}
                className={`transition-colors duration-500 ${
                  a.id === highlightId
                    ? 'bg-pa-blue/10 ring-1 ring-inset ring-pa-blue/30'
                    : 'hover:bg-gray-50'
                }`}
              >
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
          </TableStateBody>
        </table>
      </div>
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
