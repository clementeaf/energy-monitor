import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { MapView } from '../../../components/ui/MapView';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { deriveBuildingStatus, getStatusStyle } from '../../../lib/energy-status';
import type { BuildingMarkerMeta } from '../../../components/ui/MapView';
import type { Building } from '../../../types/building';
import type { LatestReading } from '../../../types/reading';
import type { Meter } from '../../../types/meter';
import type { Alert, AlertSeverity } from '../../../types/alert';

/* ── Filter options ── */

// ponytail: country filter removed from UI (already in navbar); kept for building filter fallback
const DEFAULT_COUNTRY = 'CL';

interface PeriodOption { key: string; label: string }
const PERIODS: PeriodOption[] = [
  { key: 'month', label: 'Mes actual' },
  { key: 'quarter', label: 'Trimestre actual' },
  { key: 'ytd', label: 'Año en curso' },
  { key: '12m', label: 'Últimos 12 meses' },
  { key: 'custom', label: 'Rango personalizado' },
];

interface MetricOption { key: string; label: string; unit: string }
const METRICS: MetricOption[] = [
  { key: 'energy', label: 'Consumo', unit: 'MWh' },
  { key: 'demand', label: 'Demanda', unit: 'kW' },
  { key: 'cost', label: 'Costo', unit: 'UF' },
  { key: 'intensity', label: 'Intensidad', unit: 'kWh/m²' },
];

const SORT_OPTIONS = [
  { key: 'metric', label: 'Por métrica' },
  { key: 'name', label: 'Alfabético' },
  { key: 'alerts', label: 'Por alertas' },
];

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'critical', label: 'Con alarma crítica' },
  { key: 'variation', label: 'Con variación > X%' },
  { key: 'nodata', label: 'Sin datos completos' },
];

const COMPARE_OPTIONS = [
  { key: 'none', label: 'Sin comparación' },
  { key: 'previous', label: 'Período anterior' },
  { key: 'yoy', label: 'Año anterior' },
  { key: 'avg', label: 'Promedio portafolio' },
];

/* ── Building row enrichment ── */

interface BuildingRow {
  building: Building;
  energyMwh: number;
  demandKw: number;
  meterCount: number;
  variationPct: number | null;
  status: string;
  alertCount: number;
}

function buildRows(
  buildings: Building[],
  readings: LatestReading[],
  alerts: Alert[],
  yesterdayAgg: import('../../../types/reading').AggregatedReading[],
): BuildingRow[] {
  const readingsByBuilding = groupByFallback(readings, (r) => r.building_id);
  const alertsByBuilding = groupByFallback(alerts, (a) => a.buildingId);

  // Portfolio-level yesterday demand (from matview)
  const yesterdayPortfolioKw = yesterdayAgg.reduce((s, r) => s + parseFloat(r.avg_power_kw ?? '0'), 0);
  const todayTotalKw = readings.reduce((s, r) => s + Number(r.power_kw || 0), 0);
  // ponytail: portfolio-level variation applied to all buildings until per-building aggregated is fast
  const portfolioVariationPct = yesterdayPortfolioKw > 0
    ? Math.round(((todayTotalKw - yesterdayPortfolioKw) / yesterdayPortfolioKw) * 100)
    : null;

  return buildings.map((building) => {
    const bReadings = readingsByBuilding.get(building.id) ?? [];
    const bAlerts = alertsByBuilding.get(building.id) ?? [];
    const demandKw = bReadings.reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
    const energyMwh = bReadings.reduce((sum, r) => sum + Number(r.energy_kwh_total || 0), 0) / 1000;
    const severities = bAlerts.map((a) => a.severity as AlertSeverity);
    const status = deriveBuildingStatus(severities, bReadings.length > 0);

    return { building, energyMwh, demandKw, meterCount: bReadings.length, variationPct: portfolioVariationPct, status, alertCount: bAlerts.length };
  });
}

function groupByFallback<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  });
  return map;
}

/* ── Metric value accessor ── */

type MetricAccessor = (row: BuildingRow) => number;
const METRIC_ACCESSORS: Record<string, MetricAccessor> = {
  energy: (r) => r.energyMwh,
  demand: (r) => r.demandKw,
  cost: (r) => r.energyMwh * 0.12, // ponytail: placeholder UF/MWh rate, replace with tariff lookup
  intensity: (r) => {
    const area = Number(r.building.areaSqm ?? 0);
    return area > 0 ? (r.energyMwh * 1000) / area : 0; // kWh/m²
  },
};

