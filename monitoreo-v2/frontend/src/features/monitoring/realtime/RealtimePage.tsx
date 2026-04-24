import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { DataWidget } from '../../../components/ui/DataWidget';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useQueryState } from '../../../hooks/useQueryState';
import { useOperatorFilter } from '../../../hooks/useOperatorFilter';
import type { LatestReading } from '../../../types/reading';

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  online: { label: 'En linea', dot: 'bg-green-500' },
  offline: { label: 'Sin datos', dot: 'bg-gray-400' },
  alarm: { label: 'Alarma', dot: 'bg-red-500' },
};

function getMeterStatus(reading: LatestReading, alertMeterIds: Set<string>): string {
  if (alertMeterIds.has(reading.meter_id)) return 'alarm';
  const age = Date.now() - new Date(reading.timestamp).getTime();
  if (age > 30 * 60_000) return 'offline'; // >30 min without data
  return 'online';
}

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
      result = result.filter((r) => getMeterStatus(r, alertMeterIds) === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.meter_name.toLowerCase().includes(q) ||
        (buildingMap.get(r.building_id) ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [readings, statusFilter, search, alertMeterIds, buildingMap]);

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
  const onlineCount = readings.filter((r) => getMeterStatus(r, alertMeterIds) === 'online').length;
  const offlineCount = readings.filter((r) => getMeterStatus(r, alertMeterIds) === 'offline').length;
  const alarmCount = readings.filter((r) => getMeterStatus(r, alertMeterIds) === 'alarm').length;
  const totalPower = readings.reduce((s, r) => s + Number(r.power_kw || 0), 0);

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-pa-text-muted">Selecciona un operador en la barra lateral para ver medidores en tiempo real.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header + filters row */}
      <div className="flex flex-wrap items-center gap-2">
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
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm w-48"
        />
        <span className="ml-auto text-[11px] text-pa-text-muted">
          {filteredReadings.length} de {readings.length} medidores
        </span>
      </div>

      {/* Compact KPI row */}
      <div className="flex flex-wrap gap-2">
        <MiniKpi label="En linea" value={onlineCount} color="text-green-600" />
        <MiniKpi label="Sin datos" value={offlineCount} color="text-gray-500" />
        <MiniKpi label="Alarma" value={alarmCount} color="text-red-600" />
        <MiniKpi label="Potencia" value={`${totalPower.toFixed(1)} kW`} color="text-pa-text" />
      </div>

      {qs.phase === 'loading' ? (
        <TableSkeleton />
      ) : (
        <DataWidget
          phase={qs.phase}
          error={qs.error}
          onRetry={() => { latestQuery.refetch(); }}
          isFetching={latestQuery.isFetching && qs.phase === 'ready'}
          emptyTitle="Sin lecturas"
          emptyDescription="No hay lecturas recientes disponibles."
        >
          <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 z-10 bg-gray-50">
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
              <tbody className="divide-y divide-gray-200">
                {visibleReadings.map((r) => {
                  const status = getMeterStatus(r, alertMeterIds);
                  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
                  return (
                    <tr
                      key={r.meter_id}
                      className="cursor-pointer hover:bg-gray-50"
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
                      <Td className="text-xs text-gray-500">
                        {new Date(r.timestamp).toLocaleString('es-CL')}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="h-4" />}
          </div>
        </DataWidget>
      )}
    </div>
  );
}

function MiniKpi({ label, value, color }: Readonly<{ label: string; value: number | string; color: string }>) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-[13px] font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}

const SKELETON_ROWS = 8;
const SKELETON_COLS = ['w-16', 'w-32', 'w-28', 'w-20', 'w-20', 'w-16', 'w-20', 'w-28'];

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
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
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <tr key={i}>
              {SKELETON_COLS.map((w, j) => (
                <td key={j} className="whitespace-nowrap px-4 py-3">
                  <div className={`h-4 ${w} animate-pulse rounded bg-gray-200`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
