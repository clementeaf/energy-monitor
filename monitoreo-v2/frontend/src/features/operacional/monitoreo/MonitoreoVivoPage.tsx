import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import type { Building } from '../../../types/building';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';
import type { Alert } from '../../../types/alert';

/* ── Meter status derivation ── */

type MeterStatus = 'online' | 'offline' | 'stale';

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

const STATUS_STYLES: Record<MeterStatus, { dot: string; label: string }> = {
  online: { dot: 'bg-emerald-500', label: 'En línea' },
  offline: { dot: 'bg-red-500', label: 'Offline' },
  stale: { dot: 'bg-amber-500', label: 'Dato estancado' },
};

function deriveMeterStatus(reading: LatestReading | undefined, now: number): MeterStatus {
  const statusMap: [boolean, MeterStatus][] = [
    [!reading, 'offline'],
    [!!reading && (now - new Date(reading!.timestamp).getTime()) > STALE_THRESHOLD_MS, 'stale'],
  ];
  return statusMap.find(([cond]) => cond)?.[1] ?? 'online';
}

/* ── Mall card data ── */

interface MallCard {
  building: Building;
  totalMeters: number;
  onlineCount: number;
  offlineCount: number;
  staleCount: number;
  onlinePct: number;
  lastReading: string | null;
  semaphore: 'green' | 'yellow' | 'red';
  alertCount: number;
}

const SEMAPHORE_THRESHOLDS: [number, MallCard['semaphore']][] = [
  [95, 'green'],
  [85, 'yellow'],
];

function deriveSemaphore(pct: number): MallCard['semaphore'] {
  return SEMAPHORE_THRESHOLDS.find(([threshold]) => pct >= threshold)?.[1] ?? 'red';
}

const SEMAPHORE_STYLES: Record<string, string> = {
  green: 'border-emerald-500 bg-emerald-50',
  yellow: 'border-amber-500 bg-amber-50',
  red: 'border-red-500 bg-red-50',
};

function buildMallCards(
  buildings: Building[],
  meters: Meter[],
  readings: LatestReading[],
  alerts: Alert[],
  now: number,
): MallCard[] {
  const metersByBuilding = new Map<string, Meter[]>();
  meters.forEach((m) => {
    const list = metersByBuilding.get(m.buildingId) ?? [];
    list.push(m);
    metersByBuilding.set(m.buildingId, list);
  });

  const readingByMeter = new Map(readings.map((r) => [r.meter_id, r]));

  const alertsByBuilding = new Map<string, number>();
  alerts.forEach((a) => {
    alertsByBuilding.set(a.buildingId, (alertsByBuilding.get(a.buildingId) ?? 0) + 1);
  });

  return buildings.map((building) => {
    const bMeters = metersByBuilding.get(building.id) ?? [];
    const totalMeters = bMeters.length;

    let onlineCount = 0;
    let offlineCount = 0;
    let staleCount = 0;
    let lastTs = 0;

    bMeters.forEach((meter) => {
      const reading = readingByMeter.get(meter.id);
      const status = deriveMeterStatus(reading, now);
      const counters: Record<MeterStatus, () => void> = {
        online: () => { onlineCount++; },
        offline: () => { offlineCount++; },
        stale: () => { staleCount++; },
      };
      counters[status]();
      const ts = reading ? new Date(reading.timestamp).getTime() : 0;
      lastTs = Math.max(lastTs, ts);
    });

    const onlinePct = totalMeters > 0 ? (onlineCount / totalMeters) * 100 : 0;

    return {
      building,
      totalMeters,
      onlineCount,
      offlineCount,
      staleCount,
      onlinePct,
      lastReading: lastTs > 0 ? new Date(lastTs).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : null,
      semaphore: deriveSemaphore(onlinePct),
      alertCount: alertsByBuilding.get(building.id) ?? 0,
    };
  });
}

/* ── Event feed item ── */

interface FeedEvent {
  id: string;
  type: 'alert' | 'offline' | 'stale';
  message: string;
  building: string;
  timestamp: string;
}

const EVENT_BADGE: Record<string, string> = {
  alert: 'bg-red-100 text-red-700',
  offline: 'bg-gray-100 text-gray-700',
  stale: 'bg-amber-100 text-amber-700',
};

/* ── Page ── */

