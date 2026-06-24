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
import { dateRangeFromDays } from '../dashboardAggregations';
import type { Building } from '../../../types/building';
import type { LatestReading } from '../../../types/reading';
import type { Meter } from '../../../types/meter';
import type { Alert, AlertSeverity } from '../../../types/alert';

/* ── Filter options ── */

interface Country { code: string; label: string }
const COUNTRIES: Country[] = [
  { code: 'CL', label: 'Chile' },
  { code: 'PE', label: 'Perú' },
  { code: 'CO', label: 'Colombia' },
];

interface PeriodOption { key: string; label: string; days: number }
const PERIODS: PeriodOption[] = [
  { key: 'month', label: 'Mes', days: 30 },
  { key: 'quarter', label: 'Trimestre', days: 90 },
  { key: 'year', label: 'Año', days: 365 },
];

interface MetricOption { key: string; label: string; unit: string }
const METRICS: MetricOption[] = [
  { key: 'energy', label: 'Consumo', unit: 'MWh' },
  { key: 'demand', label: 'Demanda', unit: 'kW' },
  { key: 'cost', label: 'Costo', unit: 'UF' },
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
): BuildingRow[] {
  const readingsByBuilding = Map.groupBy
    ? Map.groupBy(readings, (r: LatestReading) => r.building_id)
    : groupByFallback(readings, (r) => r.building_id);

  const alertsByBuilding = Map.groupBy
    ? Map.groupBy(alerts, (a: Alert) => a.buildingId)
    : groupByFallback(alerts, (a) => a.buildingId);

  return buildings.map((building) => {
    const bReadings = readingsByBuilding.get(building.id) ?? [];
    const bAlerts = alertsByBuilding.get(building.id) ?? [];
    const demandKw = bReadings.reduce((sum, r) => sum + Number(r.power_kw || 0), 0);
    const energyMwh = bReadings.reduce((sum, r) => sum + Number(r.energy_kwh_total || 0), 0) / 1000;
    const severities = bAlerts.map((a) => a.severity as AlertSeverity);
    const status = deriveBuildingStatus(severities, bReadings.length > 0);
    return {
      building,
      energyMwh,
      demandKw,
      meterCount: bReadings.length,
      variationPct: null, // ponytail: compute when previous-period API available
      status,
      alertCount: bAlerts.length,
    };
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
};

/* ── Page ── */

export function ConsumoJerarquicoPage() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('CL');
  const [period, setPeriod] = useState('month');
  const [metric, setMetric] = useState('energy');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Queries
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const allBuildings = buildingsQuery.data ?? [];
  const allMeters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];

  const currentMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const accessor = METRIC_ACCESSORS[metric] ?? METRIC_ACCESSORS.energy;

  // Filter by country
  const filteredBuildings = useMemo(
    () => allBuildings.filter((b) => (b.countryCode ?? 'CL') === country),
    [allBuildings, country],
  );

  // Enrich
  const rows = useMemo(
    () => buildRows(filteredBuildings, readings, alerts),
    [filteredBuildings, readings, alerts],
  );

  // Sort by metric descending
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => accessor(b) - accessor(a)),
    [rows, accessor],
  );

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
            <PillToggle
              options={COUNTRIES.map((c) => ({ key: c.code, label: c.label }))}
              value={country}
              onChange={setCountry}
              size="sm"
            />
            <PillToggle
              options={PERIODS.map((p) => ({ key: p.key, label: p.label }))}
              value={period}
              onChange={setPeriod}
              size="sm"
            />
            <PillToggle
              options={METRICS.map((m) => ({ key: m.key, label: m.label }))}
              value={metric}
              onChange={setMetric}
              size="sm"
            />
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left: Map */}
        <div className="hidden min-h-0 flex-1 overflow-hidden rounded-xl border border-border lg:block">
          <MapView buildings={geoBuildings} className="h-full w-full" />
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
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">Centro</th>
                  <th className="px-3 py-2 text-right">{currentMetric.label} ({currentMetric.unit})</th>
                  <th className="px-3 py-2 text-right">% Total</th>
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
}

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
}: Readonly<TreeRowProps>) {
  const readingMap = useMemo(() => {
    const map = new Map<string, LatestReading>();
    expandedReadings.forEach((r) => map.set(r.meter_id, r));
    return map;
  }, [expandedReadings]);

  return (
    <>
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
        <td className="px-3 py-2 text-right text-muted">{row.meterCount}</td>
        <td className="px-3 py-2 text-center">
          <span className={`inline-block size-2.5 rounded-full ${statusStyle.bg}`} title={statusStyle.label} />
        </td>
      </tr>
      {isExpanded && expandedMeters.map((meter) => {
        const reading = readingMap.get(meter.id);
        const powerKw = Number(reading?.power_kw ?? 0);
        const status = reading ? 'online' : 'offline';
        return (
          <tr
            key={meter.id}
            className="cursor-pointer bg-surface/50 transition-colors hover:bg-surface"
            onClick={() => onMeterClick(meter.id)}
          >
            <td className="py-1.5 pl-10 pr-3">
              <span className="text-[12px] text-foreground">{meter.name}</span>
              <span className="ml-2 text-[10px] text-muted">{meter.code}</span>
            </td>
            <td className="px-3 py-1.5 text-right text-[12px] text-foreground">
              {powerKw.toFixed(1)} kW
            </td>
            <td className="px-3 py-1.5" />
            <td className="px-3 py-1.5 text-right text-[10px] text-muted">
              {reading?.timestamp
                ? new Date(reading.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </td>
            <td className="px-3 py-1.5 text-center">
              <span className={`inline-block size-2 rounded-full ${status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            </td>
          </tr>
        );
      })}
    </>
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
