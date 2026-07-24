import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useAlertsQuery, useResolveAlert, useAcknowledgeAlert } from '../../../hooks/queries/useAlertsQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { Alert, AlertSeverity, AlertStatus } from '../../../types/alert';

/* ── Fallback alert data ── */

const FALLBACK_ALERTS: Alert[] = [
  { id: 'fb-al-001-uuid', buildingId: 'fb-b1', meterId: 'fb-m1-uuid-x', severity: 'critical', status: 'active', message: 'Voltaje fase R fuera de rango (245 V > 220±5%)', alertTypeCode: 'VOLT_HIGH', alertRuleId: null, triggeredValue: 245, thresholdValue: 231, createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), acknowledgedAt: null, acknowledgedBy: null, assignedTo: null, resolvedAt: null, resolvedBy: null, resolutionNotes: null },
  { id: 'fb-al-002-uuid', buildingId: 'fb-b1', meterId: 'fb-m2-uuid-x', severity: 'high', status: 'acknowledged', message: 'Factor de potencia bajo umbral contractual (0.83 < 0.90)', alertTypeCode: 'PF_LOW', alertRuleId: null, triggeredValue: 0.83, thresholdValue: 0.90, createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString(), acknowledgedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(), acknowledgedBy: 'operador@pasa.cl', assignedTo: 'operador@pasa.cl', resolvedAt: null, resolvedBy: null, resolutionNotes: null },
  { id: 'fb-al-003-uuid', buildingId: 'fb-b2', meterId: 'fb-m3-uuid-x', severity: 'medium', status: 'active', message: 'THD corriente supera 8% en circuito alumbrado zona norte', alertTypeCode: 'THD_HIGH', alertRuleId: null, triggeredValue: 9.2, thresholdValue: 8.0, createdAt: new Date(Date.now() - 8 * 3_600_000).toISOString(), acknowledgedAt: null, acknowledgedBy: null, assignedTo: null, resolvedAt: null, resolvedBy: null, resolutionNotes: null },
  { id: 'fb-al-004-uuid', buildingId: 'fb-b2', meterId: null, severity: 'medium', status: 'active', message: 'Consumo supera demanda contratada (320 kW > 300 kW)', alertTypeCode: 'DEMAND_EXCEED', alertRuleId: null, triggeredValue: 320, thresholdValue: 300, createdAt: new Date(Date.now() - 12 * 3_600_000).toISOString(), acknowledgedAt: null, acknowledgedBy: null, assignedTo: null, resolvedAt: null, resolvedBy: null, resolutionNotes: null },
  { id: 'fb-al-005-uuid', buildingId: 'fb-b3', meterId: 'fb-m5-uuid-x', severity: 'low', status: 'resolved', message: 'Comunicación interrumpida por 45 min en medidor M-07', alertTypeCode: 'COMM_LOSS', alertRuleId: null, triggeredValue: null, thresholdValue: null, createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString(), acknowledgedAt: new Date(Date.now() - 25 * 3_600_000).toISOString(), acknowledgedBy: 'tecnico@pasa.cl', assignedTo: 'tecnico@pasa.cl', resolvedAt: new Date(Date.now() - 20 * 3_600_000).toISOString(), resolvedBy: 'tecnico@pasa.cl', resolutionNotes: 'Reconexión manual en tablero secundario' },
];

/* ── Fallback sparkline data (48 hourly points) ── */

const FALLBACK_SPARKLINE_POINTS: number[] = [
  42,44,46,48,51,53,55,58,62,67,71,74,72,68,64,60,58,56,54,52,
  50,49,51,54,58,63,68,73,78,82,85,83,79,74,69,64,59,55,52,49,
  47,46,48,51,55,60,65,70,
];

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
  { key: 'open', label: 'Abierta' },
  { key: 'active', label: 'Abiertas' },
  { key: 'acknowledged', label: 'Asignadas' },
  { key: 'resolved', label: 'Resueltas' },
];

