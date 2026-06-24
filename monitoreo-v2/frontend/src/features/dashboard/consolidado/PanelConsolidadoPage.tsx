import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { DataWidget } from '../../../components/ui/DataWidget';
import { MapView } from '../../../components/ui/MapView';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { useInvoicesQuery } from '../../../hooks/queries/useInvoicesQuery';
import { deriveBuildingStatus, getStatusStyle, type EnergyStatus } from '../../../lib/energy-status';
import { fmtClp } from '../../../lib/formatters';
import type { Building } from '../../../types/building';
import type { LatestReading } from '../../../types/reading';
import type { Alert, AlertSeverity } from '../../../types/alert';

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

export function PanelConsolidadoPage() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('CL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

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

  // Geo buildings (with coordinates) for map
  const geoBuildings = useMemo(
    () => filteredBuildings.filter((b): b is Building & { latitude: number; longitude: number } =>
      b.latitude != null && b.longitude != null,
    ),
    [filteredBuildings],
  );

  // Portfolio KPIs
  const totalDemandMw = useMemo(
    () => enriched.reduce((sum, e) => sum + e.powerKw, 0) / 1000,
    [enriched],
  );
  const totalCriticalAlerts = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length,
    [activeAlerts],
  );
  const totalCostUf = useMemo(() => {
    const paid = invoices
      .filter((inv) => inv.status !== 'voided')
      .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    return paid;
  }, [invoices]);

  // Selected building detail (Nivel 2)
  const selectedDetail = useMemo(
    () => enriched.find((e) => e.building.id === selectedBuildingId) ?? null,
    [enriched, selectedBuildingId],
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Panel Consolidado"
        eyebrow="Panel Consolidado"
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
        {/* Column 1: Map */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
            <MapView
              buildings={geoBuildings}
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
        </div>

        {/* Column 2: KPIs or Building Detail */}
        <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto">
          {selectedDetail
            ? <BuildingDetail detail={selectedDetail} onBack={() => setSelectedBuildingId(null)} />
            : <PortfolioPanel
                enriched={enriched}
                totalDemandMw={totalDemandMw}
                totalCostUf={totalCostUf}
                totalCriticalAlerts={totalCriticalAlerts}
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
  onSelectBuilding: (id: string) => void;
}

function PortfolioPanel({
  enriched,
  totalDemandMw,
  totalCostUf,
  totalCriticalAlerts,
  onSelectBuilding,
}: Readonly<PortfolioPanelProps>) {
  const totalMeters = enriched.reduce((sum, e) => sum + e.meterCount, 0);
  const activeCount = enriched.filter((e) => e.building.isActive).length;

  const kpis = [
    { title: 'Demanda agregada', value: `${totalDemandMw.toFixed(2)} MW`, color: 'text-foreground' },
    { title: 'Medidores activos', value: String(totalMeters), color: 'text-foreground' },
    { title: 'Costo acumulado', value: fmtClp(totalCostUf), color: 'text-foreground' },
    {
      title: 'Alertas críticas',
      value: String(totalCriticalAlerts),
      color: totalCriticalAlerts > 0 ? 'text-red-600' : 'text-emerald-600',
    },
  ];

  return (
    <>
      {/* KPI cards 2×2 */}
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((k) => (
          <div key={k.title} className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`mt-0.5 text-lg font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Building list */}
      <div className="panel flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="text-[12px] font-medium text-foreground">
            Centros comerciales
          </h3>
          <span className="text-[11px] text-muted">{activeCount} / {enriched.length}</span>
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
  onBack: () => void;
}

function BuildingDetail({ detail, onBack }: Readonly<BuildingDetailProps>) {
  const { building, powerKw, meterCount, activeAlerts } = detail;
  const style = getStatusStyle(detail.status);

  const metrics = [
    { title: 'Carga total', value: `${powerKw.toFixed(1)} kW` },
    { title: 'Medidores', value: String(meterCount) },
    { title: 'Alertas activas', value: String(activeAlerts.length) },
  ];

  return (
    <>
      {/* Header with back */}
      <div className="panel px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="mb-1.5 text-[11px] text-brand hover:underline"
        >
          ← Volver al portafolio
        </button>
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
            <p className="mt-0.5 text-base font-semibold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Alert feed */}
      <div className="panel flex flex-col">
        <h4 className="px-3 py-2 text-[12px] font-medium text-foreground">Alertas en vivo</h4>
        <DataWidget
          phase={activeAlerts.length === 0 ? 'empty' : 'ready'}
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
