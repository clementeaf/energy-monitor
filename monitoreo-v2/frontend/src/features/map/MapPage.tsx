import { useState, useMemo, useRef, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { MapView } from '../../components/ui/MapView';
import type { MapPolygon, IndoorConfig, SelectedPoint } from '../../components/ui/MapView';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useQueryState } from '../../hooks/useQueryState';
import { useMapVxMalls, useMapVxStoresQuery } from '../../hooks/queries/useMapVxQuery';
import type { MapvxMall, MapvxFloor, MapvxStore } from '../../types/mapvx';
import type { Building } from '../../types/building';

export function MapPage() {
  const mallsQuery = useMapVxMalls();
  const malls = mallsQuery.data ?? [];

  const [activeMallId, setActiveMallId] = useState<string | null>(null);
  const activeMall = malls.find((m) => m.id === activeMallId) ?? malls[0] ?? null;

  const defaultFloor = activeMall?.floors.find((f) => f.isDefault) ?? activeMall?.floors[0];
  const [floorKey, setFloorKey] = useState<string>(defaultFloor?.externalKey ?? '');

  // Sync floor when mall changes
  useEffect(() => {
    const df = activeMall?.floors.find((f) => f.isDefault) ?? activeMall?.floors[0];
    setFloorKey(df?.externalKey ?? '');
    setSelectedStore(null);
  }, [activeMall?.id]);

  const [selectedStore, setSelectedStore] = useState<MapvxStore | null>(null);

  const query = useBuildingsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });

  const storesQuery = useMapVxStoresQuery(activeMall?.id ?? '');

  const geoBuildings = useMemo(
    () =>
      (query.data ?? []).filter(
        (b): b is Building & { latitude: number; longitude: number } =>
          b.latitude != null && b.longitude != null,
      ),
    [query.data],
  );

  const polygons = useMemo<MapPolygon[]>(() => {
    const coords = activeMall?.polygonCoords;
    if (!coords || !activeMall) return [];
    return [{
      id: activeMall.id,
      label: activeMall.name,
      coordinates: coords as [number, number][],
      color: '#3b82f6',
      opacity: 0.15,
    }];
  }, [activeMall]);

  const indoor = useMemo<IndoorConfig | undefined>(
    () => (floorKey ? { floorKey } : undefined),
    [floorKey],
  );

  const selectedPoint = useMemo<SelectedPoint | null>(() => {
    if (!selectedStore) return null;
    return { lng: selectedStore.lng, lat: selectedStore.lat, label: selectedStore.title };
  }, [selectedStore]);

  const handleSelectMall = (mall: MapvxMall) => {
    setActiveMallId(mall.id);
  };

  const handleSelectStore = (store: MapvxStore) => {
    setSelectedStore(store);
    setFloorKey(store.floorKey);
  };

  const currentFloor = activeMall?.floors.find((f) => f.externalKey === floorKey);
  const center: [number, number] = activeMall
    ? [activeMall.centerLng, activeMall.centerLat]
    : [-70.5770, -33.4010];

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
            polygons={polygons}
            indoor={indoor}
            selectedPoint={selectedPoint}
            center={center}
            zoom={17}
            pitch={50}
          />

          <MallSelector
            malls={malls}
            activeId={activeMall?.id ?? ''}
            onSelect={handleSelectMall}
            isLoading={mallsQuery.isLoading}
          />

          <StoreSearch
            stores={storesQuery.data ?? []}
            isLoading={storesQuery.isLoading}
            selected={selectedStore}
            onSelect={handleSelectStore}
            onClear={() => setSelectedStore(null)}
            floors={activeMall?.floors ?? []}
          />

          <FloorSelector
            floors={activeMall?.floors ?? []}
            activeKey={floorKey}
            onChange={setFloorKey}
            currentLabel={currentFloor?.label ?? ''}
          />
        </div>
      </QueryStateView>
    </div>
  );
}

/* ── Mall Selector (top-left) ── */

function MallSelector({
  malls,
  activeId,
  onSelect,
  isLoading,
}: Readonly<{
  malls: MapvxMall[];
  activeId: string;
  onSelect: (mall: MapvxMall) => void;
  isLoading: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const active = malls.find((m) => m.id === activeId);

  return (
    <div className="absolute left-4 top-4 z-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-lg ring-1 ring-gray-200 hover:bg-gray-50"
      >
        {isLoading ? 'Cargando...' : (active?.name ?? 'Seleccionar mall')} {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="mt-1 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-gray-200">
          {malls.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onSelect(m); setOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                m.id === activeId
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {m.name}
              <span className="ml-2 text-[10px] text-gray-400">{m.floors.length} pisos</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Store Search (top-right) — DropdownSelect style ── */

function StoreSearch({
  stores,
  isLoading,
  selected,
  onSelect,
  onClear,
  floors,
}: Readonly<{
  stores: MapvxStore[];
  isLoading: boolean;
  selected: MapvxStore | null;
  onSelect: (store: MapvxStore) => void;
  onClear: () => void;
  floors: MapvxFloor[];
}>) {
  const [searchText, setSearchText] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) { setHighlightIdx(-1); }
  }, [open]);

  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  const filtered = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    const list = q ? stores.filter((s) => s.title.toLowerCase().includes(q)) : stores;
    return list.slice(0, 30);
  }, [stores, searchText]);

  const floorLabel = (key: string) =>
    floors.find((f) => f.externalKey === key)?.label ?? '';

  const handleSelect = (store: MapvxStore) => {
    onSelect(store);
    setOpen(false);
    setSearchText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % filtered.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && filtered[highlightIdx]) handleSelect(filtered[highlightIdx]);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="absolute right-4 top-4 z-10 w-72" onKeyDown={handleKeyDown}>
      {/* Trigger button / selected display */}
      {selected ? (
        <button
          type="button"
          onClick={() => { onClear(); setSearchText(''); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
          className={
            'flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ' +
            'text-left shadow-sm transition-all duration-150 hover:border-subtle cursor-pointer'
          }
        >
          <span className="truncate font-medium text-foreground">{selected.title}</span>
          <svg className="ml-2 size-4 shrink-0 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setOpen(true);
              setHighlightIdx(0);
            }}
            onFocus={() => setOpen(true)}
            placeholder={isLoading ? 'Cargando tiendas...' : 'Buscar tienda...'}
            className={
              'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ' +
              'shadow-sm transition-all duration-150 placeholder:text-subtle ' +
              'hover:border-subtle focus:border-brand focus:outline-none'
            }
          />
          <svg
            className={`pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}

      {/* Dropdown panel */}
      {open && !selected && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-sm">
          <ul ref={listRef} className="max-h-60 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-subtle">
                {searchText ? `Sin resultados para "${searchText}"` : 'Sin tiendas'}
              </li>
            )}
            {filtered.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={false}
                onMouseEnter={() => setHighlightIdx(i)}
                onClick={() => handleSelect(s)}
                className={
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors duration-150 ' +
                  (i === highlightIdx ? 'bg-surface text-foreground' : 'text-foreground hover:bg-surface')
                }
              >
                <span className="truncate">{s.title}</span>
                <span className="ml-2 shrink-0 text-[10px] text-subtle">{floorLabel(s.floorKey)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Floor Selector (bottom-left) ── */

function FloorSelector({
  floors,
  activeKey,
  onChange,
  currentLabel,
}: Readonly<{
  floors: MapvxFloor[];
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
              key={f.externalKey}
              type="button"
              onClick={() => { onChange(f.externalKey); setExpanded(false); }}
              className={`block w-full px-3 py-1.5 text-left text-xs transition-colors ${
                f.externalKey === activeKey
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
