import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
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

  const selectedRow = useMemo(
    () => expandedId ? sortedRows.find((r) => r.building.id === expandedId) ?? null : null,
    [sortedRows, expandedId],
  );

  // Meters for expanded building
  const expandedMeters = useMemo(
    () => expandedId ? allMeters.filter((m) => m.buildingId === expandedId) : [],
    [allMeters, expandedId],
  );

  const expandedReadings = useMemo(() => {
    const meterIds = new Set(expandedMeters.map((m) => m.id));
    return readings.filter((r) => meterIds.has(r.meter_id));
  }, [expandedMeters, readings]);

  // Zones grouped from expanded meters
  const zones = useMemo(() => {
    if (expandedMeters.length === 0) return [];
    const zoneMap = new Map<string, Meter[]>();
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
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="3.2 Consumo Jerárquico"
        description="Análisis drill-down: mapa + árbol expandible + panel de detalle sincronizados"
      />

      {/* Filter banner */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-[11px] text-muted">
        <span className="font-semibold text-foreground">Filtros:</span>
        <span className="flex items-center gap-1">
          País
          <DropdownSelect options={[{ value: 'CL', label: 'Chile' }, { value: 'PE', label: 'Perú' }, { value: 'CO', label: 'Colombia' }]} value={country} onChange={() => {}} />
        </span>
        <span className="flex items-center gap-1">
          Período
          <DropdownSelect options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} value={period} onChange={setPeriod} />
        </span>
        {period === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none" />
          </>
        )}
        <span className="flex items-center gap-1">
          Métrica principal
          <DropdownSelect options={METRICS.map((m) => ({ value: m.key, label: `${m.label} (${m.unit})` }))} value={metric} onChange={setMetric} />
        </span>
        <span className="flex items-center gap-1">
          Granularidad
          <DropdownSelect options={[{ value: 'monthly', label: 'Mensual' }, { value: 'weekly', label: 'Semanal' }]} value={granularity} onChange={(v) => setGranularity(v as 'monthly' | 'weekly')} />
        </span>
        <span className="flex items-center gap-1">
          Ordenar malls por
          <DropdownSelect options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={sortBy} onChange={setSortBy} />
        </span>
        <span className="flex items-center gap-1">
          Comparar con
          <DropdownSelect options={COMPARE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} value={compareWith} onChange={setCompareWith} />
        </span>
      </div>

      {/* Row 1: 3 cards */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Card 1: Mapa geográfico (sincronizado) */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Mapa geográfico (sincronizado)</p>
          <p className="text-[9px] text-subtle">Click en marcador ↔ árbol ↔ detalle</p>
          <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
            <MapView
              buildings={geoBuildings}
              buildingMeta={buildingMeta}
              onBuildingClick={(id) => setExpandedId(expandedId === id ? null : id)}
              className="h-full w-full"
            />
          </div>
          <p className="mt-1 text-right text-[9px] text-subtle">[ARQ-05, DAT-11]</p>
        </div>

        {/* Card 2: Árbol jerárquico expandible */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Árbol jerárquico expandible</p>
          <p className="text-[9px] text-subtle">3 niveles de sangría</p>
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
                    </button>
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{ display: 'grid', gridTemplateRows: isExp ? '1fr' : '0fr' }}
                    >
                      <div className="min-h-0">
                        {expandedMeters.length > 0 && (
                          <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-2 pb-1">
                            {zones.length > 0 ? zones.map((z) => (
                              <li key={z.name} className="text-[11px] text-muted">{z.name}</li>
                            )) : expandedMeters.slice(0, 5).map((m) => (
                              <li key={m.id} className="text-[11px] text-muted">{m.name}</li>
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
          <p className="mt-1 text-right text-[9px] text-subtle">[DAT-11, DAT-22]</p>
        </div>

        {/* Card 3: KPIs + Tendencia + Zonas (stacked) */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          {/* KPIs del mall (3 tarjetas) */}
          <div className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">KPIs del mall (3 tarjetas)</p>
            <p className="mt-0.5 text-[9px] text-subtle">seleccionado en el árbol/mapa</p>
            {selectedRow ? (
              <div className="mt-2 space-y-1 text-[11px]">
                <p className="text-foreground">• Consumo [MWh] <span className="font-semibold">{formatMetric(accessor(selectedRow), currentMetric.unit)}</span> {selectedRow.variationPct != null && <span className={selectedRow.variationPct > 0 ? 'text-red-500' : 'text-emerald-500'}>▲{Math.abs(selectedRow.variationPct)}%</span>}</p>
                <p className="text-foreground">• Intensidad [kWh/m²] <span className="font-semibold">{METRIC_ACCESSORS.intensity(selectedRow).toFixed(1)}</span></p>
                <p className="text-foreground">• Costo [UF] <span className="font-semibold">{METRIC_ACCESSORS.cost(selectedRow).toFixed(1)}</span></p>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-muted">Seleccione un mall</p>
            )}
            <p className="mt-1 text-right text-[9px] text-subtle">[DAT-22, DAT-11, FIN-07]</p>
          </div>

          {/* Tendencia mensual */}
          <div className="panel flex min-h-0 flex-1 flex-col px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Tendencia mensual: mall vs. promedio portafolio</p>
            <p className="text-[9px] text-subtle">Últimos 8-12 meses · detecta anomalías estacionales</p>
            <div className="mt-2 min-h-0 flex-1">
              {selectedRow ? (
                <TrendSparkline buildingId={selectedRow.building.id} metricVal={accessor(selectedRow)} label={currentMetric.unit} granularity={granularity} compareWith={compareWith} />
              ) : (
                <p className="text-[11px] text-muted">Seleccione un mall</p>
              )}
            </div>
            <p className="mt-1 text-right text-[9px] text-subtle">[DAT-08, DAT-22]</p>
          </div>

          {/* Zonas del piso seleccionado */}
          <div className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Zonas del piso seleccionado</p>
            <p className="text-[9px] text-subtle">tarjetas coloreadas por estado (vectorizado PASA)</p>
            {zones.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {zones.map((z) => (
                  <div key={z.name} className={`rounded px-2 py-1.5 text-center text-[10px] ${z.status === 'online' ? 'bg-emerald-100 text-emerald-700' : z.status === 'stale' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {z.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-muted">Seleccione un mall con pisos</p>
            )}
            <p className="mt-1 text-right text-[9px] text-subtle">[DAT-11, DAT-03]</p>
          </div>
        </div>
      </div>

      {/* Row 2: Tabla de remarcadores del mall */}
      <div className="panel flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden px-3 py-2.5">
        <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Tabla de remarcadores del mall</p>
        <p className="shrink-0 text-[9px] text-subtle">al seleccionar mall sin piso</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                <th className="px-2 py-1.5">ID medidor</th>
                <th className="px-2 py-1.5">Zona</th>
                <th className="px-2 py-1.5 text-right">Consumo [MWh]</th>
                <th className="px-2 py-1.5 text-right">% del total</th>
                <th className="px-2 py-1.5 text-right">Último valor</th>
                <th className="px-2 py-1.5">Timestamp</th>
                <th className="px-2 py-1.5 text-center">Estado</th>
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-border">
            {expandedMeters.length > 0 ? expandedMeters.map((meter, i) => {
              const reading = expandedReadings.find((r) => r.meter_id === meter.id);
              const mwh = Number(reading?.energy_kwh_total ?? 0) / 1000;
              const mallTotal = expandedReadings.reduce((s, r) => s + Number(r.energy_kwh_total || 0), 0) / 1000;
              const pct = mallTotal > 0 ? (mwh / mallTotal) * 100 : 0;
              const isOnline = !!reading;
              const stale = reading ? (Date.now() - new Date(reading.timestamp).getTime()) > 4 * 3_600_000 : false;
              const statusLabel = !isOnline ? 'offline' : stale ? 'stale' : 'online';
              const statusDot = statusLabel === 'online' ? 'bg-emerald-500' : statusLabel === 'stale' ? 'bg-amber-400' : 'bg-gray-400';
              const zone = (meter.metadata as Record<string, string>)?.zone ?? meter.loadCategory ?? '—';
              return (
                <tr
                  key={meter.id}
                  className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => navigate(`/monitoring/meter/${meter.id}`)}
                >
                  <td className="px-2 py-1.5 font-medium text-foreground">{meter.code}</td>
                  <td className="px-2 py-1.5 text-muted">{zone}</td>
                  <td className="px-2 py-1.5 text-right text-foreground">{mwh > 0 ? mwh.toFixed(2) : '—'}</td>
                  <td className="px-2 py-1.5 text-right text-muted">{pct > 0 ? `${pct.toFixed(1)}%` : '—'}</td>
                  <td className="px-2 py-1.5 text-right text-foreground">{reading ? `${Number(reading.power_kw).toFixed(1)} kW` : '—'}</td>
                  <td className="px-2 py-1.5 text-muted">{reading ? new Date(reading.timestamp).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-2 py-1.5 text-center"><span className={`inline-block size-2 rounded-full ${statusDot}`} title={statusLabel} /></td>
                </tr>
              );
            }) : (
              <tr><td colSpan={7} className="px-2 py-4 text-center text-muted">Seleccione un mall para ver sus medidores</td></tr>
            )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[DAT-06, DAT-19, DAT-17]</p>
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
