import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { BuildingDetailSkeleton, ChartSkeleton, MetersGridSkeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/auth/useAuth';
import { useBuilding, useBuildingConsumption } from '../../hooks/queries/useBuildings';
import { useAlerts } from '../../hooks/queries/useAlerts';
import { useMetersByBuilding } from '../../hooks/queries/useMeters';
import { useAppStore } from '../../store/useAppStore';
import { appRoutes, canAccessRoute } from '../../app/appRoutes';
import { BuildingConsumptionChart } from './components/BuildingConsumptionChart';
import { BuildingAlertsPanel } from './components/BuildingAlertsPanel';
import { MeterCard } from '../meters/components/MeterCard';
import type { Alert } from '../../types';

type Resolution = '15min' | 'hourly' | 'daily';

function pickResolution(rangeMs: number): Resolution {
  const hours = rangeMs / 3_600_000;
  if (hours <= 36) return '15min';
  if (hours <= 7 * 24) return 'hourly';
  return 'daily';
}

export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSelectedSiteId } = useAppStore();
  const [resolution, setResolution] = useState<Resolution>('hourly');
  const handleRangeChange = useCallback((min: number, max: number) => {
    setResolution(pickResolution(max - min));
  }, []);
  useEffect(() => {
    if (id) {
      setSelectedSiteId(id);
    }
  }, [id, setSelectedSiteId]);

  const { data: building, isLoading: loadingBuilding } = useBuilding(id!);
  const { data: consumption, isLoading: loadingConsumption, isFetching: fetchingConsumption } = useBuildingConsumption(id!, resolution);
  const { data: meters, isLoading: loadingMeters } = useMetersByBuilding(id!);
  const canViewAlerts = !!user && canAccessRoute(user.role, appRoutes.alerts);
  const canOpenDrilldown = !!user && canAccessRoute(user.role, appRoutes.drilldown);
  const { data: activeAlerts } = useAlerts(
    { status: 'active', buildingId: id, limit: 50 },
    { enabled: !!id && canViewAlerts, refetchInterval: 60_000, staleTime: 15_000 },
  );

  const alertsByMeter = new Map<string, Alert[]>();
  for (const alert of activeAlerts ?? []) {
    if (!alert.meterId) continue;
    const list = alertsByMeter.get(alert.meterId) ?? [];
    list.push(alert);
    alertsByMeter.set(alert.meterId, list);
  }

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
          {canOpenDrilldown && (
            <button
              onClick={() => navigate(`/monitoring/drilldown/${id}`)}
              className="rounded-lg border border-border px-3 py-1 text-xs text-muted hover:bg-raised hover:text-text"
            >
              Drill-down Jerárquico
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {loadingConsumption ? <ChartSkeleton /> : consumption && <BuildingConsumptionChart data={consumption} loading={fetchingConsumption} onRangeChange={handleRangeChange} />}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {canViewAlerts && (activeAlerts?.length ?? 0) > 0 && id && (
          <BuildingAlertsPanel buildingId={id} alerts={activeAlerts ?? []} />
        )}

        <h2 className="mb-2 text-lg font-bold text-text">Medidores ({meters?.length ?? 0})</h2>
        {loadingMeters ? (
          <MetersGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 content-start gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-3">
            {meters?.map((m) => (
              <MeterCard
                key={m.id}
                meter={m}
                activeAlerts={alertsByMeter.get(m.id) ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
