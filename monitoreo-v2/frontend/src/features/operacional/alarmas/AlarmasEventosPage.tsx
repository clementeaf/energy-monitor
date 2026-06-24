import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useAlertsQuery, useResolveAlert, useAcknowledgeAlert } from '../../../hooks/queries/useAlertsQuery';
import type { Alert, AlertSeverity, AlertStatus } from '../../../types/alert';

/* ── Filter options ── */

interface SelectOption { key: string; label: string }

const SEVERITY_OPTIONS: SelectOption[] = [
  { key: 'all', label: 'Todas' },
  { key: 'critical', label: 'Crítica' },
  { key: 'high', label: 'Alta' },
  { key: 'medium', label: 'Media' },
  { key: 'low', label: 'Baja' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { key: 'active', label: 'Abiertas' },
  { key: 'acknowledged', label: 'Asignadas' },
  { key: 'resolved', label: 'Resueltas' },
];

/* ── Badge styling ── */

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};

const STATUS_BADGE: Record<AlertStatus, string> = {
  active: 'bg-red-100 text-red-700',
  acknowledged: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABEL: Record<AlertStatus, string> = {
  active: 'Abierta',
  acknowledged: 'Asignada',
  resolved: 'Resuelta',
};

/* ── Elapsed time ── */

function elapsed(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(hours / 24);
  const UNITS: [number, string][] = [[1, `${hours}h`]];
  return days > 0 ? `${days}d ${hours % 24}h` : (UNITS.find(([min]) => hours >= min)?.[1] ?? '<1h');
}

/* ── Page ── */

export function AlarmasEventosPage() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const buildingsQuery = useBuildingsQuery();
  const alertsQuery = useAlertsQuery({ status: statusFilter as AlertStatus });
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  const buildings = buildingsQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];

  const buildingMap = useMemo(
    () => new Map(buildings.map((b) => [b.id, b.name])),
    [buildings],
  );

  // Filter by severity
  const filtered = useMemo(
    () => severityFilter === 'all'
      ? alerts
      : alerts.filter((a) => a.severity === severityFilter),
    [alerts, severityFilter],
  );

  // Sort: severity priority × age
  const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => {
      const sevDiff = (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
      return sevDiff !== 0 ? sevDiff : a.createdAt.localeCompare(b.createdAt);
    }),
    [filtered],
  );

  const selectedAlert = useMemo(
    () => sorted.find((a) => a.id === selectedId) ?? null,
    [sorted, selectedId],
  );

  // SLA summary
  const resolvedAlerts = useMemo(
    () => (statusFilter === 'resolved' ? alerts : []),
    [alerts, statusFilter],
  );
  const totalResolved = resolvedAlerts.length;

  const handleAcknowledge = () => {
    selectedId && acknowledgeAlert.mutate(selectedId);
  };

  const handleResolve = () => {
    selectedId && resolveAlert.mutate({ id: selectedId, resolutionNotes: comment || undefined });
    setComment('');
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Alarmas y Eventos"
        eyebrow="Alarmas"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PillToggle
              options={SEVERITY_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={severityFilter}
              onChange={setSeverityFilter}
              size="sm"
            />
            <PillToggle
              options={STATUS_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={statusFilter}
              onChange={setStatusFilter}
              size="sm"
            />
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Table */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="panel min-h-0 flex-1 overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">Severidad</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Centro</th>
                  <th className="px-3 py-2 text-right">Tiempo</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((alert) => {
                  const isSelected = selectedId === alert.id;
                  const sevStyle = SEVERITY_BADGE[alert.severity];
                  const statStyle = STATUS_BADGE[alert.status];
                  const statLabel = STATUS_LABEL[alert.status];
                  return (
                    <tr
                      key={alert.id}
                      className={`cursor-pointer transition-colors hover:bg-surface ${isSelected ? 'bg-surface' : ''}`}
                      onClick={() => setSelectedId(isSelected ? null : alert.id)}
                    >
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${sevStyle}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="max-w-[250px] px-3 py-2">
                        <p className="truncate text-foreground">{alert.message}</p>
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {buildingMap.get(alert.buildingId) ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-muted">
                        {elapsed(alert.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statStyle}`}>
                          {statLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted">
                      Sin alarmas para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SLA summary bar */}
          <div className="panel mt-3 shrink-0 px-4 py-3">
            <h4 className="text-[12px] font-medium text-foreground">Resumen SLA</h4>
            <div className="mt-2 flex gap-4 text-[12px]">
              <span className="text-muted">Total: {sorted.length}</span>
              <span className="text-muted">Resueltas período: {totalResolved}</span>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
          {selectedAlert ? (
            <AlertDetailPanel
              alert={selectedAlert}
              buildingName={buildingMap.get(selectedAlert.buildingId) ?? '—'}
              comment={comment}
              onCommentChange={setComment}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              acknowledging={acknowledgeAlert.isPending}
              resolving={resolveAlert.isPending}
            />
          ) : (
            <div className="panel flex flex-1 items-center justify-center p-4">
              <p className="text-center text-[13px] text-muted">
                Selecciona una alarma para ver el detalle.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Alert Detail Panel ── */

interface AlertDetailPanelProps {
  alert: Alert;
  buildingName: string;
  comment: string;
  onCommentChange: (v: string) => void;
  onAcknowledge: () => void;
  onResolve: () => void;
  acknowledging: boolean;
  resolving: boolean;
}

function AlertDetailPanel({
  alert,
  buildingName,
  comment,
  onCommentChange,
  onAcknowledge,
  onResolve,
  acknowledging,
  resolving,
}: Readonly<AlertDetailPanelProps>) {
  const sevStyle = SEVERITY_BADGE[alert.severity];

  const details = [
    { label: 'Valor disparador', value: alert.triggeredValue?.toString() ?? '—' },
    { label: 'Umbral', value: alert.thresholdValue?.toString() ?? '—' },
    { label: 'Código', value: alert.alertTypeCode },
    { label: 'Tiempo activa', value: elapsed(alert.createdAt) },
  ];

  return (
    <>
      {/* Header */}
      <div className="panel px-3 py-3">
        <div className="flex items-center gap-2">
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${sevStyle}`}>
            {alert.severity.toUpperCase()}
          </span>
          <span className="text-[11px] text-muted">{buildingName}</span>
        </div>
        <p className="mt-2 text-[13px] font-medium text-foreground">{alert.message}</p>
        <p className="mt-1 text-[11px] text-muted">
          {new Date(alert.createdAt).toLocaleString('es-CL')}
        </p>
      </div>

      {/* Details */}
      <div className="panel px-3 py-3">
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Detalle</h4>
        <dl className="space-y-1.5">
          {details.map((d) => (
            <div key={d.label} className="flex justify-between text-[12px]">
              <dt className="text-muted">{d.label}</dt>
              <dd className="font-medium text-foreground">{d.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Actions */}
      <div className="panel space-y-3 px-3 py-3">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted">Acciones</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onAcknowledge} loading={acknowledging}>
            Asignar a mí
          </Button>
          <Button size="sm" variant="danger" onClick={onResolve} loading={resolving}>
            Cerrar
          </Button>
        </div>

        {/* Comment */}
        <div>
          <label className="text-[11px] font-medium text-muted" htmlFor="alert-comment">
            Comentario
          </label>
          <textarea
            id="alert-comment"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-[12px] text-foreground outline-none transition-colors focus:border-brand"
            placeholder="Notas de resolución..."
          />
        </div>
      </div>
    </>
  );
}
