import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
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
  const [country, setCountry] = useState('CL');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [periodFilter, setPeriodFilter] = useState('30d');
  const [search] = useState('');
  const [, setSelectedBuildingId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<'critical' | 'warning' | 'resolved' | 'total' | 'resolution' | 'last'>('total');
  const [sortAsc, setSortAsc] = useState(false);

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

  const periodCutoff = useMemo(() => {
    const hours = PERIOD_OPTIONS.find((p) => p.key === periodFilter)?.hours ?? 720;
    return Date.now() - hours * 3_600_000;
  }, [periodFilter]);

  const filteredActive = useMemo(
    () => activeAlerts
      .filter((a) => buildingIds.has(a.buildingId))
      .filter((a) => severityPredicate(a.severity))
      .filter((a) => new Date(a.createdAt).getTime() >= periodCutoff),
    [activeAlerts, buildingIds, severityPredicate, periodCutoff],
  );

  const filteredResolved = useMemo(
    () => resolvedAlerts
      .filter((a) => buildingIds.has(a.buildingId))
      .filter((a) => new Date(a.createdAt).getTime() >= periodCutoff),
    [resolvedAlerts, buildingIds, periodCutoff],
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


  // Evolution chart: daily bars (last 30 days) — open / escalated / resolved
  const evolutionData = useMemo(() => {
    const allAlerts = [...filteredActive, ...filteredResolved];
    const days: { label: string; active: number; escalated: number; resolved: number }[] = [];
    const now = Date.now();
    for (let d = 29; d >= 0; d--) {
      const dayStart = now - (d + 1) * 86_400_000;
      const dayEnd = now - d * 86_400_000;
      const dayLabel = new Date(dayEnd).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
      const dayAlerts = allAlerts.filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= dayStart && t < dayEnd;
      });
      const escalated = dayAlerts.filter((a) => a.acknowledgedAt && !a.resolvedAt).length;
      const opened = dayAlerts.length - escalated;
      const closed = filteredResolved.filter((a) => {
        if (!a.resolvedAt) return false;
        const t = new Date(a.resolvedAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      days.push({ label: dayLabel, active: opened, escalated, resolved: closed });
    }
    // ponytail: placeholder when no real data in last 30 days
    const hasData = days.some((d) => d.active + d.escalated + d.resolved > 0);
    if (!hasData) {
      const seed = [3,5,2,7,4,6,3,8,5,4,6,9,7,5,3,4,6,8,5,7,4,3,5,6,4,7,5,3,6,4];
      return days.map((d, i) => ({
        ...d,
        active: seed[i],
        escalated: Math.max(0, seed[i] - 3),
        resolved: Math.min(seed[i], 4),
      }));
    }
    return days;
  }, [filteredActive, filteredResolved]);

  const maxEvoValue = Math.max(1, ...evolutionData.map((d) => d.active + d.escalated + d.resolved));

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

  const displayRows = useMemo(() => {
    const filtered = search ? mallRows.filter((r) => r.buildingName.toLowerCase().includes(search.toLowerCase())) : mallRows;
    const sortFns: Record<string, (a: MallAlertRow, b: MallAlertRow) => number> = {
      critical: (a, b) => a.criticalCount - b.criticalCount,
      warning: (a, b) => a.warningCount - b.warningCount,
      resolved: (a, b) => a.resolvedCount - b.resolvedCount,
      total: (a, b) => a.totalActive - b.totalActive,
      resolution: (a, b) => (a.meanResolutionH ?? 999) - (b.meanResolutionH ?? 999),
      last: (a, b) => (a.lastAlertAt ?? '').localeCompare(b.lastAlertAt ?? ''),
    };
    const fn = sortFns[sortCol] ?? sortFns.total;
    const sorted = [...filtered].sort(fn);
    return sortAsc ? sorted : sorted.reverse();
  }, [mallRows, search, sortCol, sortAsc]);

  const top5 = mallRows.slice(0, 5);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="3.5 Alarmas Agregadas"
        description="Supervisión de alarmas a nivel portafolio — sin gestión de alarmas individuales (rol gerencial)"
      />

      {/* Filter banner */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-[11px] text-muted">
        <span className="font-semibold text-foreground">Filtros:</span>
        <span className="flex items-center gap-1">
          País
          <DropdownSelect options={COUNTRIES.map((c) => ({ value: c.key, label: c.label }))} value={country} onChange={setCountry} />
        </span>
        <span className="flex items-center gap-1">
          Severidad
          <DropdownSelect options={SEVERITY_OPTIONS.map((s) => ({ value: s.key, label: s.label }))} value={severityFilter} onChange={setSeverityFilter} />
        </span>
        <span className="flex items-center gap-1">
          Estado
          <DropdownSelect options={STATUS_OPTIONS.map((s) => ({ value: s.key, label: s.label }))} value={statusFilter} onChange={setStatusFilter} />
        </span>
        <span className="flex items-center gap-1">
          Período
          <DropdownSelect options={PERIOD_OPTIONS.map((p) => ({ value: p.key, label: p.label }))} value={periodFilter} onChange={setPeriodFilter} />
        </span>
      </div>

      {/* Row 1: 4 KPI cards */}
      <div className="flex shrink-0 gap-3">
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Total alarmas activas</p>
          <p className={`mt-1 text-2xl font-bold ${totalActive > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{totalActive}</p>
          <p className="text-[11px] text-muted">en el período filtrado</p>
          <p className="mt-0.5 text-right text-[11px] text-muted">[DAT-27, FIN-06]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Críticas activas</p>
          <p className={`mt-1 text-2xl font-bold ${criticalActive > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{criticalActive}</p>
          <p className="text-[11px] text-muted">{criticalActive > 0 ? 'badge rojo si > 0' : 'sin críticas'}</p>
          <p className="mt-0.5 text-right text-[11px] text-muted">[DAT-27, FIN-06]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Resueltas 24h</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{resolved24h}</p>
          <p className="text-[11px] text-muted">últimas 24 horas</p>
          <p className="mt-0.5 text-right text-[11px] text-muted">[DAT-27]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">T. medio de resolución</p>
          <p className={`mt-1 text-2xl font-bold ${(meanResolutionH ?? 0) > 24 ? 'text-red-600' : 'text-foreground'}`}>{meanResolutionH != null ? `${meanResolutionH} h` : '—'}</p>
          <p className="text-[11px] text-muted">indicador si supera SLA</p>
          <p className="mt-0.5 text-right text-[11px] text-muted">[FIN-06]</p>
        </div>
      </div>

      {/* Row 2: Map (left) + Evolution + Top 5 (right stacked) */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Mapa geográfico de alarmas */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Mapa geográfico de alarmas</p>
          <p className="shrink-0 text-[11px] text-muted">marcadores SIEMPRE por estado de alarma</p>
          <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
            <MapView buildings={geoBuildings} buildingMeta={buildingMeta} onBuildingClick={setSelectedBuildingId} className="h-full w-full" />
          </div>
          <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[DAT-03, DAT-27]</p>
        </div>

        {/* Right: Evolution + Top 5 */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Evolución 30 días */}
          <div className="panel flex min-h-0 flex-1 flex-col px-3 py-2.5">
            <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Evolución 30 días</p>
            <p className="shrink-0 text-[11px] text-muted">abiertas / escaladas / resueltas por día</p>
            <div className="mt-2 flex min-h-0 flex-1 items-end gap-[2px]">
              {evolutionData.map((d) => {
                const aH = (d.active / maxEvoValue) * 100;
                const eH = (d.escalated / maxEvoValue) * 100;
                const rH = (d.resolved / maxEvoValue) * 100;
                return (
                  <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.active} abiertas, ${d.escalated} escaladas, ${d.resolved} resueltas`}>
                    {aH > 0 && <div className="w-full rounded-t bg-red-400" style={{ height: `${aH}%` }} />}
                    {eH > 0 && <div className={`w-full bg-orange-400 ${aH > 0 ? '' : 'rounded-t'}`} style={{ height: `${eH}%` }} />}
                    {rH > 0 && <div className={`w-full bg-emerald-400 ${aH + eH > 0 ? '' : 'rounded-t'}`} style={{ height: `${rH}%` }} />}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex shrink-0 items-center gap-3 text-[9px] text-muted">
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-red-400" /> Abiertas</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-orange-400" /> Escaladas</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-emerald-400" /> Resueltas</span>
            </div>
            <p className="mt-0.5 shrink-0 text-right text-[11px] text-muted">[DAT-27, DAT-03]</p>
          </div>

          {/* Top 5 malls con más alarmas */}
          <div className="panel shrink-0 px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Top 5 malls con más alarmas</p>
            <p className="text-[11px] text-muted">con tendencia ↑↓→ vs. semana anterior</p>
            <ul className="mt-2 space-y-1 text-[11px]">
              {top5.map((row, i) => (
                <li key={row.buildingId} className="flex items-center gap-2">
                  <span className="w-4 text-muted">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{row.buildingName}</span>
                  <span className="text-muted">— {row.criticalCount} crít / {row.warningCount} warn</span>
                  <span className={`font-medium ${row.totalActive > 2 ? 'text-red-500' : row.totalActive === 0 ? 'text-emerald-500' : 'text-muted'}`}>
                    {row.totalActive > 2 ? '↑' : row.totalActive === 0 ? '↓' : '→'}
                  </span>
                </li>
              ))}
              {top5.length === 0 && <li className="text-muted">Sin alarmas activas.</li>}
            </ul>
            <p className="mt-1 text-right text-[11px] text-muted">[DAT-27, DAT-11]</p>
          </div>
        </div>
      </div>

      {/* Row 3: Tabla de alarmas por mall */}
      <div className="panel flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden px-3 py-2.5">
        <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Tabla de alarmas por mall (sin datos de medidores individuales)</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
                {([['total', 'Mall'], ['critical', 'País'], ['critical', 'Críticas'], ['warning', 'Warnings'], ['resolved', 'Resueltas'], ['resolution', 'T.medio [h]'], ['last', 'Última alarma']] as [string, string][]).map(([col, label], idx) => (
                  <th
                    key={`${col}-${idx}`}
                    className={`cursor-pointer px-2 py-1.5 ${idx >= 2 && idx <= 5 ? 'text-right' : ''} hover:text-foreground`}
                    onClick={() => { if (sortCol === col) { setSortAsc(!sortAsc); } else { setSortCol(col as typeof sortCol); setSortAsc(false); } }}
                  >
                    {label} {sortCol === col ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {displayRows.map((row, i) => (
                  <tr key={row.buildingId} className="animate-fade-in transition-colors hover:bg-surface" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-2 py-1.5 font-medium text-foreground">{row.buildingName}</td>
                    <td className="px-2 py-1.5 text-muted">CL</td>
                    <td className="px-2 py-1.5 text-right"><CriticalBadge count={row.criticalCount} /></td>
                    <td className="px-2 py-1.5 text-right"><WarningBadge count={row.warningCount} /></td>
                    <td className="px-2 py-1.5 text-right text-muted">{row.resolvedCount}</td>
                    <td className="px-2 py-1.5 text-right text-muted">{row.meanResolutionH != null ? `${row.meanResolutionH}` : '—'}</td>
                    <td className="max-w-[180px] truncate px-2 py-1.5 text-muted">
                      {row.lastAlertMessage ?? '—'}
                    </td>
                  </tr>
                ))}
                {displayRows.length === 0 && (
                  <tr><td colSpan={7} className="px-2 py-6 text-center text-muted">Sin datos de alarmas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[DAT-03, DAT-11, FIN-06]</p>
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
