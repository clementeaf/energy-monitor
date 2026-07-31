import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { MapView } from '../../../components/ui/MapView';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useOperatorFilter } from '../../../hooks/useOperatorFilter';
import { getStatusStyle } from '../../../lib/energy-status';
import type { BuildingMarkerMeta } from '../../../components/ui/MapView';
import type { Building } from '../../../types/building';
import type { AggregatedReading } from '../../../types/reading';
import { TrendSparkline } from './TrendSparkline';
import { MeterTable } from './MeterTable';
import {
  COUNTRY_OPTIONS, PERIODS, METRICS, SORT_OPTIONS, GRANULARITY_OPTIONS, COMPARE_OPTIONS,
  METRIC_ACCESSORS,
  buildRows, formatMetric,
} from './consumo-utils';

type ConsumoTab = 'mapa' | 'medidores';

export function ConsumoJerarquicoPage() {
  const { isFilteredMode, needsSelection, operatorBuildingIds, operatorMeterIds } = useOperatorFilter();
  const [country, setCountry] = useState('CL');
  const [period, setPeriod] = useState('month');
  const [metric, setMetric] = useState('consumption');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('highest');
  const [compareWith, setCompareWith] = useState('previous');
  const [granularity, setGranularity] = useState<'monthly' | 'weekly'>('monthly');
  const [activeTab, setActiveTab] = useState<ConsumoTab>('mapa');

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });
  const yesterdayQuery = { data: [] as AggregatedReading[] };

  const rawBuildings = buildingsQuery.data ?? [];
  const allBuildings = useMemo(() => {
    if (!isFilteredMode || !operatorBuildingIds) return rawBuildings;
    return rawBuildings.filter((b) => operatorBuildingIds.has(b.id));
  }, [rawBuildings, isFilteredMode, operatorBuildingIds]);

  const rawMeters = metersQuery.data ?? [];
  const allMeters = useMemo(() => {
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

  const currentMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const accessor = METRIC_ACCESSORS[metric] ?? METRIC_ACCESSORS.consumption;

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

  const filteredBuildings = allBuildings.filter((b) => (b.countryCode ?? 'CL') === country);
  const rows = buildRows(filteredBuildings, readings, alerts, yesterdayQuery.data);

  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === 'name') return a.building.name.localeCompare(b.building.name);
    if (sortBy === 'alerts') return b.alertCount - a.alertCount;
    if (sortBy === 'lowest') return accessor(a) - accessor(b);
    return accessor(b) - accessor(a);
  });

  const geoBuildings = filteredBuildings.filter((b): b is Building & { latitude: number; longitude: number } =>
    b.latitude != null && b.longitude != null,
  );

  const buildingMeta = useMemo(() => {
    const map = new Map<string, BuildingMarkerMeta>();
    const maxVal = Math.max(1, ...rows.map((r) => accessor(r)));
    rows.forEach((r) => {
      const val = accessor(r);
      const ratio = val / maxVal;
      const color = ratio > 0.75 ? '#ef4444' : ratio > 0.5 ? '#f59e0b' : ratio > 0.25 ? '#3b82f6' : '#22c55e';
      const scale = 0.6 + 0.8 * ratio;
      map.set(r.building.id, {
        color, scale,
        popupHtml: `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
          <strong style="font-size:13px">${r.building.name}</strong>
          <p style="margin:3px 0 0;font-size:12px">${formatMetric(val, currentMetric.unit)}</p>
          ${r.variationPct != null ? `<p style="margin:2px 0 0;font-size:11px;color:${r.variationPct > 0 ? '#ef4444' : '#22c55e'}">${r.variationPct > 0 ? '↑' : '↓'} ${Math.abs(r.variationPct)}% vs ayer</p>` : ''}
        </div>`,
      });
    });
    return map;
  }, [rows, accessor, currentMetric.unit]);

  const selectedRow = expandedId ? sortedRows.find((r) => r.building.id === expandedId) ?? null : null;
  const expandedMeters = expandedId ? allMeters.filter((m) => m.buildingId === expandedId) : [];
  const expandedMeterIds = new Set(expandedMeters.map((m) => m.id));
  const expandedReadings = readings.filter((r) => expandedMeterIds.has(r.meter_id));

  const zones = useMemo(() => {
    if (expandedMeters.length === 0) return [];
    const zoneMap = new Map<string, typeof expandedMeters>();
    expandedMeters.forEach((m) => {
      const zone = (m.metadata as Record<string, string>)?.zone ?? m.loadCategory ?? 'general';
      const list = zoneMap.get(zone) ?? [];
      list.push(m);
      zoneMap.set(zone, list);
    });
    return Array.from(zoneMap.entries()).map(([name, meters]) => {
      const meterIds = new Set(meters.map((m) => m.id));
      const hasOnline = expandedReadings.some((r) => meterIds.has(r.meter_id));
      const hasStale = expandedReadings.some((r) => meterIds.has(r.meter_id) && (Date.now() - new Date(r.timestamp).getTime()) > 4 * 3_600_000);
      const status = !hasOnline ? 'offline' : hasStale ? 'stale' : 'online';
      return { name, meters, status };
    });
  }, [expandedMeters, expandedReadings]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="Consumo Jerárquico"
        description="Mapa + árbol expandible + panel de detalle sincronizados"
      />

      {/* Filters */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-[11px] text-muted">
        <span className="font-semibold text-foreground">Filtros:</span>
        <span className="flex items-center gap-1">
          País
          <DropdownSelect options={COUNTRY_OPTIONS.map((c) => ({ value: c.key, label: c.label }))} value={country} onChange={setCountry} />
        </span>
        <span className="flex items-center gap-1">
          Período
          <DropdownSelect options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} value={period} onChange={setPeriod} />
        </span>
        <span className="flex items-center gap-1">
          Métrica
          <DropdownSelect options={METRICS.map((m) => ({ value: m.key, label: `${m.label} [${m.unit}]` }))} value={metric} onChange={setMetric} />
        </span>
        <span className="flex items-center gap-1">
          Ordenar
          <DropdownSelect options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={sortBy} onChange={setSortBy} />
        </span>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-border">
        <button type="button" onClick={() => setActiveTab('mapa')}
          className={`px-4 py-2 text-[12px] font-medium transition-colors ${activeTab === 'mapa' ? 'border-b-2 border-brand text-brand' : 'text-muted hover:text-foreground'}`}>
          Mapa y detalle
        </button>
        <button type="button" onClick={() => setActiveTab('medidores')}
          className={`px-4 py-2 text-[12px] font-medium transition-colors ${activeTab === 'medidores' ? 'border-b-2 border-brand text-brand' : 'text-muted hover:text-foreground'}`}>
          Medidores {selectedRow ? `— ${selectedRow.building.name}` : ''}
        </button>
      </div>

      {/* Tab: Mapa y detalle */}
      {activeTab === 'mapa' && (
        <div className="flex min-h-0 flex-1 gap-3">
          {/* Map */}
          <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Mapa geográfico</p>
            <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
              <MapView
                buildings={geoBuildings}
                buildingMeta={buildingMeta}
                onBuildingClick={(id) => setExpandedId(expandedId === id ? null : id)}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Tree */}
          <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Árbol jerárquico</p>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto text-[12px]">
              <div className="font-semibold text-foreground">▼ Total país — Chile</div>
              <ul className="mt-1 space-y-0.5">
                {sortedRows.map((row) => {
                  const isExp = expandedId === row.building.id;
                  const style = getStatusStyle(row.status as 'normal' | 'warning' | 'critical' | 'nodata');
                  return (
                    <li key={row.building.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExp ? null : row.building.id)}
                        className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left transition-colors hover:bg-surface"
                      >
                        <span className={`inline-block text-[10px] text-muted transition-transform duration-200 ${isExp ? 'rotate-90' : ''}`}>▶</span>
                        <span className={`inline-block size-2 shrink-0 rounded-full ${style.bg}`} />
                        <span className="truncate font-medium text-foreground">{row.building.name}</span>
                        <span className="ml-auto text-[10px] text-muted">{formatMetric(accessor(row), currentMetric.unit)}</span>
                      </button>
                      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ display: 'grid', gridTemplateRows: isExp ? '1fr' : '0fr' }}>
                        <div className="min-h-0">
                          {zones.length > 0 && (
                            <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-2 pb-1">
                              {zones.map((z) => (
                                <li key={z.name} className="text-[11px] text-muted">{z.name}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
            <div className="panel px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-wider text-muted">KPIs del mall</p>
              {selectedRow ? (
                <div className="mt-2 space-y-1 text-[11px]">
                  <p className="text-foreground">• Consumo <span className="font-semibold">{formatMetric(accessor(selectedRow), currentMetric.unit)}</span> {selectedRow.variationPct != null && <span className={selectedRow.variationPct > 0 ? 'text-red-500' : 'text-emerald-500'}>▲{Math.abs(selectedRow.variationPct)}%</span>}</p>
                  <p className="text-foreground">• Intensidad <span className="font-semibold">{METRIC_ACCESSORS.intensity(selectedRow).toFixed(1)} kWh/m²</span></p>
                  <p className="text-foreground">• Costo <span className="font-semibold">{METRIC_ACCESSORS.cost(selectedRow).toFixed(1)} UF</span></p>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-muted">Seleccione un mall</p>
              )}
            </div>

            <div className="panel flex min-h-0 flex-1 flex-col px-3 py-2.5">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Tendencia</p>
                <DropdownSelect options={GRANULARITY_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={granularity} onChange={(v) => setGranularity(v as 'monthly' | 'weekly')} />
                <DropdownSelect options={COMPARE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={compareWith} onChange={setCompareWith} />
              </div>
              <div className="mt-2 min-h-0 flex-1">
                {selectedRow ? (
                  <TrendSparkline buildingId={selectedRow.building.id} metricVal={accessor(selectedRow)} label={currentMetric.unit} granularity={granularity} compareWith={compareWith} />
                ) : (
                  <p className="text-[11px] text-muted">Seleccione un mall</p>
                )}
              </div>
            </div>

            <div className="panel px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Zonas</p>
              {zones.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {zones.map((z) => (
                    <div key={z.name} className={`rounded px-2 py-1.5 text-center text-[10px] ${z.status === 'online' ? 'bg-emerald-100 text-emerald-700' : z.status === 'stale' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {z.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-muted">Seleccione un mall</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Medidores */}
      {activeTab === 'medidores' && (
        <div className="min-h-0 flex-1">
          <MeterTable meters={expandedMeters} readings={expandedReadings} />
        </div>
      )}
    </div>
  );
}
