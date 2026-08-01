import { useState, useMemo, useEffect, useRef } from 'react';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useHierarchyByBuildingQuery } from '../../../hooks/queries/useHierarchyQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { deriveBuildingStatus, getStatusStyle, type EnergyStatus } from '../../../lib/energy-status';
import { COUNTRIES, SEVERITY_LABELS } from './consolidado-utils';
import type { LatestReading } from '../../../types/reading';
import type { Alert, AlertSeverity } from '../../../types/alert';
import type { Meter } from '../../../types/meter';

type FloorColorMode = 'alarm' | 'intensity' | 'variation';

const COLOR_MODE_OPTIONS: { key: FloorColorMode; label: string }[] = [
  { key: 'alarm', label: 'Estado alarma' },
  { key: 'intensity', label: 'Intensidad consumo' },
  { key: 'variation', label: 'Variación consumo' },
];

interface ZoneBlock {
  id: string;
  name: string;
  powerKw: number;
  status: EnergyStatus;
  meterCount: number;
  lastAlarm: { severity: string; message: string; time: string } | null;
  col: number;
  row: number;
}

function deriveZoneStatus(meterIds: string[], readings: LatestReading[], alerts: Alert[]): EnergyStatus {
  const meterSet = new Set(meterIds);
  const zoneAlerts = alerts.filter((a) => a.meterId && meterSet.has(a.meterId));
  const hasData = readings.some((r) => meterSet.has(r.meter_id));
  const severities = zoneAlerts.map((a) => a.severity as AlertSeverity);
  return deriveBuildingStatus(severities, hasData);
}

function getZoneColor(zone: ZoneBlock, mode: FloorColorMode, maxPower: number): string {
  if (mode === 'alarm') {
    const colors: Record<EnergyStatus, string> = { normal: 'bg-success/20', warning: 'bg-warning/20', critical: 'bg-danger/20', nodata: 'bg-surface' };
    return colors[zone.status];
  }
  if (mode === 'intensity') {
    const ratio = maxPower > 0 ? zone.powerKw / maxPower : 0;
    if (ratio > 0.75) return 'bg-danger/20';
    if (ratio > 0.5) return 'bg-warning/20';
    if (ratio > 0.25) return 'bg-info/20';
    return 'bg-success/20';
  }
  // variation: ponytail: approximate with power ratio as proxy
  const ratio = maxPower > 0 ? zone.powerKw / maxPower : 0;
  if (ratio > 0.6) return 'bg-warning/25';
  if (ratio > 0.3) return 'bg-warning/20';
  return 'bg-sky-200';
}

const ZONE_BORDER: Record<EnergyStatus, string> = {
  normal: 'border-emerald-400',
  warning: 'border-warning',
  critical: 'border-danger',
  nodata: 'border-border',
};

interface FloorPlanViewProps {
  buildingId: string;
  buildingName: string;
  floorId: string;
  readings: LatestReading[];
  alerts: Alert[];
  country: string;
  onBackToMall: () => void;
  onBackToCountry: () => void;
}

type FloorPeriod = 'realtime' | 'today' | 'week' | 'month';
type FloorShowOnly = 'all' | 'alarm' | 'over_threshold';

