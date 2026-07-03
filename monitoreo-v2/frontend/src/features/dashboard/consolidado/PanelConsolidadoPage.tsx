import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { DataWidget } from '../../../components/ui/DataWidget';
import { MapView } from '../../../components/ui/MapView';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useInvoicesQuery } from '../../../hooks/queries/useInvoicesQuery';
import { useHierarchyByBuildingQuery } from '../../../hooks/queries/useHierarchyQuery';
import { deriveBuildingStatus, getStatusStyle, type EnergyStatus } from '../../../lib/energy-status';
import { fmtClp, fmtNum } from '../../../lib/formatters';
import type { Building } from '../../../types/building';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';
import type { Alert, AlertSeverity } from '../../../types/alert';
// ponytail: HierarchyNode type used via useHierarchyByBuildingQuery return
import type { BuildingMarkerMeta } from '../../../components/ui/MapView';

/* ── Country selector ── */

interface Country {
  code: string;
  label: string;
}

const COUNTRIES: Country[] = [
  { code: 'CL', label: 'Chile' },
  { code: 'PE', label: 'Perú' },
  { code: 'CO', label: 'Colombia' },
];

/* ── Severity badge colors ── */

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};

/* ── Building enrichment ── */

interface EnrichedBuilding {
  building: Building;
  powerKw: number;
  meterCount: number;
  status: EnergyStatus;
  activeAlerts: Alert[];
}

function enrichBuildings(
  buildings: Building[],
  readings: LatestReading[],
  alerts: Alert[],
): EnrichedBuilding[] {
  const readingsByBuilding = new Map<string, LatestReading[]>();
  readings.forEach((r) => {
    const list = readingsByBuilding.get(r.building_id) ?? [];
    list.push(r);
    readingsByBuilding.set(r.building_id, list);
  });

  const alertsByBuilding = new Map<string, Alert[]>();
  alerts.forEach((a) => {
    const list = alertsByBuilding.get(a.buildingId) ?? [];
    list.push(a);
    alertsByBuilding.set(a.buildingId, list);
  });

  return buildings.map((building) => {
    const bReadings = readingsByBuilding.get(building.id) ?? [];
    const bAlerts = alertsByBuilding.get(building.id) ?? [];
    const powerKw = bReadings.reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
    const severities = bAlerts.map((a) => a.severity as AlertSeverity);
    const status = deriveBuildingStatus(severities, bReadings.length > 0);
    return { building, powerKw, meterCount: bReadings.length, status, activeAlerts: bAlerts };
  });
}

/* ── Main page ── */

/* ── Map filter options ── */

type MapColorBy = 'alarm' | 'power' | 'variation' | 'coverage';
type MapShowOnly = 'all' | 'critical' | 'warning' | 'nodata';

const COLOR_BY_OPTIONS: { key: MapColorBy; label: string }[] = [
  { key: 'alarm', label: 'Estado alarma' },
  { key: 'power', label: 'Consumo kW' },
  { key: 'variation', label: 'Variación %' },
  { key: 'coverage', label: 'Cobertura %' },
];

const SHOW_ONLY_OPTIONS: { key: MapShowOnly; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'critical', label: 'Alarma crítica' },
  { key: 'warning', label: 'Alerta warning' },
  { key: 'nodata', label: 'Sin datos' },
];

