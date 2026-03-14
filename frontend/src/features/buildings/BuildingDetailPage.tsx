import { useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { useBuilding } from '../../hooks/queries/useBuildings';
import { BuildingDetailSkeleton } from '../../components/ui/Skeleton';

export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: months, isLoading } = useBuilding(id!);

  if (isLoading) return <BuildingDetailSkeleton />;
  if (!months || months.length === 0) return <p className="text-muted">Edificio no encontrado</p>;

  const latest = months[0];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title={latest.buildingName}
          showBack
          breadcrumbs={[
            { label: 'Edificios', to: '/' },
            { label: latest.buildingName },
          ]}
        />
        <div className="mb-4 text-sm text-muted">
          {latest.areaSqm && <span>{latest.areaSqm.toLocaleString()} m²</span>}
          {' · '}{latest.totalMeters} medidores · {latest.totalStores} tiendas
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="text-muted">
          Detalle de edificio — pendiente de conectar gráficos y medidores
        </div>
      </div>
    </div>
  );
}
