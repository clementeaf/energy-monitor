import { useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { useBuilding, useBuildingConsumption } from '../../hooks/queries/useBuildings';
import { useLocalsByBuilding } from '../../hooks/queries/useLocals';
import { BuildingConsumptionChart } from './components/BuildingConsumptionChart';
import { LocalCard } from '../locals/components/LocalCard';

export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: building, isLoading: loadingBuilding } = useBuilding(id!);
  const { data: consumption } = useBuildingConsumption(id!);
  const { data: locals } = useLocalsByBuilding(id!);

  if (loadingBuilding) return <p className="text-[#999]">Cargando...</p>;
  if (!building) return <p className="text-[#999]">Edificio no encontrado</p>;

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
        <p className="mb-3 text-sm text-[#666]">{building.address} &middot; {building.totalArea} m²</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        {consumption && (
          <div className="min-h-0 shrink-0 lg:flex-1">
            <BuildingConsumptionChart data={consumption} />
          </div>
        )}

        <div className="flex min-h-0 shrink-0 flex-col lg:w-80">
          <h2 className="mb-2 shrink-0 text-lg font-bold text-black">Locales ({locals?.length ?? 0})</h2>
          <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {locals?.map((l) => (
              <LocalCard key={l.id} local={l} buildingId={id!} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
