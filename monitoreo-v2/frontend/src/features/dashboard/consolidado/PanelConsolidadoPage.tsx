import { useState, useMemo, useEffect } from 'react';
import { MapView } from '../../../components/ui/MapView';
import type { BuildingMarkerMeta, SelectedPoint, IndoorConfig } from '../../../components/ui/MapView';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery, useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useInvoicesQuery } from '../../../hooks/queries/useInvoicesQuery';
import { useMapVxMalls } from '../../../hooks/queries/useMapVxQuery';
import { getStatusStyle, type EnergyStatus } from '../../../lib/energy-status';
import { useOperatorFilter } from '../../../hooks/useOperatorFilter';
import type { Building } from '../../../types/building';
import type { MapPolygon } from '../../../components/ui/MapView';
import {
  COUNTRIES,
  enrichBuildings,
} from './consolidado-utils';
import { PortfolioPanel } from './PortfolioPanel';
import { BuildingDetail } from './BuildingDetail';
import { FloorPlanView } from './FloorPlanView';
import { BuildingList } from './BuildingList';

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
  { key: 'warning', label: 'Alerta' },
  { key: 'nodata', label: 'Sin datos' },
];


const STATUS_MARKER_COLORS: Record<EnergyStatus, string> = {
  normal: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  nodata: '#9ca3af',
};

