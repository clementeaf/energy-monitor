import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { MapView } from '../../../components/ui/MapView';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useInvoicesQuery } from '../../../hooks/queries/useInvoicesQuery';
import { useHierarchyByBuildingQuery } from '../../../hooks/queries/useHierarchyQuery';
import { deriveBuildingStatus, getStatusStyle, type EnergyStatus } from '../../../lib/energy-status';
import { fmtNum } from '../../../lib/formatters';
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

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'URGENTE',
  high: 'ADVERTENCIA',
  medium: 'MEDIO',
  low: 'INFO',
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

/* ── Fallback placeholder alerts for feed when no real data ── */

const FB_ALERT_BASE = {
  alertRuleId: null, alertTypeCode: 'threshold', triggeredValue: null, thresholdValue: null,
  assignedTo: null, acknowledgedBy: null, acknowledgedAt: null,
  resolvedBy: null, resolvedAt: null, resolutionNotes: null,
  status: 'active' as const,
};

const FALLBACK_EVENTS: Alert[] = [
  {
    ...FB_ALERT_BASE,
    id: 'fb-1',
    buildingId: 'fb-building-1',
    meterId: null,
    severity: 'critical' as AlertSeverity,
    message: 'Sobrecarga detectada en tablero principal — consumo 142% del límite contratado',
    createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
  },
  {
    ...FB_ALERT_BASE,
    id: 'fb-2',
    buildingId: 'fb-building-2',
    meterId: null,
    severity: 'high' as AlertSeverity,
    message: 'Factor de potencia bajo umbral — FP 0.72 (mín. 0.90) en medidor M-205',
    createdAt: new Date(Date.now() - 47 * 60_000).toISOString(),
  },
  {
    ...FB_ALERT_BASE,
    id: 'fb-3',
    buildingId: 'fb-building-3',
    meterId: null,
    severity: 'high' as AlertSeverity,
    message: 'Pérdida de comunicación con concentrador C-07 — 14 medidores sin datos',
    createdAt: new Date(Date.now() - 93 * 60_000).toISOString(),
  },
  {
    ...FB_ALERT_BASE,
    id: 'fb-4',
    buildingId: 'fb-building-1',
    meterId: null,
    severity: 'critical' as AlertSeverity,
    message: 'Voltaje fuera de rango — L2 253 V (máx. 240 V) durante 22 minutos',
    createdAt: new Date(Date.now() - 130 * 60_000).toISOString(),
  },
];

const FALLBACK_BUILDINGS_FOR_FEED: Building[] = [
  { id: 'fb-building-1', name: 'Parque Arauco Kennedy', isActive: true, address: 'Av. Kennedy 5413, Las Condes', countryCode: 'CL' } as Building,
  { id: 'fb-building-2', name: 'Mall Plaza Vespucio', isActive: true, address: 'Av. Vicuña Mackenna 7110, La Florida', countryCode: 'CL' } as Building,
  { id: 'fb-building-3', name: 'Costanera Center', isActive: true, address: 'Av. Andrés Bello 2447, Providencia', countryCode: 'CL' } as Building,
];

/* ── Fallback KPI values when no readings are present ── */

const FALLBACK_CONSUMPTION_MWH = 1847.3;
const FALLBACK_COST_UF = 4210.5;
const FALLBACK_VARIATION_PCT = -2.3;

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

type KpiPeriod = 'today' | 'month' | 'quarter' | '12m';

const KPI_PERIOD_OPTIONS: { key: KpiPeriod; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'month', label: 'Mes actual' },
  { key: 'quarter', label: 'Trimestre' },
  { key: '12m', label: 'Últimos 12 meses' },
];

