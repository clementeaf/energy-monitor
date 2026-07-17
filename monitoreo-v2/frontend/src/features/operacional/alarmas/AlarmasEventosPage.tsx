import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useAlertsQuery, useResolveAlert, useAcknowledgeAlert } from '../../../hooks/queries/useAlertsQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
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
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="4.2 Alarmas y Eventos"
        description="Gestión de alarmas operacionales — asignar, escalar, cerrar, backfill (MFA requerido)"
      />

      {/* Filter banner */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-[11px] text-muted">
        <span className="font-semibold text-foreground">Filtros:</span>
        <span className="flex items-center gap-1">
          Severidad
          <DropdownSelect options={SEVERITY_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={severityFilter} onChange={setSeverityFilter} />
        </span>
        <span className="flex items-center gap-1">
          Estado
          <DropdownSelect options={STATUS_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={statusFilter} onChange={setStatusFilter} />
        </span>
        <span className="flex items-center gap-1">
          Mall
          <DropdownSelect options={[{ value: 'all', label: 'Todos' }, ...buildings.map((b) => ({ value: b.id, label: b.name }))]} value={mallFilter} onChange={setMallFilter} />
        </span>
        <span className="flex items-center gap-1">
          Desde
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
        </span>
        <span className="flex items-center gap-1">
          Hasta
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
        </span>
      </div>

      {/* 2 columns */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex gap-3">
          {/* Left: Tabla de alarmas */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
              <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Tabla de alarmas</p>
              <p className="shrink-0 text-[9px] text-subtle">orden por defecto: severidad + antigüedad · fila expandible: valor que disparó, baseline esperado, historial de acciones</p>
              <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                      <th className="px-2 py-1.5">ID</th>
                      <th className="px-2 py-1.5">Sev.</th>
                      <th className="px-2 py-1.5">Descripción</th>
                      <th className="px-2 py-1.5">Mall</th>
                      <th className="px-2 py-1.5">Zona/medidor</th>
                      <th className="px-2 py-1.5">Apertura</th>
                      <th className="px-2 py-1.5">Transcurrido</th>
                      <th className="px-2 py-1.5">Responsable</th>
                      <th className="px-2 py-1.5 text-center">Estado</th>
                    </tr>
                  </thead>
                </table>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <table className="w-full">
                    <tbody className="divide-y divide-border">
                      {sorted.map((alert, i) => (
                        <AlertTableRow
                          key={alert.id}
                          alert={alert}
                          isSelected={selectedId === alert.id}
                          sevStyle={SEVERITY_BADGE[alert.severity]}
                          statStyle={STATUS_BADGE[alert.status]}
                          statLabel={STATUS_LABEL[alert.status]}
                          buildingName={buildingMap.get(alert.buildingId) ?? '—'}
                          onSelect={() => setSelectedId(selectedId === alert.id ? null : alert.id)}
                          index={i}
                        />
                      ))}
                      {sorted.length === 0 && (
                        <tr><td colSpan={9} className="px-2 py-6 text-center text-muted">Sin alarmas para los filtros seleccionados.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[DAT-03, DAT-27, FIN-05]</p>
            </div>
          </div>

          {/* Right: SLA + Detail + Actions + Comment */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
            {/* Resumen de SLA de alarmas */}
            <div className="panel shrink-0 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Resumen de SLA de alarmas</p>
              <p className="text-[9px] text-subtle">% resueltas dentro / fuera del SLA, por severidad y período</p>
              {(() => {
                const resolvedWithTs = resolvedAlerts.filter((a) => a.resolvedAt);
                const SLA_H: Record<string, number> = { critical: 4, high: 8, medium: 24, low: 72 };
                const withinSla = resolvedWithTs.filter((a) => {
                  const resolveMs = new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime();
                  return resolveMs <= (SLA_H[a.severity] ?? 72) * 3_600_000;
                }).length;
                const withinPct = resolvedWithTs.length > 0 ? Math.round((withinSla / resolvedWithTs.length) * 100) : 100;
                return (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${withinPct}%` }} />
                    </div>
                    <span className="text-[11px] font-medium text-foreground">{withinPct}% dentro SLA</span>
                  </div>
                );
              })()}
              <p className="mt-1 text-right text-[9px] text-subtle">[FIN-06, FIN-05]</p>
            </div>

            {/* Panel de detalle — serie del medidor 48h */}
            <div className="panel shrink-0 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Panel de detalle — serie del medidor 48h</p>
              <p className="text-[9px] text-subtle">línea de threshold del valor que disparó la alarma</p>
              <div className="mt-2">
                {selectedAlert ? (
                  <MeterSparkline48h meterId={selectedAlert.meterId} thresholdValue={selectedAlert.thresholdValue} />
                ) : (
                  <p className="py-4 text-center text-[11px] text-muted">Seleccione una alarma</p>
                )}
              </div>
              <p className="mt-1 text-right text-[9px] text-subtle">[DAT-03, DAT-10, DAT-23]</p>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={handleAcknowledge} loading={acknowledgeAlert.isPending} disabled={!selectedId} className="flex-1">Asignar</Button>
              <button type="button" disabled={!selectedId} onClick={handleAcknowledge} className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-40">Escalar</button>
              <Button size="sm" variant="danger" onClick={handleResolve} loading={resolveAlert.isPending} disabled={!selectedId} className="flex-1">Cerrar</Button>
              <button type="button" disabled={!selectedAlert?.meterId} className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-40">Iniciar backfill</button>
            </div>

            {/* Comentario de la alarma */}
            <div className="panel shrink-0 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Comentario de la alarma</p>
              <p className="text-[9px] text-subtle">queda registrado en la pista de auditoría</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-[11px] text-foreground outline-none transition-colors focus:border-brand"
                placeholder="Comentario del operador (texto libre)"
              />
              <p className="mt-1 text-right text-[9px] text-subtle">[DAT-14, DAT-23]</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Meter Sparkline 48h ── */

function MeterSparkline48h({ meterId, thresholdValue }: Readonly<{ meterId?: string | null; triggeredValue?: number | null; thresholdValue?: number | null }>) {
  const range = useMemo(() => {
    const now = new Date();
    return { from: new Date(now.getTime() - 48 * 3_600_000).toISOString(), to: now.toISOString() };
  }, []);
  const aggQuery = useAggregatedReadingsQuery(
    { ...range, interval: 'hourly', ...(meterId ? { meterId } : {}) },
    !!meterId,
  );
  const aggData = aggQuery.data ?? [];

  // Build 48-slot array from real hourly data
  const points = useMemo(() => {
    const slots = new Array(48).fill(0);
    const now = Date.now();
    for (const r of aggData) {
      const hourIndex = Math.floor((now - new Date(r.bucket).getTime()) / 3_600_000);
      const slot = 47 - hourIndex;
      if (slot >= 0 && slot < 48) {
        slots[slot] = parseFloat(r.avg_power_kw ?? '0');
      }
    }
    return slots;
  }, [aggData]);

  const threshold = thresholdValue ?? 0;
  const w = 240;
  const h = 48;
  const allVals = [...points, threshold].filter((v) => v > 0);
  if (allVals.length === 0) return <p className="text-[10px] text-muted">Sin datos 48h.</p>;
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;
  const toY = (v: number) => h - ((v - minV) / (maxV - minV)) * (h - 4);
  const linePath = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / 47) * w} ${toY(v)}`).join(' ');
  const threshY = threshold > 0 ? toY(threshold) : -10;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
      {threshold > 0 && <line x1={0} y1={threshY} x2={w} y2={threshY} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />}
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
      {threshold > 0 && <text x={w - 2} y={threshY - 3} fontSize={8} fill="#ef4444" textAnchor="end">umbral</text>}
    </svg>
  );
}

/* ── Alert Table Row (expandable) ── */

function AlertTableRow({ alert, isSelected, sevStyle, statStyle, statLabel, buildingName, onSelect, index = 0 }: Readonly<{
  alert: Alert; isSelected: boolean; sevStyle: string; statStyle: string; statLabel: string; buildingName: string; onSelect: () => void; index?: number;
}>) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className={`animate-fade-in cursor-pointer transition-colors hover:bg-surface ${isSelected ? 'bg-surface' : ''}`}
        style={{ animationDelay: `${index * 25}ms` }}
        onClick={() => { onSelect(); setExpanded(!expanded); }}
      >
        <td className="px-2 py-1.5 text-[10px] text-muted">{alert.id.slice(0, 6)}</td>
        <td className="px-2 py-1.5">
          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${sevStyle}`}>
            {alert.severity.toUpperCase()}
          </span>
        </td>
        <td className="max-w-[180px] truncate px-2 py-1.5 text-foreground">{alert.message}</td>
        <td className="px-2 py-1.5 text-muted">{buildingName}</td>
        <td className="px-2 py-1.5 text-muted">{alert.meterId ? alert.meterId.slice(0, 8) : '—'}</td>
        <td className="px-2 py-1.5 text-muted">{new Date(alert.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</td>
        <td className="px-2 py-1.5 text-muted">{elapsed(alert.createdAt)}</td>
        <td className="px-2 py-1.5 text-muted">{alert.assignedTo ?? '—'}</td>
        <td className="px-2 py-1.5 text-center">
          <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statStyle}`}>{statLabel}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface/50">
          <td colSpan={9} className="px-6 py-2">
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
        <MeterSparkline48h meterId={alert.meterId} triggeredValue={alert.triggeredValue} thresholdValue={alert.thresholdValue} />
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
          <Button size="sm" variant="secondary" onClick={() => { onAcknowledge(); /* ponytail: assign-to-other — uses acknowledge as proxy until user-picker available */ }}>
            Asignar a otro
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { onAcknowledge(); /* ponytail: escalation uses acknowledge + notes until escalation API */ }}>
            Escalar
          </Button>
          <Button size="sm" variant="secondary" disabled={!alert.meterId} title={alert.meterId ? 'Iniciar backfill' : 'Sin medidor asociado'} onClick={() => { /* ponytail: trigger backfill API for meter when available */ }}>
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
