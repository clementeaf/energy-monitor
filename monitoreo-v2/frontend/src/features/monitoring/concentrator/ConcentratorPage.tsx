import { useMemo, type ReactElement } from 'react';
import { useParams, Link } from 'react-router';
import { useConcentratorQuery, useConcentratorMetersQuery } from '../../../hooks/queries/useConcentratorsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import type { ConcentratorStatus } from '../../../types/concentrator';
import type { LatestReading } from '../../../types/reading';

const STATUS_CONFIG: Record<ConcentratorStatus, { label: string; color: string }> = {
  online: { label: 'Online', color: 'bg-green-100 text-green-700' },
  offline: { label: 'Offline', color: 'bg-red-100 text-red-600' },
  error: { label: 'Error', color: 'bg-orange-100 text-orange-700' },
  maintenance: { label: 'Mantenimiento', color: 'bg-blue-100 text-blue-600' },
};

/**
 * Diagnóstico de concentrador individual.
 * Ruta: `/monitoring/concentrator/:concentratorId`
 */
export function ConcentratorPage(): ReactElement {
  const { concentratorId } = useParams<{ concentratorId: string }>();

  const concQuery = useConcentratorQuery(concentratorId ?? '', !!concentratorId);
  const metersQuery = useConcentratorMetersQuery(concentratorId ?? '', !!concentratorId);
  const latestQuery = useLatestReadingsQuery();
  const buildingsQuery = useBuildingsQuery();

  const concQs = useQueryState(concQuery, { isEmpty: (d) => !d });
  const concentrator = concQuery.data;
  const meters = metersQuery.data ?? [];

  const building = useMemo(
    () => (buildingsQuery.data ?? []).find((b) => b.id === concentrator?.buildingId),
    [buildingsQuery.data, concentrator?.buildingId],
  );

  // Map latest readings by meter_id for status check
  const latestByMeter = useMemo(() => {
    const map = new Map<string, LatestReading>();
    for (const r of latestQuery.data ?? []) {
      map.set(r.meter_id, r);
    }
    return map;
  }, [latestQuery.data]);

  // Classify meters: online (reading < 30min ago), offline, no data
  const meterStatus = useMemo(() => {
    const now = Date.now();
    const threshold = 30 * 60 * 1000; // 30 min
    return meters.map((m) => {
      const latest = latestByMeter.get(m.id);
      if (!latest) return { meter: m, status: 'sin datos' as const, latest: null };
      const age = now - new Date(latest.timestamp).getTime();
      return {
        meter: m,
        status: age < threshold ? ('online' as const) : ('offline' as const),
        latest,
      };
    });
  }, [meters, latestByMeter]);

  const onlineCount = meterStatus.filter((m) => m.status === 'online').length;
  const offlineCount = meterStatus.filter((m) => m.status === 'offline').length;
  const noDataCount = meterStatus.filter((m) => m.status === 'sin datos').length;

  const lastHeartbeat = concentrator?.lastHeartbeatAt
    ? new Date(concentrator.lastHeartbeatAt).toLocaleString('es-CL')
    : '—';

  if (!concentratorId) {
    return <p className="p-6 text-gray-500">Concentrador no especificado.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="mb-1 text-xs text-gray-400">
          <Link to="/monitoring/devices" className="hover:text-gray-600">Dispositivos</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-600">{concentrator?.name ?? '...'}</span>
        </nav>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">
            {concentrator?.name ?? 'Cargando...'}
          </h1>
          {concentrator && (
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[concentrator.status].color}`}>
              {STATUS_CONFIG[concentrator.status].label}
            </span>
          )}
        </div>
        {building && (
          <p className="mt-0.5 text-sm text-gray-500">{building.name}</p>
        )}
      </div>

      {/* Info cards */}
      <DataWidget
        phase={concQs.phase}
        error={concQs.error}
        onRetry={() => { concQuery.refetch(); }}
        emptyTitle="Concentrador no encontrado"
        emptyDescription="No se encontró el concentrador solicitado."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Modelo" value={concentrator?.model ?? '—'} />
          <InfoCard label="Serial" value={concentrator?.serialNumber ?? '—'} />
          <InfoCard label="IP" value={concentrator?.ipAddress ?? '—'} />
          <InfoCard label="Firmware" value={concentrator?.firmwareVersion ?? '—'} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label="MQTT"
            value={concentrator?.mqttConnected ? 'Conectado' : 'Desconectado'}
            valueClass={concentrator?.mqttConnected ? 'text-green-600' : 'text-red-500'}
          />
          <InfoCard label="Último heartbeat" value={lastHeartbeat} />
          <InfoCard
            label="Batería"
            value={concentrator?.batteryLevel != null ? `${concentrator.batteryLevel}%` : 'N/A'}
          />
          <InfoCard label="Medidores conectados" value={String(meters.length)} />
        </div>
      </DataWidget>

      {/* Meter status summary */}
      {meters.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatusCard label="Online" count={onlineCount} color="text-green-600 bg-green-50" />
          <StatusCard label="Offline" count={offlineCount} color="text-red-600 bg-red-50" />
          <StatusCard label="Sin datos" count={noDataCount} color="text-gray-500 bg-gray-50" />
        </div>
      )}

      {/* Meters table */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-gray-700">Medidores del concentrador</h2>
        <DataWidget
          phase={metersQuery.isPending ? 'loading' : metersQuery.isError ? 'error' : 'ready'}
          error={metersQuery.error}
          onRetry={() => { metersQuery.refetch(); }}
          emptyTitle="Sin medidores"
          emptyDescription="No hay medidores asignados a este concentrador."
        >
          <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Medidor</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2 text-right">Potencia (kW)</th>
                  <th className="px-4 py-2 text-right">Voltaje L1 (V)</th>
                  <th className="px-4 py-2 text-right">FP</th>
                  <th className="px-4 py-2">Última lectura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {meterStatus.map(({ meter, status, latest }) => (
                  <tr key={meter.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{meter.name ?? meter.code}</td>
                    <td className="px-4 py-2">
                      <MeterStatusBadge status={status} />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {latest ? fmt(latest.power_kw) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {latest ? fmt(latest.voltage_l1) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {latest ? fmt(latest.power_factor, 3) : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {latest ? new Date(latest.timestamp).toLocaleString('es-CL') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataWidget>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  valueClass,
}: Readonly<{ label: string; value: string; valueClass?: string }>): ReactElement {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${valueClass ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function StatusCard({ label, count, color }: Readonly<{ label: string; count: number; color: string }>): ReactElement {
  return (
    <div className={`rounded-lg p-4 text-center ${color}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}

function MeterStatusBadge({ status }: Readonly<{ status: 'online' | 'offline' | 'sin datos' }>): ReactElement {
  const config = {
    online: 'bg-green-100 text-green-700',
    offline: 'bg-red-100 text-red-600',
    'sin datos': 'bg-gray-100 text-gray-500',
  };
  const labels = { online: 'Online', offline: 'Offline', 'sin datos': 'Sin datos' };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config[status]}`}>
      {labels[status]}
    </span>
  );
}

function fmt(val: string | null, decimals = 1): string {
  if (val == null) return '—';
  const n = Number(val);
  return Number.isNaN(n) ? '—' : n.toLocaleString('es-CL', { maximumFractionDigits: decimals });
}