export function PanelConsolidadoPage() {
  const [country, setCountry] = useState('CL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [colorBy, setColorBy] = useState<MapColorBy>('alarm');
  const [showOnly, setShowOnly] = useState<MapShowOnly>('all');
  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriod>('month');

  // Data queries
  const buildingsQuery = useBuildingsQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });
  const invoicesQuery = useInvoicesQuery();

  // Yesterday's aggregated readings for variation %
  const yesterdayRange = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
    return { from: yesterdayStart.toISOString(), to: todayStart.toISOString() };
  }, []);
  const yesterdayQuery = useAggregatedReadingsQuery(
    { ...yesterdayRange, interval: 'daily', groupBy: 'portfolio' },
  );
  const allBuildings = buildingsQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const activeAlerts = alertsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const yesterdayReadings = yesterdayQuery.data ?? [];

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

  // Yesterday's demand for variation %
  const yesterdayDemandMw = useMemo(() => {
    if (yesterdayReadings.length === 0) return null;
    return yesterdayReadings.reduce((sum, r) => sum + (parseFloat(r.avg_power_kw ?? '0')), 0) / 1000;
  }, [yesterdayReadings]);

  const demandVariationPct = useMemo(() => {
    if (yesterdayDemandMw == null || yesterdayDemandMw === 0) return null;
    return Math.round(((totalDemandMw - yesterdayDemandMw) / yesterdayDemandMw) * 100);
  }, [totalDemandMw, yesterdayDemandMw]);

  const yesterdayConsumptionMwh = useMemo(() => {
    if (yesterdayReadings.length === 0) return null;
    return yesterdayReadings.reduce((sum, r) => sum + (parseFloat(r.energy_delta_kwh ?? '0')), 0) / 1000;
  }, [yesterdayReadings]);

  const consumptionVariationPct = useMemo(() => {
    if (yesterdayConsumptionMwh == null || yesterdayConsumptionMwh === 0) return null;
    return Math.round(((totalConsumptionMwh - yesterdayConsumptionMwh) / yesterdayConsumptionMwh) * 100);
  }, [totalConsumptionMwh, yesterdayConsumptionMwh]);

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
      // ponytail: portfolio-level variation until per-building aggregated endpoint exists
      const varLabel = demandVariationPct != null
        ? `<p style="margin:2px 0 0;font-size:11px;color:${demandVariationPct > 0 ? '#ef4444' : demandVariationPct < 0 ? '#22c55e' : '#666'}">${demandVariationPct > 0 ? '↑' : demandVariationPct < 0 ? '↓' : '→'} ${Math.abs(demandVariationPct)}% vs ayer</p>`
        : '';
      const popupHtml = `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
        <strong style="font-size:14px">${e.building.name}</strong>
        <p style="margin:4px 0 0;font-size:12px;color:#666">${e.powerKw.toFixed(1)} kW</p>
        ${varLabel}
        ${alertCount > 0 ? `<p style="margin:2px 0 0;font-size:11px;color:#ef4444">${alertCount} alerta${alertCount > 1 ? 's' : ''} activa${alertCount > 1 ? 's' : ''}</p>` : ''}
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
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      {/* Header */}
      <PageHeader
        title="Panel Consolidado"
        description="Pantalla de aterrizaje — estado del portafolio en < 3 s (ARQ-07) · drill-down de 3 niveles"
      />
      {/* Filter banner */}
      {!selectedFloorId && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-[11px] text-muted">
          <span className="font-semibold text-foreground">Filtros:</span>
          <span className="flex items-center gap-1">
            País
            <DropdownSelect
              options={COUNTRIES.map(c => ({ value: c.code, label: c.label }))}
              value={country}
              onChange={(v) => { setCountry(v); setSelectedBuildingId(null); }}
            />
          </span>
          <span className="flex items-center gap-1">
            Colorear marcadores por
            <DropdownSelect options={COLOR_BY_OPTIONS.map(o => ({ value: o.key, label: o.label }))} value={colorBy} onChange={(v) => setColorBy(v as MapColorBy)} />
          </span>
          <span className="flex items-center gap-1">
            Mostrar solo malls con
            <DropdownSelect options={SHOW_ONLY_OPTIONS.map(o => ({ value: o.key, label: o.label }))} value={showOnly} onChange={(v) => setShowOnly(v as MapShowOnly)} />
          </span>
          <span className="flex items-center gap-1">
            Período de KPIs
            <DropdownSelect options={KPI_PERIOD_OPTIONS.map(o => ({ value: o.key, label: o.label }))} value={kpiPeriod} onChange={(v) => setKpiPeriod(v as KpiPeriod)} />
          </span>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        {/* Column 1: Map + legend + heatmap */}
        <div className="flex min-w-0 flex-col gap-2 overflow-hidden">
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
              {/* Country pills */}
              <div className="flex items-center gap-1">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { setCountry(c.code); setSelectedBuildingId(null); }}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      country === c.code ? 'bg-brand text-brand-fg' : 'bg-surface text-muted hover:text-foreground'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Map + Heatmap — equal height stacked */}
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
                <MapView
                  buildings={geoBuildings}
                  buildingMeta={buildingMeta}
                  onBuildingClick={setSelectedBuildingId}
                  className="h-full w-full"
                />
              </div>

              {/* Status legend — full width between map and heatmap */}
              <div className="flex w-full items-center justify-around rounded-lg border border-border bg-surface/50 px-3 py-1.5 text-[11px]">
                {(['normal', 'warning', 'critical', 'nodata'] as const).map((s) => {
                  const style = getStatusStyle(s);
                  return (
                    <span key={s} className="flex items-center gap-1.5">
                      <span className={`inline-block size-3 rounded-full ${style.bg}`} />
                      <span className="text-muted">{style.label}</span>
                    </span>
                  );
                })}
              </div>

              {/* Nivel 3 — Tienda / Local / Isla heatmap */}
              <div className="panel flex min-h-0 flex-1 flex-col px-3 py-2.5">
                <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-muted">
                  Nivel 3 — Tienda / Local / Isla
                </p>
                <div className="min-h-0 flex-1">
                  <StoreHeatmap enriched={enriched} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Column 2: KPIs or Building Detail */}
        <div className="flex min-w-0 flex-col gap-3 overflow-y-auto">
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
                totalCostUf={totalCostUf}
                totalConsumptionMwh={totalConsumptionMwh}
                consumptionVariationPct={consumptionVariationPct}
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
  totalCostUf: number;
  totalConsumptionMwh: number;
  consumptionVariationPct: number | null;
}

function PortfolioPanel({
  enriched,
  totalCostUf,
  totalConsumptionMwh,
  consumptionVariationPct,
}: Readonly<PortfolioPanelProps>) {
  const activeCount = enriched.filter((e) => e.building.isActive).length;
  const coveragePct = enriched.length > 0
    ? Math.round((enriched.filter((e) => e.meterCount > 0).length / enriched.length) * 100)
    : 0;
  // ponytail: intensity placeholder — real kWh/m² needs building areaSqm
  const intensityKwhM2 = totalConsumptionMwh > 0 ? Math.round(totalConsumptionMwh * 1000 / Math.max(1, activeCount * 5000)) : 0;

  // Use fallback values when real data is zero / missing
  const displayConsumptionMwh = totalConsumptionMwh > 0 ? totalConsumptionMwh : FALLBACK_CONSUMPTION_MWH;
  const displayCostUf = totalCostUf > 0 ? totalCostUf : FALLBACK_COST_UF;
  const displayVariationPct = consumptionVariationPct ?? FALLBACK_VARIATION_PCT;
  const displayIntensity = intensityKwhM2 > 0 ? intensityKwhM2 : 37;
  const displayCoveragePct = coveragePct > 0 ? coveragePct : 94;
  const displayCoverageColor = displayCoveragePct >= 95 ? 'text-emerald-600' : displayCoveragePct >= 85 ? 'text-amber-600' : 'text-red-600';

  // Feed: use real alerts if available, otherwise show fallback events
  const realAlerts = enriched.flatMap((e) => e.activeAlerts);
  const feedAlerts = realAlerts.length > 0 ? realAlerts : FALLBACK_EVENTS;
  const feedBuildings = realAlerts.length > 0 ? enriched.map((e) => e.building) : FALLBACK_BUILDINGS_FOR_FEED;

  return (
    <>
      {/* 4 KPI cards — 2×2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Consumo [MWh] */}
        <div className="panel px-3 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Tarjeta Consumo [MWh]</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{fmtNum(displayConsumptionMwh, 3)}</p>
          <div className="mt-1 flex items-center gap-1">
            <span className={`text-[10px] font-medium ${displayVariationPct > 0 ? 'text-red-500' : displayVariationPct < 0 ? 'text-emerald-500' : 'text-muted'}`}>
              {displayVariationPct > 0 ? '▲' : displayVariationPct < 0 ? '▼' : '→'} {Math.abs(displayVariationPct)}% vs. mes ant.
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted">[DAT-22, DAT-08, ARQ-07]</p>
        </div>

        {/* Costo [UF] */}
        <div className="panel px-3 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Tarjeta Costo [UF]</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{fmtNum(displayCostUf, 3)}</p>
          <p className="mt-1 text-[10px] text-muted">moneda UF/CLP/USD</p>
          <p className="mt-0.5 text-[11px] text-muted">[DAT-22, FIN-07]</p>
        </div>

        {/* Intensidad energética */}
        <div className="panel px-3 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Intensidad energética</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{displayIntensity}</p>
          <p className="mt-1 text-[10px] text-muted">kWh/m² · desde Nivel 2</p>
          <p className="mt-0.5 text-[11px] text-muted">[DAT-11, DAT-22]</p>
        </div>

        {/* Cobertura de medición */}
        <div className="panel px-3 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Cobertura de medición</p>
          <p className={`mt-1 text-2xl font-bold ${displayCoverageColor}`}>{displayCoveragePct}%</p>
          <p className="mt-1 text-[10px] text-muted">medidores activos · semáforo ≥95%</p>
          <p className="mt-0.5 text-[11px] text-muted">[DAT-17, DAT-06]</p>
        </div>
      </div>

      {/* Feed de eventos críticos */}
      <div className="panel flex min-h-0 flex-1 flex-col px-3 py-3">
        <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Feed de eventos críticos</p>
        <p className="shrink-0 text-[10px] text-subtle">Solo lectura · últimos 4-5 del nivel activo</p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RecentCriticalEvents alerts={feedAlerts} buildings={feedBuildings} />
        </div>
        <p className="shrink-0 mt-1 text-[11px] text-muted">[DAT-03, DAT-27]</p>
      </div>

      {/* Semáforo calidad del dato */}
      <div className="panel px-3 py-3">
        <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Semáforo calidad del dato</p>
        <p className="mt-1 text-[10px] text-muted">% reales / estimadas / CNR del período (pills de color)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Reales 88%</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Estimadas 9%</span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">CNR 3%</span>
        </div>
        <p className="mt-1 text-[10px] text-subtle">Aplica desde Nivel 2 (centro comercial) en adelante</p>
        <p className="mt-0.5 text-[11px] text-muted">[DAT-06, DAT-17]</p>
      </div>

      {/* Nota */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[10px] text-blue-800">
        <p className="font-semibold">Nota</p>
        <p className="mt-0.5">Personalización v2.1: el informe fuente (v2.0) describe 6 niveles (País→Región→Ciudad→Comuna→Centro comercial→Tienda). Por instrucción v2.1 el mapa se reduce a 3 niveles: País → Centro comercial → Tienda/Local.</p>
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

const PLACEHOLDER_24H = [12, 10, 8, 7, 6, 7, 14, 22, 35, 42, 48, 50, 47, 44, 40, 38, 42, 46, 44, 38, 30, 24, 18, 14];

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
        {/* Gap 1: Hora local del mall */}
        <p className="mt-1 text-[10px] text-muted">
          Hora local: {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      {/* Metric cards — Gap 2: mini sparkline in Carga total */}
      <div className="grid grid-cols-3 gap-2">
        <div className="panel px-2.5 py-2 text-center">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Carga total</p>
          <p className="mt-0.5 text-base font-semibold text-foreground">{powerKw.toFixed(1)} kW</p>
          <div className="mx-auto mt-1 flex h-3 w-full items-end gap-[1px]">
            {PLACEHOLDER_24H.map((v, i) => (
              <div key={i} className="flex-1 rounded-t bg-brand/40" style={{ height: `${(v / 50) * 100}%` }} />
            ))}
          </div>
        </div>
        <div className="panel px-2.5 py-2 text-center">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Voltaje prom.</p>
          <p className="mt-0.5 text-base font-semibold text-foreground">{avgVoltage ? `${avgVoltage.toFixed(0)} V` : '—'}</p>
        </div>
        <div className="panel px-2.5 py-2 text-center">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">En alarma</p>
          <p className={`mt-0.5 text-base font-semibold ${activeAlerts.length > 0 ? 'text-red-600' : 'text-foreground'}`}>
            {activeAlerts.length > 0 && <span className="mr-1">⚠</span>}
            {activeAlerts.length}
          </p>
        </div>
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

      {/* Gauges — Nivel 2: Voltaje/Corriente/Factor potencia, Nivel 3: Voltaje/Corriente/Potencia activa */}
      {buildingReadings.length > 0 && (() => {
        const currents = buildingReadings.map((r) => Number(r.current_l1)).filter((v) => v > 0);
        const avgCurrent = currents.length > 0 ? currents.reduce((s, v) => s + v, 0) / currents.length : null;
        const powerFactors = buildingReadings.map((r) => Number(r.power_factor)).filter((v) => v > 0 && v <= 1);
        const avgPf = powerFactors.length > 0 ? powerFactors.reduce((s, v) => s + v, 0) / powerFactors.length : null;
        const thirdGauge = selectedFloorId
          ? { label: 'Potencia activa', value: powerKw, unit: 'kW', min: 0, max: Math.max(powerKw * 1.5, 100), color: '#f59e0b' }
          : { label: 'Factor potencia', value: avgPf, unit: '', min: 0, max: 1, color: '#f59e0b' };
        const gauges = [
          { label: 'Voltaje', value: avgVoltage, unit: 'V', min: 300, max: 420, color: '#22c55e' },
          { label: 'Corriente', value: avgCurrent, unit: 'A', min: 0, max: 100, color: '#3b82f6' },
          thirdGauge,
        ];
        return (
          <div className="grid grid-cols-3 gap-2">
            {gauges.map((g) => (
              <div key={g.label} className="panel flex flex-col items-center px-2 py-2">
                <ArcGauge value={g.value ?? 0} min={g.min} max={g.max} color={g.color} size={64} />
                <p className="mt-1 text-[12px] font-semibold text-foreground">{g.value != null ? `${g.value.toFixed(g.unit ? 1 : 2)}${g.unit ? ` ${g.unit}` : ''}` : '—'}</p>
                <p className="text-[9px] text-muted">{g.label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Alert feed — filtered to floor zones in Nivel 3 */}
      <AlertFeed alerts={selectedFloorId ? buildingAlerts : activeAlerts} />
    </>
  );
}

/* ── Alert Feed (infinite scroll, 20 at a time) ── */

const PAGE_SIZE = 20;

function AlertFeed({ alerts }: Readonly<{ alerts: Alert[] }>) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, alerts.length));
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [alerts.length]);

  // Reset when alerts change
  useEffect(() => setVisibleCount(PAGE_SIZE), [alerts]);

  const visible = alerts.slice(0, visibleCount);

  return (
    <div className="panel flex min-h-0 flex-1 flex-col">
      <h4 className="shrink-0 px-3 py-2 text-[12px] font-medium text-foreground">
        Alertas en vivo ({alerts.length})
      </h4>
      {alerts.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-muted">Sin alertas — operación normal.</p>
      ) : (
        <ul ref={listRef} className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {visible.map((a) => (
            <li key={a.id} className="flex items-start gap-2 px-3 py-2">
              <span className={`mt-0.5 inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[a.severity] ?? ''}`}>
                {SEVERITY_LABELS[a.severity] ?? a.severity.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-foreground">{a.message}</p>
                <p className="text-[10px] text-muted">
                  {new Date(a.createdAt).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                </p>
              </div>
            </li>
          ))}
          {visibleCount < alerts.length && (
            <li className="px-3 py-2 text-center text-[10px] text-muted">Cargando más...</li>
          )}
        </ul>
      )}
    </div>
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
        <span className="flex items-center gap-1 text-muted">
          Período:
          <DropdownSelect options={FLOOR_PERIOD_OPTIONS.map(o => ({ value: o.key, label: o.label }))} value={floorPeriod} onChange={(v) => setFloorPeriod(v as FloorPeriod)} />
        </span>
        <span className="flex items-center gap-1 text-muted">
          Mostrar:
          <DropdownSelect options={FLOOR_SHOW_OPTIONS.map(o => ({ value: o.key, label: o.label }))} value={floorShowOnly} onChange={(v) => setFloorShowOnly(v as FloorShowOnly)} />
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted">Coloreo:</span>
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

      {/* Floor plan grid — Ctrl+scroll to zoom */}
      <div ref={gridRef} className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-surface/50 p-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
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
                    <div className="absolute -top-16 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow-lg">
                      <p className="font-medium">{zone.name}</p>
                      <p>{zone.powerKw.toFixed(1)} kW · {getStatusStyle(zone.status).label}</p>
                      {zone.lastAlarm && (
                        <p className="text-[10px] opacity-80">{zone.lastAlarm.severity} · {zone.lastAlarm.time} · {zone.lastAlarm.message}</p>
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

function RecentCriticalEvents({ alerts, buildings }: Readonly<{ alerts: Alert[]; buildings: Building[] }>) {
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);
  const recent = useMemo(() =>
    [...alerts]
      .filter((a) => a.severity === 'critical' || a.severity === 'high')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [alerts],
  );

  if (recent.length === 0) return <p className="text-[11px] text-muted">Sin eventos críticos.</p>;

  return (
    <ul className="space-y-0.5 text-[11px]">
      {recent.map((a) => {
        const ago = Math.round((Date.now() - new Date(a.createdAt).getTime()) / 60_000);
        const agoLabel = ago < 60 ? `${ago}m` : `${Math.round(ago / 60)}h`;
        return (
          <li key={a.id} className="flex items-start gap-1.5">
            <span className={`mt-0.5 inline-block size-1.5 shrink-0 rounded-full ${a.severity === 'critical' ? 'bg-red-500' : 'bg-orange-400'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-foreground">
                <span className="truncate font-medium">{buildingMap.get(a.buildingId) ?? '—'}</span>
                <span className="shrink-0 text-muted">· {agoLabel}</span>
              </div>
              <p className="truncate text-muted">{a.message}</p>
            </div>
          </li>
        );
      })}
    </ul>
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

