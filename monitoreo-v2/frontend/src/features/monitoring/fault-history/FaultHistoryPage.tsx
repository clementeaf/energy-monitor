import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useFaultEventsQuery } from '../../../hooks/queries/useFaultEventsQuery';
import { DataWidget } from '../../../components/ui/DataWidget';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useQueryState } from '../../../hooks/useQueryState';
import type { FaultEventQueryParams } from '../../../types/fault-event';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-blue-100 text-blue-700 border-blue-300',
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

export function FaultHistoryPage() {
  const { meterId } = useParams<{ meterId: string }>();

  const metersQuery = useMetersQuery();
  const meter = metersQuery.data?.find((m) => m.id === meterId);

  const buildingsQuery = useBuildingsQuery();
  const building = buildingsQuery.data?.find((b) => b.id === meter?.buildingId);

  const [faultType, setFaultType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const queryParams: FaultEventQueryParams = useMemo(() => {
    const params: FaultEventQueryParams = {};
    if (meterId) params.meterId = meterId;
    if (faultType) params.faultType = faultType;
    if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString();
    if (dateTo) params.dateTo = new Date(dateTo).toISOString();
    return params;
  }, [meterId, faultType, dateFrom, dateTo]);

  const faultEventsQuery = useFaultEventsQuery(queryParams, !!meterId);
  const qs = useQueryState(faultEventsQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const events = faultEventsQuery.data ?? [];

  // Extract unique fault types for filter
  const faultTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach((e) => types.add(e.faultType));
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [events]);

  // Stats
  const openCount = events.filter((e) => !e.resolvedAt).length;
  const resolvedCount = events.filter((e) => !!e.resolvedAt).length;
  const criticalCount = events.filter((e) => e.severity === 'critical').length;

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link to="/monitoring/realtime" className="hover:text-gray-700">Monitoreo</Link>
        <span>/</span>
        {building && (
          <>
            <Link to={`/monitoring/drilldown/${building.id}`} className="hover:text-gray-700">{building.name}</Link>
            <span>/</span>
          </>
        )}
        <Link to="/monitoring/devices" className="hover:text-gray-700">Dispositivos</Link>
        <span>/</span>
        <span className="text-gray-900">Historial de Fallos</span>
      </nav>

      <h1 className="text-2xl font-semibold text-gray-900">
        Historial de Fallos — {meter?.name ?? 'Medidor'}
      </h1>

      {faultEventsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="h-3 w-20 rounded bg-gray-200" />
              <div className="mt-2 h-5 w-10 rounded bg-gray-300" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard label="Total eventos" value={String(events.length)} />
          <SummaryCard label="Abiertos" value={String(openCount)} color="text-red-600" />
          <SummaryCard label="Resueltos" value={String(resolvedCount)} color="text-green-600" />
          <SummaryCard label="Criticos" value={String(criticalCount)} color="text-red-600" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <DropdownSelect
          options={[
            { value: '', label: 'Todos los tipos' },
            ...faultTypes.map((t) => ({ value: t, label: t })),
          ]}
          value={faultType}
          onChange={(val) => setFaultType(val)}
          className="w-48"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="Desde"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="Hasta"
        />
      </div>

      {faultEventsQuery.isLoading && (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 size-3 rounded-full bg-gray-300" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 rounded-full bg-gray-200" />
                    <div className="h-4 w-28 rounded bg-gray-200" />
                  </div>
                  <div className="h-3 w-3/4 rounded bg-gray-100" />
                  <div className="flex gap-4">
                    <div className="h-3 w-32 rounded bg-gray-100" />
                    <div className="h-3 w-24 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!faultEventsQuery.isLoading && (
      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { faultEventsQuery.refetch(); }}
        isFetching={faultEventsQuery.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin eventos de fallo"
        emptyDescription="No hay eventos de fallo registrados para este medidor."
      >
        {/* Timeline */}
        <div className="space-y-3">
          {events.map((event) => {
            const isOpen = !event.resolvedAt;
            const sevColors = SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.low;
            const dotColor = SEVERITY_DOT[event.severity] ?? SEVERITY_DOT.low;

            return (
              <div
                key={event.id}
                className={`relative rounded-lg border bg-white p-4 ${isOpen ? 'border-red-200' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className="mt-1 flex flex-col items-center">
                      <span className={`inline-block size-3 rounded-full ${dotColor}`} />
                      <div className="mt-1 h-full w-px bg-gray-200" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sevColors}`}>
                          {event.severity}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{event.faultType}</span>
                        {isOpen && (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Abierto
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                      )}
                      <div className="mt-2 flex gap-4 text-xs text-gray-400">
                        <span>Inicio: {new Date(event.startedAt).toLocaleString('es-CL')}</span>
                        {event.resolvedAt && (
                          <span>Resuelto: {new Date(event.resolvedAt).toLocaleString('es-CL')}</span>
                        )}
                        {event.resolvedAt && event.startedAt && (
                          <span>
                            Duracion: {formatDuration(new Date(event.startedAt), new Date(event.resolvedAt))}
                          </span>
                        )}
                      </div>
                      {event.resolutionNotes && (
                        <p className="mt-1 text-xs text-gray-500">
                          Notas: {event.resolutionNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DataWidget>
      )}
    </div>
  );
}

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function SummaryCard({ label, value, color = 'text-gray-900' }: Readonly<{ label: string; value: string; color?: string }>) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
