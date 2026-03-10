import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { hasGlobalSiteAccess, isSiteInScope } from '../../auth/siteScope';
import { appRoutes } from '../../app/appRoutes';
import { useAuth } from '../../hooks/auth/useAuth';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { useAppStore } from '../../store/useAppStore';

export function ContextSelectPage() {
  const { user } = useAuth();
  const { data: buildings, isLoading } = useBuildings();
  const { setSelectedSiteId } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const availableSites = useMemo(() => {
    if (!user) return [];
    if (hasGlobalSiteAccess(user.siteIds)) return buildings ?? [];
    return (buildings ?? []).filter((building) => isSiteInScope(user.siteIds, building.id));
  }, [buildings, user]);

  if (isLoading) return <BuildingsPageSkeleton />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Seleccionar sitio" />
      <p className="mb-6 text-sm text-muted">
        Elige el edificio con el que vas a trabajar. Puedes cambiarlo después desde la barra lateral.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableSites.map((site) => (
          <Card
            key={site.id}
            className="cursor-pointer hover:bg-raised"
            onClick={() => {
              setSelectedSiteId(site.id);
              navigate(from ?? appRoutes.buildings.path);
            }}
          >
            <h2 className="text-lg font-semibold text-text">{site.name}</h2>
            <p className="mt-2 text-sm text-muted">{site.address}</p>
            <div className="mt-4 flex justify-between text-sm text-subtle">
              <span>{site.id}</span>
              <span>{site.metersCount} medidores</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}