import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useClickOutside } from '../../hooks/useClickOutside';
import { EMS_SECTION_NAV } from '../../features/ems/navigation';
import { canViewSection, EMS_SECTION_PATHS, type EmsSection } from '../../features/ems/roles';
import { useEmsRole } from '../../features/ems/useEmsRole';

const MAX_RESULTS = 8;

interface SearchResult {
  key: string;
  title: string;
  subtitle: string;
  path: string;
}

function matches(query: string, ...texts: (string | null)[]): boolean {
  return texts.some((text) => text?.toLowerCase().includes(query));
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const role = useEmsRole();
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside([containerRef], () => setIsOpen(false), isOpen);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const buildings = buildingsQuery.data ?? [];
    const buildingNames = new Map(buildings.map((building) => [building.id, building.name]));
    const centros = canViewSection(role, 'centros')
      ? buildings
        .filter((building) => matches(q, building.name, building.code, building.address))
        .map((building) => ({ key: building.id, title: building.name, subtitle: `Centro · ${building.address ?? building.code}`, path: `/centros/${building.id}` }))
      : [];
    const remarcadores = canViewSection(role, 'remarcadores')
      ? (metersQuery.data ?? [])
        .filter((meter) => matches(q, meter.code, meter.name))
        .map((meter) => ({ key: meter.id, title: meter.code, subtitle: `Remarcador · ${meter.name} · ${buildingNames.get(meter.buildingId) ?? '—'}`, path: `/remarcadores/${meter.id}` }))
      : [];
    const sections = (Object.keys(EMS_SECTION_PATHS) as EmsSection[])
      .filter((section) => canViewSection(role, section) && matches(q, EMS_SECTION_NAV[section].label))
      .map((section) => ({ key: section, title: EMS_SECTION_NAV[section].label, subtitle: 'Sección', path: EMS_SECTION_PATHS[section] }));
    return [...centros, ...remarcadores, ...sections].slice(0, MAX_RESULTS);
  }, [query, role, buildingsQuery.data, metersQuery.data]);

  const goTo = (path: string) => {
    setQuery('');
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#505955" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
      <input
        type="search"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => { if (event.key === 'Escape') setIsOpen(false); }}
        placeholder="Buscar centro, equipo o sección"
        aria-label="Buscar en la plataforma"
        autoComplete="off"
        className="h-10 w-full rounded-md border border-[#505955] bg-transparent pl-8 pr-8 text-[13px] text-[#C6CFCB] outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button type="button" onClick={() => { setQuery(''); setIsOpen(false); }} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-muted hover:text-sidebar-fg">
          ✕
        </button>
      )}
      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-background py-1 shadow-float">
          {results.length > 0 ? results.map((result) => (
            <button key={result.key} type="button" onClick={() => goTo(result.path)} className="flex w-full flex-col px-3 py-2 text-left hover:bg-surface">
              <span className="text-sm text-foreground">{result.title}</span>
              <span className="text-xs text-muted">{result.subtitle}</span>
            </button>
          )) : (
            <p className="px-3 py-3 text-xs text-muted">Sin resultados para «{query.trim()}»</p>
          )}
        </div>
      )}
    </div>
  );
}