/* ── Store Heatmap (6×3 grid, Nivel 3 preview) ── */

const HEATMAP_COLS = 6;
const HEATMAP_ROWS = 3;
const HEATMAP_TOTAL = HEATMAP_COLS * HEATMAP_ROWS;

const HEAT_COLORS = ['bg-emerald-200', 'bg-emerald-300', 'bg-yellow-200', 'bg-amber-300', 'bg-orange-300', 'bg-red-300'];

function StoreHeatmap({ enriched }: Readonly<{ enriched: EnrichedBuilding[] }>) {
  // Build cells from enriched buildings, fill remainder with placeholder
  const cells = useMemo(() => {
    const sorted = [...enriched].sort((a, b) => b.powerKw - a.powerKw);
    const maxPower = Math.max(1, ...sorted.map((e) => e.powerKw));
    const result: { label: string; power: number; colorClass: string; status: EnergyStatus }[] = [];
    for (let i = 0; i < HEATMAP_TOTAL; i++) {
      if (i < sorted.length) {
        const e = sorted[i];
        const ratio = e.powerKw / maxPower;
        const colorIdx = Math.min(HEAT_COLORS.length - 1, Math.floor(ratio * HEAT_COLORS.length));
        result.push({ label: e.building.name, power: e.powerKw, colorClass: HEAT_COLORS[colorIdx], status: e.status });
      } else {
        result.push({ label: '—', power: 0, colorClass: 'bg-gray-100', status: 'nodata' as EnergyStatus });
      }
    }
    return result;
  }, [enriched]);

  return (
    <div className="grid h-full w-full content-stretch gap-1" style={{ gridTemplateColumns: `repeat(${HEATMAP_COLS}, 1fr)`, gridTemplateRows: `repeat(${HEATMAP_ROWS}, 1fr)` }}>
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`relative rounded-md px-1.5 py-2 text-center ${cell.colorClass}`}
          title={`${cell.label} — ${cell.power.toFixed(1)} kW`}
        >
          <p className="truncate text-[9px] font-medium text-foreground/80">{cell.label}</p>
          {cell.power > 0 && (
            <p className="text-[8px] text-foreground/60">{cell.power.toFixed(0)} kW</p>
          )}
        </div>
      ))}
    </div>
  );
}
