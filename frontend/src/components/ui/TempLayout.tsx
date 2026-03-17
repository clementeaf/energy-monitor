import { useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useClickOutside } from '../../hooks/useClickOutside';
import { appRoutes, getNavItems, type AppRoute } from '../../app/appRoutes';
import paIcon from '../../assets/pa-icon.png';
import { useAppStore, USER_MODE_LABELS, type UserMode } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useComparisonFilters } from '../../hooks/queries/useComparisons';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { useStores } from '../../hooks/queries/useStores';
import { PillDropdown } from './PillDropdown';

const allNavItems = (Object.values(appRoutes) as AppRoute[]).filter((r) => r.showInNav);

// =============================================================================
// TopBar — user menu top-right
// =============================================================================

const COUNTRIES = [
  { code: 'CL', label: 'Chile', flag: 'CL' },
  { code: 'CO', label: 'Colombia', flag: 'CO' },
  { code: 'PE', label: 'Peru', flag: 'PE' },
] as const;

/** Convert country code to flag emoji (regional indicator symbols) */
function countryFlag(code: string) {
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}

function TopBar({ userName }: { userName?: string }) {
  const [open, setOpen] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string>('CL');
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside([btnRef, menuRef], () => setOpen(false), open);
  const navigate = useNavigate();

  const initials = (userName ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-12 shrink-0 items-center justify-end gap-3 border-b border-pa-border bg-white px-4">
      {/* Country flags */}
      <div className="flex items-center gap-1">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setActiveCountry(c.code)}
            title={c.label}
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-base transition-colors ${
              activeCountry === c.code
                ? 'bg-pa-navy/10 ring-1 ring-pa-navy/30'
                : 'hover:bg-gray-100'
            }`}
          >
            {countryFlag(c.flag)}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-pa-border" />

      {/* User menu */}
      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-pa-text transition-colors hover:bg-gray-100"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pa-navy text-[11px] font-semibold text-white">
            {initials}
          </span>
          <span className="hidden text-[13px] font-medium sm:inline">{userName ?? 'Usuario'}</span>
          <svg className="h-3 w-3 opacity-50" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>

        {open && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-pa-border bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/settings/profile'); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-pa-text transition-colors hover:bg-gray-100"
            >
              <svg className="h-4 w-4 text-pa-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Configuracion perfil
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

/** Temporary layout without auth. Replace with <Layout /> when re-enabling login. */

export function TempLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    userMode, setUserMode,
    selectedOperator, setSelectedOperator,
    selectedBuilding, setSelectedBuilding,
    selectedStoreMeterId, setSelectedStoreMeterId,
  } = useAppStore();
  const isTecnico = userMode === 'tecnico';
  const { user } = useAuthStore();
  const { data: filters } = useComparisonFilters();
  const { data: buildings } = useBuildings();
  const { data: stores } = useStores();

  // Filter nav by role when authenticated, fallback to all items in dev mode
  const navItems = useMemo(() => {
    const items = user?.role ? getNavItems(user.role) : allNavItems;
    // Tecnico: hide Dashboard (financial-only view)
    return isTecnico ? items.filter((r) => r.path !== '/') : items;
  }, [user?.role, isTecnico]);

  const operatorItems = (filters?.storeNames ?? []).map((n) => ({ value: n, label: n }));

  // Building dropdown items for operador mode — unique building names
  const buildingItems = useMemo(() => {
    if (!buildings) return [];
    const seen = new Set<string>();
    const items: { value: string; label: string }[] = [];
    for (const b of buildings) {
      if (!seen.has(b.buildingName)) {
        seen.add(b.buildingName);
        items.push({ value: b.buildingName, label: b.buildingName });
      }
    }
    return items;
  }, [buildings]);

  // Store dropdown items for operador mode — filtered by selected building
  const storeItems = useMemo(() => {
    if (!stores || !selectedBuilding) return [];
    return stores
      .filter((s) => s.buildingName === selectedBuilding)
      .map((s) => ({ value: s.meterId, label: `${s.storeName} (${s.meterId})` }));
  }, [stores, selectedBuilding]);

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {/* Sidebar — PA Design System */}
      <aside className="flex h-full w-52 shrink-0 flex-col bg-pa-bg-alt">
        {/* Logo + title */}
        <div className="px-4 pt-5 pb-4">
          <button
            type="button"
            className="flex items-center gap-2.5"
            onClick={() => navigate('/')}
          >
            {/* Crop to flower only — text in PNG is white/invisible on light bg */}
            <div className="h-8 w-8 shrink-0 overflow-hidden">
              <img src={paIcon} alt="Parque Arauco" className="h-8 w-auto max-w-none" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-pa-navy">
                Parque Arauco
              </span>
              <span className="text-[11px] text-pa-text-muted">
                Energy Monitor
              </span>
            </div>
          </button>
        </div>

        {/* Mode selector */}
        <div className="relative z-30 px-3">
          <PillDropdown
            items={Object.entries(USER_MODE_LABELS).map(([value, label]) => ({ value: value as UserMode, label }))}
            value={userMode}
            onChange={setUserMode}
            listWidth="w-full"
            align="left"
            fullWidth
          />
        </div>

        {/* Operator selector (multi_operador only) */}
        {userMode === 'multi_operador' && (
          <div className="relative z-20 px-3 pt-2">
            <PillDropdown
              items={operatorItems}
              value={selectedOperator ?? ''}
              onChange={(v) => setSelectedOperator(v || null)}
              listWidth="w-full"
              align="left"
              placeholder="Seleccionar operador"
              fullWidth
            />
          </div>
        )}

        {/* Building + Store selectors (operador only) */}
        {userMode === 'operador' && (
          <>
            <div className="relative z-20 px-3 pt-2">
              <PillDropdown
                items={buildingItems}
                value={selectedBuilding ?? ''}
                onChange={(v) => setSelectedBuilding(v || null)}
                listWidth="w-full"
                align="left"
                placeholder="Seleccionar edificio"
                fullWidth
              />
            </div>
            <div className="relative z-10 px-3 pt-2">
              <PillDropdown
                items={storeItems}
                value={selectedStoreMeterId ?? ''}
                onChange={(v) => setSelectedStoreMeterId(v || null)}
                listWidth="w-full"
                align="left"
                placeholder={selectedBuilding ? 'Seleccionar tienda' : 'Primero selecciona edificio'}
                fullWidth
                searchable
              />
            </div>
          </>
        )}

        {/* Nav — PA numbered items with pill bg */}
        <nav className="flex-1 space-y-2.5 px-3 pt-4">
          {navItems.map((item, i) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path.split(':')[0]);
            const num = String(i + 1).padStart(2, '0');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-pa-blue text-white'
                    : 'bg-white text-pa-text hover:bg-gray-100'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    isActive
                      ? 'border-white/40 text-white'
                      : 'border-pa-navy/30 text-pa-navy'
                  }`}
                >
                  {num}
                </span>
                <span className="text-[13px] font-medium leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] text-pa-text-muted">Dev Mode</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userName={user?.name} />
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
