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

type Company = 'pasa' | 'mallplaza';

const COMPANY_OPTIONS: { value: Company; label: string }[] = [
  { value: 'pasa', label: 'PASA' },
  { value: 'mallplaza', label: 'Mall Plaza / Arauco' },
];

function getCompany(mall: MapvxMall): Company {
  return mall.externalId.startsWith('pasa-') ? 'pasa' : 'mallplaza';
}

export function MapPage() {
  const [company, setCompany] = useState<Company>('pasa');
  const [activeMallId, setActiveMallId] = useState<string>('');
  const [floorKey, setFloorKey] = useState('');
  const [selectedStore, setSelectedStore] = useState<MapvxStore | null>(null);

  const mallsQuery = useMapVxMalls();
  const malls = mallsQuery.data ?? [];

  const companyMalls = useMemo(
    () => malls.filter((m) => getCompany(m) === company),
    [malls, company],
  );

  const activeMall = malls.find((m) => m.id === activeMallId) ?? null;

  // Sync mall when company changes
  useEffect(() => {
    const first = companyMalls[0];
    setActiveMallId(first?.id ?? '');
    setSelectedStore(null);
  }, [company, companyMalls.length]);

  // Sync floor when mall changes
  useEffect(() => {
    const df = activeMall?.floors.find((f) => f.isDefault) ?? activeMall?.floors[0];
    setFloorKey(df?.externalKey ?? '');
    setSelectedStore(null);
  }, [activeMallId]);

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

  const handleSelectStore = (store: MapvxStore) => {
    setSelectedStore(store);
    setFloorKey(store.floorKey);
  };

  const center: [number, number] = activeMall
    ? [activeMall.centerLng, activeMall.centerLat]
    : [-70.5770, -33.4010];

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title="Mapa" eyebrow="Monitoreo" />

      <QueryStateView
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { query.refetch(); }}
        emptyMessage="No hay edificios con coordenadas registradas."
      >
        <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>
          {/* ── Left Panel ── */}
          <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-background p-4">
            <SelectorField label="Empresa">
              <SelectDropdown
                options={COMPANY_OPTIONS}
                value={company}
                onChange={(v) => setCompany(v as Company)}
                placeholder="Seleccionar empresa..."
              />
            </SelectorField>

            <SelectorField label="Edificio">
              <SelectDropdown
                options={companyMalls.map((m) => ({ value: m.id, label: m.name }))}
                value={activeMallId}
                onChange={setActiveMallId}
                placeholder={mallsQuery.isLoading ? 'Cargando...' : 'Seleccionar edificio...'}
              />
            </SelectorField>

            <SelectorField label="Tienda">
              <StoreSearchInput
                stores={storesQuery.data ?? []}
                isLoading={storesQuery.isLoading}
                selected={selectedStore}
                onSelect={handleSelectStore}
                onClear={() => setSelectedStore(null)}
                floors={activeMall?.floors ?? []}
              />
            </SelectorField>

            <SelectorField label="Nivel">
              <SelectDropdown
                options={(activeMall?.floors ?? []).map((f) => ({ value: f.externalKey, label: f.label }))}
                value={floorKey}
                onChange={setFloorKey}
                placeholder="Seleccionar nivel..."
              />
            </SelectorField>

            {activeMall && (
              <div className="mt-auto border-t border-border pt-3 text-[11px] text-subtle">
                <p>{activeMall.name}</p>
                <p>{activeMall.floors.length} pisos · {storesQuery.data?.length ?? 0} tiendas</p>
              </div>
            )}
          </div>

          {/* ── Map ── */}
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-border">
            <MapView
              buildings={geoBuildings}
              polygons={polygons}
              indoor={indoor}
              selectedPoint={selectedPoint}
              center={center}
              zoom={17}
              pitch={50}
            />
          </div>
        </div>
      </QueryStateView>
    </div>
  );
}

/* ── Selector Field ── */

function SelectorField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      {children}
    </div>
  );
}

/* ── Select Dropdown (same style as DropdownSelect) ── */

function SelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
}: Readonly<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          'flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ' +
          'text-left transition-all duration-150 hover:border-subtle focus:border-brand focus:outline-none cursor-pointer'
        }
      >
        <span className={value ? 'text-foreground' : 'text-subtle'}>{selectedLabel}</span>
        <svg className={`ml-2 size-4 shrink-0 text-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-sm">
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
            {options.map((o) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={
                  'cursor-pointer px-3 py-2 text-sm transition-colors duration-150 ' +
                  (o.value === value ? 'font-medium text-brand' : 'text-foreground hover:bg-surface')
                }
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Store Search Input ── */

function StoreSearchInput({
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
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) setHighlightIdx(-1);
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
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {selected ? (
        <button
          type="button"
          onClick={() => { onClear(); setSearchText(''); setOpen(true); }}
          className={
            'flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ' +
            'text-left transition-all duration-150 hover:border-subtle cursor-pointer'
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
            type="text"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setOpen(true); setHighlightIdx(0); }}
            onFocus={() => setOpen(true)}
            placeholder={isLoading ? 'Cargando...' : 'Buscar tienda...'}
            className={
              'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ' +
              'transition-all duration-150 placeholder:text-subtle hover:border-subtle focus:border-brand focus:outline-none'
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

      {open && !selected && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-sm">
          <ul ref={listRef} className="max-h-48 overflow-y-auto py-1" role="listbox">
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
