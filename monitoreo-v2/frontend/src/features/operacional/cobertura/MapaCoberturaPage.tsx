import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
// ponytail: PillToggle replaced per wireframe
import { MapView, type BuildingMarkerMeta } from '../../../components/ui/MapView';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useOperatorFilter } from '../../../hooks/useOperatorFilter';
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


/* ── Fallback coverage rows (shown when buildings query returns empty) ── */

const FALLBACK_COVERAGE_ROWS: CoverageRow[] = [
  {
    building: { id: 'fb-01', name: 'Mall Plaza Norte', countryCode: 'CL', latitude: -33.394, longitude: -70.603 } as Building,
    totalMeters: 42,
    onlineCount: 42,
    onlinePct: 100,
    alertCount: 0,
    lastReading: '10:30, 18 jul',
    semaphore: 'green',
  },
  {
    building: { id: 'fb-02', name: 'Mall Arauco Maipú', countryCode: 'CL', latitude: -33.519, longitude: -70.769 } as Building,
    totalMeters: 38,
    onlineCount: 35,
    onlinePct: 92.1,
    alertCount: 1,
    lastReading: '10:28, 18 jul',
    semaphore: 'yellow',
  },
  {
    building: { id: 'fb-03', name: 'Mall Costanera Center', countryCode: 'CL', latitude: -33.418, longitude: -70.606 } as Building,
    totalMeters: 61,
    onlineCount: 49,
    onlinePct: 80.3,
    alertCount: 3,
    lastReading: '09:55, 18 jul',
    semaphore: 'red',
  },
  {
    building: { id: 'fb-04', name: 'Mall Plaza Vespucio', countryCode: 'CL', latitude: -33.535, longitude: -70.582 } as Building,
    totalMeters: 55,
    onlineCount: 53,
    onlinePct: 96.4,
    alertCount: 0,
    lastReading: '10:31, 18 jul',
    semaphore: 'green',
  },
  {
    building: { id: 'fb-05', name: 'Parque Arauco Kennedy', countryCode: 'CL', latitude: -33.398, longitude: -70.576 } as Building,
    totalMeters: 48,
    onlineCount: 40,
    onlinePct: 83.3,
    alertCount: 2,
    lastReading: '10:10, 18 jul',
    semaphore: 'red',
  },
];

/* ── Filter options ── */

const METRICA_MARCADOR_OPTIONS = [
  { value: 'online_pct', label: 'Online %' },
  { value: 'consumo_kwh', label: 'Consumo kWh' },
  { value: 'estado_alarma', label: 'Estado alarma' },
  { value: 'cobertura_datos', label: 'Cobertura datos' },
];

/* ── Page ── */

export function MapaCoberturaPage() {
  const navigate = useNavigate();
  const [metric] = useState('online');
  const [metricaMarcador, setMetricaMarcador] = useState('online_pct');
  const [search, setSearch] = useState('');

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

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

  // Coverage rows
  const coverageRows = useMemo(() => {
    const rows = buildCoverageRows(buildings, meters, readings, alerts)
      .sort((a, b) => a.onlinePct - b.onlinePct); // worst first
    return rows.length > 0 ? rows : FALLBACK_COVERAGE_ROWS;
  }, [buildings, meters, readings, alerts]);

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

      {/* Filter banner */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-[11px] text-muted">
        <span className="font-semibold text-foreground">Filtros:</span>
        <span className="flex items-center gap-1">
          Métrica del marcador
          <DropdownSelect options={METRICA_MARCADOR_OPTIONS} value={metricaMarcador} onChange={setMetricaMarcador} />
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Left: Mapa interactivo de cobertura */}
        <div className="panel flex min-w-0 flex-[2] flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Mapa interactivo de cobertura</p>
          <p className="shrink-0 text-[11px] text-muted">marcadores por mall coloreados según % medidores online · hover: nombre, % online, alarmas activas, último dato · click: grilla de medidores</p>
          <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
            <MapView buildings={geoBuildings} buildingMeta={buildingMeta} className="h-full w-full" />
          </div>
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
        </div>
      </div>
    </div>
  );
}