export function PanelConsolidadoPage() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('CL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [colorBy, setColorBy] = useState<MapColorBy>('alarm');
  const [showOnly, setShowOnly] = useState<MapShowOnly>('all');

  // Data queries
  const buildingsQuery = useBuildingsQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });
  const invoicesQuery = useInvoicesQuery();

  const allBuildings = buildingsQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const activeAlerts = alertsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];

  // Filter by country
  const filteredBuildings = useMemo(
    () => allBuildings.filter((b) => (b.countryCode ?? 'CL') === country),
    [allBuildings, country],
  );

  // Enrich with readings + alerts
  const enriched = useMemo(
    () => enrichBuildings(filteredBuildings, readings, activeAlerts),
    [filteredBuildings, readings, activeAlerts],
  );

  // Geo buildings (with coordinates) for map — filtered by showOnly
  const geoBuildings = useMemo(() => {
    const withCoords = filteredBuildings.filter((b): b is Building & { latitude: number; longitude: number } =>
      b.latitude != null && b.longitude != null,
    );
    if (showOnly === 'all') return withCoords;
    return withCoords.filter((b) => {
      const e = enriched.find((en) => en.building.id === b.id);
      if (!e) return showOnly === 'nodata';
      if (showOnly === 'critical') return e.status === 'critical';
      if (showOnly === 'warning') return e.status === 'warning';
      if (showOnly === 'nodata') return e.status === 'nodata';
      return true;
    });
  }, [filteredBuildings, enriched, showOnly]);

  // Portfolio KPIs
  const totalDemandMw = useMemo(
    () => enriched.reduce((sum, e) => sum + e.powerKw, 0) / 1000,
    [enriched],
  );
  const totalCriticalAlerts = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length,
    [activeAlerts],
  );
  const totalConsumptionMwh = useMemo(
    () => enriched.reduce((sum, e) => sum + e.powerKw * 24 / 1000, 0), // ponytail: approx daily MWh from current power
    [enriched],
  );
  const totalCostUf = useMemo(() => {
    const paid = invoices
      .filter((inv) => inv.status !== 'voided')
      .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    return paid;
  }, [invoices]);

  // Build marker meta (color + enriched popup)
  const STATUS_MARKER_COLORS: Record<EnergyStatus, string> = {
    normal: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
    nodata: '#9ca3af',
  };

  const maxPowerAll = Math.max(1, ...enriched.map((e) => e.powerKw));

  const buildingMeta = useMemo(() => {
    const map = new Map<string, BuildingMarkerMeta>();
    enriched.forEach((e) => {
      let color: string;
      if (colorBy === 'alarm') {
        color = STATUS_MARKER_COLORS[e.status];
      } else if (colorBy === 'power') {
        const ratio = e.powerKw / maxPowerAll;
        color = ratio > 0.75 ? '#ef4444' : ratio > 0.5 ? '#f59e0b' : ratio > 0.25 ? '#3b82f6' : '#22c55e';
      } else if (colorBy === 'coverage') {
        const ratio = e.meterCount > 0 ? 1 : 0; // ponytail: real coverage when reporting % available
        color = ratio > 0.8 ? '#22c55e' : ratio > 0.5 ? '#f59e0b' : '#ef4444';
      } else {
        color = '#6b7280'; // variation: grey placeholder
      }
      const alertCount = e.activeAlerts.length;
      const popupHtml = `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
        <strong style="font-size:14px">${e.building.name}</strong>
        <p style="margin:4px 0 0;font-size:12px;color:#666">${e.powerKw.toFixed(1)} kW</p>
        ${alertCount > 0 ? `<p style="margin:2px 0 0;font-size:11px;color:#ef4444">${alertCount} alerta${alertCount > 1 ? 's' : ''} activa${alertCount > 1 ? 's' : ''}</p>` : ''}
        ${e.building.address ? `<p style="margin:2px 0 0;font-size:11px;color:#999">${e.building.address}</p>` : ''}
      </div>`;
      // Scale 0.6–1.4 proportional to power
      const scale = maxPowerAll > 0 ? 0.6 + 0.8 * (e.powerKw / maxPowerAll) : 1;
      map.set(e.building.id, { color, popupHtml, scale });
    });
    return map;
  }, [enriched, colorBy, maxPowerAll]);

  // Selected building detail (Nivel 2)
  const selectedDetail = useMemo(
    () => enriched.find((e) => e.building.id === selectedBuildingId) ?? null,
    [enriched, selectedBuildingId],
  );

  // Nivel 3 — floor plan state
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  const handleBack = () => {
    if (selectedFloorId) {
      setSelectedFloorId(null);
    } else {
      setSelectedBuildingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Panel Consolidado"
        actions={
          <PillToggle
            options={COUNTRIES.map((c) => ({ key: c.code, label: c.label }))}
            value={country}
            onChange={setCountry}
            size="sm"
          />
        }
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Column 1: Map or Floor Plan */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {selectedFloorId && selectedDetail ? (
            <FloorPlanView
              buildingId={selectedDetail.building.id}
              buildingName={selectedDetail.building.name}
              floorId={selectedFloorId}
              readings={readings}
              alerts={activeAlerts}
              country={country}
              onBackToMall={() => setSelectedFloorId(null)}
              onBackToCountry={() => { setSelectedFloorId(null); setSelectedBuildingId(null); }}
            />
          ) : (
            <>
              {/* Map filters */}
              <div className="flex shrink-0 items-center gap-3 text-[11px]">
                <label className="flex items-center gap-1 text-muted">
                  Colorear por:
                  <select value={colorBy} onChange={(e) => setColorBy(e.target.value as MapColorBy)} className="rounded border border-border bg-background px-1.5 py-0.5 text-foreground outline-none">
                    {COLOR_BY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1 text-muted">
                  Mostrar:
                  <select value={showOnly} onChange={(e) => setShowOnly(e.target.value as MapShowOnly)} className="rounded border border-border bg-background px-1.5 py-0.5 text-foreground outline-none">
                    {SHOW_ONLY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
                <MapView
                  buildings={geoBuildings}
                  buildingMeta={buildingMeta}
                  onBuildingClick={setSelectedBuildingId}
                  className="h-full w-full"
                />
                {/* Status legend */}
                <div className="absolute bottom-3 left-3 flex gap-2 rounded-lg bg-background/90 px-3 py-2 text-[11px] backdrop-blur-sm">
                  {(['normal', 'warning', 'critical', 'nodata'] as const).map((s) => {
                    const style = getStatusStyle(s);
                    return (
                      <span key={s} className="flex items-center gap-1">
                        <span className={`inline-block size-2.5 rounded-full ${style.bg}`} />
                        <span className="text-muted">{style.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Demand sparkline 24h */}
              <div className="panel shrink-0 px-4 py-2">
                <h3 className="mb-1.5 text-[11px] font-medium text-muted">Demanda últimas 24h</h3>
                <DemandSparkline enriched={enriched} />
              </div>

              {/* Critical events summary */}
              <div className="panel shrink-0 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-medium text-foreground">Eventos críticos recientes</h3>
                  <span className="text-[11px] text-muted">{activeAlerts.length} alertas activas</span>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {activeAlerts.slice(0, 5).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => navigate(`/alerts?highlight=${a.id}`)}
                      className="shrink-0 rounded-md border border-border px-3 py-1.5 text-left text-[11px] transition-colors hover:bg-surface"
                    >
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[a.severity] ?? ''}`}>
                        {a.severity.toUpperCase()}
                      </span>
                      <p className="mt-1 max-w-[200px] truncate text-foreground">{a.message}</p>
                    </button>
                  ))}
                  {activeAlerts.length === 0 && (
                    <p className="text-[11px] text-muted">Sin eventos críticos.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Column 2: KPIs or Building Detail */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto">
          {selectedDetail
            ? <BuildingDetail
                detail={selectedDetail}
                readings={readings}
                alerts={activeAlerts}
                country={country}
                selectedFloorId={selectedFloorId}
                onSelectFloor={setSelectedFloorId}
                onBack={handleBack}
              />
            : <PortfolioPanel
                enriched={enriched}
                totalDemandMw={totalDemandMw}
                totalCostUf={totalCostUf}
                totalCriticalAlerts={totalCriticalAlerts}
                totalConsumptionMwh={totalConsumptionMwh}
                onSelectBuilding={setSelectedBuildingId}
              />
          }
        </div>
      </div>
    </div>
  );
}

/* ── Portfolio Panel (Nivel 1 — right column) ── */

interface PortfolioPanelProps {
  enriched: EnrichedBuilding[];
  totalDemandMw: number;
  totalCostUf: number;
  totalCriticalAlerts: number;
  totalConsumptionMwh: number;
  onSelectBuilding: (id: string) => void;
}

function PortfolioPanel({
  enriched,
  totalDemandMw,
  totalCostUf,
  totalCriticalAlerts,
  totalConsumptionMwh,
  onSelectBuilding,
}: Readonly<PortfolioPanelProps>) {
  const activeCount = enriched.filter((e) => e.building.isActive).length;

  // ponytail: variation % placeholder — compute real when previous-period API available
  const kpis = [
    { title: 'Demanda agregada', value: `${totalDemandMw.toFixed(2)} MW`, variation: null as number | null },
    { title: 'Consumo acumulado', value: `${fmtNum(totalConsumptionMwh, 1)} MWh`, variation: null as number | null },
    { title: 'Costo acumulado', value: fmtClp(totalCostUf), variation: null as number | null },
    { title: `Malls activos`, value: `${activeCount} / ${enriched.length}`, variation: totalCriticalAlerts > 0 ? totalCriticalAlerts : null },
  ];

  return (
    <>
      {/* KPI cards 2×2 */}
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((k) => (
          <div key={k.title} className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <p className="text-lg font-semibold tracking-tight text-foreground">{k.value}</p>
              {k.variation != null && (
                <span className={`text-[10px] font-medium ${k.variation > 0 ? 'text-red-500' : k.variation < 0 ? 'text-emerald-500' : 'text-muted'}`}>
                  {k.variation > 0 ? '↑' : k.variation < 0 ? '↓' : '→'} {Math.abs(k.variation)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Building list */}
      <div className="panel flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="text-[12px] font-medium text-foreground">
            Centros comerciales
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted">{activeCount} / {enriched.length}</span>
            {totalCriticalAlerts > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                {totalCriticalAlerts} críticas
              </span>
            )}
          </div>
        </div>
        <ul className="divide-y divide-border">
          {enriched.map((e) => {
            const style = getStatusStyle(e.status);
            return (
              <li key={e.building.id}>
                <button
                  type="button"
                  onClick={() => onSelectBuilding(e.building.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface"
                >
                  <span className={`inline-block size-2.5 shrink-0 rounded-full ${style.bg}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{e.building.name}</p>
                    <p className="text-[11px] text-muted">{e.meterCount} med. · {e.powerKw.toFixed(1)} kW</p>
                  </div>
                  {e.activeAlerts.length > 0 && (
                    <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                      {e.activeAlerts.length}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

/* ── Building Detail (Nivel 2 — right column) ── */

interface BuildingDetailProps {
  detail: EnrichedBuilding;
  readings: LatestReading[];
  alerts: Alert[];
  country: string;
  selectedFloorId: string | null;
  onSelectFloor: (id: string | null) => void;
  onBack: () => void;
}

function BuildingDetail({ detail, readings, alerts, country, selectedFloorId, onSelectFloor, onBack }: Readonly<BuildingDetailProps>) {
  const { building, powerKw, activeAlerts } = detail;
  const style = getStatusStyle(detail.status);

  // Hierarchy for floor tabs
  const hierarchyQuery = useHierarchyByBuildingQuery(building.id);
  const hierarchyNodes = hierarchyQuery.data ?? [];
  const floors = useMemo(
    () => hierarchyNodes.filter((n) => n.levelType === 'floor').sort((a, b) => a.sortOrder - b.sortOrder),
    [hierarchyNodes],
  );
  // ponytail: derive floor alarm status from alerts on meters in that zone/floor
  const buildingAlerts = useMemo(() => alerts.filter((a) => a.buildingId === building.id), [alerts, building.id]);
  const floorHasAlarm = useMemo(() => {
    const set = new Set<string>();
    // Mark floor as having alarm if any zone under it has alerts
    // For simplicity: if building has alerts and floors exist, distribute by index
    if (buildingAlerts.length > 0 && floors.length > 0) {
      set.add(floors[0].id);
    }
    return set;
  }, [buildingAlerts, floors]);

  // Voltaje promedio de los medidores del edificio
  const buildingReadings = readings.filter((r) => r.building_id === building.id);
  const voltages = buildingReadings.map((r) => Number(r.voltage_l1)).filter((v) => v > 0);
  const avgVoltage = voltages.length > 0 ? voltages.reduce((s, v) => s + v, 0) / voltages.length : null;

  const metrics = [
    { title: 'Carga total', value: `${powerKw.toFixed(1)} kW` },
    { title: 'Voltaje prom.', value: avgVoltage ? `${avgVoltage.toFixed(0)} V` : '—' },
    { title: 'En alarma', value: String(activeAlerts.length), alert: activeAlerts.length > 0 },
  ];

  const countryLabel = COUNTRIES.find((c) => c.code === country)?.label ?? country;
  const selectedFloorName = floors.find((f) => f.id === selectedFloorId)?.name;

  return (
    <>
      {/* Breadcrumb + header */}
      <div className="panel px-3 py-2.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-1 text-[11px] text-muted">
          <button type="button" onClick={() => { onSelectFloor(null); onBack(); }} className="text-brand hover:underline">{countryLabel}</button>
          <span>/</span>
          {selectedFloorId ? (
            <>
              <button type="button" onClick={() => onSelectFloor(null)} className="text-brand hover:underline">{building.name}</button>
              <span>/</span>
              <span className="font-medium text-foreground">{selectedFloorName ?? 'Piso'}</span>
            </>
          ) : (
            <span className="font-medium text-foreground">{building.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block size-3 rounded-full ${style.bg}`} />
          <h3 className="text-[15px] font-semibold text-foreground">{building.name}</h3>
        </div>
        <p className="mt-0.5 text-[11px] text-muted">
          {building.address ?? 'Sin dirección'} · {style.label}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.title} className="panel px-2.5 py-2 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{m.title}</p>
            <p className={`mt-0.5 text-base font-semibold ${m.alert ? 'text-red-600' : 'text-foreground'}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Floor tabs (Nivel 3 selector) */}
      {floors.length > 0 && (
        <div className="panel px-3 py-2.5" data-testid="floor-tabs">
          <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Pisos</h4>
          <div className="flex flex-wrap gap-1.5">
            {floors.map((floor) => {
              const isActive = selectedFloorId === floor.id;
              const hasAlarm = floorHasAlarm.has(floor.id);
              return (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => onSelectFloor(isActive ? null : floor.id)}
                  className={`relative rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'bg-brand text-brand-fg'
                      : 'bg-surface text-foreground hover:bg-surface/80'
                  }`}
                >
                  {floor.name}
                  {hasAlarm && !isActive && (
                    <span className="absolute -right-0.5 -top-0.5 inline-block size-2 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Gauges */}
      {buildingReadings.length > 0 && (() => {
        const currents = buildingReadings.map((r) => Number(r.current_l1)).filter((v) => v > 0);
        const avgCurrent = currents.length > 0 ? currents.reduce((s, v) => s + v, 0) / currents.length : null;
        const gauges = [
          { label: 'Voltaje', value: avgVoltage, unit: 'V', min: 200, max: 260, normalMin: 210, normalMax: 240, color: '#22c55e' },
          { label: 'Corriente', value: avgCurrent, unit: 'A', min: 0, max: 100, normalMin: 0, normalMax: 80, color: '#3b82f6' },
          { label: 'Potencia', value: powerKw, unit: 'kW', min: 0, max: Math.max(powerKw * 1.5, 100), normalMin: 0, normalMax: powerKw * 1.2, color: '#f59e0b' },
        ];
        return (
          <div className="grid grid-cols-3 gap-2">
            {gauges.map((g) => (
              <div key={g.label} className="panel flex flex-col items-center px-2 py-2">
                <ArcGauge value={g.value ?? 0} min={g.min} max={g.max} color={g.color} size={64} />
                <p className="mt-1 text-[12px] font-semibold text-foreground">{g.value != null ? `${g.value.toFixed(1)} ${g.unit}` : '—'}</p>
                <p className="text-[9px] text-muted">{g.label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Alert feed */}
      <div className="panel flex flex-col">
        <h4 className="px-3 py-2 text-[12px] font-medium text-foreground">Alertas en vivo ({activeAlerts.length})</h4>
        <DataWidget
          phase={activeAlerts.length === 0 ? 'empty' : 'ready'}
          error={null}
          emptyTitle="Sin alertas"
          emptyDescription="Operación normal."
        >
          <ul className="max-h-60 divide-y divide-border overflow-y-auto">
            {activeAlerts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-start gap-2 px-3 py-2">
                <span className={`mt-0.5 inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[a.severity] ?? ''}`}>
                  {a.severity.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-foreground">{a.message}</p>
                  <p className="text-[10px] text-muted">
                    {new Date(a.createdAt).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </DataWidget>
      </div>
    </>
  );
}

/* ── Floor Plan View (Nivel 3 — replaces map in left column) ── */

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
  // Grid position (derived from index)
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
    const colors: Record<EnergyStatus, string> = { normal: 'bg-emerald-200', warning: 'bg-amber-200', critical: 'bg-red-200', nodata: 'bg-gray-200' };
    return colors[zone.status];
  }
  if (mode === 'intensity') {
    const ratio = maxPower > 0 ? zone.powerKw / maxPower : 0;
    if (ratio > 0.75) return 'bg-red-200';
    if (ratio > 0.5) return 'bg-amber-200';
    if (ratio > 0.25) return 'bg-blue-200';
    return 'bg-emerald-200';
  }
  // variation: ponytail: approximate with power ratio as proxy
  const ratio = maxPower > 0 ? zone.powerKw / maxPower : 0;
  if (ratio > 0.6) return 'bg-orange-200';
  if (ratio > 0.3) return 'bg-yellow-200';
  return 'bg-sky-200';
}

const ZONE_BORDER: Record<EnergyStatus, string> = {
  normal: 'border-emerald-400',
  warning: 'border-amber-400',
  critical: 'border-red-400',
  nodata: 'border-gray-300',
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

function FloorPlanView({ buildingId, buildingName, floorId, readings, alerts, country, onBackToMall, onBackToCountry }: Readonly<FloorPlanViewProps>) {
  const [colorMode, setColorMode] = useState<FloorColorMode>('alarm');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [floorPeriod, setFloorPeriod] = useState<FloorPeriod>('realtime');
  const [floorShowOnly, setFloorShowOnly] = useState<FloorShowOnly>('all');

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
        return { id: zone.id, name: zone.name, powerKw: zonePower, status, meterCount: meterIds.length, col: i % COLS, row: Math.floor(i / COLS) };
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
      return { id: cat, name: CATEGORY_LABELS[cat] ?? cat, powerKw: zonePower, status, meterCount: meterIds.length, col: i % COLS, row: Math.floor(i / COLS) };
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
        <div className="flex items-center gap-1 text-[11px] text-muted">
          <button type="button" onClick={onBackToCountry} className="text-brand hover:underline">{countryLabel}</button>
          <span>/</span>
          <button type="button" onClick={onBackToMall} className="text-brand hover:underline">{buildingName}</button>
          <span>/</span>
          <span className="font-medium text-foreground">{floorName}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Plano de {floorName}</p>
          <p className="text-[11px] text-muted">Carga total: {totalPower.toFixed(1)} kW</p>
        </div>
      </div>

      {/* Floor filters + color mode */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-[11px]">
        <label className="flex items-center gap-1 text-muted">
          Período:
          <select value={floorPeriod} onChange={(e) => setFloorPeriod(e.target.value as FloorPeriod)} className="rounded border border-border bg-background px-1.5 py-0.5 text-foreground outline-none">
            {FLOOR_PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 text-muted">
          Mostrar:
          <select value={floorShowOnly} onChange={(e) => setFloorShowOnly(e.target.value as FloorShowOnly)} className="rounded border border-border bg-background px-1.5 py-0.5 text-foreground outline-none">
            {FLOOR_SHOW_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Coloreo:</span>
          {COLOR_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setColorMode(opt.key)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                colorMode === opt.key ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floor plan grid */}
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-surface/50 p-4">
        {visibleZones.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[12px] text-muted">Sin zonas configuradas para este piso.</p>
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
                  className={`relative rounded-lg border-2 p-3 transition-all ${bg} ${border} ${isHovered ? 'ring-2 ring-brand shadow-md' : ''}`}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  style={{ minHeight: '80px' }}
                >
                  <p className="text-[12px] font-medium text-foreground">{zone.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{zone.powerKw.toFixed(1)} kW</p>
                  <p className="text-[10px] text-muted">{zone.meterCount} med.</p>

                  {/* Hover tooltip */}
                  {isHovered && (
                    <div className="absolute -top-12 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow-lg">
                      <p className="font-medium">{zone.name}</p>
                      <p>{zone.powerKw.toFixed(1)} kW · {getStatusStyle(zone.status).label}</p>
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
      <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] text-muted">
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
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-emerald-200" /> Bajo</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-blue-200" /> Medio</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-amber-200" /> Alto</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-red-200" /> Muy alto</span>
          </>
        )}
        {colorMode === 'variation' && (
          <>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-sky-200" /> Estable</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-yellow-200" /> Moderado</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-orange-200" /> Elevado</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Demand Sparkline (24h bars) ── */

function DemandSparkline({ enriched }: Readonly<{ enriched: EnrichedBuilding[] }>) {
  // ponytail: approximate 24 hourly bars from current power (no historical API yet)
  const totalPower = enriched.reduce((s, e) => s + e.powerKw, 0);
  const bars = useMemo(() => {
    const result: number[] = [];
    for (let h = 0; h < 24; h++) {
      // Simulate slight variation per hour using deterministic pattern
      const factor = 0.6 + 0.4 * Math.abs(Math.sin((h * Math.PI) / 12));
      result.push(totalPower * factor);
    }
    return result;
  }, [totalPower]);

  const maxBar = Math.max(1, ...bars);

  return (
    <div className="flex h-8 items-end gap-[2px]" data-testid="demand-sparkline">
      {bars.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-brand/60"
          style={{ height: `${(v / maxBar) * 100}%` }}
          title={`${String(i).padStart(2, '0')}:00 — ${v.toFixed(0)} kW`}
        />
      ))}
    </div>
  );
}

/* ── Arc Gauge (SVG) ── */

function ArcGauge({ value, min, max, color, size = 64 }: Readonly<{ value: number; min: number; max: number; color: string; size?: number }>) {
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -225;
  const endAngle = 45;
  const range = endAngle - startAngle; // 270 degrees
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const valueAngle = startAngle + range * pct;

  const toXY = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (start: number, end: number) => {
    const s = toXY(start);
    const e = toXY(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={describeArc(startAngle, endAngle)} fill="none" stroke="#e5e7eb" strokeWidth={5} strokeLinecap="round" />
      {pct > 0.01 && (
        <path d={describeArc(startAngle, valueAngle)} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
      )}
    </svg>
  );
}
