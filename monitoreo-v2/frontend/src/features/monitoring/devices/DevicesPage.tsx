import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useConcentratorsQuery } from '../../../hooks/queries/useConcentratorsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import type { Concentrator } from '../../../types/concentrator';
import type { Meter } from '../../../types/meter';

type DeviceType = 'all' | 'meter' | 'concentrator';
type StatusFilter = 'all' | 'online' | 'offline' | 'error';

interface DeviceRow {
  id: string;
  name: string;
  type: 'meter' | 'concentrator';
  buildingId: string;
  model: string | null;
  status: string;
  lastComm: string | null;
  detail: string;
}

const PAGE_SIZE = 15;

export function DevicesPage() {
  const [buildingFilter, setBuildingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<DeviceType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery(buildingFilter || undefined);
  const concentratorsQuery = useConcentratorsQuery(buildingFilter || undefined);
  const latestQuery = useLatestReadingsQuery(buildingFilter ? { buildingId: buildingFilter } : undefined);

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const concentrators = concentratorsQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  const buildingMap = useMemo(() => {
    const map = new Map<string, string>();
    buildings.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [buildings]);

  const readingMap = useMemo(() => {
    const map = new Map<string, typeof readings[0]>();
    readings.forEach((r) => map.set(r.meter_id, r));
    return map;
  }, [readings]);

  // Unify meters and concentrators into a single device list
  const devices: DeviceRow[] = useMemo(() => {
    const rows: DeviceRow[] = [];

    meters.forEach((m: Meter) => {
      const reading = readingMap.get(m.id);
      const age = reading ? Date.now() - new Date(reading.timestamp).getTime() : Infinity;
      const status = !m.isActive ? 'offline' : age < 30 * 60_000 ? 'online' : 'offline';
      rows.push({
        id: m.id,
        name: m.name,
        type: 'meter',
        buildingId: m.buildingId,
        model: m.model,
        status,
        lastComm: reading?.timestamp ?? null,
        detail: `${m.meterType} · ${m.phaseType === 'three_phase' ? 'Trifasico' : 'Monofasico'}${m.modbusAddress ? ` · Modbus ${m.modbusAddress}` : ''}`,
      });
    });

    concentrators.forEach((c: Concentrator) => {
      rows.push({
        id: c.id,
        name: c.name,
        type: 'concentrator',
        buildingId: c.buildingId,
        model: c.model,
        status: c.status,
        lastComm: c.lastHeartbeatAt,
        detail: `${c.firmwareVersion ? `FW ${c.firmwareVersion}` : ''}${c.ipAddress ? ` · ${c.ipAddress}` : ''}${c.mqttConnected ? ' · MQTT' : ''}`,
      });
    });

    return rows;
  }, [meters, concentrators, readingMap]);

  // Apply filters
  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !(buildingMap.get(d.buildingId) ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [devices, typeFilter, statusFilter, search, buildingMap]);

  const visibleDevices = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset on filter change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [buildingFilter, typeFilter, statusFilter, search]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE); },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  const qs = useQueryState(metersQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const statusColors: Record<string, string> = {
    online: 'bg-green-100 text-green-700',
    offline: 'bg-gray-100 text-gray-600',
    error: 'bg-red-100 text-red-700',
    maintenance: 'bg-yellow-100 text-yellow-700',
  };

  const typeLabels: Record<string, string> = {
    meter: 'Medidor',
    concentrator: 'Concentrador',
  };

  // Summary
  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;
  const errorCount = devices.filter((d) => d.status === 'error').length;

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-[12px]"
        >
          <option value="">Todos los edificios</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as DeviceType)}
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-[12px]"
        >
          <option value="all">Todos los tipos</option>
          <option value="meter">Medidores</option>
          <option value="concentrator">Concentradores</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-[12px]"
        >
          <option value="all">Todos los estados</option>
          <option value="online">En linea</option>
          <option value="offline">Sin conexion</option>
          <option value="error">Error</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar dispositivo..."
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-[12px] w-44"
        />
        <span className="ml-auto text-[11px] text-pa-text-muted">
          {filtered.length} de {devices.length} dispositivos
        </span>
      </div>

      {/* Compact KPIs */}
      <div className="flex flex-wrap gap-2">
        <MiniKpi label="Total" value={devices.length} />
        <MiniKpi label="En linea" value={onlineCount} color="text-green-600" />
        <MiniKpi label="Sin conexion" value={offlineCount} color="text-gray-500" />
        <MiniKpi label="Error" value={errorCount} color="text-red-600" />
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <Th>Estado</Th>
              <Th>Nombre</Th>
              <Th>Tipo</Th>
              <Th>Edificio</Th>
              <Th>Modelo</Th>
              <Th>Detalle</Th>
              <Th>Ultima comunicacion</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase === 'loading' ? 'loading' : filtered.length === 0 ? 'empty' : 'ready'}
            colSpan={8}
            error={qs.error}
            onRetry={() => { metersQuery.refetch(); }}
            emptyMessage="No hay dispositivos que coincidan con los filtros seleccionados."
            skeletonWidths={['w-16', 'w-32', 'w-20', 'w-28', 'w-24', 'w-40', 'w-28', 'w-20']}
          >
            {visibleDevices.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <Td>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[d.status] ?? statusColors.offline}`}>
                    {d.status}
                  </span>
                </Td>
                <Td className="font-medium">{d.name}</Td>
                <Td>{typeLabels[d.type]}</Td>
                <Td>{buildingMap.get(d.buildingId) ?? '—'}</Td>
                <Td>{d.model ?? '—'}</Td>
                <Td className="max-w-xs truncate text-xs text-gray-500">{d.detail || '—'}</Td>
                <Td className="text-xs text-gray-500">
                  {d.lastComm ? new Date(d.lastComm).toLocaleString('es-CL') : '—'}
                </Td>
                <Td>
                  <div className="flex gap-2">
                    {d.type === 'meter' && (
                      <Link
                        to={`/monitoring/fault-history/${d.id}`}
                        className="rounded px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
                      >
                        Fallos
                      </Link>
                    )}
                    {d.type === 'concentrator' && (
                      <Link
                        to={`/monitoring/concentrator/${d.id}`}
                        className="rounded px-2 py-1 text-xs font-medium text-[var(--color-primary,#3D3BF3)] hover:bg-[var(--color-primary,#3D3BF3)]/10"
                      >
                        Diagnostico
                      </Link>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
    </div>
  );
}

function MiniKpi({ label, value, color = 'text-pa-text' }: Readonly<{ label: string; value: number | string; color?: string }>) {
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
