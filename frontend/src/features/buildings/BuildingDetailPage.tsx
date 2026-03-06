import { useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { BuildingDetailSkeleton } from '../../components/ui/Skeleton';
import { useBuilding, useBuildingConsumption } from '../../hooks/queries/useBuildings';
import { useMetersByBuilding } from '../../hooks/queries/useMeters';
import { BuildingConsumptionChart } from './components/BuildingConsumptionChart';
import { MeterCard } from '../meters/components/MeterCard';

export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: building, isLoading: loadingBuilding } = useBuilding(id!);
  const { data: consumption } = useBuildingConsumption(id!);
  const { data: meters } = useMetersByBuilding(id!);

  if (loadingBuilding) return <BuildingDetailSkeleton />;
  if (!building) return <p className="text-subtle">Edificio no encontrado</p>;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title={building.name}
          showBack
          breadcrumbs={[
            { label: 'Edificios', to: '/' },
            { label: building.name },
          ]}
        />
        <p className="mb-3 text-sm text-muted">{building.address} &middot; {building.totalArea} m²</p>
      </div>

      <div className="shrink-0">
        {consumption && (
          <BuildingConsumptionChart data={consumption} />
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <h2 className="mb-2 text-lg font-bold text-text">Medidores ({meters?.length ?? 0})</h2>
        <div className="grid grid-cols-1 content-start gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-3">
          {meters?.map((m) => (
            <MeterCard key={m.id} meter={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
