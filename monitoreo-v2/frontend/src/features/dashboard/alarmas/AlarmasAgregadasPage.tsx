import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { MapView, type BuildingMarkerMeta } from '../../../components/ui/MapView';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import type { Building } from '../../../types/building';
import type { Alert, AlertSeverity } from '../../../types/alert';

/* ── Filter options ── */

interface SelectOption { key: string; label: string }

const COUNTRIES: SelectOption[] = [
  { key: 'CL', label: 'Chile' },
  { key: 'PE', label: 'Perú' },
  { key: 'CO', label: 'Colombia' },
];

const SEVERITY_OPTIONS: SelectOption[] = [
  { key: 'all', label: 'Todas' },
  { key: 'critical_high', label: 'Críticas' },
  { key: 'warning', label: 'Warnings' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { key: 'active', label: 'Activas' },
  { key: 'resolved', label: 'Resueltas' },
  { key: 'all', label: 'Todas' },
];

const PERIOD_OPTIONS: { key: string; label: string; hours: number }[] = [
  { key: 'today', label: 'Hoy', hours: 24 },
  { key: '24h', label: '24h', hours: 24 },
  { key: '7d', label: '7 días', hours: 168 },
  { key: '30d', label: '30 días', hours: 720 },
];

/* ── Severity filter predicate ── */

const SEVERITY_FILTERS: Record<string, (s: AlertSeverity) => boolean> = {
  all: () => true,
  critical_high: (s) => s === 'critical' || s === 'high',
  warning: (s) => s === 'medium' || s === 'low',
};

/* ── Mall aggregation row ── */

interface MallAlertRow {
  buildingId: string;
  buildingName: string;
  criticalCount: number;
  warningCount: number;
  resolvedCount: number;
  totalActive: number;
  meanResolutionH: number | null;
  lastAlertAt: string | null;
  lastAlertMessage: string | null;
}

function aggregateByMall(
  buildings: Building[],
  activeAlerts: Alert[],
  resolvedAlerts: Alert[],
): MallAlertRow[] {
  const activeByBuilding = new Map<string, Alert[]>();
  activeAlerts.forEach((a) => {
    const list = activeByBuilding.get(a.buildingId) ?? [];
    list.push(a);
    activeByBuilding.set(a.buildingId, list);
  });

  const resolvedByBuilding = new Map<string, Alert[]>();
  resolvedAlerts.forEach((a) => {
    const list = resolvedByBuilding.get(a.buildingId) ?? [];
    list.push(a);
    resolvedByBuilding.set(a.buildingId, list);
  });

  return buildings.map((building) => {
    const bActive = activeByBuilding.get(building.id) ?? [];
    const bResolved = resolvedByBuilding.get(building.id) ?? [];
    const criticalCount = bActive.filter((a) => a.severity === 'critical' || a.severity === 'high').length;
    const warningCount = bActive.filter((a) => a.severity === 'medium' || a.severity === 'low').length;
    const lastAlert = bActive.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

    // Mean time to resolution
    const withResolvedAt = bResolved.filter((a) => a.resolvedAt);
    let meanResolutionH: number | null = null;
    if (withResolvedAt.length > 0) {
      const totalMs = withResolvedAt.reduce((sum, a) =>
        sum + Math.max(0, new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime()), 0);
      meanResolutionH = Math.round((totalMs / withResolvedAt.length / 3_600_000) * 10) / 10;
    }

    return {
      buildingId: building.id,
      buildingName: building.name,
      criticalCount,
      warningCount,
      resolvedCount: bResolved.length,
      totalActive: bActive.length,
      meanResolutionH,
      lastAlertAt: lastAlert?.createdAt ?? null,
      lastAlertMessage: lastAlert?.message ?? null,
    };
  });
}

/* ── Page ── */

export function AlarmasAgregadasPage() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('CL');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [periodFilter, setPeriodFilter] = useState('30d');
  const [search, setSearch] = useState('');

  const buildingsQuery = useBuildingsQuery();
  const activeAlertsQuery = useAlertsQuery({ status: 'active' });
  const resolvedAlertsQuery = useAlertsQuery({ status: 'resolved' });

  const buildings = buildingsQuery.data ?? [];
  const activeAlerts = activeAlertsQuery.data ?? [];
  const resolvedAlerts = resolvedAlertsQuery.data ?? [];

  // Filter buildings by country
  const filteredBuildings = useMemo(
    () => buildings.filter((b) => (b.countryCode ?? 'CL') === country),
    [buildings, country],
  );

  const buildingIds = useMemo(
    () => new Set(filteredBuildings.map((b) => b.id)),
    [filteredBuildings],
  );

  // Filter alerts by country and severity
  const severityPredicate = SEVERITY_FILTERS[severityFilter] ?? SEVERITY_FILTERS.all;

  const filteredActive = useMemo(
    () => activeAlerts
      .filter((a) => buildingIds.has(a.buildingId))
      .filter((a) => severityPredicate(a.severity)),
    [activeAlerts, buildingIds, severityPredicate],
  );

  const filteredResolved = useMemo(
    () => resolvedAlerts.filter((a) => buildingIds.has(a.buildingId)),
    [resolvedAlerts, buildingIds],
  );

  // KPIs
  const totalActive = filteredActive.length;
  const criticalActive = filteredActive.filter((a) => a.severity === 'critical' || a.severity === 'high').length;
  const resolved24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return filteredResolved.filter((a) => a.resolvedAt && new Date(a.resolvedAt).getTime() > cutoff).length;
  }, [filteredResolved]);

  // Mean time to resolve (hours)
  const meanResolutionH = useMemo(() => {
    const resolved = filteredResolved.filter((a) => a.resolvedAt);
    if (resolved.length === 0) return null;
    const totalMs = resolved.reduce((sum, a) => {
      return sum + Math.max(0, new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime());
    }, 0);
    return Math.round((totalMs / resolved.length / 3_600_000) * 10) / 10;
  }, [filteredResolved]);

  const kpis = [
    { title: 'Activas', value: String(totalActive), color: totalActive > 0 ? 'text-red-600' : 'text-emerald-600' },
    { title: 'Críticas activas', value: String(criticalActive), color: criticalActive > 0 ? 'text-red-600' : 'text-emerald-600' },
    { title: 'Resueltas 24h', value: String(resolved24h), color: 'text-emerald-600' },
    { title: 'Resolución media', value: meanResolutionH != null ? `${meanResolutionH}h` : '—', color: (meanResolutionH ?? 0) <= 24 ? 'text-emerald-600' : 'text-red-600' },
  ];

  // Evolution chart: daily bars (last 30 days)
  const evolutionData = useMemo(() => {
    const allAlerts = [...filteredActive, ...filteredResolved];
    const days: { label: string; active: number; resolved: number }[] = [];
    const now = Date.now();
    for (let d = 29; d >= 0; d--) {
      const dayStart = now - (d + 1) * 86_400_000;
      const dayEnd = now - d * 86_400_000;
      const dayLabel = new Date(dayEnd).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
      const opened = allAlerts.filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      const closed = filteredResolved.filter((a) => {
        if (!a.resolvedAt) return false;
        const t = new Date(a.resolvedAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      days.push({ label: dayLabel, active: opened, resolved: closed });
    }
    return days;
  }, [filteredActive, filteredResolved]);

  const maxEvoValue = Math.max(1, ...evolutionData.map((d) => d.active + d.resolved));

  // Mall aggregation
  const mallRows = useMemo(
    () => aggregateByMall(filteredBuildings, filteredActive, filteredResolved)
      .sort((a, b) => b.totalActive - a.totalActive),
    [filteredBuildings, filteredActive, filteredResolved],
  );

  // Geo buildings for map
  const geoBuildings = useMemo(
    () => filteredBuildings.filter((b): b is Building & { latitude: number; longitude: number } =>
      b.latitude != null && b.longitude != null,
    ),
    [filteredBuildings],
  );

  // Map markers colored by alarm state
  const buildingMeta = useMemo(() => {
    const map = new Map<string, BuildingMarkerMeta>();
    mallRows.forEach((r) => {
      const color = r.criticalCount > 0 ? '#ef4444' : r.warningCount > 0 ? '#f59e0b' : r.totalActive > 0 ? '#f97316' : '#22c55e';
      const popupHtml = `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 0">
        <strong style="font-size:13px">${r.buildingName}</strong>
        <p style="margin:3px 0 0;font-size:12px">${r.criticalCount} críticas · ${r.warningCount} warnings</p>
        ${r.totalActive > 0 ? `<p style="margin:2px 0 0;font-size:11px;color:#ef4444">${r.totalActive} activas</p>` : '<p style="margin:2px 0 0;font-size:11px;color:#22c55e">Sin alarmas</p>'}
      </div>`;
      map.set(r.buildingId, { color, popupHtml });
    });
    return map;
  }, [mallRows]);

  const displayRows = useMemo(
    () => search ? mallRows.filter((r) => r.buildingName.toLowerCase().includes(search.toLowerCase())) : mallRows,
    [mallRows, search],
  );

  const top5 = mallRows.slice(0, 5);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Alarmas Agregadas"
        eyebrow="Alarmas"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PillToggle
              options={COUNTRIES.map((c) => ({ key: c.key, label: c.label }))}
              value={country}
              onChange={setCountry}
              size="sm"
            />
            <PillToggle
              options={SEVERITY_OPTIONS.map((s) => ({ key: s.key, label: s.label }))}
              value={severityFilter}
              onChange={setSeverityFilter}
              size="sm"
            />
            <PillToggle
              options={STATUS_OPTIONS.map((s) => ({ key: s.key, label: s.label }))}
              value={statusFilter}
              onChange={setStatusFilter}
              size="sm"
            />
            <PillToggle
              options={PERIOD_OPTIONS.map((p) => ({ key: p.key, label: p.label }))}
              value={periodFilter}
              onChange={setPeriodFilter}
              size="sm"
            />
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.title} className="panel px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`mt-0.5 text-xl font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Evolution chart — 30 days */}
      <div className="panel shrink-0 p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Evolución alarmas — 30 días</h3>
        <div className="flex h-28 items-end gap-[2px]">
          {evolutionData.map((d) => {
            const activeH = (d.active / maxEvoValue) * 100;
            const resolvedH = (d.resolved / maxEvoValue) * 100;
            return (
              <div key={d.label} className="group relative flex flex-1 flex-col items-center">
                <div className="flex w-full flex-col justify-end" style={{ height: 96 }}>
                  {activeH > 0 && <div className="w-full rounded-t bg-red-400" style={{ height: `${activeH}%` }} />}
                  {resolvedH > 0 && <div className={`w-full bg-emerald-400 ${activeH > 0 ? '' : 'rounded-t'}`} style={{ height: `${resolvedH}%` }} />}
                </div>
                {/* Rich tooltip */}
                <div className="pointer-events-none absolute -top-16 left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[10px] text-background shadow-lg group-hover:block">
                  <p className="font-medium">{d.label}</p>
                  <p>🔴 Abiertas: {d.active}</p>
                  <p>🟢 Resueltas: {d.resolved}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-400" /> Abiertas</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" /> Resueltas</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Map */}
        <div className="hidden min-h-0 flex-1 overflow-hidden rounded-xl border border-border lg:block">
          <MapView buildings={geoBuildings} buildingMeta={buildingMeta} className="h-full w-full" />
        </div>

        {/* Top 5 + full table */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden lg:max-w-[55%]">
          {/* Top 5 */}
          <div className="panel shrink-0">
            <h3 className="px-4 py-3 text-[13px] font-medium text-foreground">
              Top 5 centros con más alarmas activas
            </h3>
            <ul className="divide-y divide-border">
              {top5.map((row) => (
                <li key={row.buildingId} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{row.buildingName}</p>
                    <p className="text-[11px] text-muted">
                      {row.criticalCount} críticas · {row.warningCount} warnings
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* ponytail: trend placeholder — compute real when previous-week data available */}
                    <span className={`text-[12px] font-medium ${row.totalActive > 2 ? 'text-red-500' : row.totalActive === 0 ? 'text-emerald-500' : 'text-muted'}`}>
                      {row.totalActive > 2 ? '↑' : row.totalActive === 0 ? '↓' : '→'}
                    </span>
                    <span className="text-[15px] font-semibold text-foreground">{row.totalActive}</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/consumo?building=${row.buildingId}`)}
                      className="text-[11px] text-brand hover:underline"
                    >
                      Ver mall
                    </button>
                  </div>
                </li>
              ))}
              {top5.length === 0 && (
                <li className="px-4 py-6 text-center text-[13px] text-muted">Sin alarmas activas.</li>
              )}
            </ul>
          </div>

          {/* Full table */}
          <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-2 px-4 py-3">
              <h3 className="flex-1 text-[13px] font-medium text-foreground">Alarmas por centro comercial</h3>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar mall..."
                className="w-36 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={() => {
                  const header = 'Centro,Críticas,Warnings,Resueltas,Total activas,Última alarma';
                  const csv = [header, ...displayRows.map((r) => `${r.buildingName},${r.criticalCount},${r.warningCount},${r.resolvedCount},${r.totalActive},${r.lastAlertAt ?? '—'}`)].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `alarmas_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:bg-surface"
              >
                Exportar CSV
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                    <th className="px-4 py-2">Centro</th>
                    <th className="px-3 py-2 text-right">Críticas</th>
                    <th className="px-3 py-2 text-right">Warnings</th>
                    <th className="px-3 py-2 text-right">Resueltas</th>
                    <th className="px-3 py-2 text-right">Total activas</th>
                    <th className="px-3 py-2 text-right">T. resolución</th>
                    <th className="px-3 py-2">Última alarma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayRows.map((row) => (
                    <tr key={row.buildingId} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-2 font-medium text-foreground">{row.buildingName}</td>
                      <td className="px-3 py-2 text-right">
                        <CriticalBadge count={row.criticalCount} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <WarningBadge count={row.warningCount} />
                      </td>
                      <td className="px-3 py-2 text-right text-muted">{row.resolvedCount}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">{row.totalActive}</td>
                      <td className="px-3 py-2 text-right text-[11px] text-muted">
                        {row.meanResolutionH != null ? `${row.meanResolutionH}h` : '—'}
                      </td>
                      <td className="max-w-[200px] px-3 py-2">
                        {row.lastAlertMessage
                          ? (
                            <div>
                              <p className="truncate text-[12px] text-foreground">{row.lastAlertMessage}</p>
                              <p className="text-[10px] text-muted">
                                {row.lastAlertAt && new Date(row.lastAlertAt).toLocaleString('es-CL', {
                                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            </div>
                          )
                          : <span className="text-[12px] text-muted">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {displayRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted">
                        Sin datos de alarmas para los filtros seleccionados.
                      </td>
                    </tr>
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

/* ── Badge components ── */

function CriticalBadge({ count }: Readonly<{ count: number }>) {
  const style = count > 0 ? 'bg-red-100 text-red-700' : 'text-muted';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${style}`}>{count}</span>;
}

function WarningBadge({ count }: Readonly<{ count: number }>) {
  const style = count > 0 ? 'bg-amber-100 text-amber-700' : 'text-muted';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${style}`}>{count}</span>;
}
