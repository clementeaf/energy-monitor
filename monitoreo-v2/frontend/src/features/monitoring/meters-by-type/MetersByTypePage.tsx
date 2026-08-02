import { Fragment, useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useQueryState } from '../../../hooks/useQueryState';
import { formatMeterTypeLabel } from '../lib/meterClassification';
import type { Meter } from '../../../types/meter';

/**
 * Agrupa medidores por tipo y calcula potencia agregada desde ultimas lecturas.
 * @param meters - Lista de medidores
 * @param powerByMeterId - Mapa meter_id -> potencia kW
 * @returns Pares [tipo, medidores, potencia total tipo]
 */
function groupMetersByType(
  meters: Meter[],
  powerByMeterId: Map<string, number>,
): { typeKey: string; meters: Meter[]; totalKw: number }[] {
  const map = new Map<string, Meter[]>();
  for (const m of meters) {
    const k = (m.meterType ?? '').trim() || 'unknown';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(m);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([typeKey, list]) => {
      const totalKw = list.reduce((s, m) => s + (powerByMeterId.get(m.id) ?? 0), 0);
      return { typeKey, meters: list, totalKw };
    });
}

/**
 * Estado de comunicacion a partir de ultima lectura.
 * @param timestampIso - ISO timestamp o null
 * @param isActive - Medidor activo en plataforma
 * @returns Etiqueta de estado
 */
function commStatus(timestampIso: string | null, isActive: boolean): 'online' | 'offline' {
  if (!isActive) return 'offline';
  if (!timestampIso) return 'offline';
  const age = Date.now() - new Date(timestampIso).getTime();
  return age < 30 * 60_000 ? 'online' : 'offline';
}

const PAGE_SIZE = 15;

export function MetersByTypePage() {
  const metersQuery = useMetersQuery();
  const buildingsQuery = useBuildingsQuery();
  const latestQuery = useLatestReadingsQuery();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const qs = useQueryState(metersQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const buildingNameById = useMemo(() => {
    const map = new Map<string, string>();
    (buildingsQuery.data ?? []).forEach((b) => map.set(b.id, b.name));
    return map;
  }, [buildingsQuery.data]);

  const powerByMeterId = useMemo(() => {
    const map = new Map<string, number>();
    (latestQuery.data ?? []).forEach((r) => {
      map.set(r.meter_id, Number(r.power_kw ?? 0));
    });
    return map;
  }, [latestQuery.data]);

  const meters = metersQuery.data ?? [];
  const groups = useMemo(
    () => groupMetersByType(meters, powerByMeterId),
    [meters, powerByMeterId],
  );

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const totalKw = useMemo(
    () => groups.reduce((s, g) => s + g.totalKw, 0),
    [groups],
  );

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter((g) =>
      formatMeterTypeLabel(g.typeKey).toLowerCase().includes(q) ||
      g.meters.some((m) => m.name.toLowerCase().includes(q)),
    );
  }, [groups, search]);

  const visibleGroups = filteredGroups.slice(0, visibleCount);
  const hasMore = visibleCount < filteredGroups.length;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE); },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  const toggle = (typeKey: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) next.delete(typeKey);
      else next.add(typeKey);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Medidores por tipo"
        eyebrow="Monitoreo"
        description={`${filteredGroups.length} tipos · ${meters.length} medidores`}
        actions={
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tipo o medidor..."
            className="w-52 rounded-md border border-border px-2.5 py-1.5 text-xs"
          />
        }
      />

      {/* Compact KPIs */}
      <div className="flex flex-wrap gap-2">
        <MiniKpi label="Medidores" value={meters.length} />
        <MiniKpi label="Tipos" value={groups.length} />
        <MiniKpi label="Potencia total" value={`${totalKw.toFixed(1)} kW`} />
      </div>

      <div className="overflow-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Tipo</Th>
              <Th>Cantidad</Th>
              <Th>Potencia sumada (kW)</Th>
              <Th className="w-28">Detalle</Th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={4}
            error={qs.error}
            onRetry={() => { metersQuery.refetch(); }}
            emptyMessage="No hay medidores visibles para su usuario."
            skeletonWidths={['w-28', 'w-16', 'w-24', 'w-20']}
          >
            {visibleGroups.map((g) => (
              <Fragment key={g.typeKey}>
                <tr className="hover:bg-surface">
                  <Td className="font-medium text-foreground">{formatMeterTypeLabel(g.typeKey)}</Td>
                  <Td>{g.meters.length}</Td>
                  <Td>{g.totalKw.toFixed(1)}</Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => { toggle(g.typeKey); }}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {expanded.has(g.typeKey) ? 'Ocultar' : 'Ver medidores'}
                    </button>
                  </Td>
                </tr>
                {expanded.has(g.typeKey) && (
                  <tr key={`${g.typeKey}-detail`} className="bg-surface">
                    <td colSpan={4} className="p-0">
                      <div className="overflow-auto px-4 py-3">
                        <table className="min-w-full text-sm">
                          <thead className="sticky top-0 z-10 bg-background">
                            <tr className="text-left text-xs uppercase text-muted">
                              <th className="pb-2 pr-4">Nombre</th>
                              <th className="pb-2 pr-4">Codigo</th>
                              <th className="pb-2 pr-4">Edificio</th>
                              <th className="pb-2 pr-4">Potencia kW</th>
                              <th className="pb-2">Enlace</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {g.meters.map((m) => {
                              const p = powerByMeterId.get(m.id);
                              const ts = (latestQuery.data ?? []).find((r) => r.meter_id === m.id)?.timestamp ?? null;
                              const st = commStatus(ts, m.isActive);
                              return (
                                <tr key={m.id}>
                                  <td className="py-2 pr-4 font-medium text-foreground">{m.name}</td>
                                  <td className="py-2 pr-4">{m.code}</td>
                                  <td className="py-2 pr-4">{buildingNameById.get(m.buildingId) ?? m.buildingId}</td>
                                  <td className="py-2 pr-4">{(p ?? 0).toFixed(1)}</td>
                                  <td className="py-2">
                                    <span
                                      className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-xs ${
                                        st === 'online' ? 'bg-success/10 text-success' : 'bg-raised text-muted'
                                      }`}
                                    >
                                      {st === 'online' ? 'Online' : 'Offline'}
                                    </span>
                                    <Link
                                      to={`/meters?buildingId=${m.buildingId}`}
                                      className="text-foreground hover:underline"
                                    >
                                      Listado edificio
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
    </div>
  );
}

function MiniKpi({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function Th({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-medium text-muted ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}
