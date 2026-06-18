import { useState, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { MapView } from '../../components/ui/MapView';
import type { MapPolygon, IndoorConfig } from '../../components/ui/MapView';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useQueryState } from '../../hooks/useQueryState';
import type { Building } from '../../types/building';

/** Parque Arauco center (Kennedy 5413) */
const PARQUE_ARAUCO_CENTER: [number, number] = [-70.5770, -33.4010];

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
    opacity: 0.15,
  },
];

/** Parque Arauco floors from MapVX API */
const FLOORS = [
  { key: '-Ons7hshX_vjIes81OLE', label: 'Nivel -6', level: -6 },
  { key: '-OnqhMQTUG9E4LT-yUI2', label: 'Nivel -5', level: -5 },
  { key: '-OncWh9Ox1qGeWkS2UDy', label: 'Nivel -4', level: -4 },
  { key: '-OmJqjgCsd5x-KgjnhUf', label: 'Nivel -3', level: -3 },
  { key: '-OmJqgA8HTSC0xEpOf7l', label: 'Nivel -2', level: -2 },
  { key: '-Ok-zE5qqNsLukgAMYrU', label: 'Nivel -1', level: -1 },
  { key: '-Ok-zJ4XAd3cBJhlBZti', label: 'Nivel 1', level: 1 },
  { key: '-OpYs8gSAilq51t_nIUz', label: 'Nivel 1.5', level: 1.5 },
  { key: '-Ok-zUvxSQ8f4tR0aepM', label: 'Nivel 2', level: 2 },
  { key: '-OmATfrgDFSCy6_C8YaY', label: 'Nivel 2.5', level: 2.5 },
  { key: '-Ok-zY4fl5dAapOtcv-H', label: 'Nivel 3', level: 3 },
  { key: '-OmATkJy4hLSQKJO-yJj', label: 'Nivel 3.5', level: 3.5 },
  { key: '-Ok-zb9k9Fa7_4jHFtV9', label: 'Nivel 4', level: 4 },
  { key: '-OmJpuo1X_R3ddRW0zES', label: 'Nivel 4.5', level: 4.5 },
  { key: '-OmJqCZRzWWZSvV64fEd', label: 'Nivel 5', level: 5 },
  { key: '-Onvq8MFNm3Nncvkzv3x', label: 'Nivel 6', level: 6 },
] as const;

const DEFAULT_FLOOR = '-Ok-zJ4XAd3cBJhlBZti'; // Nivel 1

export function MapPage() {
  const [floorKey, setFloorKey] = useState(DEFAULT_FLOOR);

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

  const indoor = useMemo<IndoorConfig>(
    () => ({
      floorKey,
      fillColor: '#e0e7ff',
      fillOpacity: 0.6,
      lineColor: '#6366f1',
    }),
    [floorKey],
  );

  const currentFloor = FLOORS.find((f) => f.key === floorKey);

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
        <div className="relative overflow-hidden rounded-xl border border-border" style={{ height: 'calc(100vh - 180px)' }}>
          <MapView
            buildings={geoBuildings}
            polygons={MALL_POLYGONS}
            indoor={indoor}
            center={PARQUE_ARAUCO_CENTER}
            zoom={17}
            pitch={50}
          />

          <FloorSelector
            floors={FLOORS}
            activeKey={floorKey}
            onChange={setFloorKey}
            currentLabel={currentFloor?.label ?? ''}
          />
        </div>
      </QueryStateView>
    </div>
  );
}

function FloorSelector({
  floors,
  activeKey,
  onChange,
  currentLabel,
}: Readonly<{
  floors: readonly { key: string; label: string; level: number }[];
  activeKey: string;
  onChange: (key: string) => void;
  currentLabel: string;
}>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-lg ring-1 ring-gray-200 hover:bg-gray-50"
      >
        {currentLabel} {expanded ? '▼' : '▲'}
      </button>

      {expanded && (
        <div className="max-h-64 overflow-y-auto rounded-lg bg-white shadow-lg ring-1 ring-gray-200">
          {floors.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { onChange(f.key); setExpanded(false); }}
              className={`block w-full px-3 py-1.5 text-left text-xs transition-colors ${
                f.key === activeKey
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
