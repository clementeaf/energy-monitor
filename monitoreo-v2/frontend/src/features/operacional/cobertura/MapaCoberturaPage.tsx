import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
// ponytail: PillToggle replaced per wireframe
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


/* ── Page ── */

export function MapaCoberturaPage() {
  const navigate = useNavigate();
  const [metric] = useState('online');
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

  // Colored markers by selected metric
  const buildingMeta = useMemo(() => {
    const map = new Map<string, BuildingMarkerMeta>();


    coverageRows.forEach((r) => {
      let color: string;

      if (metric === 'alerts') {
        color = r.alertCount === 0 ? '#22c55e' : r.alertCount <= 2 ? '#f59e0b' : '#ef4444';
      } else if (metric === 'last') {
        color = r.lastReading != null ? '#22c55e' : '#ef4444';
      } else if (metric === 'quality') {
        color = r.onlinePct >= 95 ? '#22c55e' : r.onlinePct >= 85 ? '#f59e0b' : '#ef4444';
      } else {
        color = r.onlinePct >= 95 ? '#22c55e' : r.onlinePct >= 85 ? '#f59e0b' : '#ef4444';
      }

      const country = r.building.countryCode ?? 'CL';
      const popupHtml = `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
        <strong style="font-size:13px">${r.building.name}</strong>
        <p style="margin:3px 0 0;font-size:11px;color:#666">${country} · ${r.onlinePct.toFixed(0)}% online (${r.onlineCount}/${r.totalMeters})</p>
        ${r.alertCount > 0 ? `<p style="margin:2px 0 0;font-size:11px;color:#ef4444">${r.alertCount} alerta${r.alertCount > 1 ? 's' : ''} activa${r.alertCount > 1 ? 's' : ''}</p>` : ''}
        ${r.lastReading ? `<p style="margin:2px 0 0;font-size:10px;color:#999">Últ. dato: ${r.lastReading}</p>` : ''}
        <p style="margin:4px 0 0;font-size:11px;color:#3b82f6;cursor:pointer" onclick="window.location.href='/meters?building=${r.building.id}'">Ver grilla de medidores →</p>
      </div>`;
      map.set(r.building.id, { color, popupHtml });
    });
    return map;
  }, [coverageRows, metric]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="4.6 Mapa de Cobertura"
        description="Visualización geográfica de cobertura de medidores — click abre grilla del mall"
      />

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Left: Mapa interactivo de cobertura */}
        <div className="panel flex min-w-0 flex-[2] flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Mapa interactivo de cobertura</p>
          <p className="shrink-0 text-[11px] text-muted">marcadores por mall coloreados según % medidores online · hover: nombre, % online, alarmas activas, último dato · click: grilla de medidores</p>
          <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
            <MapView buildings={geoBuildings} buildingMeta={buildingMeta} className="h-full w-full" />
          </div>
          <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[ARQ-08, DAT-17, DAT-11]</p>
        </div>

        {/* Right: Panel lateral de lista */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Panel lateral de lista</p>
          <p className="shrink-0 text-[11px] text-muted">malls ordenados por % online ascendente (los más problemáticos primero) · búsqueda</p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar mall..."
            className="mt-2 w-full shrink-0 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none transition-colors focus:border-brand"
          />
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-2 py-1.5">Mall</th>
                  <th className="px-2 py-1.5 text-right">% online</th>
                  <th className="px-2 py-1.5 text-right">Alarmas</th>
                  <th className="px-2 py-1.5">Último dato</th>
                </tr>
              </thead>
            </table>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {filteredRows.map((row, i) => (
                    <tr
                      key={row.building.id}
                      className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
                      style={{ animationDelay: `${i * 25}ms` }}
                      onClick={() => navigate(`/meters?building=${row.building.id}`)}
                    >
                      <td className="px-2 py-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className={`inline-block size-2 shrink-0 rounded-full ${SEMAPHORE_DOT[row.semaphore]}`} />
                          <span className="truncate font-medium text-foreground">{row.building.name}</span>
                        </span>
                      </td>
                      <td className={`px-2 py-1.5 text-right font-medium ${row.onlinePct >= 95 ? 'text-emerald-600' : row.onlinePct >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                        {row.onlinePct.toFixed(0)}%
                      </td>
                      <td className="px-2 py-1.5 text-right text-muted">
                        {row.alertCount > 0 ? <span className="font-medium text-red-600">{row.alertCount}</span> : '0'}
                      </td>
                      <td className="px-2 py-1.5 text-muted">{row.lastReading ?? '—'}</td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-6 text-center text-muted">Sin resultados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[DAT-17, DAT-27]</p>
        </div>
      </div>
    </div>
  );
}
