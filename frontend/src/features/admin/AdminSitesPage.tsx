import { type ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { useAppStore } from '../../store/useAppStore';
import { matchesSelectedSite } from '../../auth/siteScope';
import { appRoutes } from '../../app/appRoutes';
import type { Building } from '../../types';

const columns: ColumnDef<Building, unknown>[] = [
  { accessorKey: 'id', header: 'Sitio' },
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'address', header: 'Dirección' },
  { accessorKey: 'totalArea', header: 'Area m²' },
  { accessorKey: 'metersCount', header: 'Medidores' },
];

export function AdminSitesPage() {
  const navigate = useNavigate();
  const { selectedSiteId } = useAppStore();
  const { data: buildings, isLoading } = useBuildings();

  if (isLoading) return <BuildingsPageSkeleton />;

  const scopedBuildings = (buildings ?? []).filter((building) => matchesSelectedSite(selectedSiteId, building.id));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Administración de Sitios" />
      <Card className="mb-4">
        <p className="text-sm text-muted">
          Vista administrativa base para revisar sitios disponibles y entrar a la jerarquía eléctrica por edificio.
        </p>
      </Card>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          data={scopedBuildings}
          columns={columns}
          className="h-full cursor-pointer"
          onRowClick={(building) => navigate(appRoutes.adminHierarchy.path.replace(':siteId', building.id))}
        />
      </div>
    </div>
  );
}