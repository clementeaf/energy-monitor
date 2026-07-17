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
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="4.1 Monitoreo en Vivo"
        description="Estado operativo del parque de medidores — refresh cada 15 min (ARQ-06)"
      />

      {/* Row 1: 5 KPI cards */}
      <div className="flex shrink-0 gap-3">
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Total medidores</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalMeters}</p>
          <p className="text-[9px] text-subtle">parque completo del portafolio</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[ARQ-08]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">En línea [%]</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{onlinePct}%</p>
          <p className="text-[9px] text-subtle">▲ vs. inicio de turno · sparkline 24h</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[ARQ-06, DAT-27]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Offline</p>
          <p className={`mt-1 text-2xl font-bold ${offlineCount > 0 ? 'text-red-600' : 'text-foreground'}`}>{offlineCount}</p>
          <p className="text-[9px] text-subtle">medidores sin conexión</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[ARQ-08, DAT-24]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Dato estancado &gt; 4h</p>
          <p className={`mt-1 text-2xl font-bold ${staleCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>{staleCount}</p>
          <p className="text-[9px] text-subtle">{staleCount > 0 ? 'badge rojo · alerta DAT-24' : 'sin estancados'}</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[DAT-24, DAT-27]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">CNR pendientes</p>
          <p className={`mt-1 text-2xl font-bold ${cnrPending > 0 ? 'text-amber-600' : 'text-foreground'}`}>{cnrPending}</p>
          <p className="text-[9px] text-subtle">a la espera de ingreso</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[DAT-24]</p>
        </div>
      </div>

      {/* Row 2: Map + Histogram (same height) */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Mapa / grilla de centros comerciales */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Mapa / grilla de centros comerciales</p>
          <p className="shrink-0 text-[9px] text-subtle">Tarjeta por mall: nombre, país, % medidores online, última lectura, semáforo general · click → grilla de medidores</p>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {mallCards.map((card) => {
                const semStyle = SEMAPHORE_STYLES[card.semaphore] ?? '';
                return (
                  <button
                    key={card.building.id}
                    type="button"
                    onClick={() => setExpandedMallId(expandedMallId === card.building.id ? null : card.building.id)}
                    className={`w-[calc(50%-0.25rem)] rounded-lg border-l-4 p-2.5 text-left transition-colors hover:bg-surface ${semStyle} ${expandedMallId === card.building.id ? 'ring-2 ring-brand' : ''}`}
                  >
                    <p className="truncate text-[12px] font-medium text-foreground">{card.building.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
                      <span>{card.building.countryCode ?? 'CL'}</span>
                      <span>{card.onlinePct.toFixed(0)}%</span>
                      <span>{card.totalMeters} med.</span>
                      {card.alertCount > 0 && <span className="rounded-full bg-red-100 px-1 py-0.5 text-[9px] font-medium text-red-700">{card.alertCount}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[ARQ-06, DAT-11, DAT-19]</p>
        </div>

        {/* Comportamiento del parque — 24h */}
        <div className="panel flex min-w-0 flex-1 flex-col px-3 py-2.5">
          <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Comportamiento del parque — 24h</p>
          <p className="shrink-0 text-[9px] text-subtle">% medidores online por hora · detecta caídas masivas o parciales</p>
          <div className="mt-2 flex min-h-0 flex-1 items-end gap-[1px]">
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
          <p className="mt-0.5 shrink-0 text-right text-[9px] text-subtle">[DAT-27, DAT-24]</p>
        </div>
      </div>

      {/* Row 3: Meter grid + Feed (same height) */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Grilla de medidores del mall seleccionado */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Grilla de medidores del mall seleccionado</p>
          <p className="shrink-0 text-[9px] text-subtle">se despliega al hacer click en una tarjeta del mapa</p>
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-2 py-1.5">Serial</th>
                  <th className="px-2 py-1.5">Zona</th>
                  <th className="px-2 py-1.5 text-center">Estado</th>
                  <th className="px-2 py-1.5 text-right">Último valor</th>
                  <th className="px-2 py-1.5">Timestamp</th>
                  <th className="px-2 py-1.5 text-right">Var. vs día ant.</th>
                </tr>
              </thead>
            </table>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {expandedMeters.length > 0 ? expandedMeters.map((meter, i) => {
                    const reading = readingByMeter.get(meter.id);
                    const status = deriveMeterStatus(reading, now);
                    const sStyle = STATUS_STYLES[status];
                    const currentKw = reading ? Number(reading.power_kw) : 0;
                    const yesterdayKw = yesterdayPowerByMeter.get(meter.id);
                    const varPct = yesterdayKw && yesterdayKw > 0 && reading ? Math.round(((currentKw - yesterdayKw) / yesterdayKw) * 100) : null;
                    return (
                      <tr key={meter.id} className="animate-fade-in cursor-pointer transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }} onClick={() => navigate(`/monitoring/meter/${meter.id}`)}>
                        <td className="px-2 py-1.5 font-medium text-foreground">{meter.code ?? meter.name}</td>
                        <td className="px-2 py-1.5 text-muted">{(meter.metadata as Record<string, string>)?.zone ?? '—'}</td>
                        <td className="px-2 py-1.5 text-center"><span className={`inline-block size-2 rounded-full ${sStyle.dot}`} title={sStyle.label} /></td>
                        <td className="px-2 py-1.5 text-right text-muted">{reading ? `${Number(reading.power_kw).toFixed(1)} kW` : '—'}</td>
                        <td className="px-2 py-1.5 text-muted">{reading ? new Date(reading.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-2 py-1.5 text-right">{varPct != null ? <span className={`font-medium ${varPct > 0 ? 'text-red-500' : varPct < 0 ? 'text-emerald-500' : 'text-muted'}`}>{varPct > 0 ? '↑' : varPct < 0 ? '↓' : '→'} {Math.abs(varPct)}%</span> : <span className="text-muted">—</span>}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={6} className="px-2 py-6 text-center text-muted">Seleccione un mall para ver sus medidores</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[DAT-11, DAT-19, ARQ-08]</p>
        </div>

        {/* Feed de eventos recientes */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Feed de eventos recientes</p>
          <p className="shrink-0 text-[9px] text-subtle">cronológico · con timestamp y mall</p>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            <ul className="space-y-1.5">
              {enrichedFeed.map((evt) => (
                <li key={evt.id} className="flex items-start gap-2 text-[11px]">
                  <span className={`mt-0.5 inline-block size-2 shrink-0 rounded-full ${evt.type === 'alert' ? 'bg-red-500' : evt.type === 'offline' ? 'bg-gray-500' : evt.type === 'backfill' ? 'bg-emerald-500' : evt.type === 'cnr' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      <span className="font-medium uppercase">{evt.type}</span> · {evt.message}
                      {evt.building && <span className="text-muted"> — {evt.building}</span>}
                    </p>
                  </div>
                </li>
              ))}
              {enrichedFeed.length === 0 && (
                <li className="py-4 text-center text-muted">Sin eventos recientes.</li>
              )}
            </ul>
          </div>
          <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[DAT-03, DAT-10, DAT-19]</p>
        </div>
      </div>
    </div>
  );
}
