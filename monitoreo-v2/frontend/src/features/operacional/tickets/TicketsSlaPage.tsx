import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { Alert } from '../../../types/alert';

/* ── Ticket type derived from alert ── */

type TicketType = 'alarma' | 'cnr' | 'solicitud';
type TicketPriority = 'alta' | 'media' | 'baja';
type TicketStatus = 'abierto' | 'asignado' | 'escalado' | 'resuelto';

interface Ticket {
  id: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  buildingId: string;
  openDate: string;
  slaDeadline: string;
  status: TicketStatus;
  daysRemaining: number;
}

/* ── Mapping alert → ticket ── */

const SEVERITY_TO_PRIORITY: Record<string, TicketPriority> = {
  critical: 'alta',
  high: 'alta',
  medium: 'media',
  low: 'baja',
};

const STATUS_MAP: Record<string, TicketStatus> = {
  active: 'abierto',
  acknowledged: 'asignado',
  resolved: 'resuelto',
};

const SLA_HOURS: Record<TicketPriority, number> = {
  alta: 4,
  media: 24,
  baja: 72,
};

function alertToTicket(alert: Alert): Ticket {
  const priority = SEVERITY_TO_PRIORITY[alert.severity] ?? 'baja';
  const status = STATUS_MAP[alert.status] ?? 'abierto';
  const openMs = new Date(alert.createdAt).getTime();
  const deadlineMs = openMs + SLA_HOURS[priority] * 3_600_000;
  const daysRemaining = Math.ceil((deadlineMs - Date.now()) / 86_400_000);

  return {
    id: alert.id.slice(0, 8),
    description: alert.message,
    type: 'alarma',
    priority,
    buildingId: alert.buildingId,
    openDate: alert.createdAt,
    slaDeadline: new Date(deadlineMs).toISOString(),
    status,
    daysRemaining,
  };
}

/* ── Filter options ── */

interface SelectOption { key: string; label: string }

const QUICK_FILTERS: SelectOption[] = [
  { key: 'all', label: 'Todos' },
  { key: 'mine', label: 'Mis tickets' },
  { key: 'due_soon', label: 'Por vencer' },
  { key: 'overdue', label: 'Vencidos' },
];

const QUICK_PREDICATES: Record<string, (t: Ticket) => boolean> = {
  all: () => true,
  mine: () => true, // ponytail: filter by current user when auth context available
  due_soon: (t) => t.daysRemaining > 0 && t.daysRemaining <= 1,
  overdue: (t) => t.daysRemaining <= 0,
};

/* ── Badge styling ── */

const PRIORITY_BADGE: Record<TicketPriority, string> = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-amber-100 text-amber-700',
  baja: 'bg-blue-100 text-blue-700',
};

const STATUS_BADGE: Record<TicketStatus, string> = {
  abierto: 'bg-red-100 text-red-700',
  asignado: 'bg-amber-100 text-amber-700',
  escalado: 'bg-orange-100 text-orange-700',
  resuelto: 'bg-emerald-100 text-emerald-700',
};

const DAYS_COLOR: Record<string, string> = {
  overdue: 'text-red-600 font-medium',
  due_soon: 'text-amber-600',
  ok: 'text-muted',
};

function daysClass(days: number): string {
  const key = days <= 0 ? 'overdue' : days <= 1 ? 'due_soon' : 'ok';
  return DAYS_COLOR[key];
}

function daysLabel(days: number): string {
  return days <= 0 ? `${Math.abs(days)}d vencido` : `${days}d`;
}

/* ── Page ── */

