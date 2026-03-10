import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { useHierarchy } from '../../hooks/queries/useHierarchy';
import { useBuilding } from '../../hooks/queries/useBuildings';
import { appRoutes } from '../../app/appRoutes';
import type { HierarchyNode } from '../../types';

function nodeLabel(node: HierarchyNode) {
  return `${'  '.repeat(Math.max(node.level - 1, 0))}${node.name}`;
}

const columns: ColumnDef<HierarchyNode, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Nodo',
    cell: ({ row }) => <span className="font-medium text-text">{nodeLabel(row.original)}</span>,
  },
  { accessorKey: 'nodeType', header: 'Tipo' },
  { accessorKey: 'level', header: 'Nivel' },
  { accessorKey: 'meterId', header: 'Medidor asociado' },
  { accessorKey: 'sortOrder', header: 'Orden' },
];

export function AdminHierarchyPage() {
  const { siteId: routeSiteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const siteId = routeSiteId ?? '';
  const { data: building, isLoading: loadingBuilding } = useBuilding(siteId);
  const { data: nodes, isLoading } = useHierarchy(siteId);
  const orderedNodes = useMemo(
    () => [...(nodes ?? [])].sort((left, right) => left.level - right.level || left.sortOrder - right.sortOrder),
    [nodes],
  );

  if (!siteId) {
    return <p className="text-sm text-muted">Sitio no encontrado.</p>;
  }

  if (isLoading || loadingBuilding) return <BuildingsPageSkeleton />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title={`Jerarquía administrativa ${building?.name ?? siteId}`}
        showBack
        breadcrumbs={[
          { label: 'Administrar Sitios', to: appRoutes.adminSites.path },
          { label: building?.name ?? siteId },
        ]}
      />
      <Card className="mb-4">
        <p className="text-sm text-muted">
          Vista administrativa base de la jerarquía eléctrica del sitio. En esta etapa queda disponible como inspección estructural.
        </p>
      </Card>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          data={orderedNodes}
          columns={columns}
          className="h-full cursor-pointer"
          onRowClick={(node) => {
            if (node.meterId) {
              navigate(`/meters/${node.meterId}`);
            }
          }}
        />
      </div>
    </div>
  );
}