import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { Drawer } from '../../components/ui/Drawer';
import { useQueryState } from '../../hooks/useQueryState';
import { useAlertsQuery, useAcknowledgeAlert, useResolveAlert } from '../../hooks/queries/useAlertsQuery';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import type { Alert, AlertStatus, AlertSeverity, AlertQueryParams } from '../../types/alert';

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
  const { isFilteredMode, needsSelection, operatorMeterIds } = useOperatorFilter();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const highlightRef = useRef<HTMLTableRowElement>(null);
  const [statusTab, setStatusTab] = useState<string>('');
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
  // Fetch all statuses — status tab is client-side only
  const apiFilters = useMemo(() => {
    const { status: _ignored, ...rest } = filters;
    return rest;
  }, [filters]);
  const alertsQuery = useAlertsQuery(apiFilters);
  const qs = useQueryState(alertsQuery, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });

  const [resolvingAlert, setResolvingAlert] = useState<Alert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();

  const handleResolve = () => {
    if (!resolvingAlert) return;
    resolveMutation.mutate(
      { id: resolvingAlert.id, payload: { resolutionNotes: resolutionNotes.trim() || undefined } },
      { onSuccess: () => { setResolvingAlert(null); setResolutionNotes(''); } },
    );
  };

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

  const statusTabs: { value: string; label: string }[] = [
    { value: '', label: 'Todas' },
    { value: 'active', label: 'Activas' },
    { value: 'acknowledged', label: 'Reconocidas' },
    { value: 'resolved', label: 'Resueltas' },
  ];

  // All alerts (unfiltered by status) for counts — filtered by operator
  const rawAlerts = alertsQuery.data ?? [];
  const allAlerts = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawAlerts;
    return rawAlerts.filter((a) => a.meterId && operatorMeterIds.has(a.meterId));
  }, [rawAlerts, isFilteredMode, operatorMeterIds]);
  const activeCount = allAlerts.filter((a) => a.status === 'active').length;
  const ackCount = allAlerts.filter((a) => a.status === 'acknowledged').length;
  const resolvedCount = allAlerts.filter((a) => a.status === 'resolved').length;
  const statusCounts: Record<string, number> = { '': allAlerts.length, active: activeCount, acknowledged: ackCount, resolved: resolvedCount };

  // Client-side status filter
  const displayAlerts = statusTab ? allAlerts.filter((a) => a.status === statusTab) : allAlerts;

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-pa-text-muted">Selecciona un operador en la barra lateral para ver alertas.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Status tabs */}
      <div className="flex gap-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusTab(tab.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusTab === tab.value
                ? 'bg-[var(--color-primary,#3a5b1e)] text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            {statusCounts[tab.value] > 0 && (
              <span className="ml-1 opacity-70">({statusCounts[tab.value]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Other filters */}
      <div className="flex flex-wrap gap-2">
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
          className="w-56"
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
            {displayAlerts.slice(0, 50).map((a) => (
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
                        onClick={() => { setResolvingAlert(a); setResolutionNotes(''); }}
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

      {/* Resolve drawer */}
      <Drawer
        open={!!resolvingAlert}
        onClose={() => { setResolvingAlert(null); setResolutionNotes(''); }}
        title="Resolver alerta"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setResolvingAlert(null); setResolutionNotes(''); }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {resolveMutation.isPending ? 'Resolviendo...' : 'Confirmar resolucion'}
            </button>
          </div>
        }
      >
        {resolvingAlert && (
          <div className="flex flex-col gap-4 text-sm">
            {/* Alert summary */}
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[resolvingAlert.severity]}`}>
                  {resolvingAlert.severity}
                </span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[resolvingAlert.status]}`}>
                  {STATUS_LABELS[resolvingAlert.status]}
                </span>
              </div>
              <p className="text-xs text-gray-500">Tipo: {resolvingAlert.alertTypeCode}</p>
              <p className="mt-1 text-sm text-gray-900">{resolvingAlert.message}</p>
              <p className="mt-2 text-xs text-gray-500">
                Creada: {new Date(resolvingAlert.createdAt).toLocaleString('es-CL')}
              </p>
              {resolvingAlert.triggeredValue != null && (
                <p className="text-xs text-gray-500">
                  Valor: {resolvingAlert.triggeredValue} (umbral: {resolvingAlert.thresholdValue ?? '—'})
                </p>
              )}
            </div>

            {/* Resolution notes */}
            <label className="flex flex-col gap-1">
              <span className="text-gray-600">Notas de resolucion</span>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describa las acciones tomadas para resolver esta alerta..."
                rows={4}
                className="input-field resize-none"
              />
            </label>
          </div>
        )}
      </Drawer>
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
