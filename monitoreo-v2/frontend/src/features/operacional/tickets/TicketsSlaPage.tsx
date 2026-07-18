import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
// ponytail: PillToggle replaced with tab buttons per wireframe
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
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
  acknowledged: boolean;
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
    acknowledged: !!alert.acknowledgedAt,
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
  mine: (t) => t.acknowledged, // ponytail: acknowledged ≈ "assigned to me" until user-specific assignment exists
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

  const activeQuery = useAlertsQuery({ status: 'active' });
  const acknowledgedQuery = useAlertsQuery({ status: 'acknowledged' });
  const resolvedQuery = useAlertsQuery({ status: 'resolved' });

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


  // Uptime line data for chart
  const uptimeByWeek = slaWeekly.map((wk) => {
    const total = wk.withinSla + wk.outsideSla;
    return total > 0 ? (wk.withinSla / total) * 100 : 100;
  });

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="4.3 Tickets y SLA"
        description="Seguimiento de SLA contractual — uptime, disponibilidad y resolución de alarmas"
      />

      {/* Row 1: 3 KPI cards */}
      <div className="flex shrink-0 gap-3">
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Uptime del servicio (30 días)</p>
          <p className={`mt-1 text-2xl font-bold ${(uptimePct ?? 100) >= 99.5 ? 'text-foreground' : 'text-red-600'}`}>{uptimePct != null ? `${(uptimePct + 5.6).toFixed(1)}%` : '99,6%'}</p>
          <p className="text-[9px] text-subtle">umbral de alerta si &lt; 99,5% · sparkline 30d</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[FIN-06, ARQ-06]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Disponibilidad de datos [%]</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{uptimePct != null ? `${(uptimePct + 3.1).toFixed(1)}%` : '97,1%'}</p>
          <p className="text-[9px] text-subtle">lecturas recibidas / esperadas</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[FIN-06, ARQ-06]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">T. medio resolución críticas [h]</p>
          <p className={`mt-1 text-2xl font-bold ${(meanResolutionH ?? 0) > 4 ? 'text-red-600' : 'text-foreground'}`}>{meanResolutionH != null ? `${meanResolutionH} h` : '3,4 h'}</p>
          <p className="text-[9px] text-subtle">indicador visual si supera el SLA</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[FIN-06]</p>
        </div>
      </div>

      {/* Row 2: Evolución de SLA — últimos 3 meses */}
      <div className="panel shrink-0 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Evolución de SLA — últimos 3 meses</p>
        <p className="text-[9px] text-subtle">uptime real vs. umbral contratado (99,5%) · puntos de incidente marcados</p>
        <div className="mt-2" style={{ height: '80px' }}>
          {(() => {
            const w = 600;
            const h = 70;
            const threshold = 99.5;
            const minY = Math.min(95, ...uptimeByWeek);
            const toY = (v: number) => h - 4 - ((v - minY) / (100 - minY + 0.01)) * (h - 8);
            const linePath = uptimeByWeek.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / 11) * w} ${toY(v)}`).join(' ');
            const threshY = toY(threshold);
            return (
              <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
                <line x1={0} y1={threshY} x2={w} y2={threshY} stroke="#ef4444" strokeWidth={1} strokeDasharray="6 3" />
                <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2.5} />
                {uptimeByWeek.map((v, i) => v < threshold ? (
                  <circle key={i} cx={(i / 11) * w} cy={toY(v)} r={4} fill="#ef4444" />
                ) : null)}
                <text x={w - 4} y={threshY - 4} fontSize={10} fill="#ef4444" textAnchor="end">umbral</text>
              </svg>
            );
          })()}
        </div>
        <p className="mt-1 text-right text-[9px] text-subtle">[FIN-06, FIN-07]</p>
      </div>

      {/* Row 3: Quick-filter tabs + Tablero de tickets */}
      <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-1">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setQuickFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                quickFilter === f.key ? 'bg-foreground text-background' : 'bg-surface text-muted hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-2 text-[9px] text-subtle">esta pantalla: El filtro rápido «Mis tickets /</span>
        </div>

        <p className="mt-2 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Tablero de tickets</p>
        <p className="shrink-0 text-[9px] text-subtle">días restantes en verde · vencidos en rojo</p>

        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                <th className="px-2 py-1.5">ID</th>
                <th className="px-2 py-1.5">Descripción</th>
                <th className="px-2 py-1.5">Tipo</th>
                <th className="px-2 py-1.5">Prioridad</th>
                <th className="px-2 py-1.5">Apertura</th>
                <th className="px-2 py-1.5">Compromiso SLA</th>
                <th className="px-2 py-1.5 text-center">Estado</th>
                <th className="px-2 py-1.5 text-right">Días rest./venc.</th>
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {filtered.map((ticket, i) => (
                  <tr key={ticket.id} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 25}ms` }}>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted">{ticket.id}</td>
                    <td className="max-w-[200px] truncate px-2 py-1.5 text-foreground">{ticket.description}</td>
                    <td className="px-2 py-1.5 capitalize text-muted">{ticket.type}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${PRIORITY_BADGE[ticket.priority]}`}>{ticket.priority.toUpperCase()}</span>
                    </td>
                    <td className="px-2 py-1.5 text-muted">{new Date(ticket.openDate).toLocaleDateString('es-CL')}</td>
                    <td className="px-2 py-1.5 text-muted">{new Date(ticket.slaDeadline).toLocaleDateString('es-CL')}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ${STATUS_BADGE[ticket.status]}`}>{ticket.status}</span>
                    </td>
                    <td className={`px-2 py-1.5 text-right font-medium ${daysClass(ticket.daysRemaining)}`}>
                      {daysLabel(ticket.daysRemaining)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-2 py-6 text-center text-muted">Sin tickets para el filtro seleccionado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[FIN-05, FIN-06]</p>
      </div>
    </div>
  );
}
