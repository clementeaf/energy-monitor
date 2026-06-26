import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { MapView, type BuildingMarkerMeta } from '../../../components/ui/MapView';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import type { Building } from '../../../types/building';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';
import type { Alert } from '../../../types/alert';

/* ── Coverage row per building ── */

interface CoverageRow {
  building: Building;
  totalMeters: number;
  onlineCount: number;
  onlinePct: number;
  alertCount: number;
  lastReading: string | null;
  semaphore: 'green' | 'yellow' | 'red';
}

const COVERAGE_THRESHOLDS: [number, CoverageRow['semaphore']][] = [
  [95, 'green'],
  [85, 'yellow'],
];

function deriveSemaphore(pct: number): CoverageRow['semaphore'] {
  return COVERAGE_THRESHOLDS.find(([threshold]) => pct >= threshold)?.[1] ?? 'red';
}

const SEMAPHORE_DOT: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

function buildCoverageRows(
  buildings: Building[],
  meters: Meter[],
  readings: LatestReading[],
  alerts: Alert[],
): CoverageRow[] {
  const metersByBuilding = new Map<string, Meter[]>();
  meters.forEach((m) => {
    const list = metersByBuilding.get(m.buildingId) ?? [];
    list.push(m);
    metersByBuilding.set(m.buildingId, list);
  });

  const readingMeterIds = new Set(readings.map((r) => r.meter_id));
  const readingByMeter = new Map(readings.map((r) => [r.meter_id, r]));

  const alertsByBuilding = new Map<string, number>();
  alerts.forEach((a) => {
    alertsByBuilding.set(a.buildingId, (alertsByBuilding.get(a.buildingId) ?? 0) + 1);
  });

  return buildings.map((building) => {
    const bMeters = metersByBuilding.get(building.id) ?? [];
    const totalMeters = bMeters.length;
    const onlineCount = bMeters.filter((m) => readingMeterIds.has(m.id)).length;
    const onlinePct = totalMeters > 0 ? (onlineCount / totalMeters) * 100 : 0;

    let lastTs = 0;
    bMeters.forEach((m) => {
      const r = readingByMeter.get(m.id);
      const ts = r ? new Date(r.timestamp).getTime() : 0;
      lastTs = Math.max(lastTs, ts);
    });

    return {
      building,
      totalMeters,
      onlineCount,
      onlinePct,
      alertCount: alertsByBuilding.get(building.id) ?? 0,
      lastReading: lastTs > 0
        ? new Date(lastTs).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
        : null,
      semaphore: deriveSemaphore(onlinePct),
    };
  });
}

/* ── Metric selector ── */

interface MetricOption { key: string; label: string }

const METRIC_OPTIONS: MetricOption[] = [
  { key: 'online', label: '% Online' },
  { key: 'alerts', label: 'Alertas' },
  { key: 'last', label: 'Última lectura' },
];

/* ── Page ── */

export function MapaCoberturaPage() {
  const navigate = useNavigate();
  const [metric, setMetric] = useState('online');
  const [search, setSearch] = useState('');

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];

  // Coverage rows
  const coverageRows = useMemo(
    () => buildCoverageRows(buildings, meters, readings, alerts)
      .sort((a, b) => a.onlinePct - b.onlinePct), // worst first
    [buildings, meters, readings, alerts],
  );

  // Search filter
  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return q ? coverageRows.filter((r) => r.building.name.toLowerCase().includes(q)) : coverageRows;
  }, [coverageRows, search]);

  // Geo buildings for map
  const geoBuildings = useMemo(
    () => buildings.filter((b): b is Building & { latitude: number; longitude: number } =>
      b.latitude != null && b.longitude != null,
    ),
    [buildings],
  );

  // Colored markers by % online
  const buildingMeta = useMemo(() => {
    const map = new Map<string, BuildingMarkerMeta>();
    coverageRows.forEach((r) => {
      const color = r.onlinePct >= 95 ? '#22c55e' : r.onlinePct >= 85 ? '#f59e0b' : '#ef4444';
      const popupHtml = `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
        <strong style="font-size:13px">${r.building.name}</strong>
        <p style="margin:3px 0 0;font-size:12px">${r.onlinePct.toFixed(0)}% online (${r.onlineCount}/${r.totalMeters})</p>
        ${r.alertCount > 0 ? `<p style="margin:2px 0 0;font-size:11px;color:#ef4444">${r.alertCount} alertas</p>` : ''}
      </div>`;
      map.set(r.building.id, { color, popupHtml });
    });
    return map;
  }, [coverageRows]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Mapa de Cobertura"
        eyebrow="Cobertura"
        actions={
          <PillToggle
            options={METRIC_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
            value={metric}
            onChange={setMetric}
            size="sm"
          />
        }
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Map */}
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
          <MapView buildings={geoBuildings} buildingMeta={buildingMeta} className="h-full w-full" />
        </div>

        {/* Side panel */}
        <div className="flex w-72 shrink-0 flex-col gap-3 overflow-hidden">
          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar centro..."
            className="w-full shrink-0 rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none transition-colors focus:border-brand"
          />

          {/* Mall list */}
          <div className="panel min-h-0 flex-1 overflow-y-auto">
            <ul className="divide-y divide-border">
              {filteredRows.map((row) => {
                const dot = SEMAPHORE_DOT[row.semaphore];
                return (
                  <li key={row.building.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/meters?building=${row.building.id}`)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface"
                    >
                      <span className={`inline-block size-2.5 shrink-0 rounded-full ${dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{row.building.name}</p>
                        <p className="text-[11px] text-muted">
                          {row.onlinePct.toFixed(0)}% online · {row.totalMeters} med.
                          {row.alertCount > 0 && ` · ${row.alertCount} alertas`}
                        </p>
                        {row.lastReading && (
                          <p className="text-[10px] text-muted">Últ: {row.lastReading}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
              {filteredRows.length === 0 && (
                <li className="px-3 py-6 text-center text-[12px] text-muted">
                  Sin resultados.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
