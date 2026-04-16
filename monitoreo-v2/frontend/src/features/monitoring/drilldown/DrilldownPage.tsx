import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useHierarchyByBuildingQuery } from '../../../hooks/queries/useHierarchyQuery';
import { useConcentratorsQuery } from '../../../hooks/queries/useConcentratorsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import type { HierarchyNode } from '../../../types/hierarchy';
import type { Concentrator } from '../../../types/concentrator';

export function DrilldownPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const buildingsQuery = useBuildingsQuery();
  const building = buildingsQuery.data?.find((b) => b.id === siteId);

  const hierarchyQuery = useHierarchyByBuildingQuery(siteId ?? '', !!siteId);
  const concentratorsQuery = useConcentratorsQuery(siteId);
  const metersQuery = useMetersQuery(siteId);
  const latestQuery = useLatestReadingsQuery(siteId ? { buildingId: siteId } : undefined);

  const hierarchyQs = useQueryState(hierarchyQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const hierarchy = hierarchyQuery.data ?? [];
  const concentrators = concentratorsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  // Build breadcrumb trail
  const breadcrumb = useMemo(() => {
    const trail: { id: string; name: string }[] = [];
    if (!selectedNodeId) return trail;
    const findNode = (nodes: HierarchyNode[], targetId: string): HierarchyNode[] | null => {
      for (const n of nodes) {
        if (n.id === targetId) return [n];
        if (n.children) {
          const sub = findNode(n.children, targetId);
          if (sub) return [n, ...sub];
        }
      }
      return null;
    };
    const path = findNode(hierarchy, selectedNodeId);
    if (path) path.forEach((n) => trail.push({ id: n.id, name: n.name }));
    return trail;
  }, [hierarchy, selectedNodeId]);

  // Meters power by building
  const totalPower = readings.reduce((s, r) => s + Number(r.power_kw || 0), 0);
  const meterCount = meters.length;

  // Reading map for quick lookup
  const readingByMeter = useMemo(() => {
    const map = new Map<string, typeof readings[0]>();
    readings.forEach((r) => map.set(r.meter_id, r));
    return map;
  }, [readings]);

  if (!siteId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Drill-down por Sitio</h1>
        <p className="text-sm text-gray-500">Seleccione un edificio para explorar su jerarquia electrica.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(buildingsQuery.data ?? []).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(`/monitoring/drilldown/${b.id}`)}
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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link to="/monitoring/realtime" className="hover:text-gray-700">Monitoreo</Link>
        <span>/</span>
        <button
          type="button"
          onClick={() => setSelectedNodeId(null)}
          className="hover:text-gray-700"
        >
          {building?.name ?? 'Edificio'}
        </button>
        {breadcrumb.map((bc) => (
          <span key={bc.id} className="flex items-center gap-1">
            <span>/</span>
            <button
              type="button"
              onClick={() => setSelectedNodeId(bc.id)}
              className="hover:text-gray-700"
            >
              {bc.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {building?.name ?? 'Drill-down'}
        </h1>
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{meterCount} medidores</span>
          <span>{totalPower.toFixed(1)} kW total</span>
        </div>
      </div>

      {/* Hierarchy tree */}
      <DataWidget
        phase={hierarchyQs.phase}
        error={hierarchyQs.error}
        onRetry={() => { void hierarchyQuery.refetch(); }}
        emptyTitle="Sin jerarquia"
        emptyDescription="Este edificio no tiene jerarquia electrica configurada. Mostrando concentradores y medidores."
      >
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Jerarquia Electrica</h2>
          <div className="space-y-1">
            {hierarchy.map((node) => (
              <HierarchyTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedNodeId}
                onSelect={setSelectedNodeId}
              />
            ))}
          </div>
        </div>
      </DataWidget>

      {/* Concentrators */}
      {concentrators.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
            Concentradores ({concentrators.length})
          </h2>
          <div className="divide-y divide-gray-200">
            {concentrators.map((c) => (
              <ConcentratorRow key={c.id} concentrator={c} />
            ))}
          </div>
        </div>
      )}

      {/* Meters table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
          Medidores ({meters.length})
        </h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Tipo</Th>
              <Th>Potencia (kW)</Th>
              <Th>FP</Th>
              <Th>Estado</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {meters.map((m) => {
              const reading = readingByMeter.get(m.id);
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <Td className="font-medium">{m.name}</Td>
                  <Td>{m.meterType}</Td>
                  <Td>{reading ? Number(reading.power_kw || 0).toFixed(2) : '—'}</Td>
                  <Td>{reading?.power_factor ? Number(reading.power_factor).toFixed(3) : '—'}</Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {m.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <Link
                        to={`/monitoring/demand/${siteId}`}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Demanda
                      </Link>
                      <Link
                        to={`/monitoring/quality/${siteId}`}
                        className="rounded px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50"
                      >
                        Calidad
                      </Link>
                      <Link
                        to={`/monitoring/fault-history/${m.id}`}
                        className="rounded px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
                      >
                        Fallos
                      </Link>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HierarchyTreeNode({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: HierarchyNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const isSelected = node.id === selectedId;
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
          isSelected
            ? 'bg-[var(--color-primary,#3D3BF3)]/10 text-[var(--color-primary,#3D3BF3)]'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <span className="text-xs text-gray-400">{node.levelType}</span>
        <span className="font-medium">{node.name}</span>
      </button>
      {node.children?.map((child) => (
        <HierarchyTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function ConcentratorRow({ concentrator }: Readonly<{ concentrator: Concentrator }>) {
  const statusColors: Record<string, string> = {
    online: 'bg-green-100 text-green-700',
    offline: 'bg-gray-100 text-gray-600',
    error: 'bg-red-100 text-red-700',
    maintenance: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{concentrator.name}</p>
        <p className="text-xs text-gray-500">{concentrator.model} {concentrator.serialNumber ? `· S/N ${concentrator.serialNumber}` : ''}</p>
      </div>
      <div className="flex items-center gap-3">
        {concentrator.ipAddress && (
          <span className="text-xs text-gray-400">{concentrator.ipAddress}</span>
        )}
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[concentrator.status] ?? statusColors.offline}`}>
          {concentrator.status}
        </span>
      </div>
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