export function PanelConsolidadoPage() {
  const { isFilteredMode, needsSelection, operatorBuildingIds, operatorMeterIds } = useOperatorFilter();
  const [country, setCountry] = useState('CL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [colorBy, setColorBy] = useState<MapColorBy>('alarm');
  const [showOnly, setShowOnly] = useState<MapShowOnly>('all');
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });
  const invoicesQuery = useInvoicesQuery();
  const mallsQuery = useMapVxMalls();
  const malls = mallsQuery.data ?? [];
  const [indoorFloorKey, setIndoorFloorKey] = useState('');

  const yesterdayRange = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
    return { from: yesterdayStart.toISOString(), to: todayStart.toISOString() };
  }, []);
  const yesterdayQuery = useAggregatedReadingsQuery(
    { ...yesterdayRange, interval: 'daily', groupBy: 'portfolio' },
  );

  const rawBuildings = buildingsQuery.data ?? [];
  const allBuildings = useMemo(() => {
    if (!isFilteredMode || !operatorBuildingIds) return rawBuildings;
    return rawBuildings.filter((b) => operatorBuildingIds.has(b.id));
  }, [rawBuildings, isFilteredMode, operatorBuildingIds]);

  const rawReadings = latestQuery.data ?? [];
  const readings = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawReadings;
    return rawReadings.filter((r) => operatorMeterIds.has(r.meter_id));
  }, [rawReadings, isFilteredMode, operatorMeterIds]);

  const rawAlerts = alertsQuery.data ?? [];
  const activeAlerts = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawAlerts;
    return rawAlerts.filter((a) => a.meterId && operatorMeterIds.has(a.meterId));
  }, [rawAlerts, isFilteredMode, operatorMeterIds]);

  const invoices = invoicesQuery.data ?? [];
  const yesterdayReadings = yesterdayQuery.data ?? [];

  const filteredBuildings = useMemo(
    () => allBuildings.filter((b) => (b.countryCode ?? 'CL') === country),
    [allBuildings, country],
  );

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

  const enriched = enrichBuildings(filteredBuildings, readings, activeAlerts);

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

  const totalDemandMw = enriched.reduce((sum, e) => sum + e.powerKw, 0) / 1000;
  const totalConsumptionMwh = enriched.reduce((sum, e) => sum + e.powerKw * 24 / 1000, 0);
  const totalCostUf = invoices
    .filter((inv) => inv.status !== 'voided')
    .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);

  const yesterdayDemandMw = yesterdayReadings.length === 0 ? null
    : yesterdayReadings.reduce((sum, r) => sum + (parseFloat(r.avg_power_kw ?? '0')), 0) / 1000;
  const demandVariationPct = yesterdayDemandMw == null || yesterdayDemandMw === 0 ? null
    : Math.round(((totalDemandMw - yesterdayDemandMw) / yesterdayDemandMw) * 100);

  const yesterdayConsumptionMwh = yesterdayReadings.length === 0 ? null
    : yesterdayReadings.reduce((sum, r) => sum + (parseFloat(r.energy_delta_kwh ?? '0')), 0) / 1000;
  const consumptionVariationPct = yesterdayConsumptionMwh == null || yesterdayConsumptionMwh === 0 ? null
    : Math.round(((totalConsumptionMwh - yesterdayConsumptionMwh) / yesterdayConsumptionMwh) * 100);

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
        const ratio = e.meterCount > 0 ? 1 : 0;
        color = ratio > 0.8 ? '#22c55e' : ratio > 0.5 ? '#f59e0b' : '#ef4444';
      } else {
        color = '#6b7280';
      }
      const alertCount = e.activeAlerts.length;
      const varLabel = demandVariationPct != null
        ? `<p style="margin:4px 0 0;font-size:14px;font-weight:500;color:${demandVariationPct > 0 ? '#dc2626' : demandVariationPct < 0 ? '#16a34a' : '#333'}">${demandVariationPct > 0 ? '↑' : demandVariationPct < 0 ? '↓' : '→'} ${Math.abs(demandVariationPct)}% vs ayer</p>`
        : '';
      const popupHtml = `<div style="font-family:Inter,system-ui,sans-serif;padding:6px 2px">
        <strong style="font-size:16px;color:#111">${e.building.name}</strong>
        <p style="margin:4px 0 0;font-size:14px;color:#333">${e.powerKw.toFixed(1)} kW</p>
        ${varLabel}
        ${alertCount > 0 ? `<p style="margin:4px 0 0;font-size:14px;font-weight:500;color:#dc2626">${alertCount} alerta${alertCount > 1 ? 's' : ''} activa${alertCount > 1 ? 's' : ''}</p>` : ''}
      </div>`;
      const scale = maxPowerAll > 0 ? 0.6 + 0.8 * (e.powerKw / maxPowerAll) : 1;
      map.set(e.building.id, { color, popupHtml, scale });
    });
    return map;
  }, [enriched, colorBy, maxPowerAll, demandVariationPct]);

  const selectedDetail = enriched.find((e) => e.building.id === selectedBuildingId) ?? null;

  const matchedMall = useMemo(() => {
    if (!selectedDetail) return null;
    const b = selectedDetail.building;
    if (b.externalSiteId) return malls.find((m) => m.externalId === b.externalSiteId) ?? null;
    return malls.find((m) => m.name === b.name) ?? null;
  }, [selectedDetail, malls]);

  useEffect(() => {
    if (matchedMall?.hasIndoor) {
      const df = matchedMall.floors.find((f) => f.isDefault) ?? matchedMall.floors[0];
      setIndoorFloorKey(df?.externalKey ?? '');
    } else {
      setIndoorFloorKey('');
    }
  }, [matchedMall]);

  const indoorConfig = useMemo((): IndoorConfig | undefined =>
    matchedMall?.hasIndoor && indoorFloorKey ? { floorKey: indoorFloorKey } : undefined,
    [matchedMall, indoorFloorKey],
  );

  const indoorPolygon = useMemo((): MapPolygon[] => {
    if (!matchedMall?.hasIndoor || !matchedMall.polygonCoords) return [];
    return [{
      id: matchedMall.id,
      label: matchedMall.name,
      coordinates: matchedMall.polygonCoords as [number, number][],
      color: '#3b82f6',
      opacity: 0.15,
    }];
  }, [matchedMall]);

  const mapSelectedPoint = useMemo((): SelectedPoint | null => {
    if (!selectedDetail) return null;
    const b = selectedDetail.building;
    if (b.latitude == null || b.longitude == null) return null;
    return { lat: b.latitude, lng: b.longitude, label: b.name };
  }, [selectedDetail]);

  const mapZoom = matchedMall?.hasIndoor ? 17 : undefined;

  const handleBack = () => {
    if (selectedFloorId) {
      setSelectedFloorId(null);
    } else {
      setSelectedBuildingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* Title + meta */}
      <div className="shrink-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-foreground">Resumen</h1>
        <p className="mt-1 text-xs text-muted">
          Ultima lectura hace 3 min &middot; {enriched.reduce((s, e) => s + e.meterCount, 0) || 200} medidores
        </p>
      </div>

      {/* Country pills + map filters (minimal) */}
      {!selectedFloorId && (
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex gap-1">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                disabled={!c.enabled}
                onClick={() => { if (c.enabled) { setCountry(c.code); setSelectedBuildingId(null); } }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  !c.enabled
                    ? 'cursor-not-allowed bg-surface text-subtle opacity-50'
                    : country === c.code
                      ? 'bg-foreground text-background'
                      : 'bg-surface text-muted hover:text-foreground'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted">
            <DropdownSelect options={COLOR_BY_OPTIONS.map(o => ({ value: o.key, label: o.label }))} value={colorBy} onChange={(v) => setColorBy(v as MapColorBy)} />
            <DropdownSelect options={SHOW_ONLY_OPTIONS.map(o => ({ value: o.key, label: o.label }))} value={showOnly} onChange={(v) => setShowOnly(v as MapShowOnly)} />
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex min-w-0 flex-[3] flex-col gap-2 overflow-hidden">
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
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl">
                <MapView
                  buildings={geoBuildings}
                  buildingMeta={buildingMeta}
                  selectedPoint={mapSelectedPoint}
                  indoor={indoorConfig}
                  polygons={indoorPolygon}
                  zoom={mapZoom}
                  onBuildingClick={setSelectedBuildingId}
                  className="h-full w-full"
                />
              </div>

              <div className="flex w-full items-center justify-around rounded-lg bg-surface px-3 py-1.5 text-xs">
                {(['normal', 'warning', 'critical', 'nodata'] as const).map((s) => {
                  const style = getStatusStyle(s);
                  const count = enriched.filter((e) => e.status === s).length;
                  return (
                    <span key={s} className="flex items-center gap-1.5">
                      <span className={`inline-block size-2.5 rounded-full ${style.bg}`} />
                      <span className="text-muted">{style.label}</span>
                      <span className="font-medium tabular-nums text-foreground">{count}</span>
                    </span>
                  );
                })}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-background">
                <BuildingList enriched={enriched} selectedId={selectedBuildingId} onSelect={setSelectedBuildingId} />
              </div>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-[2] flex-col gap-3 overflow-y-auto">
          {selectedDetail && (
            <button
              type="button"
              onClick={() => { setSelectedBuildingId(null); setSelectedFloorId(null); }}
              className="flex shrink-0 items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2L4 6l4 4" /></svg>
              Volver al portafolio
            </button>
          )}
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
                onSelectBuilding={setSelectedBuildingId}
              />
          }
        </div>
      </div>
    </div>
  );
}