/* ── Page ── */

export function ConsumoJerarquicoPage() {
  const navigate = useNavigate();
  const country = DEFAULT_COUNTRY;
  const [period, setPeriod] = useState('month');
  const [metric, setMetric] = useState('energy');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('metric');
  const [filterBy, setFilterBy] = useState('all');
  const [compareWith, setCompareWith] = useState('none');
  const [granularity, setGranularity] = useState<'monthly' | 'weekly'>('monthly');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [variationThreshold, setVariationThreshold] = useState(10);

  // Queries
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

  // ponytail: aggregated query disabled — portfolio_summary matview empty in prod causes 504
  // Variation derived as null until matview is populated; sparkline uses placeholder
  const yesterdayQuery = { data: [] as import('../../../types/reading').AggregatedReading[] };

  const allBuildings = buildingsQuery.data ?? [];
  const allMeters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const yesterdayReadings = yesterdayQuery.data ?? [];

  const currentMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const accessor = METRIC_ACCESSORS[metric] ?? METRIC_ACCESSORS.energy;

  // Filter by country
  const filteredBuildings = useMemo(
    () => allBuildings.filter((b) => (b.countryCode ?? 'CL') === country),
    [allBuildings, country],
  );

  // Enrich
  const rows = useMemo(
    () => buildRows(filteredBuildings, readings, alerts, yesterdayReadings),
    [filteredBuildings, readings, alerts, yesterdayReadings],
  );

  // Filter
  const filteredRows = useMemo(() => {
    if (filterBy === 'critical') return rows.filter((r) => r.status === 'critical');
    if (filterBy === 'variation') return rows.filter((r) => r.variationPct != null && Math.abs(r.variationPct) > variationThreshold);
    if (filterBy === 'nodata') return rows.filter((r) => r.status === 'nodata');
    return rows;
  }, [rows, filterBy, variationThreshold]);

  // Sort
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    if (sortBy === 'name') sorted.sort((a, b) => a.building.name.localeCompare(b.building.name));
    else if (sortBy === 'alerts') sorted.sort((a, b) => b.alertCount - a.alertCount);
    else sorted.sort((a, b) => accessor(b) - accessor(a));
    return sorted;
  }, [filteredRows, sortBy, accessor]);

  // Total for portfolio
  const portfolioTotal = useMemo(
    () => rows.reduce((sum, r) => sum + accessor(r), 0),
    [rows, accessor],
  );

  // Geo buildings for map
  const geoBuildings = useMemo(
    () => filteredBuildings.filter((b): b is Building & { latitude: number; longitude: number } =>
      b.latitude != null && b.longitude != null,
    ),
    [filteredBuildings],
  );

  // Map marker meta — color + scale by metric intensity
  const buildingMeta = useMemo(() => {
    const map = new Map<string, BuildingMarkerMeta>();
    const maxVal = Math.max(1, ...rows.map((r) => accessor(r)));
    rows.forEach((r) => {
      const val = accessor(r);
      const ratio = val / maxVal;
      // Heat scale: blue (low) → yellow (mid) → red (high)
      const color = ratio > 0.75 ? '#ef4444' : ratio > 0.5 ? '#f59e0b' : ratio > 0.25 ? '#3b82f6' : '#22c55e';
      const scale = 0.6 + 0.8 * ratio;
      map.set(r.building.id, {
        color,
        scale,
        popupHtml: `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
          <strong style="font-size:13px">${r.building.name}</strong>
          <p style="margin:3px 0 0;font-size:12px">${formatMetric(val, currentMetric.unit)}</p>
          ${r.variationPct != null ? `<p style="margin:2px 0 0;font-size:11px;color:${r.variationPct > 0 ? '#ef4444' : '#22c55e'}">${r.variationPct > 0 ? '↑' : '↓'} ${Math.abs(r.variationPct)}% vs ayer</p>` : ''}
          ${r.alertCount > 0 ? `<p style="margin:2px 0 0;font-size:11px;color:#ef4444">${r.alertCount} alerta${r.alertCount > 1 ? 's' : ''}</p>` : ''}
        </div>`,
      });
    });
    return map;
  }, [rows, accessor, currentMetric.unit]);

  // Meters for expanded building
  const expandedMeters = useMemo(
    () => expandedId ? allMeters.filter((m) => m.buildingId === expandedId) : [],
    [allMeters, expandedId],
  );

  const expandedReadings = useMemo(() => {
    const meterIds = new Set(expandedMeters.map((m) => m.id));
    return readings.filter((r) => meterIds.has(r.meter_id));
  }, [expandedMeters, readings]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Consumo Jerárquico"
        eyebrow="Consumo"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
            >
              {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            {period === 'custom' && (
              <>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
              </>
            )}
            <PillToggle
              options={METRICS.map((m) => ({ key: m.key, label: m.label }))}
              value={metric}
              onChange={setMetric}
              size="sm"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
            >
              {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
            >
              {FILTER_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            {filterBy === 'variation' && (
              <input
                type="number"
                min={1}
                max={100}
                value={variationThreshold}
                onChange={(e) => setVariationThreshold(Number(e.target.value) || 10)}
                className="w-14 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
                title="Umbral variación %"
              />
            )}
            <select
              value={compareWith}
              onChange={(e) => setCompareWith(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
            >
              {COMPARE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <PillToggle
              options={[{ key: 'monthly', label: 'Mensual' }, { key: 'weekly', label: 'Semanal' }]}
              value={granularity}
              onChange={(v) => setGranularity(v as 'monthly' | 'weekly')}
              size="sm"
            />
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left: Map */}
        <div className="hidden min-h-0 flex-1 overflow-hidden rounded-xl border border-border lg:block">
          <MapView
            buildings={geoBuildings}
            buildingMeta={buildingMeta}
            onBuildingClick={(id) => setExpandedId(expandedId === id ? null : id)}
            className="h-full w-full"
          />
        </div>

        {/* Center/Right: Tree */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:max-w-[55%]">
          {/* Portfolio header */}
          <div className="panel mb-3 flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Portafolio</p>
              <p className="text-xl font-semibold text-foreground">
                {formatMetric(portfolioTotal, currentMetric.unit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted">{rows.length} centros</p>
              <p className="text-[11px] text-muted">{rows.reduce((s, r) => s + r.meterCount, 0)} medidores</p>
            </div>
          </div>

          {/* Building tree */}
          <div className="panel min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">Centro</th>
                  <th className="px-3 py-2 text-right">{currentMetric.label} ({currentMetric.unit})</th>
                  <th className="px-3 py-2 text-right">% Total</th>
                  <th className="px-3 py-2 text-right">Var. %</th>
                  <th className="px-3 py-2 text-right">Medidores</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRows.map((row) => {
                  const isExpanded = expandedId === row.building.id;
                  const metricVal = accessor(row);
                  const pctOfTotal = portfolioTotal > 0 ? (metricVal / portfolioTotal) * 100 : 0;
                  const style = getStatusStyle(row.status as 'normal' | 'warning' | 'critical' | 'nodata');

                  return (
                    <TreeRow
                      key={row.building.id}
                      row={row}
                      metricVal={metricVal}
                      metricUnit={currentMetric.unit}
                      pctOfTotal={pctOfTotal}
                      statusStyle={style}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedId(isExpanded ? null : row.building.id)}
                      expandedMeters={isExpanded ? expandedMeters : []}
                      expandedReadings={isExpanded ? expandedReadings : []}
                      onMeterClick={(meterId) => navigate(`/monitoring/meter/${meterId}`)}
                      onViewPlant={(buildingId) => navigate(`/dashboard/consolidado?building=${buildingId}`)}
                      granularity={granularity}
                      compareWith={compareWith}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tree Row (building + expanded meters) ── */

interface TreeRowProps {
  row: BuildingRow;
  metricVal: number;
  metricUnit: string;
  pctOfTotal: number;
  statusStyle: { bg: string; label: string };
  isExpanded: boolean;
  onToggle: () => void;
  expandedMeters: Meter[];
  expandedReadings: LatestReading[];
  onMeterClick: (meterId: string) => void;
  onViewPlant: (buildingId: string) => void;
  granularity: 'monthly' | 'weekly';
  compareWith: string;
}

const STATUS_DOT: Record<string, string> = { online: 'bg-emerald-500', stale: 'bg-amber-400', offline: 'bg-gray-400' };

function TreeRow({
  row,
  metricVal,
  metricUnit,
  pctOfTotal,
  statusStyle,
  isExpanded,
  onToggle,
  expandedMeters,
  expandedReadings,
  onMeterClick,
  onViewPlant,
  granularity,
  compareWith,
}: Readonly<TreeRowProps>) {
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const readingMap = useMemo(() => {
    const map = new Map<string, LatestReading>();
    expandedReadings.forEach((r) => map.set(r.meter_id, r));
    return map;
  }, [expandedReadings]);

  // Group meters by zone/floor for intermediate level
  const zones = useMemo(() => {
    if (!isExpanded || expandedMeters.length === 0) return [];
    const zoneMap = new Map<string, Meter[]>();
    expandedMeters.forEach((m) => {
      const zone = (m.metadata as Record<string, string>)?.zone ?? m.loadCategory ?? 'general';
      const list = zoneMap.get(zone) ?? [];
      list.push(m);
      zoneMap.set(zone, list);
    });
    const mallTotalMwh = expandedReadings.reduce((s, r) => s + Number(r.energy_kwh_total || 0), 0) / 1000;
    return Array.from(zoneMap.entries()).map(([name, meters]) => {
      const meterIds = new Set(meters.map((m) => m.id));
      const zoneReadings = expandedReadings.filter((r) => meterIds.has(r.meter_id));
      const zoneMwh = zoneReadings.reduce((s, r) => s + Number(r.energy_kwh_total || 0), 0) / 1000;
      const pctMall = mallTotalMwh > 0 ? (zoneMwh / mallTotalMwh) * 100 : 0;
      const hasOnline = zoneReadings.length > 0;
      const hasStale = zoneReadings.some((r) => (Date.now() - new Date(r.timestamp).getTime()) > 4 * 3_600_000);
      const status = !hasOnline ? 'offline' : hasStale ? 'stale' : 'online';
      return { name, meters, zoneMwh, pctMall, meterCount: meters.length, status };
    }).sort((a, b) => b.zoneMwh - a.zoneMwh);
  }, [isExpanded, expandedMeters, expandedReadings]);

  return (
    <>
      {/* Mall row */}
      <tr
        className="cursor-pointer transition-colors hover:bg-surface"
        onClick={onToggle}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <svg
              className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M4 2l4 4-4 4" />
            </svg>
            <span className="font-medium text-foreground">{row.building.name}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-right font-medium text-foreground">
          {formatMetric(metricVal, metricUnit)}
        </td>
        <td className="px-3 py-2 text-right text-muted">
          {pctOfTotal.toFixed(1)}%
        </td>
        <td className="px-3 py-2 text-right">
          {row.variationPct != null ? (
            <span className={`text-[11px] font-medium ${row.variationPct > 0 ? 'text-red-500' : row.variationPct < 0 ? 'text-emerald-500' : 'text-muted'}`}>
              {row.variationPct > 0 ? '↑' : row.variationPct < 0 ? '↓' : '→'} {Math.abs(row.variationPct)}%
            </span>
          ) : <span className="text-muted">—</span>}
        </td>
        <td className="px-3 py-2 text-right text-muted">{row.meterCount}</td>
        <td className="px-3 py-2 text-center">
          <span className={`inline-block size-2.5 rounded-full ${statusStyle.bg}`} title={statusStyle.label} />
        </td>
      </tr>

      {/* Trend sparkline + "Ver planta" */}
      {isExpanded && (
        <tr className="bg-surface/30">
          <td colSpan={6} className="px-10 py-2">
            <div className="flex items-center justify-between">
              <TrendSparkline buildingId={row.building.id} metricVal={metricVal} label={metricUnit} granularity={granularity} compareWith={compareWith} />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onViewPlant(row.building.id); }}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] text-brand hover:bg-surface"
              >
                Ver planta →
              </button>
            </div>
          </td>
        </tr>
      )}

      {/* Nivel 2: Zones/floors */}
      {isExpanded && zones.map((zone) => {
        const isZoneExpanded = expandedZone === zone.name;
        return (
          <ZoneRow
            key={zone.name}
            zone={zone}
            isExpanded={isZoneExpanded}
            onToggle={() => setExpandedZone(isZoneExpanded ? null : zone.name)}
            readingMap={readingMap}
            onMeterClick={onMeterClick}
          />
        );
      })}
    </>
  );
}

/* ── Zone Row (intermediate level: zone/floor → meters) ── */

interface ZoneData {
  name: string;
  meters: Meter[];
  zoneMwh: number;
  pctMall: number;
  meterCount: number;
  status: string;
}

function ZoneRow({
  zone,
  isExpanded,
  onToggle,
  readingMap,
  onMeterClick,
}: Readonly<{
  zone: ZoneData;
  isExpanded: boolean;
  onToggle: () => void;
  readingMap: Map<string, LatestReading>;
  onMeterClick: (meterId: string) => void;
}>) {
  return (
    <>
      <tr
        className="cursor-pointer bg-surface/30 transition-colors hover:bg-surface/50"
        onClick={onToggle}
      >
        <td className="py-1.5 pl-8 pr-3">
          <div className="flex items-center gap-2">
            <svg
              className={`h-3 w-3 shrink-0 text-muted transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M4 2l4 4-4 4" />
            </svg>
            <span className="text-[12px] font-medium text-foreground">{zone.name}</span>
          </div>
        </td>
        <td className="px-3 py-1.5 text-right text-[12px] text-foreground">
          {zone.zoneMwh > 0 ? `${zone.zoneMwh.toFixed(2)} MWh` : '—'}
        </td>
        <td className="px-3 py-1.5 text-right text-[10px] text-muted">
          {zone.pctMall > 0 ? `${zone.pctMall.toFixed(1)}%` : '—'}
        </td>
        <td className="px-3 py-1.5" />
        <td className="px-3 py-1.5 text-right text-[10px] text-muted">{zone.meterCount}</td>
        <td className="px-3 py-1.5 text-center">
          <span className={`inline-block size-2 rounded-full ${STATUS_DOT[zone.status]}`} />
        </td>
      </tr>

      {/* Nivel 3: Meters under this zone */}
      {isExpanded && zone.meters.map((meter) => {
        const reading = readingMap.get(meter.id);
        const energyKwh = Number(reading?.energy_kwh_total ?? 0);
        const meterMwh = energyKwh / 1000;
        const isOnline = !!reading;
        const stale = reading ? (Date.now() - new Date(reading.timestamp).getTime()) > 4 * 3_600_000 : false;
        const statusLabel = !isOnline ? 'offline' : stale ? 'stale' : 'online';
        return (
          <tr
            key={meter.id}
            className="cursor-pointer bg-surface/50 transition-colors hover:bg-surface"
            onClick={() => onMeterClick(meter.id)}
          >
            <td className="py-1.5 pl-14 pr-3">
              <span className="text-[11px] text-foreground">{meter.name}</span>
              <span className="ml-1.5 text-[10px] text-muted">{meter.code}</span>
            </td>
            <td className="px-3 py-1.5 text-right text-[11px] text-foreground">
              {meterMwh > 0 ? `${meterMwh.toFixed(2)} MWh` : '—'}
            </td>
            <td className="px-3 py-1.5" />
            <td className="px-3 py-1.5 text-right text-[10px] text-muted">
              {reading?.timestamp
                ? new Date(reading.timestamp).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—'}
            </td>
            <td className="px-3 py-1.5" />
            <td className="px-3 py-1.5 text-center">
              <span className="flex items-center justify-center gap-1">
                <span className={`inline-block size-2 rounded-full ${STATUS_DOT[statusLabel]}`} />
                <span className="text-[10px] text-muted">{statusLabel}</span>
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
}

/* ── Trend Sparkline (current vs comparison line) ── */

const COMPARE_LABELS: Record<string, string> = {
  none: '',
  previous: 'Período ant.',
  yoy: 'Año ant.',
  avg: 'Promedio portafolio',
};

function TrendSparkline({ buildingId, granularity = 'monthly', compareWith = 'none' }: Readonly<{ buildingId: string; metricVal: number; label: string; granularity?: 'monthly' | 'weekly'; compareWith?: string }>) {
  const isWeekly = granularity === 'weekly';
  const slotCount = 12;

  // Current period range
  const range = useMemo(() => {
    const now = new Date();
    const from = isWeekly
      ? new Date(now.getTime() - slotCount * 7 * 86_400_000)
      : new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return { from: from.toISOString(), to: now.toISOString() };
  }, [isWeekly]);

  // Comparison period range
  const compareRange = useMemo(() => {
    if (compareWith === 'none') return null;
    if (compareWith === 'previous') {
      const duration = isWeekly ? slotCount * 7 * 86_400_000 : 365 * 86_400_000;
      const to = new Date(new Date(range.from).getTime());
      const from = new Date(to.getTime() - duration);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    if (compareWith === 'yoy') {
      const from = new Date(new Date(range.from).getTime() - 365 * 86_400_000);
      const to = new Date(new Date(range.to).getTime() - 365 * 86_400_000);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    // 'avg' — same range, no buildingId filter (portfolio-wide)
    return range;
  }, [compareWith, range, isWeekly]);

  const aggQuery = useAggregatedReadingsQuery({ ...range, interval: isWeekly ? 'daily' : 'monthly', buildingId });
  const compareQuery = useAggregatedReadingsQuery(
    { ...(compareRange ?? range), interval: isWeekly ? 'daily' : 'monthly', ...(compareWith === 'avg' ? { groupBy: 'portfolio' as const } : { buildingId }) },
    compareWith !== 'none',
  );
  const aggData = aggQuery.data ?? [];
  const compareData = compareQuery.data ?? [];

  const slots = useMemo(() => {
    const now = new Date();
    const result: { label: string; current: number; compare: number }[] = [];

    const sumEnergy = (rows: typeof aggData) => rows.reduce((s, r) => s + parseFloat(r.energy_delta_kwh ?? '0'), 0) / 1000;

    if (isWeekly) {
      for (let w = slotCount - 1; w >= 0; w--) {
        const weekEnd = new Date(now.getTime() - w * 7 * 86_400_000);
        const weekStart = new Date(weekEnd.getTime() - 7 * 86_400_000);
        const label = weekStart.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
        const inRange = (r: typeof aggData[0], start: Date, end: Date) => { const t = new Date(r.bucket).getTime(); return t >= start.getTime() && t < end.getTime(); };
        const current = sumEnergy(aggData.filter((r) => inRange(r, weekStart, weekEnd)));

        let compare = 0;
        if (compareWith === 'previous' || compareWith === 'yoy') {
          const offset = compareWith === 'yoy' ? 365 * 86_400_000 : slotCount * 7 * 86_400_000;
          const cStart = new Date(weekStart.getTime() - offset);
          const cEnd = new Date(weekEnd.getTime() - offset);
          compare = sumEnergy(compareData.filter((r) => inRange(r, cStart, cEnd)));
        } else if (compareWith === 'avg' && compareData.length > 0) {
          compare = sumEnergy(compareData.filter((r) => inRange(r, weekStart, weekEnd)));
        }
        result.push({ label, current, compare });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('es-CL', { month: 'short' });
        const matchMonth = (r: typeof aggData[0], year: number, month: number) => { const b = new Date(r.bucket); return b.getFullYear() === year && b.getMonth() === month; };
        const current = sumEnergy(aggData.filter((r) => matchMonth(r, d.getFullYear(), d.getMonth())));

        let compare = 0;
        if (compareWith === 'previous') {
          const pd = new Date(d.getFullYear(), d.getMonth() - 12, 1);
          compare = sumEnergy(compareData.filter((r) => matchMonth(r, pd.getFullYear(), pd.getMonth())));
        } else if (compareWith === 'yoy') {
          compare = sumEnergy(compareData.filter((r) => matchMonth(r, d.getFullYear() - 1, d.getMonth())));
        } else if (compareWith === 'avg' && compareData.length > 0) {
          compare = sumEnergy(compareData.filter((r) => matchMonth(r, d.getFullYear(), d.getMonth())));
        }
        result.push({ label, current, compare });
      }
    }
    return result;
  }, [aggData, compareData, isWeekly, compareWith]);

  const maxVal = Math.max(1, ...slots.flatMap((s) => [s.current, s.compare]));
  const w = 320;
  const h = 48;
  const toPath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (values.length - 1)) * w} ${h - (v / maxVal) * (h - 4)}`).join(' ');

  if (aggQuery.isPending) return <p className="text-[10px] text-muted">Cargando tendencia...</p>;

  const compareLabel = COMPARE_LABELS[compareWith] ?? '';

  return (
    <div className="flex items-center gap-3">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
        {compareWith !== 'none' && (
          <path d={toPath(slots.map((s) => s.compare))} fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 2" />
        )}
        <path d={toPath(slots.map((s) => s.current))} fill="none" stroke="#3b82f6" strokeWidth={2} />
      </svg>
      <div className="flex gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-blue-500" /> Actual</span>
        {compareWith !== 'none' && (
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 border-t border-dashed border-gray-400" /> {compareLabel}</span>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */

function formatMetric(value: number, unit: string): string {
  const formatted = value >= 1000
    ? `${(value / 1000).toFixed(2)}`
    : value >= 1
      ? value.toFixed(1)
      : value.toFixed(3);
  return `${formatted} ${unit}`;
}
