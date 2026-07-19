import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useConcentratorsQuery } from '../../../hooks/queries/useConcentratorsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import type { Meter } from '../../../types/meter';
import type { Concentrator } from '../../../types/concentrator';
import { PageHeader } from '../../../components/ui/PageHeader';

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
      <div className="space-y-6">
        <PageHeader title="Mapa Modbus por sitio" eyebrow="Monitoreo" />
        <p className="text-sm text-muted">
          Seleccione un edificio para ver buses, direcciones Modbus y estado de comunicacion.
        </p>
        <div className="flex flex-wrap gap-3">
          {(buildingsQuery.data ?? []).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { navigate(`/monitoring/modbus-map/${b.id}`); }}
              className="rounded-lg bg-background p-4 text-left shadow-sm ring-1 ring-border transition-colors hover:ring-brand"
            >
              <p className="font-medium text-foreground">{b.name}</p>
              <p className="text-xs text-muted">{b.code}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-muted">
        <Link to="/monitoring/realtime" className="hover:text-foreground">Monitoreo</Link>
        <span>/</span>
        <Link to="/monitoring/modbus-map" className="hover:text-foreground">Mapa Modbus</Link>
        <span>/</span>
        <span className="text-foreground">{building?.name ?? 'Sitio'}</span>
      </nav>

      <PageHeader
        title={`Mapa Modbus — ${building?.name ?? 'Sitio'}`}
        eyebrow="Monitoreo"
        description="Concentradores del sitio y medidores agrupados por identificador de bus, ordenados por dirección Modbus."
      />

      <section className="panel p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Concentradores</h2>
        {concentrators.length === 0 ? (
          <p className="text-sm text-muted">No hay concentradores registrados para este edificio.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {concentrators.map((c) => (
              <ConcentratorCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      <div className="space-y-6">
        {busGroups.map((g) => (
          <div key={g.busKey} className="overflow-hidden panel">
            <div className="border-b border-border bg-surface px-4 py-2">
              <h3 className="text-sm font-semibold text-foreground">Bus: {g.label}</h3>
              <p className="text-xs text-muted">{g.meters.length} medidor(es)</p>
            </div>
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="text-left text-xs uppercase text-muted">
                  <th className="px-4 py-2">Modbus</th>
                  <th className="px-4 py-2">Medidor</th>
                  <th className="px-4 py-2">Modelo</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">CRC ult. sondeo</th>
                  <th className="px-4 py-2">Ruta uplink</th>
                </tr>
              </thead>
              <TableStateBody
                phase={qs.phase}
                colSpan={7}
                error={qs.error}
                onRetry={() => metersQuery.refetch()}
                emptyMessage="Sin medidores."
                skeletonWidths={['w-12', 'w-28', 'w-20', 'w-16', 'w-14', 'w-12', 'w-20']}
              >
                {g.meters.map((m) => {
                  const r = readingByMeterId.get(m.id);
                  const st = meterCommStatus(r?.timestamp ?? null, m.isActive);
                  const crc = m.crcErrorsLastPoll ?? 0;
                  const uplink = m.uplinkRoute ?? '—';
                  return (
                    <tr key={m.id} className="hover:bg-surface">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-foreground">
                        {m.modbusAddress != null ? m.modbusAddress : '—'}
                      </td>
                      <td className="px-4 py-2 font-medium text-foreground">{m.name}</td>
                      <td className="px-4 py-2 text-foreground">{m.model ?? '—'}</td>
                      <td className="px-4 py-2 text-foreground">{m.meterType}</td>
                      <td className="px-4 py-2">
                        <StatusPill status={st} crcError={crc > 0} />
                      </td>
                      <td className="px-4 py-2 font-mono text-foreground">{crc}</td>
                      <td className="max-w-[12rem] truncate px-4 py-2 text-muted" title={uplink === '—' ? undefined : uplink}>
                        {uplink}
                      </td>
                    </tr>
                  );
                })}
              </TableStateBody>
            </table>
          </div>
        ))}
      </div>

      <p className="text-xs text-subtle">
        <Link to={`/monitoring/drilldown/${siteId}`} className="text-brand hover:underline">
          Ver jerarquia electrica del sitio
        </Link>
      </p>
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
    <span className="inline-flex rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-foreground">
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
    <div className="rounded-md border border-gray-100 bg-surface/80 p-3">
      <p className="font-medium text-foreground">{c.name}</p>
      <p className="text-xs text-muted">{c.model}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${
            st === 'online'
              ? 'bg-green-100 text-green-800'
              : st === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-raised text-foreground'
          }`}
        >
          {st === 'online' ? 'Online' : st === 'error' ? 'Error' : 'Offline'}
        </span>
        {c.ipAddress && <span className="text-muted">{c.ipAddress}</span>}
        {c.mqttConnected && <span className="text-muted">MQTT</span>}
      </div>
    </div>
  );
}
