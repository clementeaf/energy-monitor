import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { MapView } from '../../components/ui/MapView';
import type { MapPolygon, IndoorConfig, SelectedPoint } from '../../components/ui/MapView';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useQueryState } from '../../hooks/useQueryState';
import { useMapVxMalls, useMapVxStoresQuery } from '../../hooks/queries/useMapVxQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { useInvoicesQuery } from '../../hooks/queries/useInvoicesQuery';
import { fmtNum } from '../../lib/formatters';
import type { MapvxFloor, MapvxMall, MapvxStore } from '../../types/mapvx';
import type { Building } from '../../types/building';

export function MapPage() {
  const navigate = useNavigate();
  const [activeMallId, setActiveMallId] = useState<string>('');
  const [floorKey, setFloorKey] = useState('');
  const [selectedStore, setSelectedStore] = useState<MapvxStore | null>(null);

  const mallsQuery = useMapVxMalls();
  const malls = mallsQuery.data ?? [];

  const activeMall = malls.find((m) => m.id === activeMallId) ?? null;
  const isIndoor = activeMall?.hasIndoor ?? false;

  // Separate mall lists for the map
  const markerMalls = useMemo(() => malls.filter((m) => !m.hasIndoor), [malls]);

  // Select first indoor mall on load
  useEffect(() => {
    if (malls.length > 0 && !activeMallId) {
      const firstIndoor = malls.find((m) => m.hasIndoor);
      setActiveMallId((firstIndoor ?? malls[0]).id);
    }
  }, [malls.length]);

  // Sync floor when mall changes
  useEffect(() => {
    if (isIndoor) {
      const df = activeMall?.floors.find((f) => f.isDefault) ?? activeMall?.floors[0];
      setFloorKey(df?.externalKey ?? '');
    } else {
      setFloorKey('');
    }
    setSelectedStore(null);
  }, [activeMallId]);

  const query = useBuildingsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const storesQuery = useMapVxStoresQuery(isIndoor ? (activeMall?.id ?? '') : '');

  const buildings = query.data ?? [];
  const geoBuildings = useMemo(
    () =>
      buildings.filter(
        (b): b is Building & { latitude: number; longitude: number } =>
          b.latitude != null && b.longitude != null,
      ),
    [buildings],
  );

  // Match active mall → building by name for tenant unit / meter lookup
  const matchedBuildingId = useMemo(
    () => activeMall ? buildings.find((b) => b.name === activeMall.name)?.id : undefined,
    [activeMall, buildings],
  );

  const metersQuery = useMetersQuery();
  const meters = metersQuery.data ?? [];
  const latestQuery = useLatestReadingsQuery();
  const readings = latestQuery.data ?? [];
  const invoicesQuery = useInvoicesQuery();
  const invoices = invoicesQuery.data ?? [];

  // Map meter id → latest reading
  const readingByMeter = useMemo(
    () => new Map(readings.map((r) => [r.meter_id, r])),
    [readings],
  );

  // Meters by building
  const metersByBuilding = useMemo(
    () => matchedBuildingId ? meters.filter((m) => m.buildingId === matchedBuildingId) : [],
    [meters, matchedBuildingId],
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
    () => (isIndoor && floorKey ? { floorKey } : undefined),
    [isIndoor, floorKey],
  );

  const selectedPoint = useMemo<SelectedPoint | null>(() => {
    if (!selectedStore) return null;

    const lines: string[] = [];

    // Building-level meter/reading summary (always show if data exists)
    if (metersByBuilding.length > 0) {
      const metersWithData = metersByBuilding.filter((m) => readingByMeter.has(m.id));
      const totalKwh = metersWithData.reduce((sum, m) => {
        const r = readingByMeter.get(m.id);
        return sum + Number(r?.energy_kwh_total ?? 0);
      }, 0);

      if (metersWithData.length > 0) {
        lines.push(`⚡ ${fmtNum(totalKwh)} kWh · ${metersWithData.length}/${metersByBuilding.length} medidores`);
      } else {
        lines.push(`📡 ${metersByBuilding.length} medidor${metersByBuilding.length > 1 ? 'es' : ''} (sin lecturas recientes)`);
      }
    }

    // Invoice summary
    const buildingInvoices = matchedBuildingId
      ? invoices.filter((inv) => inv.buildingId === matchedBuildingId)
      : [];
    if (buildingInvoices.length > 0) {
      const lastInv = [...buildingInvoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const amount = Number(lastInv.total ?? 0);
      lines.push(`💲 Última factura: $${fmtNum(amount)}`);
    }

    let extraHtml = '';
    if (lines.length > 0) {
      extraHtml = `<div style="margin-top:6px;font-size:11px;color:#555;line-height:1.6">${lines.join('<br/>')}</div>`;
    }

    // Navigation link: to building detail if matched, or meter detail if single meter
    if (matchedBuildingId) {
      const linkHref = metersByBuilding.length === 1
        ? `/monitoring/meters/${metersByBuilding[0].id}`
        : `/buildings/${matchedBuildingId}`;
      extraHtml += `<a href="${linkHref}" style="display:inline-block;margin-top:6px;font-size:11px;color:#6366f1;text-decoration:none;font-weight:600" data-meter-id="nav">Ver detalle →</a>`;
    }

    return { lng: selectedStore.lng, lat: selectedStore.lat, label: selectedStore.title, extraHtml };
  }, [selectedStore, metersByBuilding, readingByMeter, invoices, matchedBuildingId]);

  const handleSelectStore = (store: MapvxStore) => {
    setSelectedStore(store);
    setFloorKey(store.floorKey);
  };

  const center: [number, number] = activeMall
    ? [activeMall.centerLng, activeMall.centerLat]
    : [-70.5770, -33.4010];

  const mapZoom = isIndoor ? 17 : 15;

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
            <SelectorField label="Edificio">
              <MallDropdown
                malls={malls}
                value={activeMallId}
                onChange={setActiveMallId}
                placeholder={mallsQuery.isLoading ? 'Cargando...' : 'Seleccionar edificio...'}
              />
            </SelectorField>

            {isIndoor && (
              <>
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
              </>
            )}

            {activeMall && (
              <div className="mt-1 space-y-1 text-xs text-muted">
                {isIndoor ? (
                  <div>
                    <span>{activeMall.floors.length} pisos</span>
                    <span className="mx-1.5">&middot;</span>
                    <span>{storesQuery.data?.length ?? 0} tiendas</span>
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-surface p-2.5 text-xs">
                    <span className="mb-1 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Solo ubicación</span>
                    {activeMall.sizeText && <p className="mt-1 font-medium text-foreground">{activeMall.sizeText}</p>}
                    {activeMall.address && <p className="mt-0.5 text-muted">{activeMall.address}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Map ── */}
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-border">
            <MapView
              buildings={geoBuildings}
              mallMarkers={markerMalls}
              polygons={polygons}
              indoor={indoor}
              selectedPoint={selectedPoint}
              center={center}
              zoom={mapZoom}
              pitch={isIndoor ? 50 : 0}
              onNavigate={(path) => navigate(path)}
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

/* ── Mall Dropdown (with indoor badge) ── */

function MallDropdown({
  malls,
  value,
  onChange,
  placeholder = 'Seleccionar...',
}: Readonly<{
  malls: MapvxMall[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = malls.find((m) => m.id === value);

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
        <span className={value ? 'truncate text-foreground' : 'text-subtle'}>
          {selected?.name ?? placeholder}
        </span>
        <svg className={`ml-2 size-4 shrink-0 text-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-sm">
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {malls.map((m) => (
              <li
                key={m.id}
                role="option"
                aria-selected={m.id === value}
                onClick={() => { onChange(m.id); setOpen(false); }}
                className={
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors duration-150 ' +
                  (m.id === value ? 'font-medium text-brand' : 'text-foreground hover:bg-surface')
                }
              >
                <span className="truncate">{m.name}</span>
                {m.hasIndoor ? (
                  <span className="ml-2 shrink-0 rounded bg-indigo-100 px-1 py-0.5 text-[9px] font-semibold text-indigo-700">INDOOR</span>
                ) : (
                  <span className="ml-2 shrink-0 rounded bg-gray-100 px-1 py-0.5 text-[9px] font-medium text-gray-500">PIN</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
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
