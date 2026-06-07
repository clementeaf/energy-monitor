import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { PageHeader } from '../../../components/ui/PageHeader';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import { useOperatorFilter } from '../../../hooks/useOperatorFilter';
import { useMyTenantQuery } from '../../../hooks/queries/useTenantSettingsQuery';
import { resolveStaleThresholdHours, getMeterCommStatus, METER_STATUS_CONFIG } from '../../../lib/meter-status';
import type { LatestReading } from '../../../types/reading';

const PAGE_SIZE = 15;

export function RealtimePage() {
  const navigate = useNavigate();
  const { isFilteredMode, needsSelection, operatorMeterIds, operatorBuildingIds } = useOperatorFilter();
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildingsQuery = useBuildingsQuery();
  const tenantQuery = useMyTenantQuery();
  const staleThresholdHours = resolveStaleThresholdHours(tenantQuery.data?.settings);

  // Default to first building to avoid loading 875+ meters at once
  const allBuildings = buildingsQuery.data ?? [];
  const buildings = useMemo(() => {
    if (!isFilteredMode || !operatorBuildingIds) return allBuildings;
    return allBuildings.filter((b) => operatorBuildingIds.has(b.id));
  }, [allBuildings, isFilteredMode, operatorBuildingIds]);
  const effectiveFilter = buildingFilter || buildings[0]?.id || '';

  const latestQuery = useLatestReadingsQuery(
    effectiveFilter ? { buildingId: effectiveFilter } : undefined,
  );
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const qs = useQueryState(latestQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  // Auto-select first building once loaded
  useEffect(() => {
    if (!buildingFilter && buildings.length > 0) {
      setBuildingFilter(buildings[0].id);
    }
  }, [buildings, buildingFilter]);

  // Refetch every 30s for near-realtime
  useEffect(() => {
    const id = setInterval(() => { latestQuery.refetch(); }, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFilter]);

  const alertMeterIds = useMemo(() => {
    const ids = new Set<string>();
    (alertsQuery.data ?? []).forEach((a) => {
      if (a.meterId) ids.add(a.meterId);
    });
    return ids;
  }, [alertsQuery.data]);

  const rawReadings = latestQuery.data ?? [];
  const readings = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawReadings;
    return rawReadings.filter((r) => operatorMeterIds.has(r.meter_id));
  }, [rawReadings, isFilteredMode, operatorMeterIds]);

  const buildingMap = useMemo(() => {
    const map = new Map<string, string>();
    buildings.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [buildings]);

  // Client-side filtering by status and search
  const filteredReadings = useMemo(() => {
    let result = readings;
    if (statusFilter) {
      result = result.filter((r) => getMeterCommStatus(r, alertMeterIds, staleThresholdHours) === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.meter_name.toLowerCase().includes(q) ||
        (buildingMap.get(r.building_id) ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [readings, statusFilter, search, alertMeterIds, buildingMap, staleThresholdHours]);

  const visibleReadings = filteredReadings.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReadings.length;

  // Reset visible count when filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [effectiveFilter, statusFilter, search]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE); },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  // Summary cards
  const onlineCount = readings.filter((r) => getMeterCommStatus(r, alertMeterIds, staleThresholdHours) === 'online').length;
  const staleCount = readings.filter((r) => getMeterCommStatus(r, alertMeterIds, staleThresholdHours) === 'stale').length;
  const offlineCount = readings.filter((r) => getMeterCommStatus(r, alertMeterIds, staleThresholdHours) === 'offline').length;
  const alarmCount = readings.filter((r) => getMeterCommStatus(r, alertMeterIds, staleThresholdHours) === 'alarm').length;
  const totalPower = readings.reduce((s, r) => s + Number(r.power_kw || 0), 0);

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">Selecciona un operador en la barra lateral para ver medidores en tiempo real.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Tiempo real"
        eyebrow="Monitoreo"
        description={`${filteredReadings.length} de ${readings.length} medidores`}
        actions={
          <>
            <DropdownSelect
              options={[
                { value: '', label: 'Todos los edificios' },
                ...buildings.map((b) => ({ value: b.id, label: b.name })),
              ]}
              value={buildingFilter}
              onChange={(val) => setBuildingFilter(val)}
              className="w-48"
            />
            <DropdownSelect
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'online', label: 'En linea' },
                { value: 'stale', label: 'Obsoleto' },
                { value: 'offline', label: 'Sin datos' },
                { value: 'alarm', label: 'En alarma' },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              className="w-48"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar medidor..."
              className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </>
        }
      />

      {/* Compact KPI row */}
      <div className="flex flex-wrap gap-2">
        <MiniKpi label="En linea" value={onlineCount} color="text-green-600" />
        <MiniKpi label="Obsoleto" value={staleCount} color="text-amber-600" />
        <MiniKpi label="Sin datos" value={offlineCount} color="text-muted" />
        <MiniKpi label="Alarma" value={alarmCount} color="text-red-600" />
        <MiniKpi label="Potencia" value={`${totalPower.toFixed(1)} kW`} color="text-foreground" />
      </div>

      <div className="max-h-[70vh] overflow-y-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Estado</Th>
              <Th>Medidor</Th>
              <Th>Edificio</Th>
              <Th>Potencia (kW)</Th>
              <Th>Voltaje (V)</Th>
              <Th>FP</Th>
              <Th>Frecuencia</Th>
              <Th>Ultima lectura</Th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={8}
            error={qs.error}
            onRetry={() => latestQuery.refetch()}
            emptyMessage="Sin lecturas recientes."
            skeletonWidths={['w-16', 'w-32', 'w-28', 'w-20', 'w-20', 'w-16', 'w-20', 'w-28']}
          >
            {visibleReadings.map((r) => {
              const status = getMeterCommStatus(r, alertMeterIds, staleThresholdHours);
              const cfg = METER_STATUS_CONFIG[status];
              return (
                <tr
                  key={r.meter_id}
                  className="cursor-pointer hover:bg-surface"
                  onClick={() => navigate(`/monitoring/meter/${r.meter_id}`)}
                >
                  <Td>
                    <span className="flex items-center gap-2">
                      <span className={`inline-block size-2 rounded-full ${cfg.dot}`} />
                      <span className="text-xs">{cfg.label}</span>
                    </span>
                  </Td>
                  <Td className="font-medium">{r.meter_name}</Td>
                  <Td>{buildingMap.get(r.building_id) ?? '—'}</Td>
                  <Td>{Number(r.power_kw || 0).toFixed(2)}</Td>
                  <Td>{r.voltage_l1 ? Number(r.voltage_l1).toFixed(1) : '—'}</Td>
                  <Td>{r.power_factor ? Number(r.power_factor).toFixed(3) : '—'}</Td>
                  <Td>{r.frequency_hz ? `${Number(r.frequency_hz).toFixed(1)} Hz` : '—'}</Td>
                  <Td className="text-xs text-muted">
                    {r.timestamp_local
                      ? `${r.timestamp_local} (${r.timezone ?? 'UTC'})`
                      : new Date(r.timestamp).toLocaleString('es-CL')}
                  </Td>
                </tr>
              );
            })}
          </TableStateBody>
        </table>
        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
    </div>
  );
}

function MiniKpi({ label, value, color }: Readonly<{ label: string; value: number | string; color: string }>) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={`text-[13px] font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}

