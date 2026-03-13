import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { ChartSkeleton } from '../../components/ui/Skeleton';
import { useHierarchyNode, useHierarchyChildren } from '../../hooks/queries/useHierarchy';
import { DrilldownBreadcrumb } from './components/DrilldownBreadcrumb';
import { DrilldownBars } from './components/DrilldownBars';
import { DrilldownChildrenTable } from './components/DrilldownChildrenTable';

const RANGE_OPTIONS = [
  { days: 1, label: '1 Día' },
  { days: 7, label: '1 Semana' },
  { days: 30, label: '1 Mes' },
] as const;

function timeRangeForDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function DrilldownPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [rangeDays, setRangeDays] = useState<number>(30);
  const range = useMemo(() => timeRangeForDays(rangeDays), [rangeDays]);

  // The root node ID convention: B-{BUILDING_ID_UPPER}
  const rootNodeId = `B-${siteId!.toUpperCase()}`;
  const [currentNodeId, setCurrentNodeId] = useState(rootNodeId);

  const { data: nodeData, isLoading: loadingNode } = useHierarchyNode(currentNodeId);
  const { data: children, isLoading: loadingChildren } = useHierarchyChildren(
    currentNodeId,
    range.from,
    range.to,
  );

  const handleDrill = (nodeId: string) => {
    setCurrentNodeId(nodeId);
  };

  const handleBreadcrumbNav = (nodeId: string) => {
    setCurrentNodeId(nodeId);
  };

  if (loadingNode) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <DrilldownSkeleton />
      </div>
    );
  }

  if (!nodeData) {
    return <p className="text-subtle">Jerarquía no encontrada para este edificio</p>;
  }

  const currentNode = nodeData.node;
  const isCircuit = currentNode.nodeType === 'circuit';
  let content: React.ReactNode;

  if (isCircuit && currentNode.meterId) {
    content = (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="mb-2 text-sm text-muted">Este circuito tiene el medidor <strong className="text-text">{currentNode.meterId}</strong> asignado</p>
        <button
          onClick={() => navigate(`/meters/${currentNode.meterId}`)}
          className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80"
        >
          Ver detalle del medidor
        </button>
      </div>
    );
  } else if (loadingChildren) {
    content = (
      <>
        <ChartSkeleton />
        <ChartSkeleton />
      </>
    );
  } else if (children && children.length > 0) {
    const allZeroKwh = children.every((c) => c.totalKwh === 0);
    const totalReadingsInRange = children.reduce(
      (sum, c) => sum + (typeof c.readingsInRange === 'number' ? c.readingsInRange : 0),
      0,
    );
    const noReadingsInRange = allZeroKwh && totalReadingsInRange === 0;

    content = (
      <>
        <div className="mb-3 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map(({ days, label }) => (
            <button
              key={days}
              type="button"
              onClick={() => setRangeDays(days)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                rangeDays === days
                  ? 'bg-accent text-white'
                  : 'bg-raised text-muted hover:bg-border hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {noReadingsInRange && (
          <p className="mb-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            No hay lecturas en el rango seleccionado para los medidores de este nivel. Compruebe que
            existan filas en la tabla <code className="rounded bg-black/20 px-1">readings</code> para
            los <code className="rounded bg-black/20 px-1">meter_id</code> de esta jerarquía (por
            ejemplo con el script <code className="rounded bg-black/20 px-1">query-readings-direct</code>
            ).
          </p>
        )}
        <DrilldownBars items={children} onDrill={handleDrill} />
        <DrilldownChildrenTable items={children} onDrill={handleDrill} />
      </>
    );
  } else {
    content = <p className="text-sm text-subtle">Este nodo no tiene subnodos</p>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Drill-down Jerárquico"
          showBack
          breadcrumbs={[
            { label: 'Edificios', to: '/' },
            { label: nodeData.path[0]?.name ?? siteId!, to: `/buildings/${siteId}` },
            { label: 'Drill-down' },
          ]}
        />

        <div className="mb-4">
          <DrilldownBreadcrumb path={nodeData.path} onNavigate={handleBreadcrumbNav} />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">{content}</div>
    </div>
  );
}

function DrilldownSkeleton() {
  return (
    <>
      <div className="mb-6 shrink-0">
        <div className="mb-2 h-4 w-40 animate-pulse rounded bg-raised" />
        <div className="h-8 w-64 animate-pulse rounded bg-raised" />
      </div>
      <div className="mb-4 h-4 w-80 animate-pulse rounded bg-raised" />
      <div className="h-[300px] animate-pulse rounded-lg bg-raised" />
      <div className="mt-4 h-[200px] animate-pulse rounded-lg bg-raised" />
    </>
  );
}
