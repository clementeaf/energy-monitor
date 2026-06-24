import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useAlertsQuery, useAcknowledgeAlert, useResolveAlert } from '../../../hooks/queries/useAlertsQuery';
import type { Alert } from '../../../types/alert';

/* ── Work order derived from alert ── */

type OrderType = 'mantención' | 'diagnóstico' | 'cnr' | 'instalación';
type OrderStatus = 'pendiente' | 'en curso' | 'cerrada' | 'vencida';
type OrderPriority = 'alta' | 'media' | 'baja';

interface WorkOrder {
  id: string;
  description: string;
  type: OrderType;
  buildingId: string;
  priority: OrderPriority;
  assignedDate: string;
  deadline: string;
  status: OrderStatus;
  meterId: string | null;
  alertId: string;
}

const SEVERITY_TO_TYPE: Record<string, OrderType> = {
  critical: 'mantención',
  high: 'diagnóstico',
  medium: 'diagnóstico',
  low: 'cnr',
};

const SEVERITY_TO_PRIORITY: Record<string, OrderPriority> = {
  critical: 'alta',
  high: 'alta',
  medium: 'media',
  low: 'baja',
};

const SLA_HOURS: Record<OrderPriority, number> = {
  alta: 4,
  media: 24,
  baja: 72,
};

function alertToOrder(alert: Alert): WorkOrder {
  const priority = SEVERITY_TO_PRIORITY[alert.severity] ?? 'baja';
  const type = SEVERITY_TO_TYPE[alert.severity] ?? 'diagnóstico';
  const assignedMs = new Date(alert.createdAt).getTime();
  const deadlineMs = assignedMs + SLA_HOURS[priority] * 3_600_000;
  const now = Date.now();

  const STATUS_DERIVE: [boolean, OrderStatus][] = [
    [alert.status === 'resolved', 'cerrada'],
    [alert.status === 'acknowledged', 'en curso'],
    [now > deadlineMs, 'vencida'],
  ];

  const status = STATUS_DERIVE.find(([cond]) => cond)?.[1] ?? 'pendiente';

  return {
    id: alert.id.slice(0, 8).toUpperCase(),
    description: alert.message,
    type,
    buildingId: alert.buildingId,
    priority,
    assignedDate: alert.createdAt,
    deadline: new Date(deadlineMs).toISOString(),
    status,
    meterId: alert.meterId,
    alertId: alert.id,
  };
}

/* ── Styling ── */

const PRIORITY_BADGE: Record<OrderPriority, string> = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-amber-100 text-amber-700',
  baja: 'bg-blue-100 text-blue-700',
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  pendiente: 'bg-gray-100 text-gray-700',
  'en curso': 'bg-amber-100 text-amber-700',
  cerrada: 'bg-emerald-100 text-emerald-700',
  vencida: 'bg-red-100 text-red-700',
};

/* ── Page ── */

export function MisOrdenesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const activeQuery = useAlertsQuery({ status: 'active' });
  const ackQuery = useAlertsQuery({ status: 'acknowledged' });
  const resolvedQuery = useAlertsQuery({ status: 'resolved' });
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  const buildings = buildingsQuery.data ?? [];
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  const allAlerts = useMemo(
    () => [...(activeQuery.data ?? []), ...(ackQuery.data ?? []), ...(resolvedQuery.data ?? [])],
    [activeQuery.data, ackQuery.data, resolvedQuery.data],
  );

  const orders = useMemo(
    () => allAlerts.map(alertToOrder).sort((a, b) => {
      const STATUS_WEIGHT: Record<OrderStatus, number> = { vencida: 0, pendiente: 1, 'en curso': 2, cerrada: 3 };
      return (STATUS_WEIGHT[a.status] ?? 4) - (STATUS_WEIGHT[b.status] ?? 4);
    }),
    [allAlerts],
  );

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  // KPIs
  const pending = orders.filter((o) => o.status === 'pendiente').length;
  const inProgress = orders.filter((o) => o.status === 'en curso').length;
  const closedToday = orders.filter((o) => {
    const today = new Date().toISOString().slice(0, 10);
    return o.status === 'cerrada' && o.assignedDate.slice(0, 10) === today;
  }).length;
  const overdue = orders.filter((o) => o.status === 'vencida').length;

  const kpis = [
    { title: 'Pendientes', value: String(pending), color: pending > 0 ? 'text-amber-600' : 'text-foreground' },
    { title: 'En curso', value: String(inProgress), color: 'text-blue-600' },
    { title: 'Cerradas hoy', value: String(closedToday), color: 'text-emerald-600' },
    { title: 'Vencidas', value: String(overdue), color: overdue > 0 ? 'text-red-600' : 'text-foreground' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Mis Órdenes" eyebrow="Órdenes" />

      {/* KPIs */}
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.title} className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`mt-0.5 text-lg font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Table */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Prioridad</th>
                  <th className="px-3 py-2">Centro</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`cursor-pointer transition-colors hover:bg-surface ${selectedId === order.id ? 'bg-surface' : ''}`}
                    onClick={() => setSelectedId(selectedId === order.id ? null : order.id)}
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-muted">{order.id}</td>
                    <td className="max-w-[200px] px-3 py-2">
                      <p className="truncate text-foreground">{order.description}</p>
                    </td>
                    <td className="px-3 py-2 capitalize text-muted">{order.type}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[order.priority]}`}>
                        {order.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">{buildingMap.get(order.buildingId) ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">Sin órdenes asignadas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <div className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
          {selected ? (
            <OrderDetail
              order={selected}
              buildingName={buildingMap.get(selected.buildingId) ?? '—'}
              onStart={() => acknowledgeAlert.mutate(selected.alertId)}
              onClose={() => resolveAlert.mutate({ id: selected.alertId })}
              starting={acknowledgeAlert.isPending}
              closing={resolveAlert.isPending}
            />
          ) : (
            <div className="panel flex flex-1 items-center justify-center p-4">
              <p className="text-center text-[13px] text-muted">Selecciona una orden.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Order Detail ── */

interface OrderDetailProps {
  order: WorkOrder;
  buildingName: string;
  onStart: () => void;
  onClose: () => void;
  starting: boolean;
  closing: boolean;
}

function OrderDetail({ order, buildingName, onStart, onClose, starting, closing }: Readonly<OrderDetailProps>) {
  const details = [
    { label: 'Tipo', value: order.type },
    { label: 'Centro', value: buildingName },
    { label: 'Prioridad', value: order.priority },
    { label: 'Asignada', value: new Date(order.assignedDate).toLocaleDateString('es-CL') },
    { label: 'Plazo', value: new Date(order.deadline).toLocaleDateString('es-CL') },
  ];

  return (
    <>
      <div className="panel px-3 py-3">
        <p className="text-[15px] font-semibold text-foreground">{order.description}</p>
        <p className="mt-1 font-mono text-[11px] text-muted">{order.id}</p>
      </div>

      <div className="panel px-3 py-3">
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Detalle</h4>
        <dl className="space-y-1.5">
          {details.map((d) => (
            <div key={d.label} className="flex justify-between text-[12px]">
              <dt className="text-muted">{d.label}</dt>
              <dd className="capitalize font-medium text-foreground">{d.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel space-y-2 px-3 py-3">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted">Acciones</h4>
        <div className="flex gap-2">
          <Button size="sm" onClick={onStart} loading={starting}>Iniciar</Button>
          <Button size="sm" variant="secondary" onClick={onClose} loading={closing}>Cerrar</Button>
        </div>
      </div>
    </>
  );
}
