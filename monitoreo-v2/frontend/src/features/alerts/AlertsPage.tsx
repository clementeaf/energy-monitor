import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { Drawer } from '../../components/ui/Drawer';
import { PageHeader } from '../../components/ui/PageHeader';
import { PillToggle } from '../../components/ui/PillToggle';
import { useQueryState } from '../../hooks/useQueryState';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
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
  const navigate = useNavigate();
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
  const { visible: visibleAlerts, hasMore, sentinelRef, total } = useInfiniteScroll(displayAlerts, [statusTab, filters]);

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">Selecciona un edificio en la barra lateral para ver alertas.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title="Alertas" eyebrow="Alertas" />

      <PillToggle
        options={statusTabs.map((tab) => ({
          key: tab.value,
          label: statusCounts[tab.value] > 0 ? `${tab.label} (${statusCounts[tab.value]})` : tab.label,
        }))}
        value={statusTab}
        onChange={setStatusTab}
        size="sm"
      />

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

      <div className="overflow-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
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
            {visibleAlerts.map((a) => (
              <tr
                key={a.id}
                ref={a.id === highlightId ? highlightRef : undefined}
                onClick={() => { if (a.meterId) navigate('/monitoring/meter/' + a.meterId); }}
                className={`cursor-pointer transition-colors duration-500 ${
                  a.id === highlightId
                    ? 'bg-brand-muted ring-1 ring-inset ring-brand/30'
                    : 'hover:bg-surface'
                }`}
              >
                <Td>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[a.severity]}`}>
                    {a.severity}
                  </span>
                </Td>
                <Td>
                  {a.alertTypeCode}
                  {a.buildingId && (
                    <>
                      {' · '}
                      <a
                        href={`/buildings/${a.buildingId}`}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate(`/buildings/${a.buildingId}`); }}
                        className="text-xs text-brand hover:underline"
                      >
                        edificio
                      </a>
                    </>
                  )}
                </Td>
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
                        onClick={(e) => { e.stopPropagation(); acknowledgeMutation.mutate(a.id); }}
                        disabled={acknowledgeMutation.isPending}
                        className="rounded px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50"
                      >
                        Reconocer
                      </button>
                    )}
                    {a.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setResolvingAlert(a); setResolutionNotes(''); }}
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
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && <p className="px-4 py-2 text-xs text-muted">Mostrando {visibleAlerts.length} de {total}</p>}

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
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface"
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
            <div className="rounded-md border border-border bg-surface p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[resolvingAlert.severity]}`}>
                  {resolvingAlert.severity}
                </span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[resolvingAlert.status]}`}>
                  {STATUS_LABELS[resolvingAlert.status]}
                </span>
              </div>
              <p className="text-xs text-muted">Tipo: {resolvingAlert.alertTypeCode}</p>
              <p className="mt-1 text-sm text-foreground">{resolvingAlert.message}</p>
              <p className="mt-2 text-xs text-muted">
                Creada: {new Date(resolvingAlert.createdAt).toLocaleString('es-CL')}
              </p>
              {resolvingAlert.triggeredValue != null && (
                <p className="text-xs text-muted">
                  Valor: {resolvingAlert.triggeredValue} (umbral: {resolvingAlert.thresholdValue ?? '—'})
                </p>
              )}
            </div>

            {/* Resolution notes */}
            <label className="flex flex-col gap-1">
              <span className="text-muted">Notas de resolucion</span>
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
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}
