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
  const [mallFilter, setMallFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  // Filter by severity + mall
  const filtered = useMemo(() => {
    let result = alerts;
    if (severityFilter !== 'all') result = result.filter((a) => a.severity === severityFilter);
    if (mallFilter !== 'all') result = result.filter((a) => a.buildingId === mallFilter);
    if (dateFrom) result = result.filter((a) => a.createdAt >= dateFrom);
    if (dateTo) result = result.filter((a) => a.createdAt <= dateTo + 'T23:59:59');
    return result;
  }, [alerts, severityFilter, mallFilter, dateFrom, dateTo]);

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
    selectedId && resolveAlert.mutate({ id: selectedId, payload: { resolutionNotes: comment || undefined } });
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
            <select
              value={mallFilter}
              onChange={(e) => setMallFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
            >
              <option value="all">Todos los centros</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" title="Desde" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" title="Hasta" />
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
                  <th className="px-3 py-2">Zona/Medidor</th>
                  <th className="px-3 py-2 text-right">Tiempo</th>
                  <th className="px-3 py-2">Responsable</th>
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
                    <AlertTableRow
                      key={alert.id}
                      alert={alert}
                      isSelected={isSelected}
                      sevStyle={sevStyle}
                      statStyle={statStyle}
                      statLabel={statLabel}
                      buildingName={buildingMap.get(alert.buildingId) ?? '—'}
                      onSelect={() => setSelectedId(isSelected ? null : alert.id)}
                    />
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted">
                      Sin alarmas para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SLA visual widgets */}
          <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
            {(() => {
              const total = sorted.length || 1;
              const critCount = sorted.filter((a) => a.severity === 'critical').length;
              const highCount = sorted.filter((a) => a.severity === 'high').length;
              const medCount = sorted.filter((a) => a.severity === 'medium').length;
              const lowCount = sorted.filter((a) => a.severity === 'low').length;
              // ponytail: SLA within/outside derived from resolved alerts with resolvedAt
              const resolvedWithTs = resolvedAlerts.filter((a) => a.resolvedAt);
              const SLA_H: Record<string, number> = { critical: 4, high: 8, medium: 24, low: 72 };
              const withinSla = resolvedWithTs.filter((a) => {
                const resolveMs = new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime();
                return resolveMs <= (SLA_H[a.severity] ?? 72) * 3_600_000;
              }).length;
              const withinPct = resolvedWithTs.length > 0 ? Math.round((withinSla / resolvedWithTs.length) * 100) : 100;
              const outsidePct = 100 - withinPct;
              const widgets = [
                { label: '% dentro SLA', value: `${withinPct}%`, pct: withinPct, color: 'bg-emerald-400' },
                { label: '% fuera SLA', value: `${outsidePct}%`, pct: outsidePct, color: 'bg-red-400' },
                { label: 'Por severidad', value: `${critCount}C ${highCount}A ${medCount}M ${lowCount}B`, pct: total > 0 ? ((critCount + highCount) / total) * 100 : 0, color: 'bg-red-400' },
                { label: 'Resueltas período', value: String(totalResolved), pct: total > 0 ? (totalResolved / (totalResolved + sorted.length)) * 100 : 0, color: 'bg-blue-400' },
              ];
              return widgets.map((w) => (
                <div key={w.label} className="panel px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{w.label}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-foreground">{w.value}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-200">
                    <div className={`h-full rounded-full ${w.color}`} style={{ width: `${Math.min(100, w.pct)}%` }} />
                  </div>
                </div>
              ));
            })()}
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

/* ── Meter Sparkline 48h ── */

function MeterSparkline48h({ triggeredValue, thresholdValue }: Readonly<{ triggeredValue?: number | null; thresholdValue?: number | null }>) {
  // ponytail: synthetic 48 points — replace with real timeseries API
  const baseVal = triggeredValue ?? 220;
  const threshold = thresholdValue ?? baseVal * 1.1;
  const points = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < 48; i++) {
      const noise = (Math.sin(i * 0.7) * 0.08 + Math.cos(i * 0.3) * 0.05) * baseVal;
      result.push(baseVal + noise);
    }
    return result;
  }, [baseVal]);

  const w = 240;
  const h = 48;
  const allVals = [...points, threshold];
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;
  const toY = (v: number) => h - ((v - minV) / (maxV - minV)) * (h - 4);
  const linePath = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / 47) * w} ${toY(v)}`).join(' ');
  const threshY = toY(threshold);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1={0} y1={threshY} x2={w} y2={threshY} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
      <text x={w - 2} y={threshY - 3} fontSize={8} fill="#ef4444" textAnchor="end">umbral</text>
    </svg>
  );
}

/* ── Alert Table Row (expandable) ── */

function AlertTableRow({ alert, isSelected, sevStyle, statStyle, statLabel, buildingName, onSelect }: Readonly<{
  alert: Alert; isSelected: boolean; sevStyle: string; statStyle: string; statLabel: string; buildingName: string; onSelect: () => void;
}>) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className={`cursor-pointer transition-colors hover:bg-surface ${isSelected ? 'bg-surface' : ''}`}
        onClick={() => { onSelect(); setExpanded(!expanded); }}
      >
        <td className="px-3 py-2">
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${sevStyle}`}>
            {alert.severity.toUpperCase()}
          </span>
        </td>
        <td className="max-w-[250px] px-3 py-2">
          <p className="truncate text-foreground">{alert.message}</p>
        </td>
        <td className="px-3 py-2 text-muted">{buildingName}</td>
        <td className="px-3 py-2 text-[11px] text-muted">{alert.meterId ? alert.meterId.slice(0, 8) : '—'}</td>
        <td className="px-3 py-2 text-right text-muted">{elapsed(alert.createdAt)}</td>
        <td className="px-3 py-2 text-[11px] text-muted">{alert.assignedTo ?? '—'}</td>
        <td className="px-3 py-2 text-center">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statStyle}`}>{statLabel}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface/50">
          <td colSpan={7} className="px-6 py-2">
            <div className="space-y-1 text-[11px] text-muted">
              <p><span className="font-medium">Valor:</span> {alert.triggeredValue ?? '—'} | <span className="font-medium">Umbral:</span> {alert.thresholdValue ?? '—'}</p>
              <p><span className="font-medium">Código:</span> {alert.alertTypeCode}</p>
              {alert.acknowledgedAt && <p>✓ Asignada: {new Date(alert.acknowledgedAt).toLocaleString('es-CL')}{alert.acknowledgedBy ? ` por ${alert.acknowledgedBy}` : ''}</p>}
              {alert.resolvedAt && <p>✓ Resuelta: {new Date(alert.resolvedAt).toLocaleString('es-CL')}{alert.resolutionNotes ? ` — ${alert.resolutionNotes}` : ''}</p>}
              {!alert.acknowledgedAt && !alert.resolvedAt && <p>Sin acciones registradas.</p>}
            </div>
          </td>
        </tr>
      )}
    </>
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

      {/* 48h series chart */}
      <div className="panel px-3 py-3">
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Serie temporal — 48h</h4>
        <MeterSparkline48h triggeredValue={alert.triggeredValue} thresholdValue={alert.thresholdValue} />
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onAcknowledge} loading={acknowledging}>
            Asignar a mí
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { /* ponytail: assign-to-other modal when user list available */ }}>
            Asignar a otro
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { /* ponytail: escalation API when available */ }}>
            Escalar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { /* ponytail: trigger backfill for meter */ }}>
            Backfill
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