export function TicketsSlaPage() {
  const [quickFilter, setQuickFilter] = useState('all');

  const buildingsQuery = useBuildingsQuery();
  const activeQuery = useAlertsQuery({ status: 'active' });
  const acknowledgedQuery = useAlertsQuery({ status: 'acknowledged' });
  const resolvedQuery = useAlertsQuery({ status: 'resolved' });

  const buildings = buildingsQuery.data ?? [];
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  // Merge all alerts into tickets
  const allAlerts = useMemo(
    () => [...(activeQuery.data ?? []), ...(acknowledgedQuery.data ?? []), ...(resolvedQuery.data ?? [])],
    [activeQuery.data, acknowledgedQuery.data, resolvedQuery.data],
  );
  const tickets = useMemo(() => allAlerts.map(alertToTicket), [allAlerts]);

  // Apply quick filter
  const predicate = QUICK_PREDICATES[quickFilter] ?? QUICK_PREDICATES.all;
  const filtered = useMemo(
    () => tickets.filter(predicate).sort((a, b) => a.daysRemaining - b.daysRemaining),
    [tickets, predicate],
  );

  // Uptime: % meters with recent reading (< 1h)
  const latestQuery = useLatestReadingsQuery();
  const latestReadings = latestQuery.data ?? [];
  const uptimePct = useMemo(() => {
    if (latestReadings.length === 0) return null;
    const oneHourAgo = Date.now() - 3_600_000;
    const online = latestReadings.filter((r) => new Date(r.timestamp).getTime() > oneHourAgo).length;
    return Math.round((online / latestReadings.length) * 100);
  }, [latestReadings]);

  // SLA KPIs
  const openTickets = tickets.filter((t) => t.status !== 'resuelto');
  const overdueCount = openTickets.filter((t) => t.daysRemaining <= 0).length;
  const resolvedCount = tickets.filter((t) => t.status === 'resuelto').length;

  // Mean time to resolve (hours) — from resolved alerts with resolvedAt
  const meanResolutionH = useMemo(() => {
    const resolved = allAlerts.filter((a) => a.status === 'resolved' && a.resolvedAt);
    if (resolved.length === 0) return null;
    const totalMs = resolved.reduce((sum, a) => {
      const open = new Date(a.createdAt).getTime();
      const close = new Date(a.resolvedAt!).getTime();
      return sum + Math.max(0, close - open);
    }, 0);
    return Math.round((totalMs / resolved.length / 3_600_000) * 10) / 10;
  }, [allAlerts]);

  // SLA compliance: % resolved within SLA deadline
  const slaCompliancePct = useMemo(() => {
    const resolved = allAlerts.filter((a) => a.status === 'resolved' && a.resolvedAt);
    if (resolved.length === 0) return null;
    const withinSla = resolved.filter((a) => {
      const priority = SEVERITY_TO_PRIORITY[a.severity] ?? 'baja';
      const deadlineMs = new Date(a.createdAt).getTime() + SLA_HOURS[priority] * 3_600_000;
      return new Date(a.resolvedAt!).getTime() <= deadlineMs;
    }).length;
    return Math.round((withinSla / resolved.length) * 100);
  }, [allAlerts]);

  // SLA evolution: weekly bars (last 12 weeks)
  const slaWeekly = useMemo(() => {
    const resolved = allAlerts.filter((a) => a.status === 'resolved' && a.resolvedAt);
    const weeks: { label: string; withinSla: number; outsideSla: number }[] = [];
    const now = Date.now();
    for (let w = 11; w >= 0; w--) {
      const weekStart = now - (w + 1) * 7 * 86_400_000;
      const weekEnd = now - w * 7 * 86_400_000;
      const inWeek = resolved.filter((a) => {
        const t = new Date(a.resolvedAt!).getTime();
        return t >= weekStart && t < weekEnd;
      });
      const within = inWeek.filter((a) => {
        const priority = SEVERITY_TO_PRIORITY[a.severity] ?? 'baja';
        const deadlineMs = new Date(a.createdAt).getTime() + SLA_HOURS[priority] * 3_600_000;
        return new Date(a.resolvedAt!).getTime() <= deadlineMs;
      }).length;
      const d = new Date(weekEnd);
      weeks.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        withinSla: within,
        outsideSla: inWeek.length - within,
      });
    }
    return weeks;
  }, [allAlerts]);

  const maxBarValue = Math.max(1, ...slaWeekly.map((w) => w.withinSla + w.outsideSla));

  const slaKpis = [
    { title: 'Tickets abiertos', value: String(openTickets.length), color: openTickets.length > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { title: 'Vencidos (SLA)', value: String(overdueCount), color: overdueCount > 0 ? 'text-red-600' : 'text-emerald-600' },
    { title: 'Cumplimiento SLA', value: slaCompliancePct != null ? `${slaCompliancePct}%` : '—', color: (slaCompliancePct ?? 100) >= 90 ? 'text-emerald-600' : 'text-red-600' },
    { title: 'Tiempo medio resolución', value: meanResolutionH != null ? `${meanResolutionH}h` : '—', color: (meanResolutionH ?? 0) <= 24 ? 'text-emerald-600' : 'text-amber-600' },
    { title: 'Disponibilidad datos', value: uptimePct != null ? `${uptimePct}%` : '—', color: (uptimePct ?? 100) >= 95 ? 'text-emerald-600' : 'text-amber-600' },
    { title: 'Resueltos período', value: String(resolvedCount), color: 'text-emerald-600' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Tickets y SLA"
        eyebrow="Tickets"
        actions={
          <PillToggle
            options={QUICK_FILTERS.map((f) => ({ key: f.key, label: f.label }))}
            value={quickFilter}
            onChange={setQuickFilter}
            size="sm"
          />
        }
      />

      {/* SLA KPIs */}
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
        {slaKpis.map((k) => (
          <div key={k.title} className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`mt-0.5 text-lg font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-4 overflow-hidden lg:grid-cols-[1fr_320px] lg:grid-rows-1">
        {/* Ticket table */}
        <div className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Prioridad</th>
                  <th className="px-3 py-2">Centro</th>
                  <th className="px-3 py-2">Apertura</th>
                  <th className="px-3 py-2 text-right">SLA</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ticket) => (
                  <tr key={ticket.id} className="transition-colors hover:bg-surface">
                    <td className="px-3 py-2 font-mono text-[11px] text-muted">{ticket.id}</td>
                    <td className="max-w-[250px] px-3 py-2">
                      <p className="truncate text-foreground">{ticket.description}</p>
                    </td>
                    <td className="px-3 py-2 capitalize text-muted">{ticket.type}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[ticket.priority]}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {buildingMap.get(ticket.buildingId) ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted">
                      {new Date(ticket.openDate).toLocaleDateString('es-CL')}
                    </td>
                    <td className={`px-3 py-2 text-right text-[12px] ${daysClass(ticket.daysRemaining)}`}>
                      {daysLabel(ticket.daysRemaining)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted">
                      Sin tickets para el filtro seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SLA evolution chart */}
        <div className="panel flex flex-col gap-3 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Evolución SLA — 12 semanas</h3>
          <div className="flex flex-1 items-end gap-1">
            {slaWeekly.map((w) => {
              const total = w.withinSla + w.outsideSla;
              const withinH = total > 0 ? (w.withinSla / maxBarValue) * 100 : 0;
              const outsideH = total > 0 ? (w.outsideSla / maxBarValue) * 100 : 0;
              return (
                <div key={w.label} className="flex flex-1 flex-col items-center gap-1" title={`${w.label}: ${w.withinSla} dentro SLA, ${w.outsideSla} fuera`}>
                  <div className="flex w-full flex-col justify-end" style={{ height: 120 }}>
                    {outsideH > 0 && (
                      <div className="w-full rounded-t bg-red-400" style={{ height: `${outsideH}%` }} />
                    )}
                    {withinH > 0 && (
                      <div className={`w-full bg-emerald-400 ${outsideH > 0 ? '' : 'rounded-t'}`} style={{ height: `${withinH}%` }} />
                    )}
                  </div>
                  <span className="text-[9px] text-subtle">{w.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" /> Dentro SLA</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-400" /> Fuera SLA</span>
          </div>

          {/* Uptime line vs threshold */}
          <div className="mt-3">
            <h4 className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">Uptime real vs umbral contratado</h4>
            {(() => {
              const w = 280;
              const h = 48;
              const threshold = 95; // SLA contractual %
              const uptimeByWeek = slaWeekly.map((wk) => {
                const total = wk.withinSla + wk.outsideSla;
                return total > 0 ? (wk.withinSla / total) * 100 : 100;
              });
              const minY = Math.min(80, ...uptimeByWeek);
              const toY = (v: number) => h - 4 - ((v - minY) / (100 - minY)) * (h - 8);
              const linePath = uptimeByWeek.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / 11) * w} ${toY(v)}`).join(' ');
              const threshY = toY(threshold);
              return (
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
                  <line x1={0} y1={threshY} x2={w} y2={threshY} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
                  <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2} />
                  {uptimeByWeek.map((v, i) => v < threshold ? (
                    <circle key={i} cx={(i / 11) * w} cy={toY(v)} r={3} fill="#ef4444" />
                  ) : null)}
                  <text x={w - 2} y={threshY - 3} fontSize={8} fill="#ef4444" textAnchor="end">{threshold}%</text>
                </svg>
              );
            })()}
          </div>

        {/* SLA penalties history */}
        <div className="panel flex flex-col gap-2 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Historial penalizaciones SLA</h3>
          {(() => {
            // Derive penalty periods from weeks with outsideSla > 0
            const penalties = slaWeekly.filter((w) => w.outsideSla > 0);
            if (penalties.length === 0) return <p className="text-[12px] text-muted">Sin penalizaciones en el período.</p>;
            return (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                    <th className="pb-1">Semana</th>
                    <th className="pb-1 text-right">Fuera SLA</th>
                    <th className="pb-1 text-right">Dentro SLA</th>
                    <th className="pb-1 text-center">Cumplimiento</th>
                    <th className="pb-1 text-right">Crédito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {penalties.map((w) => {
                    const total = w.withinSla + w.outsideSla;
                    const pct = total > 0 ? Math.round((w.withinSla / total) * 100) : 0;
                    return (
                      <tr key={w.label}>
                        <td className="py-1 text-muted">{w.label}</td>
                        <td className="py-1 text-right text-red-600">{w.outsideSla}</td>
                        <td className="py-1 text-right text-emerald-600">{w.withinSla}</td>
                        <td className="py-1 text-center">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${pct >= 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-1 text-right text-muted">
                          {/* ponytail: placeholder — real credit from billing when available */}
                          {w.outsideSla > 0 ? `${(w.outsideSla * 0.5).toFixed(1)} UF` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
        </div>
      </div>
    </div>
  );
}