const FLOOR_PERIOD_OPTIONS: { key: FloorPeriod; label: string }[] = [
  { key: 'realtime', label: 'Tiempo real' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

const FLOOR_SHOW_OPTIONS: { key: FloorShowOnly; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'alarm', label: 'Con alarma' },
  { key: 'over_threshold', label: 'Sobre umbral' },
];

export function FloorPlanView({ buildingId, buildingName, floorId, readings, alerts, country, onBackToMall, onBackToCountry }: Readonly<FloorPlanViewProps>) {
  const [colorMode, setColorMode] = useState<FloorColorMode>('alarm');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [floorPeriod, setFloorPeriod] = useState<FloorPeriod>('realtime');
  const [floorShowOnly, setFloorShowOnly] = useState<FloorShowOnly>('all');
  const [zoom, setZoom] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  // Zoom via mouse wheel
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((prev) => Math.min(2, Math.max(0.5, prev - e.deltaY * 0.002)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Fetch hierarchy to get zones under this floor
  const hierarchyQuery = useHierarchyByBuildingQuery(buildingId);
  const allNodes = hierarchyQuery.data ?? [];

  const floorNode = allNodes.find((n) => n.id === floorId);
  const floorName = floorNode?.name ?? 'Piso';

  // Get zones under this floor
  const floorZones = useMemo(
    () => allNodes.filter((n) => n.parentId === floorId && n.levelType === 'zone').sort((a, b) => a.sortOrder - b.sortOrder),
    [allNodes, floorId],
  );

  // Get all meters for the building to map zones → meters
  const metersQuery = useMetersQuery(buildingId);
  const buildingMeters = metersQuery.data ?? [];

  // Build zone blocks
  const COLS = 4;
  const buildingReadings = readings.filter((r) => r.building_id === buildingId);

  const zoneBlocks: ZoneBlock[] = useMemo(() => {
    // If zones exist in hierarchy, use them
    if (floorZones.length > 0) {
      return floorZones.map((zone, i) => {
        // ponytail: assign meters to zones by name match or round-robin
        const zoneMeters = buildingMeters.filter((m) =>
          m.name.toLowerCase().includes(zone.name.toLowerCase()) ||
          (m.metadata as Record<string, string>)?.zone === zone.name,
        );
        const meterIds = zoneMeters.length > 0 ? zoneMeters.map((m) => m.id) : [];
        const zonePower = buildingReadings
          .filter((r) => meterIds.includes(r.meter_id))
          .reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
        const status = meterIds.length > 0 ? deriveZoneStatus(meterIds, buildingReadings, alerts) : 'nodata' as EnergyStatus;
        const meterSet = new Set(meterIds);
        const zoneAlerts = alerts.filter((a) => a.meterId && meterSet.has(a.meterId)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastAlarm = zoneAlerts.length > 0 ? { severity: SEVERITY_LABELS[zoneAlerts[0].severity] ?? zoneAlerts[0].severity, message: zoneAlerts[0].message, time: new Date(zoneAlerts[0].createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) } : null;
        return { id: zone.id, name: zone.name, powerKw: zonePower, status, meterCount: meterIds.length, lastAlarm, col: i % COLS, row: Math.floor(i / COLS) };
      });
    }

    // ponytail: no hierarchy zones → generate synthetic zones from meters grouped by loadCategory
    const categories = new Map<string, Meter[]>();
    buildingMeters.forEach((m) => {
      const cat = m.loadCategory ?? 'other';
      const list = categories.get(cat) ?? [];
      list.push(m);
      categories.set(cat, list);
    });

    const CATEGORY_LABELS: Record<string, string> = { main: 'General', hvac: 'HVAC', lighting: 'Iluminación', tenant: 'Locatario', other: 'Otros' };

    return Array.from(categories.entries()).map(([cat, catMeters], i) => {
      const meterIds = catMeters.map((m) => m.id);
      const zonePower = buildingReadings
        .filter((r) => meterIds.includes(r.meter_id))
        .reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
      const status = deriveZoneStatus(meterIds, buildingReadings, alerts);
      const meterSet = new Set(meterIds);
      const catAlerts = alerts.filter((a) => a.meterId && meterSet.has(a.meterId)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastAlarm = catAlerts.length > 0 ? { severity: SEVERITY_LABELS[catAlerts[0].severity] ?? catAlerts[0].severity, message: catAlerts[0].message, time: new Date(catAlerts[0].createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) } : null;
      return { id: cat, name: CATEGORY_LABELS[cat] ?? cat, powerKw: zonePower, status, meterCount: meterIds.length, lastAlarm, col: i % COLS, row: Math.floor(i / COLS) };
    });
  }, [floorZones, buildingMeters, buildingReadings, alerts]);

  // Filter zones by floorShowOnly
  const visibleZones = useMemo(() => {
    if (floorShowOnly === 'all') return zoneBlocks;
    if (floorShowOnly === 'alarm') return zoneBlocks.filter((z) => z.status === 'critical' || z.status === 'warning');
    // over_threshold: top 25% power
    const threshold = Math.max(...zoneBlocks.map((z) => z.powerKw)) * 0.75;
    return zoneBlocks.filter((z) => z.powerKw >= threshold);
  }, [zoneBlocks, floorShowOnly]);

  const maxPower = Math.max(1, ...visibleZones.map((z) => z.powerKw));
  const totalPower = visibleZones.reduce((s, z) => s + z.powerKw, 0);
  const countryLabel = COUNTRIES.find((c) => c.code === country)?.label ?? country;

  return (
    <div className="flex h-full flex-col gap-3" data-testid="floor-plan-view">
      {/* Breadcrumb */}
      <div className="panel px-4 py-2.5">
        <div className="flex items-center gap-1 text-xs text-muted">
          <button type="button" onClick={onBackToCountry} className="text-foreground hover:underline">{countryLabel}</button>
          <span>/</span>
          <button type="button" onClick={onBackToMall} className="text-foreground hover:underline">{buildingName}</button>
          <span>/</span>
          <span className="font-medium text-foreground">{floorName}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Plano de {floorName}</p>
          <p className="text-xs text-muted">Carga total: {totalPower.toFixed(1)} kW</p>
        </div>
      </div>

      {/* Floor filters + color mode */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-xs">
        <span className="flex items-center gap-1 text-muted">
          Período:
          <DropdownSelect options={FLOOR_PERIOD_OPTIONS.map(o => ({ value: o.key, label: o.label }))} value={floorPeriod} onChange={(v) => setFloorPeriod(v as FloorPeriod)} />
        </span>
        <span className="flex items-center gap-1 text-muted">
          Mostrar:
          <DropdownSelect options={FLOOR_SHOW_OPTIONS.map(o => ({ value: o.key, label: o.label }))} value={floorShowOnly} onChange={(v) => setFloorShowOnly(v as FloorShowOnly)} />
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">Coloreo:</span>
          {COLOR_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setColorMode(opt.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                colorMode === opt.key ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floor plan grid — Ctrl+scroll to zoom */}
      <div ref={gridRef} className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-surface/50 p-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        {visibleZones.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted">Sin zonas configuradas para este piso.</p>
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(COLS, visibleZones.length)}, 1fr)` }}>
            {visibleZones.map((zone) => {
              const isHovered = hoveredZone === zone.id;
              const bg = getZoneColor(zone, colorMode, maxPower);
              const border = ZONE_BORDER[zone.status];
              return (
                <div
                  key={zone.id}
                  className={`relative rounded-lg border-2 p-3 transition-all ${bg} ${border} ${isHovered ? 'ring-2 ring-foreground shadow-md' : ''}`}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  style={{ minHeight: '80px' }}
                >
                  <p className="text-xs font-medium text-foreground">{zone.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{zone.powerKw.toFixed(1)} kW</p>
                  <p className="text-xs text-muted">{zone.meterCount} med.</p>

                  {/* Hover tooltip */}
                  {isHovered && (
                    <div className="absolute -top-16 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg">
                      <p className="font-medium">{zone.name}</p>
                      <p>{zone.powerKw.toFixed(1)} kW · {getStatusStyle(zone.status).label}</p>
                      {zone.lastAlarm && (
                        <p className="text-xs opacity-80">{zone.lastAlarm.severity} · {zone.lastAlarm.time} · {zone.lastAlarm.message}</p>
                      )}
                    </div>
                  )}

                  {/* Status dot */}
                  <span className={`absolute right-2 top-2 inline-block size-2 rounded-full ${getStatusStyle(zone.status).bg}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-muted">
        {colorMode === 'alarm' && (
          <>
            {(['normal', 'warning', 'critical', 'nodata'] as const).map((s) => {
              const st = getStatusStyle(s);
              return (
                <span key={s} className="flex items-center gap-1">
                  <span className={`inline-block size-2 rounded-sm ${st.bg}`} />
                  {st.label}
                </span>
              );
            })}
          </>
        )}
        {colorMode === 'intensity' && (
          <>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-success/20" /> Bajo</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-info/20" /> Medio</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-warning/20" /> Alto</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-danger/20" /> Muy alto</span>
          </>
        )}
        {colorMode === 'variation' && (
          <>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-sky-200" /> Estable</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-warning/20" /> Moderado</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-warning/25" /> Elevado</span>
          </>
        )}
      </div>
    </div>
  );
}
