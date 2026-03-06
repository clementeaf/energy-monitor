import { PageHeader } from '../../components/ui/PageHeader';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { BuildingCard } from './components/BuildingCard';

export function BuildingsPage() {
  const { data: buildings, isLoading } = useBuildings();

  if (isLoading) return <BuildingsPageSkeleton />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Edificios" />

      <div className="grid flex-1 grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {buildings?.map((b) => (
          <BuildingCard key={b.id} building={b} />
        ))}
      </div>
    </div>
  );
}
