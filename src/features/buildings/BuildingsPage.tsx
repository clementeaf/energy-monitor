import { PageHeader } from '../../components/ui/PageHeader';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { BuildingCard } from './components/BuildingCard';

export function BuildingsPage() {
  const { data: buildings, isLoading } = useBuildings();

  return (
    <div>
      <PageHeader title="Edificios" />

      {isLoading && <p className="text-[#999]">Cargando...</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {buildings?.map((b) => (
          <BuildingCard key={b.id} building={b} />
        ))}
      </div>
    </div>
  );
}
