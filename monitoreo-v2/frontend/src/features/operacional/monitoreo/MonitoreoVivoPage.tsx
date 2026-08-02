import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useBackfillJobsQuery } from '../../../hooks/queries/useBackfillJobsQuery';
import { useCnrQuery } from '../../../hooks/queries/useCnrQuery';
import { useOperatorFilter } from '../../../hooks/useOperatorFilter';
import type { AggregatedReading } from '../../../types/reading';
import { MallGrid } from './MallGrid';
import { ParkHistogram } from './ParkHistogram';
import { MeterGrid } from './MeterGrid';
import { EventFeed } from './EventFeed';
import {
  deriveMeterStatus, buildMallCards, PLACEHOLDER_MALL_CARDS,
  PLACEHOLDER_HISTOGRAM, PAIS_OPTIONS, STATUS_STYLES,
  type FeedEvent,
} from './monitoreo-utils';

type MonitoreoTab = 'panorama' | 'medidores' | 'eventos';

export function MonitoreoVivoPage() {
  const [expandedMallId, setExpandedMallId] = useState<string | null>(null);
  const [paisFilter, setPaisFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<MonitoreoTab>('panorama');

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });
  const backfillQuery = useBackfillJobsQuery();
  const cnrQuery = useCnrQuery();

  const yesterdayQuery = { data: [] as AggregatedReading[] };
  const hourlyQuery = { data: [] as AggregatedReading[] };

  const { isFilteredMode, needsSelection, operatorBuildingIds, operatorMeterIds } = useOperatorFilter();

  const rawBuildings = buildingsQuery.data ?? [];
  const buildings = useMemo(() => {
    if (!isFilteredMode || !operatorBuildingIds) return rawBuildings;
    return rawBuildings.filter((b) => operatorBuildingIds.has(b.id));
  }, [rawBuildings, isFilteredMode, operatorBuildingIds]);

  const rawMeters = metersQuery.data ?? [];
  const meters = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawMeters;
    return rawMeters.filter((m) => operatorMeterIds.has(m.id));
  }, [rawMeters, isFilteredMode, operatorMeterIds]);

  const rawReadings = latestQuery.data ?? [];
  const readings = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawReadings;
    return rawReadings.filter((r) => operatorMeterIds.has(r.meter_id));
  }, [rawReadings, isFilteredMode, operatorMeterIds]);

  const rawAlerts = alertsQuery.data ?? [];
  const alerts = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawAlerts;
    return rawAlerts.filter((a) => a.meterId && operatorMeterIds.has(a.meterId));
  }, [rawAlerts, isFilteredMode, operatorMeterIds]);

  const yesterdayAgg = yesterdayQuery.data;
  const hourlyAgg = hourlyQuery.data;
  const now = Date.now();

  const yesterdayPowerByMeter = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of yesterdayAgg) map.set(r.meter_id, parseFloat(r.avg_power_kw ?? '0'));
    return map;
  }, [yesterdayAgg]);

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground">Selecciona un edificio</p>
          <p className="mt-1 text-sm text-muted">Usa el selector en la barra superior para elegir un edificio.</p>
        </div>
      </div>
    );
  }

  const mallCards = buildMallCards(buildings, meters, readings, alerts, now)
    .sort((a, b) => a.onlinePct - b.onlinePct);

  const readingByMeter = new Map(readings.map((r) => [r.meter_id, r]));

  // KPIs
  const totalMeters = meters.length > 0 ? meters.length : PLACEHOLDER_MALL_CARDS.reduce((s, c) => s + c.totalMeters, 0);
  const onlineCount = meters.length > 0
    ? meters.filter((m) => deriveMeterStatus(readingByMeter.get(m.id), now) === 'online').length
    : PLACEHOLDER_MALL_CARDS.reduce((s, c) => s + c.onlineCount, 0);
  const offlineCount = meters.length > 0
    ? meters.filter((m) => deriveMeterStatus(readingByMeter.get(m.id), now) === 'offline').length
    : PLACEHOLDER_MALL_CARDS.reduce((s, c) => s + c.offlineCount, 0);
  const staleCount = meters.length > 0
    ? meters.filter((m) => deriveMeterStatus(readingByMeter.get(m.id), now) === 'stale').length
    : PLACEHOLDER_MALL_CARDS.reduce((s, c) => s + c.staleCount, 0);
  const onlinePct = totalMeters > 0 ? ((onlineCount / totalMeters) * 100).toFixed(1) : '0';

  const expandedMeters = expandedMallId ? meters.filter((m) => m.buildingId === expandedMallId) : [];

  // Park histogram
  const parkHistogram = useMemo(() => {
    const hours: { label: string; pctOnline: number }[] = [];
    for (let h = 23; h >= 0; h--) {
      const hourTs = now - h * 3_600_000;
      const d = new Date(hourTs);
      const label = `${d.getHours().toString().padStart(2, '0')}:00`;
      const hourMeters = new Set<string>();
      for (const r of hourlyAgg) {
        const bucketTs = new Date(r.bucket).getTime();
        if (bucketTs >= hourTs - 3_600_000 && bucketTs < hourTs) hourMeters.add(r.meter_id);
      }
      const pct = totalMeters > 0 ? (hourMeters.size / totalMeters) * 100 : 0;
      hours.push({ label, pctOnline: Math.min(100, pct) });
    }
    const hasData = hours.some((h) => h.pctOnline > 0);
    if (!hasData) return hours.map((h, i) => ({ ...h, pctOnline: PLACEHOLDER_HISTOGRAM[i] }));
    return hours;
  }, [hourlyAgg, totalMeters, now]);

  // Event feed
  const enrichedFeed: FeedEvent[] = useMemo(() => {
    const alertEvents: FeedEvent[] = alerts
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map((a) => ({ id: a.id, type: 'alert', message: a.message, building: buildings.find((b) => b.id === a.buildingId)?.name ?? '', timestamp: a.createdAt }));

    const meterEvents: FeedEvent[] = meters
      .reduce<FeedEvent[]>((acc, m) => {
        const reading = readingByMeter.get(m.id);
        const status = deriveMeterStatus(reading, now);
        if (status === 'online') return acc;
        acc.push({ id: `${m.id}-${status}`, type: status, message: `${m.name} (${m.code}) — ${STATUS_STYLES[status].label}`, building: buildings.find((b) => b.id === m.buildingId)?.name ?? '', timestamp: reading?.timestamp ?? new Date(now - 86_400_000).toISOString() });
        return acc;
      }, []).slice(0, 4);

    const backfillEvents: FeedEvent[] = ((backfillQuery.data ?? []).filter((j) => j.status === 'completed')).slice(0, 3)
      .map((j) => ({ id: `bf-${j.id}`, type: 'backfill' as const, message: `Backfill completado — ${j.rowsProcessed} filas`, building: '', timestamp: j.updatedAt ?? j.createdAt }));

    const cnrEvents: FeedEvent[] = (cnrQuery.data ?? []).slice(0, 3)
      .map((c) => ({ id: `cnr-${c.id}`, type: 'cnr' as const, message: `CNR ingresada — ${c.justification ?? 'registro manual'}`, building: '', timestamp: c.created_at }));

    return [...alertEvents, ...meterEvents, ...backfillEvents, ...cnrEvents].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);
  }, [alerts, meters, buildings, readingByMeter, now, backfillQuery.data, cnrQuery.data]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader title="Monitoreo en Vivo" />

      {/* Filters */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 py-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          País
          <DropdownSelect options={PAIS_OPTIONS} value={paisFilter} onChange={setPaisFilter} />
        </span>
      </div>

      {/* KPI cards */}
      <div className="flex shrink-0 gap-3">
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-xs font-medium text-muted">Total medidores</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalMeters}</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-xs font-medium text-muted">En línea</p>
          <p className="mt-1 text-2xl font-bold text-success">{onlinePct}%</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-xs font-medium text-muted">Offline</p>
          <p className={`mt-1 text-2xl font-bold ${offlineCount > 0 ? 'text-danger' : 'text-foreground'}`}>{offlineCount}</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-xs font-medium text-muted">Estancado &gt;4h</p>
          <p className={`mt-1 text-2xl font-bold ${staleCount > 0 ? 'text-warning' : 'text-foreground'}`}>{staleCount}</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-xs font-medium text-muted">CNR pendientes</p>
          <p className={`mt-1 text-2xl font-bold ${staleCount > 0 ? 'text-warning' : 'text-foreground'}`}>{staleCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-border">
        {([
          { key: 'panorama' as const, label: 'Panorama' },
          { key: 'medidores' as const, label: `Medidores${expandedMallId ? ' — ' + (mallCards.find((c) => c.building.id === expandedMallId)?.building.name ?? '') : ''}` },
          { key: 'eventos' as const, label: 'Eventos' },
        ]).map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${activeTab === tab.key ? 'border-b-2 border-foreground text-foreground' : 'text-muted hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex min-h-0 flex-1 gap-3">
        {activeTab === 'panorama' && (
          <>
            <MallGrid mallCards={mallCards} expandedMallId={expandedMallId} onSelectMall={(id) => { setExpandedMallId(id || null); if (id) setActiveTab('medidores'); }} />
            <ParkHistogram data={parkHistogram} />
          </>
        )}
        {activeTab === 'medidores' && (
          <MeterGrid meters={expandedMeters} readingByMeter={readingByMeter} yesterdayPowerByMeter={yesterdayPowerByMeter} now={now} />
        )}
        {activeTab === 'eventos' && (
          <EventFeed events={enrichedFeed} />
        )}
      </div>
    </div>
  );
}
