import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useAlertsQuery, useAcknowledgeAlert, useResolveAlert } from '../../../hooks/queries/useAlertsQuery';
import type { Alert } from '../../../types/alert';

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

  const filteredOrders = useMemo(() => {
    if (quickFilter === 'all') return orders;
    if (quickFilter === 'overdue') return orders.filter((o) => o.status === 'vencida');
    return orders.filter((o) => o.status === quickFilter);
  }, [orders, quickFilter]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const selectedHistory = useMemo(() => {
    if (!selected?.meterId) return [];
    return allAlerts
      .filter((a) => a.meterId === selected.meterId && a.status === 'resolved' && a.id !== selected.alertId)
      .slice(0, 5);
  }, [allAlerts, selected]);

  const pending = orders.filter((o) => o.status === 'pendiente').length;
    // ... 193 lines omitted
}
    // ... 192 lines omitted
interface OrderDetailProps {
    // ... 191 lines omitted
}
    // ... 190 lines omitted
function OrderDetail({ order, buildingName, onStart, onPause, onClose, starting, pausing, closing, history, onRegisterIntervention }: Readonly<OrderDetailProps>) {
    // ... 189 lines omitted
}
// ... 188 more lines (total: 331)
