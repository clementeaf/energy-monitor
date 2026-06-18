import { useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { MapView } from '../../components/ui/MapView';
import type { MapPolygon } from '../../components/ui/MapView';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useQueryState } from '../../hooks/useQueryState';
import type { Building } from '../../types/building';

/** Midpoint between Mallplaza Gestión and Parque Arauco polygon */
const MAP_CENTER: [number, number] = [-70.5800, -33.3990];

/** Decoded from MapVX polyline: Parque Arauco perimeter */
const MALL_POLYGONS: MapPolygon[] = [
  {
    id: 'parque-arauco',
    label: 'Parque Arauco',
    coordinates: [
      [-33.40212, -70.58087],
      [-33.40395, -70.57976],
      [-33.40148, -70.57387],
      [-33.39958, -70.57502],
      [-33.40212, -70.58087],
    ],
    color: '#3b82f6',
    opacity: 0.2,
  },
];

export function MapPage() {
  const query = useBuildingsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });

  const geoBuildings = useMemo(
    () =>
      (query.data ?? []).filter(
        (b): b is Building & { latitude: number; longitude: number } =>
          b.latitude != null && b.longitude != null,
      ),
    [query.data],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Mapa"
        eyebrow="Monitoreo"
        actions={
          <span className="text-xs text-muted">
            {geoBuildings.length} edificio{geoBuildings.length !== 1 ? 's' : ''} con coordenadas
          </span>
        }
      />

      <QueryStateView
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { query.refetch(); }}
        emptyMessage="No hay edificios con coordenadas registradas."
      >
        <div className="overflow-hidden rounded-xl border border-border" style={{ height: 'calc(100vh - 180px)' }}>
          <MapView
            buildings={geoBuildings}
            polygons={MALL_POLYGONS}
            center={MAP_CENTER}
            zoom={15}
            pitch={50}
          />
        </div>
      </QueryStateView>
    </div>
  );
}
