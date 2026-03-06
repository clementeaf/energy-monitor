import { useParams, useNavigate } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { BuildingDetailSkeleton, ChartSkeleton, MetersGridSkeleton } from '../../components/ui/Skeleton';
import { useBuilding, useBuildingConsumption } from '../../hooks/queries/useBuildings';
import { useMetersByBuilding } from '../../hooks/queries/useMeters';
import { BuildingConsumptionChart } from './components/BuildingConsumptionChart';
import { MeterCard } from '../meters/components/MeterCard';

export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: building, isLoading: loadingBuilding } = useBuilding(id!);
  const { data: consumption, isLoading: loadingConsumption } = useBuildingConsumption(id!);
  const { data: meters, isLoading: loadingMeters } = useMetersByBuilding(id!);

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
        <div className="mb-3 flex items-center gap-3">
          <p className="text-sm text-muted">{building.address} &middot; {building.totalArea} m²</p>
          <button
            onClick={() => navigate(`/monitoring/drilldown/${id}`)}
            className="rounded-lg border border-border px-3 py-1 text-xs text-muted hover:bg-raised hover:text-text"
          >
            Drill-down Jerárquico
          </button>
        </div>
      </div>

      <div className="shrink-0">
        {loadingConsumption ? <ChartSkeleton /> : consumption && <BuildingConsumptionChart data={consumption} />}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <h2 className="mb-2 text-lg font-bold text-text">Medidores ({meters?.length ?? 0})</h2>
        {loadingMeters ? (
          <MetersGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 content-start gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-3">
            {meters?.map((m) => (
              <MeterCard key={m.id} meter={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