const PAIS_OPTIONS: SelectOption[] = [
  { key: 'all', label: 'Todos' },
  { key: 'CL', label: 'Chile' },
  { key: 'PE', label: 'Perú' },
  { key: 'CO', label: 'Colombia' },
];

const RANGO_FECHA_OPTIONS: SelectOption[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
  { key: 'custom', label: 'Personalizado' },
];

const RESPONSABLE_OPTIONS: SelectOption[] = [
  { key: 'all', label: 'Todas' },
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
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [mallFilter, setMallFilter] = useState('all');
  const [paisFilter, setPaisFilter] = useState('all');
  const [rangoFecha, setRangoFecha] = useState('today');
  const [responsableFilter, setResponsableFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [dateFrom] = useState('');
  const [dateTo] = useState('');

  const buildingsQuery = useBuildingsQuery();
  const alertsQuery = useAlertsQuery({ status: statusFilter as AlertStatus });
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  const buildings = buildingsQuery.data ?? [];
  const realAlerts = alertsQuery.data ?? [];
  const alerts = realAlerts.length > 0 ? realAlerts : FALLBACK_ALERTS;

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
          Mall
          <DropdownSelect options={[{ value: 'all', label: 'Todos' }, ...buildings.map((b) => ({ value: b.id, label: b.name }))]} value={mallFilter} onChange={setMallFilter} />
        </span>
        <span className="flex items-center gap-1">
          País
          <DropdownSelect options={PAIS_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={paisFilter} onChange={setPaisFilter} />
        </span>
        <span className="flex items-center gap-1">
          Estado
          <DropdownSelect options={STATUS_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={statusFilter} onChange={setStatusFilter} />
        </span>
        <span className="flex items-center gap-1">
          Rango de fecha
          <DropdownSelect options={RANGO_FECHA_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={rangoFecha} onChange={setRangoFecha} />
        </span>
        <span className="flex items-center gap-1">
          Responsable asignado
          <DropdownSelect options={RESPONSABLE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={responsableFilter} onChange={setResponsableFilter} />
        </span>
      </div>

      {/* 2 columns */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex gap-3">
          {/* Left: Tabla de alarmas */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
              <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Tabla de alarmas</p>
              <p className="shrink-0 text-[11px] text-muted">orden por defecto: severidad + antigüedad · fila expandible: valor que disparó, baseline esperado, historial de acciones</p>
              <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
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
            </div>
          </div>

          {/* Right: SLA + Detail + Actions + Comment */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
            {/* Resumen de SLA de alarmas */}
            <div className="panel shrink-0 px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Resumen de SLA de alarmas</p>
              <p className="text-[11px] text-muted">% resueltas dentro / fuera del SLA, por severidad y período</p>
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
            </div>

            {/* Panel de detalle — serie del medidor 48h */}
            <div className="panel shrink-0 px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Panel de detalle — serie del medidor 48h</p>
              <p className="text-[11px] text-muted">línea de threshold del valor que disparó la alarma</p>
              <div className="mt-2">
                {selectedAlert ? (
                  <MeterSparkline48h meterId={selectedAlert.meterId} thresholdValue={selectedAlert.thresholdValue} />
                ) : (
                  <p className="py-4 text-center text-[11px] text-muted">Seleccione una alarma</p>
                )}
              </div>
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
              <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Comentario de la alarma</p>
              <p className="text-[11px] text-muted">queda registrado en la pista de auditoría</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-[11px] text-foreground outline-none transition-colors focus:border-brand"
                placeholder="Comentario del operador (texto libre)"
              />
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
  const displayPoints = points.some((v) => v > 0) ? points : FALLBACK_SPARKLINE_POINTS;
  const allVals = [...displayPoints, threshold].filter((v) => v > 0);
  if (allVals.length === 0) return <p className="text-[10px] text-muted">Sin datos 48h.</p>;
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;
  const toY = (v: number) => h - ((v - minV) / (maxV - minV)) * (h - 4);
  const linePath = displayPoints.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / 47) * w} ${toY(v)}`).join(' ');
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

