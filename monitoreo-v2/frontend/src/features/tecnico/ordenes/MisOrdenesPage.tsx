import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
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
  alta: 'bg-danger/10 text-danger',
  media: 'bg-warning/10 text-warning',
  baja: 'bg-info/10 text-info',
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  pendiente: 'bg-surface text-foreground',
  'en curso': 'bg-warning/10 text-warning',
  cerrada: 'bg-success/10 text-success',
  vencida: 'bg-danger/10 text-danger',
};

/* ── Page ── */

const ESTADO_OPTIONS = [
  { value: 'pending_active', label: 'Pendientes + En curso' },
  { value: 'all', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en curso', label: 'En curso' },
  { value: 'cerrada', label: 'Cerradas' },
];

const PRIORIDAD_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

const QUICK_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'overdue', label: 'Vencidas' },
  { key: 'en curso', label: 'En curso' },
];

export function MisOrdenesPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState('all');
  const [estadoFilter, setEstadoFilter] = useState('pending_active');
  const [prioridadFilter, setPrioridadFilter] = useState('all');

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

  const orders = useMemo(() => {
    const derived = allAlerts.map(alertToOrder).sort((a, b) => {
      const STATUS_WEIGHT: Record<OrderStatus, number> = { vencida: 0, pendiente: 1, 'en curso': 2, cerrada: 3 };
      return (STATUS_WEIGHT[a.status] ?? 4) - (STATUS_WEIGHT[b.status] ?? 4);
    });
    return derived;
  }, [allAlerts]);

  const filteredOrders = useMemo(() => {
    if (quickFilter === 'all') return orders;
    if (quickFilter === 'overdue') return orders.filter((o) => o.status === 'vencida');
    return orders.filter((o) => o.status === quickFilter);
  }, [orders, quickFilter]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  // History: resolved alerts for the same meter as the selected order
  const selectedHistory = useMemo(() => {
    if (!selected?.meterId) return [];
    return allAlerts
      .filter((a) => a.meterId === selected.meterId && a.status === 'resolved' && a.id !== selected.alertId)
      .slice(0, 5);
  }, [allAlerts, selected]);

  // KPIs
  const pending = orders.filter((o) => o.status === 'pendiente').length;
  const inProgress = orders.filter((o) => o.status === 'en curso').length;
  const closedToday = orders.filter((o) => {
    const today = new Date().toISOString().slice(0, 10);
    return o.status === 'cerrada' && o.assignedDate.slice(0, 10) === today;
  }).length;
  const overdue = orders.filter((o) => o.status === 'vencida').length;

  const kpis = [
    { title: 'Pendientes', value: String(pending), color: pending > 0 ? 'text-warning' : 'text-foreground' },
    { title: 'En curso', value: String(inProgress), color: 'text-info' },
    { title: 'Cerradas hoy', value: String(closedToday), color: 'text-success' },
    { title: 'Vencidas', value: String(overdue), color: overdue > 0 ? 'text-danger' : 'text-foreground' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Mis Órdenes"
        eyebrow="Órdenes"
        actions={
          <div className="flex gap-1">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setQuickFilter(f.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  quickFilter === f.key
                    ? 'bg-brand text-brand-fg'
                    : 'border border-border text-muted hover:bg-surface'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Filter banner */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 py-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          Estado
          <DropdownSelect options={ESTADO_OPTIONS} value={estadoFilter} onChange={setEstadoFilter} />
        </span>
        <span className="flex items-center gap-1">
          Prioridad
          <DropdownSelect options={PRIORIDAD_OPTIONS} value={prioridadFilter} onChange={setPrioridadFilter} />
        </span>
      </div>

      {/* KPIs */}
      <div className="flex shrink-0 flex-wrap gap-2">
        {kpis.map((k) => (
          <div key={k.title} className="panel flex-1 min-w-[120px] px-3 py-2.5">
            <p className="text-xs font-medium text-muted">{k.title}</p>
            <p className={`mt-0.5 text-lg font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Table */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-xs font-medium text-muted">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Centro</th>
                  <th className="px-3 py-2">Zona</th>
                  <th className="px-3 py-2">Prioridad</th>
                  <th className="px-3 py-2">Asignada</th>
                  <th className="px-3 py-2">Plazo</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`cursor-pointer transition-colors hover:bg-surface ${selectedId === order.id ? 'bg-surface' : ''}`}
                    onClick={() => setSelectedId(selectedId === order.id ? null : order.id)}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted">{order.id}</td>
                    <td className="max-w-[200px] px-3 py-2">
                      <p className="truncate text-foreground">{order.description}</p>
                    </td>
                    <td className="px-3 py-2 capitalize text-muted">{order.type}</td>
                    <td className="px-3 py-2 text-muted">{buildingMap.get(order.buildingId) ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted">{order.meterId?.slice(0, 8) ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[order.priority]}`}>
                        {order.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{new Date(order.assignedDate).toLocaleDateString('es-CL')}</td>
                    <td className="px-3 py-2 text-xs text-muted">{new Date(order.deadline).toLocaleDateString('es-CL')}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted">Sin órdenes asignadas.</td></tr>
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
              onPause={() => acknowledgeAlert.mutate(selected.alertId)}
              onClose={() => resolveAlert.mutate({ id: selected.alertId })}
              starting={acknowledgeAlert.isPending}
              pausing={acknowledgeAlert.isPending}
              closing={resolveAlert.isPending}
              history={selectedHistory}
              onRegisterIntervention={() => navigate(`/tecnico/intervencion?meter=${selected.meterId ?? ''}`)}
            />
          ) : (
            <div className="panel flex flex-1 items-center justify-center p-4">
              <p className="text-center text-sm text-muted">Selecciona una orden.</p>
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
  onPause: () => void;
  onClose: () => void;
  starting: boolean;
  pausing: boolean;
  closing: boolean;
  history: Alert[];
  onRegisterIntervention: () => void;
}

function OrderDetail({ order, buildingName, onStart, onPause, onClose, starting, pausing, closing, history, onRegisterIntervention }: Readonly<OrderDetailProps>) {
  const details = [
    { label: 'Tipo', value: order.type },
    { label: 'Centro', value: buildingName },
    { label: 'Medidor', value: order.meterId?.slice(0, 8) ?? '—' },
    { label: 'Prioridad', value: order.priority },
    { label: 'Asignada', value: new Date(order.assignedDate).toLocaleDateString('es-CL') },
    { label: 'Plazo', value: new Date(order.deadline).toLocaleDateString('es-CL') },
  ];

  return (
    <>
      <div className="panel px-3 py-3">
        <p className="text-[15px] font-semibold text-foreground">{order.description}</p>
        <p className="mt-1 font-mono text-xs text-muted">{order.id}</p>
      </div>

      <div className="panel px-3 py-3">
        <h4 className="mb-2 text-xs font-medium text-muted">Detalle</h4>
        <dl className="space-y-1.5">
          {details.map((d) => (
            <div key={d.label} className="flex justify-between text-xs">
              <dt className="text-muted">{d.label}</dt>
              <dd className="capitalize font-medium text-foreground">{d.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel space-y-2 px-3 py-3">
        <h4 className="text-xs font-medium text-muted">Acciones</h4>
        <div className="flex gap-2">
          <Button size="sm" onClick={onStart} loading={starting}>Iniciar</Button>
          <Button size="sm" variant="secondary" onClick={onPause} loading={pausing}>Pausar</Button>
          <Button size="sm" variant="secondary" onClick={onClose} loading={closing}>Cerrar</Button>
          <Button size="sm" variant="secondary" onClick={onRegisterIntervention}>Registrar intervención</Button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="panel px-3 py-3">
          <h4 className="mb-2 text-xs font-medium text-muted">Historial del medidor</h4>
          <ul className="space-y-1.5">
            {history.map((a) => (
              <li key={a.id} className="flex justify-between text-xs">
                <span className="text-foreground">{a.message}</span>
                <span className="text-muted">{new Date(a.resolvedAt!).toLocaleDateString('es-CL')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