export function MonitoreoVivoPage() {
  const navigate = useNavigate();
  const [expandedMallId, setExpandedMallId] = useState<string | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];

  const now = Date.now();

  // Mall cards
  const mallCards = useMemo(
    () => buildMallCards(buildings, meters, readings, alerts, now)
      .sort((a, b) => a.onlinePct - b.onlinePct), // worst first
    [buildings, meters, readings, alerts, now],
  );

  // Portfolio KPIs
  const totalMeters = meters.length;
  const readingByMeter = useMemo(() => new Map(readings.map((r) => [r.meter_id, r])), [readings]);
  const onlineCount = useMemo(
    () => meters.filter((m) => deriveMeterStatus(readingByMeter.get(m.id), now) === 'online').length,
    [meters, readingByMeter, now],
  );
  const offlineCount = useMemo(
    () => meters.filter((m) => deriveMeterStatus(readingByMeter.get(m.id), now) === 'offline').length,
    [meters, readingByMeter, now],
  );
  const staleCount = useMemo(
    () => meters.filter((m) => deriveMeterStatus(readingByMeter.get(m.id), now) === 'stale').length,
    [meters, readingByMeter, now],
  );
  const onlinePct = totalMeters > 0 ? ((onlineCount / totalMeters) * 100).toFixed(1) : '0';

  // Feed events (alerts as events)
  const feedEvents: FeedEvent[] = useMemo(
    () => alerts
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        type: 'alert' as const,
        message: a.message,
        building: buildings.find((b) => b.id === a.buildingId)?.name ?? '',
        timestamp: a.createdAt,
      })),
    [alerts, buildings],
  );

  // Expanded mall meters
  const expandedMeters = useMemo(
    () => expandedMallId ? meters.filter((m) => m.buildingId === expandedMallId) : [],
    [meters, expandedMallId],
  );

  const kpis = [
    { title: 'Total medidores', value: String(totalMeters), color: 'text-foreground' },
    { title: 'En línea', value: `${onlineCount} (${onlinePct}%)`, color: 'text-emerald-600' },
    { title: 'Offline', value: String(offlineCount), color: offlineCount > 0 ? 'text-red-600' : 'text-foreground' },
    { title: 'Dato estancado >4h', value: String(staleCount), color: staleCount > 0 ? 'text-amber-600' : 'text-foreground' },
    { title: 'Alertas activas', value: String(alerts.length), color: alerts.length > 0 ? 'text-red-600' : 'text-emerald-600' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Monitoreo en Vivo" eyebrow="Monitoreo" />

      {/* KPI header */}
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.title} className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`mt-0.5 text-lg font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Mall grid */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <h3 className="mb-2 shrink-0 text-[13px] font-medium text-foreground">Centros comerciales</h3>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mallCards.map((card) => {
                const isExpanded = expandedMallId === card.building.id;
                const semStyle = SEMAPHORE_STYLES[card.semaphore] ?? '';
                return (
                  <div key={card.building.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedMallId(isExpanded ? null : card.building.id)}
                      className={`w-full rounded-lg border-l-4 p-3 text-left transition-colors hover:bg-surface ${semStyle}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-medium text-foreground">{card.building.name}</p>
                        {card.alertCount > 0 && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            {card.alertCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted">
                        <span>{card.onlinePct.toFixed(0)}% online</span>
                        <span>{card.totalMeters} med.</span>
                        {card.lastReading && <span>Últ: {card.lastReading}</span>}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-1 rounded-lg border border-border bg-surface/50 p-2">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                              <th className="pb-1 pl-2">Medidor</th>
                              <th className="pb-1 text-right">kW</th>
                              <th className="pb-1 text-right">Última lectura</th>
                              <th className="pb-1 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {expandedMeters.map((meter) => {
                              const reading = readingByMeter.get(meter.id);
                              const status = deriveMeterStatus(reading, now);
                              const sStyle = STATUS_STYLES[status];
                              return (
                                <tr
                                  key={meter.id}
                                  className="cursor-pointer transition-colors hover:bg-background"
                                  onClick={() => navigate(`/monitoring/meter/${meter.id}`)}
                                >
                                  <td className="py-1 pl-2 text-foreground">{meter.name}</td>
                                  <td className="py-1 text-right text-muted">
                                    {reading ? Number(reading.power_kw).toFixed(1) : '—'}
                                  </td>
                                  <td className="py-1 text-right text-muted">
                                    {reading
                                      ? new Date(reading.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                                      : '—'}
                                  </td>
                                  <td className="py-1 text-center">
                                    <span className={`inline-block size-2 rounded-full ${sStyle.dot}`} title={sStyle.label} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="hidden w-72 shrink-0 flex-col lg:flex">
          <h3 className="mb-2 text-[13px] font-medium text-foreground">Eventos recientes</h3>
          <div className="panel min-h-0 flex-1 overflow-y-auto">
            <ul className="divide-y divide-border">
              {feedEvents.map((evt) => {
                const badge = EVENT_BADGE[evt.type] ?? '';
                return (
                  <li key={evt.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge}`}>
                        {evt.type.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-muted">{evt.building}</span>
                    </div>
                    <p className="mt-1 text-[12px] text-foreground">{evt.message}</p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {new Date(evt.timestamp).toLocaleString('es-CL', {
                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
                      })}
                    </p>
                  </li>
                );
              })}
              {feedEvents.length === 0 && (
                <li className="px-3 py-6 text-center text-[12px] text-muted">Sin eventos recientes.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
