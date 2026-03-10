import { PageHeader } from '../../components/ui/PageHeader';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { useAlerts } from '../../hooks/queries/useAlerts';
import { useAuth } from '../../hooks/auth/useAuth';
import { useAppStore } from '../../store/useAppStore';
import { matchesSelectedSite } from '../../auth/siteScope';
import { appRoutes, canAccessRoute } from '../../app/appRoutes';
import type { Alert } from '../../types';
import { AlertsOverviewPanel } from './components/AlertsOverviewPanel';
import { BuildingCard } from './components/BuildingCard';

export function BuildingsPage() {
  const { user } = useAuth();
  const { selectedSiteId } = useAppStore();
  const { data: buildings, isLoading } = useBuildings();
  const canViewAlerts = !!user && canAccessRoute(user.role, appRoutes.alerts);
  const { data: activeAlerts } = useAlerts(
    {
      status: 'active',
      limit: 12,
      buildingId: selectedSiteId && selectedSiteId !== '*' ? selectedSiteId : undefined,
    },
    { enabled: canViewAlerts, refetchInterval: 60_000, staleTime: 15_000 },
  );
  const alertsByBuilding = new Map<string, Alert[]>();
  const visibleBuildings = (buildings ?? []).filter((building) => matchesSelectedSite(selectedSiteId, building.id));

  for (const alert of activeAlerts ?? []) {
    if (!alert.buildingId) continue;
    const list = alertsByBuilding.get(alert.buildingId) ?? [];
    list.push(alert);
    alertsByBuilding.set(alert.buildingId, list);
  }

  if (isLoading) return <BuildingsPageSkeleton />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Edificios" />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {canViewAlerts && (activeAlerts?.length ?? 0) > 0 && (
          <AlertsOverviewPanel alerts={activeAlerts ?? []} />
        )}

        <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleBuildings.map((b) => (
            <BuildingCard key={b.id} building={b} activeAlerts={alertsByBuilding.get(b.id) ?? []} />
          ))}
        </div>
      </div>
    </div>
  );
}
