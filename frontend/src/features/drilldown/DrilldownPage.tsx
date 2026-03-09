import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { ChartSkeleton } from '../../components/ui/Skeleton';
import { useHierarchyNode, useHierarchyChildren } from '../../hooks/queries/useHierarchy';
import { DrilldownBreadcrumb } from './components/DrilldownBreadcrumb';
import { DrilldownBars } from './components/DrilldownBars';
import { DrilldownChildrenTable } from './components/DrilldownChildrenTable';

export function DrilldownPage() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();

  // The root node ID convention: B-{BUILDING_ID_UPPER}
  const rootNodeId = `B-${buildingId!.toUpperCase()}`;
  const [currentNodeId, setCurrentNodeId] = useState(rootNodeId);

  const { data: nodeData, isLoading: loadingNode } = useHierarchyNode(currentNodeId);
  const { data: children, isLoading: loadingChildren } = useHierarchyChildren(currentNodeId);

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
    content = (
      <>
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
            { label: nodeData.path[0]?.name ?? buildingId!, to: `/buildings/${buildingId}` },
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
