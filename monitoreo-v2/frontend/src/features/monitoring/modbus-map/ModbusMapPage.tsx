import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useConcentratorsQuery } from '../../../hooks/queries/useConcentratorsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import type { Meter } from '../../../types/meter';
import type { Concentrator } from '../../../types/concentrator';

const UNKNOWN_BUS = '__sin_bus__';

/**
 * Agrupa medidores por bus_id; sin bus en grupo dedicado.
 * @param meters - Medidores del sitio
 * @returns Lista ordenada por etiqueta de bus
 */
function groupByBus(meters: Meter[]): { busKey: string; label: string; meters: Meter[] }[] {
  const map = new Map<string, Meter[]>();
  for (const m of meters) {
    const key = m.busId && m.busId.trim() !== '' ? m.busId.trim() : UNKNOWN_BUS;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  const rows = [...map.entries()].map(([busKey, list]) => {
    const sorted = [...list].sort((a, b) => {
      const aa = a.modbusAddress ?? 9999;
      const bb = b.modbusAddress ?? 9999;
      return aa - bb;
    });
    const label = busKey === UNKNOWN_BUS ? 'Sin bus asignado' : busKey;
    return { busKey, label, meters: sorted };
  });
  return rows.sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

/**
 * Estado de ultima lectura respecto a ventana online de 30 min.
 * @param timestampIso - Ultima lectura
 * @param isActive - Medidor activo
 */
function meterCommStatus(timestampIso: string | null, isActive: boolean): 'online' | 'offline' {
  if (!isActive) return 'offline';
  if (!timestampIso) return 'offline';
  const age = Date.now() - new Date(timestampIso).getTime();
  if (age >= 30 * 60_000) return 'offline';
  return 'online';
}

export function ModbusMapPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const buildingsQuery = useBuildingsQuery();
  const building = buildingsQuery.data?.find((b) => b.id === siteId);

  const metersQuery = useMetersQuery(siteId);
  const concentratorsQuery = useConcentratorsQuery(siteId);
  const latestQuery = useLatestReadingsQuery(siteId ? { buildingId: siteId } : undefined);

  const qs = useQueryState(metersQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const meters = metersQuery.data ?? [];
  const concentrators = concentratorsQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  const readingByMeterId = useMemo(() => {
    const map = new Map<string, (typeof readings)[0]>();
    readings.forEach((r) => map.set(r.meter_id, r));
    return map;
  }, [readings]);

  const busGroups = useMemo(() => groupByBus(meters), [meters]);

  if (!siteId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Mapa Modbus por sitio</h1>
        <p className="text-sm text-gray-500">
          Seleccione un edificio para ver buses, direcciones Modbus y estado de comunicacion.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(buildingsQuery.data ?? []).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { navigate(`/monitoring/modbus-map/${b.id}`); }}
              className="rounded-lg bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 transition-colors hover:ring-[var(--color-primary,#3D3BF3)]"
            >
              <p className="font-medium text-gray-900">{b.name}</p>
              <p className="text-xs text-gray-500">{b.code}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link to="/monitoring/realtime" className="hover:text-gray-700">Monitoreo</Link>
        <span>/</span>
        <Link to="/monitoring/modbus-map" className="hover:text-gray-700">Mapa Modbus</Link>
        <span>/</span>
        <span className="text-gray-900">{building?.name ?? 'Sitio'}</span>
      </nav>

      <h1 className="text-2xl font-semibold text-gray-900">Mapa Modbus — {building?.name ?? 'Sitio'}</h1>
      <p className="text-sm text-gray-500">
        Concentradores del sitio y medidores agrupados por identificador de bus, ordenados por direccion Modbus.
      </p>

      {metersQuery.isLoading || concentratorsQuery.isLoading ? (
        <div className="space-y-4 animate-pulse">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 h-3 w-32 rounded bg-gray-200" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-md border border-gray-100 bg-gray-50/80 p-3">
                  <div className="h-4 w-28 rounded bg-gray-300" />
                  <div className="mt-1 h-3 w-20 rounded bg-gray-200" />
                  <div className="mt-2 h-5 w-16 rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          </section>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
              <div className="h-4 w-24 rounded bg-gray-300" />
              <div className="mt-1 h-3 w-16 rounded bg-gray-200" />
            </div>
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-gray-200">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-2">
                        <div className="h-3 rounded bg-gray-100" style={{ width: `${[32, 80, 56, 56, 48, 24, 64][j]}px` }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">Concentradores</h2>
        {concentrators.length === 0 ? (
          <p className="text-sm text-gray-500">No hay concentradores registrados para este edificio.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {concentrators.map((c) => (
              <ConcentratorCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { metersQuery.refetch(); }}
        emptyTitle="Sin medidores"
        emptyDescription="No hay medidores en este edificio."
      >
        <div className="space-y-6">
          {busGroups.map((g) => (
            <div key={g.busKey} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                <h3 className="text-sm font-semibold text-gray-800">Bus: {g.label}</h3>
                <p className="text-xs text-gray-500">{g.meters.length} medidor(es)</p>
              </div>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-xs uppercase text-gray-500">
                    <th className="px-4 py-2">Modbus</th>
                    <th className="px-4 py-2">Medidor</th>
                    <th className="px-4 py-2">Modelo</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">CRC ult. sondeo</th>
                    <th className="px-4 py-2">Ruta uplink</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {g.meters.map((m) => {
                    const r = readingByMeterId.get(m.id);
                    const st = meterCommStatus(r?.timestamp ?? null, m.isActive);
                    const crc = m.crcErrorsLastPoll ?? 0;
                    const uplink = m.uplinkRoute ?? '—';
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-gray-900">
                          {m.modbusAddress != null ? m.modbusAddress : '—'}
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-900">{m.name}</td>
                        <td className="px-4 py-2 text-gray-700">{m.model ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-700">{m.meterType}</td>
                        <td className="px-4 py-2">
                          <StatusPill status={st} crcError={crc > 0} />
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-700">{crc}</td>
                        <td className="max-w-[12rem] truncate px-4 py-2 text-gray-600" title={uplink === '—' ? undefined : uplink}>
                          {uplink}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </DataWidget>

      <p className="text-xs text-gray-400">
        <Link to={`/monitoring/drilldown/${siteId}`} className="text-[var(--color-primary,#3D3BF3)] hover:underline">
          Ver jerarquia electrica del sitio
        </Link>
      </p>
        </>
      )}
    </div>
  );
}

function StatusPill({ status, crcError }: Readonly<{ status: 'online' | 'offline'; crcError: boolean }>) {
  if (crcError) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Error / CRC
      </span>
    );
  }
  if (status === 'online') {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      Offline
    </span>
  );
}

function ConcentratorCard({ c }: Readonly<{ c: Concentrator }>) {
  const st =
    c.status === 'online'
      ? 'online'
      : c.status === 'error'
        ? 'error'
        : 'offline';
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50/80 p-3">
      <p className="font-medium text-gray-900">{c.name}</p>
      <p className="text-xs text-gray-500">{c.model}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${
            st === 'online'
              ? 'bg-green-100 text-green-800'
              : st === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {st === 'online' ? 'Online' : st === 'error' ? 'Error' : 'Offline'}
        </span>
        {c.ipAddress && <span className="text-gray-600">{c.ipAddress}</span>}
        {c.mqttConnected && <span className="text-gray-600">MQTT</span>}
      </div>
    </div>
  );
}
