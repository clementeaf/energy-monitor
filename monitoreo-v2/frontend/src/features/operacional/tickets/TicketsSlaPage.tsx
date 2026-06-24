import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
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
  { key: 'due_soon', label: 'Por vencer' },
  { key: 'overdue', label: 'Vencidos' },
];

const QUICK_PREDICATES: Record<string, (t: Ticket) => boolean> = {
  all: () => true,
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

  // SLA KPIs
  const openTickets = tickets.filter((t) => t.status !== 'resuelto');
  const overdueCount = openTickets.filter((t) => t.daysRemaining <= 0).length;
  const resolvedCount = tickets.filter((t) => t.status === 'resuelto').length;

  const slaKpis = [
    { title: 'Tickets abiertos', value: String(openTickets.length), color: openTickets.length > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { title: 'Vencidos (SLA)', value: String(overdueCount), color: overdueCount > 0 ? 'text-red-600' : 'text-emerald-600' },
    { title: 'Resueltos período', value: String(resolvedCount), color: 'text-emerald-600' },
    { title: 'Total tickets', value: String(tickets.length), color: 'text-foreground' },
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
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        {slaKpis.map((k) => (
          <div key={k.title} className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`mt-0.5 text-lg font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Ticket table */}
      <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
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
    </div>
  );
}
