import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useAlertsQuery } from '../../../hooks/queries/useAlertsQuery';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
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

export function RealtimePage() {
  const navigate = useNavigate();
  const [buildingFilter, setBuildingFilter] = useState<string>('');

  const buildingsQuery = useBuildingsQuery();
  const latestQuery = useLatestReadingsQuery(
    buildingFilter ? { buildingId: buildingFilter } : undefined,
  );
  const alertsQuery = useAlertsQuery({ status: 'active' });

  const qs = useQueryState(latestQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  // Refetch every 30s for near-realtime
  useEffect(() => {
    const id = setInterval(() => { void latestQuery.refetch(); }, 30_000);
    return () => clearInterval(id);
  }, [latestQuery]);

  const alertMeterIds = useMemo(() => {
    const ids = new Set<string>();
    (alertsQuery.data ?? []).forEach((a) => {
      if (a.meterId) ids.add(a.meterId);
    });
    return ids;
  }, [alertsQuery.data]);

  const readings = latestQuery.data ?? [];
  const buildings = buildingsQuery.data ?? [];

  const buildingMap = useMemo(() => {
    const map = new Map<string, string>();
    buildings.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [buildings]);

  // Summary cards
  const onlineCount = readings.filter((r) => getMeterStatus(r, alertMeterIds) === 'online').length;
  const offlineCount = readings.filter((r) => getMeterStatus(r, alertMeterIds) === 'offline').length;
  const alarmCount = readings.filter((r) => getMeterStatus(r, alertMeterIds) === 'alarm').length;
  const totalPower = readings.reduce((s, r) => s + Number(r.power_kw || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Monitoreo Tiempo Real</h1>
        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los edificios</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="En linea" value={String(onlineCount)} color="text-green-600" />
        <SummaryCard label="Sin datos" value={String(offlineCount)} color="text-gray-500" />
        <SummaryCard label="En alarma" value={String(alarmCount)} color="text-red-600" />
        <SummaryCard label="Potencia total" value={`${totalPower.toFixed(1)} kW`} color="text-gray-900" />
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { void latestQuery.refetch(); }}
        isFetching={latestQuery.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin lecturas"
        emptyDescription="No hay lecturas recientes disponibles."
      >
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
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
              {readings.map((r) => {
                const status = getMeterStatus(r, alertMeterIds);
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
                return (
                  <tr
                    key={r.meter_id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/monitoring/demand/${r.building_id}`)}
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
        </div>
      </DataWidget>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}
