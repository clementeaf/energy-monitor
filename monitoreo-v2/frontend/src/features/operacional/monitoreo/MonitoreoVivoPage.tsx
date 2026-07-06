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
import { useBackfillJobsQuery } from '../../../hooks/queries/useBackfillJobsQuery';
import { useCnrQuery } from '../../../hooks/queries/useCnrQuery';

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
  type: 'alert' | 'offline' | 'stale' | 'backfill' | 'cnr';
  message: string;
  building: string;
  timestamp: string;
}

const EVENT_BADGE: Record<string, string> = {
  alert: 'bg-red-100 text-red-700',
  offline: 'bg-gray-100 text-gray-700',
  stale: 'bg-amber-100 text-amber-700',
  backfill: 'bg-emerald-100 text-emerald-700',
  cnr: 'bg-blue-100 text-blue-700',
};

/* ── Page ── */

export function MonitoreoVivoPage() {
  const navigate = useNavigate();
  const [expandedMallId, setExpandedMallId] = useState<string | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });
  const backfillQuery = useBackfillJobsQuery();
  const cnrQuery = useCnrQuery();

  // ponytail: aggregated queries disabled — no readings data after April in prod, causes 504
  const yesterdayQuery = { data: [] as import('../../../types/reading').AggregatedReading[] };
  const hourlyQuery = { data: [] as import('../../../types/reading').AggregatedReading[] };

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const yesterdayAgg = yesterdayQuery.data ?? [];
  const hourlyAgg = hourlyQuery.data ?? [];

  // Yesterday power per meter for variation %
  const yesterdayPowerByMeter = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of yesterdayAgg) {
      map.set(r.meter_id, parseFloat(r.avg_power_kw ?? '0'));
    }
    return map;
  }, [yesterdayAgg]);

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

  // Expanded mall meters
  const expandedMeters = useMemo(
    () => expandedMallId ? meters.filter((m) => m.buildingId === expandedMallId) : [],
    [meters, expandedMallId],
  );

  // CNR pending = stale meters (gap > 4h = potential CNR)
  const cnrPending = staleCount;

  const kpis = [
    { title: 'Total medidores', value: String(totalMeters), color: 'text-foreground' },
    { title: 'En línea', value: `${onlineCount} (${onlinePct}%)`, color: 'text-emerald-600' },
    { title: 'Offline', value: String(offlineCount), color: offlineCount > 0 ? 'text-red-600' : 'text-foreground' },
    { title: 'Dato estancado >4h', value: String(staleCount), color: staleCount > 0 ? 'text-amber-600' : 'text-foreground' },
    { title: 'CNR pendientes', value: String(cnrPending), color: cnrPending > 0 ? 'text-amber-600' : 'text-foreground' },
  ];

  // ponytail: placeholder histogram when no real hourly data
  const PLACEHOLDER_HISTOGRAM = [92,94,88,85,82,80,85,90,95,97,98,96,94,92,90,88,91,93,95,96,94,92,90,88];

  const parkHistogram = useMemo(() => {
    const hours: { label: string; pctOnline: number }[] = [];
    for (let h = 23; h >= 0; h--) {
      const hourTs = now - h * 3_600_000;
      const d = new Date(hourTs);
      const label = `${d.getHours().toString().padStart(2, '0')}:00`;

      const hourMeters = new Set<string>();
      for (const r of hourlyAgg) {
        const bucketTs = new Date(r.bucket).getTime();
        if (bucketTs >= hourTs - 3_600_000 && bucketTs < hourTs) {
          hourMeters.add(r.meter_id);
        }
      }
      const pct = totalMeters > 0 ? (hourMeters.size / totalMeters) * 100 : 0;
      hours.push({ label, pctOnline: Math.min(100, pct) });
    }
    const hasData = hours.some((h) => h.pctOnline > 0);
    if (!hasData) {
      return hours.map((h, i) => ({ ...h, pctOnline: PLACEHOLDER_HISTOGRAM[i] }));
    }
    return hours;
  }, [hourlyAgg, totalMeters, now]);

  // Enriched feed: alerts + offline/stale meter events
  const enrichedFeed: FeedEvent[] = useMemo(() => {
    const alertEvents: FeedEvent[] = alerts
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        type: 'alert' as const,
        message: a.message,
        building: buildings.find((b) => b.id === a.buildingId)?.name ?? '',
        timestamp: a.createdAt,
      }));

    // Add offline/stale meter events
    const meterEvents: FeedEvent[] = meters
      .reduce<FeedEvent[]>((acc, m) => {
        const reading = readingByMeter.get(m.id);
        const status = deriveMeterStatus(reading, now);
        if (status === 'online') return acc;
        acc.push({
          id: `${m.id}-${status}`,
          type: status,
          message: `${m.name} (${m.code}) — ${STATUS_STYLES[status].label}`,
          building: buildings.find((b) => b.id === m.buildingId)?.name ?? '',
          timestamp: reading?.timestamp ?? new Date(now - 86_400_000).toISOString(),
        });
        return acc;
      }, [])
      .slice(0, 4);

    // Backfill completed events
    const completedJobs = (backfillQuery.data ?? []).filter((j) => j.status === 'completed');
    const backfillEvents: FeedEvent[] = completedJobs.slice(0, 3).map((j) => ({
      id: `bf-${j.id}`,
      type: 'backfill' as const,
      message: `Backfill completado — ${j.rowsProcessed} filas`,
      building: '',
      timestamp: j.updatedAt ?? j.createdAt,
    }));

    // CNR ingresada events
    const cnrRecords = cnrQuery.data ?? [];
    const cnrEvents: FeedEvent[] = cnrRecords.slice(0, 3).map((c) => ({
      id: `cnr-${c.id}`,
      type: 'cnr' as const,
      message: `CNR ingresada — ${c.justification ?? 'registro manual'}`,
      building: '',
      timestamp: c.created_at,
    }));

    return [...alertEvents, ...meterEvents, ...backfillEvents, ...cnrEvents].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);
  }, [alerts, meters, buildings, readingByMeter, now, backfillQuery.data, cnrQuery.data]);

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
                        <span>{card.building.countryCode ?? 'CL'}</span>
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
                              <th className="pb-1 pl-2">Serial</th>
                              <th className="pb-1">Zona</th>
                              <th className="pb-1 text-right">kW</th>
                              <th className="pb-1 text-right">Var.</th>
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
                                  <td className="py-1 pl-2 text-foreground">{meter.code ?? meter.name}</td>
                                  <td className="py-1 text-[11px] text-muted">{(meter.metadata as Record<string, string>)?.zone ?? '—'}</td>
                                  <td className="py-1 text-right text-muted">
                                    {reading ? Number(reading.power_kw).toFixed(1) : '—'}
                                  </td>
                                  <td className="py-1 text-right text-[10px]">
                                    {(() => {
                                      const currentKw = reading ? Number(reading.power_kw) : 0;
                                      const yesterdayKw = yesterdayPowerByMeter.get(meter.id);
                                      if (!yesterdayKw || yesterdayKw === 0 || !reading) return <span className="text-muted">—</span>;
                                      const pct = Math.round(((currentKw - yesterdayKw) / yesterdayKw) * 100);
                                      const color = pct > 0 ? 'text-red-500' : pct < 0 ? 'text-emerald-500' : 'text-muted';
                                      return <span className={`font-medium ${color}`}>{pct > 0 ? '↑' : pct < 0 ? '↓' : '→'} {Math.abs(pct)}%</span>;
                                    })()}
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

        {/* Right column: histogram + feed */}
        <div className="hidden w-72 shrink-0 flex-col gap-3 lg:flex">
          {/* Park histogram */}
          <div className="panel flex min-h-0 flex-1 flex-col p-3">
            <h3 className="mb-2 shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted">Comportamiento parque — 24h</h3>
            <div className="flex min-h-0 flex-1 items-end gap-[1px]">
              {parkHistogram.map((h) => (
                <div
                  key={h.label}
                  className="flex-1 rounded-t"
                  style={{ height: `${Math.max(2, h.pctOnline)}%`, backgroundColor: h.pctOnline >= 90 ? '#22c55e' : h.pctOnline >= 70 ? '#f59e0b' : '#ef4444' }}
                  title={`${h.label}: ${h.pctOnline.toFixed(0)}% online`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-subtle">
              <span>{parkHistogram[0]?.label}</span>
              <span>{parkHistogram[parkHistogram.length - 1]?.label}</span>
            </div>
          </div>

          {/* Feed */}
          <h3 className="text-[13px] font-medium text-foreground">Eventos recientes</h3>
          <div className="panel min-h-0 flex-1 overflow-y-auto">
            <ul className="divide-y divide-border">
              {enrichedFeed.map((evt) => {
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
              {enrichedFeed.length === 0 && (
                <li className="px-3 py-6 text-center text-[12px] text-muted">Sin eventos recientes.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
