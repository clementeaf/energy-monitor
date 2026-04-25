import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { APP_ROUTES } from '../../app/routes';
import { useAppStore, VIEW_AS_LABELS } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/auth/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useTenantsAdminQuery } from '../../hooks/queries/useTenantsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { applyTenantTheme } from '../../lib/tenant-theme';
import type { RoleSlug, TenantTheme } from '../../types/auth';
import type { Tenant } from '../../types/tenant';
import globeLogo from '../../assets/globe-logo.png';

interface SubItem {
  to: string;
  label: string;
  end?: boolean;
  /** Only show for super_admin (real, not impersonating) */
  superAdminOnly?: boolean;
  /** Hide when super_admin has no tenant selected */
  requiresTenant?: boolean;
}

interface NavEntry {
  label: string;
  /** Direct route (no children) */
  to?: string;
  /** Base path for active detection */
  basePath: string;
  requiredPerms: string[];
  children?: SubItem[];
}

const NAV_ENTRIES: NavEntry[] = [
  {
    label: 'Dashboard',
    basePath: '/dashboard',
    requiredPerms: ['dashboard_executive:read', 'dashboard_technical:read'],
    children: [
      { to: '/', label: 'General', end: true, requiresTenant: true },
      { to: APP_ROUTES.platform, label: 'Plataforma', superAdminOnly: true },
      { to: APP_ROUTES.executive, label: 'Ejecutivo', requiresTenant: true },
      { to: APP_ROUTES.compare, label: 'Comparativo', requiresTenant: true },
    ],
  },
  {
    label: 'Monitoreo',
    basePath: '/monitoring',
    requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'],
    children: [
      { to: '/monitoring/realtime', label: 'Tiempo Real' },
      { to: '/monitoring/devices', label: 'Dispositivos' },
      { to: '/monitoring/meters/type', label: 'Medidores por tipo' },
      // { to: '/monitoring/generation', label: 'Generación' },
      // { to: '/monitoring/modbus-map', label: 'Mapa Modbus' },
    ],
  },
  {
    label: 'Edificios',
    to: '/buildings',
    basePath: '/buildings',
    requiredPerms: ['admin_buildings:read', 'dashboard_executive:read', 'dashboard_technical:read'],
  },
  {
    label: 'Medidores',
    to: '/meters',
    basePath: '/meters',
    requiredPerms: ['admin_meters:read', 'dashboard_executive:read', 'dashboard_technical:read'],
  },
  {
    label: 'Alertas',
    basePath: '/alerts',
    requiredPerms: ['alerts:read'],
    children: [
      { to: '/alerts', label: 'Alertas', end: true },
      { to: '/alerts/history', label: 'Historial / SLA' },
    ],
  },
  {
    label: 'Facturación',
    basePath: '/billing',
    requiredPerms: ['billing:read', 'billing:view_own'],
    children: [
      { to: '/billing', label: 'Facturas', end: true },
      { to: '/billing/my-invoice', label: 'Mi Factura' },
      { to: '/billing/rates', label: 'Tarifas' },
    ],
  },
  {
    label: 'Reportes',
    basePath: '/reports',
    requiredPerms: ['reports:read', 'reports:view_own'],
    to: '/reports',
  },
  {
    label: 'Analítica',
    basePath: '/analytics',
    requiredPerms: ['dashboard_executive:read'],
    children: [
      { to: '/analytics/benchmark', label: 'Benchmarking' },
      { to: '/analytics/trends', label: 'Tendencias' },
      { to: '/analytics/patterns', label: 'Patrones' },
    ],
  },
  {
    label: 'Integraciones',
    to: APP_ROUTES.integrations,
    basePath: '/integrations',
    requiredPerms: ['integrations:read'],
  },
  {
    label: 'Administración',
    basePath: '/admin',
    requiredPerms: ['admin_users:read'],
    children: [
      { to: '/admin/companies', label: 'Empresas', superAdminOnly: true },
      { to: '/admin/users', label: 'Usuarios' },
      { to: '/admin/tenants', label: 'Locatarios' },
      { to: '/admin/hierarchy', label: 'Jerarquía' },
      { to: '/admin/roles', label: 'Roles' },
      { to: '/admin/api-keys', label: 'API Keys' },
      { to: '/admin/audit', label: 'Auditoría' },
      { to: '/admin/settings', label: 'Configuración' },
    ],
  },
];

const VIEW_AS_ROLES: RoleSlug[] = ['super_admin', 'corp_admin', 'site_admin', 'operator', 'tenant_user', 'analyst', 'auditor'];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, viewAsRole, setViewAsRole, selectedTenantId, setSelectedTenantId, selectedOperator, setSelectedOperator, selectedBuildingId, setSelectedBuildingId } = useAppStore();
  const { tenant } = useAuthStore();
  const { logout } = useAuth();
  const { hasAny, isSuperAdmin, isImpersonating } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [contactOpen, setContactOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const visibleEntries = NAV_ENTRIES.filter((e) => hasAny(...e.requiredPerms));

  // Auto-expand active group
  const activeIdx = visibleEntries.findIndex((e) =>
    e.basePath === '/dashboard'
      ? location.pathname === '/' || location.pathname.startsWith('/dashboard')
      : location.pathname.startsWith(e.basePath),
  );

  return (
    <aside
      className={`flex shrink-0 flex-col bg-pa-bg-alt overflow-hidden transition-[width] duration-300 ease-in-out ${
        sidebarOpen ? 'w-52' : 'w-0'
      }`}
    >
      {/* Logo */}
      <div className="flex justify-center px-4 pt-5 pb-4">
        <button type="button" onClick={toggleSidebar} title="Colapsar menú">
          <img src={tenant?.logoUrl ?? globeLogo} alt="Globe Power" className="h-9 w-auto object-contain" />
        </button>
      </div>

      {/* Role switcher — super_admin only */}
      {isSuperAdmin && (
        <div className="space-y-2 px-3 pb-3">
          <RoleSwitcher
            value={viewAsRole ?? 'super_admin'}
            onChange={(val) => { setViewAsRole(val === 'super_admin' ? null : val); navigate('/'); }}
            isImpersonating={isImpersonating}
            onReset={() => { setViewAsRole(null); navigate('/'); }}
          />
          <TenantSwitcher
            selectedId={selectedTenantId}
            onChange={(id, tenantTheme, slug) => {
              setSelectedTenantId(id);
              queryClient.clear();
              if (tenantTheme) {
                applyTenantTheme(tenantTheme, slug);
              } else if (tenant) {
                applyTenantTheme(tenant);
              }
            }}
          />
          {(viewAsRole === 'corp_admin' || viewAsRole === 'site_admin') && (
            <OperatorSwitcher
              selectedName={selectedOperator}
              onChange={setSelectedOperator}
              tenantId={selectedTenantId}
            />
          )}
          {viewAsRole === 'site_admin' && selectedOperator && (
            <BuildingSwitcher
              selectedId={selectedBuildingId}
              operatorName={selectedOperator}
              onChange={setSelectedBuildingId}
            />
          )}
        </div>
      )}

      {/* Nav — numbered items */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pt-2">
        {visibleEntries.map((entry, i) => {
          const isActive = i === activeIdx;
          const isExpanded = expandedIdx === i || (expandedIdx === null && isActive);
          const num = String(i + 1).padStart(2, '0');
          const hasChildren = entry.children && entry.children.length > 0;

          const handleClick = () => {
            if (hasChildren) {
              setExpandedIdx(isExpanded ? null : i);
            } else if (entry.to) {
              navigate(entry.to);
            }
          };

          return (
            <div key={entry.basePath}>
              <button
                type="button"
                onClick={handleClick}
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
                <span className="flex-1 text-[13px] font-medium leading-tight">
                  {entry.label}
                </span>
                {hasChildren && (
                  <svg
                    className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 5l3 3 3-3" />
                  </svg>
                )}
              </button>

              {/* Sub-items */}
              {hasChildren && isExpanded && (
                <div className="ml-5 mt-1 space-y-0.5 border-l border-pa-border pl-4">
                  {entry.children!.filter((sub) => {
                    if (sub.superAdminOnly && !isSuperAdmin) return false;
                    if (sub.requiresTenant && isSuperAdmin && !selectedTenantId) return false;
                    return true;
                  }).map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      end={sub.end}
                      className={({ isActive: subActive }) =>
                        `flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-all ${
                          subActive
                            ? 'bg-white text-pa-blue font-semibold ring-1 ring-pa-blue/30 shadow-sm'
                            : 'text-pa-text-muted hover:bg-gray-100 hover:text-pa-text'
                        }`
                      }
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer — soporte toggle + cerrar sesión */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => setContactOpen((o) => !o)}
          className="flex w-full items-center gap-2 text-[13px] font-semibold text-pa-navy transition-colors hover:text-pa-blue"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Soporte y Contacto
          <svg className={`ml-auto h-3 w-3 transition-transform ${contactOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>
        <div
          className="grid transition-all duration-200 ease-in-out"
          style={{ gridTemplateRows: contactOpen ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="mt-2 space-y-0.5">
              <p className="text-[13px] font-medium text-pa-navy">Globe Power</p>
              <a href="mailto:atencion@globepower.cl" className="block truncate text-[13px] text-pa-text-muted hover:text-pa-blue">atencion@globepower.cl</a>
              <a href="tel:+56227810274" className="block text-[13px] text-pa-text-muted hover:text-pa-blue">227810274</a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-pa-border px-4 py-3">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 text-[12px] font-medium text-pa-text-muted transition-colors hover:text-pa-coral"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

/* ── Role Switcher (custom dropdown) ── */
function RoleSwitcher({
  value,
  onChange,
  isImpersonating,
  onReset,
}: Readonly<{
  value: string;
  onChange: (slug: RoleSlug) => void;
  isImpersonating: boolean;
  onReset: () => void;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const currentLabel = VIEW_AS_LABELS[value] ?? value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors ${
          isImpersonating
            ? 'border-2 border-pa-coral bg-pa-coral/10 text-pa-coral'
            : 'border border-pa-border bg-white text-pa-navy'
        }`}
      >
        <span className="truncate">Vista: {currentLabel}</span>
        <svg
          className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-pa-border bg-white shadow-lg">
          {VIEW_AS_ROLES.map((slug) => (
            <li key={slug}>
              <button
                type="button"
                onClick={() => { onChange(slug); setOpen(false); }}
                className={`flex w-full px-3 py-2 text-left text-[11px] transition-colors hover:bg-gray-100 ${
                  value === slug ? 'font-semibold text-pa-blue' : 'text-pa-text'
                }`}
              >
                {VIEW_AS_LABELS[slug]}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isImpersonating && (
        <button
          type="button"
          onClick={onReset}
          className="mt-1 w-full rounded-md bg-pa-coral px-2 py-1 text-[10px] font-medium text-white hover:bg-pa-coral/90"
        >
          Volver a Super Admin
        </button>
      )}
    </div>
  );
}

/* ── Tenant Switcher (company selector with search) ── */

const TENANT_PAGE_SIZE = 10;

function TenantSwitcher({
  selectedId,
  onChange,
}: Readonly<{
  selectedId: string | null;
  onChange: (id: string | null, theme: TenantTheme | null, slug?: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tenantsQuery = useTenantsAdminQuery();
  const allTenants = tenantsQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const matched = q ? allTenants.filter((t) => t.name.toLowerCase().includes(q)) : allTenants;
    return matched.slice(0, TENANT_PAGE_SIZE);
  }, [allTenants, search]);

  const selectedName = selectedId
    ? allTenants.find((t) => t.id === selectedId)?.name ?? 'Empresa'
    : 'Todas las empresas';

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  useEffect(() => {
    if (open) { setSearch(''); inputRef.current?.focus(); }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-colors ${
          selectedId
            ? 'border-pa-blue bg-pa-blue/10 text-pa-blue'
            : 'border-pa-border bg-white text-pa-navy'
        }`}
      >
        <span className="truncate">{selectedName}</span>
        <svg
          className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-pa-border bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empresa..."
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] outline-none focus:border-gray-300"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {/* "All" option */}
            <li>
              <button
                type="button"
                onClick={() => { onChange(null, null); setOpen(false); }}
                className={`flex w-full px-3 py-2 text-left text-[11px] transition-colors hover:bg-gray-100 ${
                  !selectedId ? 'font-semibold text-pa-blue' : 'text-pa-text'
                }`}
              >
                Todas las empresas
              </button>
            </li>

            {filtered.map((t: Tenant) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(t.id, {
                      primaryColor: t.primaryColor,
                      secondaryColor: t.secondaryColor,
                      sidebarColor: t.sidebarColor,
                      accentColor: t.accentColor,
                      appTitle: t.appTitle,
                      logoUrl: t.logoUrl,
                      faviconUrl: t.faviconUrl,
                    }, t.slug);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[11px] transition-colors hover:bg-gray-100 ${
                    selectedId === t.id ? 'font-semibold text-pa-blue' : 'text-pa-text'
                  }`}
                >
                  <span className="truncate">{t.name}</span>
                  {!t.isActive && (
                    <span className="ml-1 shrink-0 rounded bg-gray-100 px-1 py-0.5 text-[9px] text-gray-500">
                      Inactiva
                    </span>
                  )}
                </button>
              </li>
            ))}

            {filtered.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-gray-400">Sin resultados</li>
            )}

            {allTenants.length > TENANT_PAGE_SIZE && !search && (
              <li className="border-t border-gray-100 px-3 py-1.5 text-[10px] text-gray-400">
                Mostrando {TENANT_PAGE_SIZE} de {allTenants.length} — usa el buscador
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Operator Switcher (store/brand selector for Multi Operador) ── */

const OPERATOR_PAGE_SIZE = 10;

function OperatorSwitcher({
  selectedName,
  onChange,
  tenantId,
}: Readonly<{
  selectedName: string | null;
  onChange: (name: string | null) => void;
  tenantId: string | null;
}>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const metersQuery = useMetersQuery();
  const buildingsQuery = useBuildingsQuery();
  const allMeters = metersQuery.data ?? [];
  const allBuildings = buildingsQuery.data ?? [];

  // Building IDs that belong to the selected tenant
  const tenantBuildingIds = useMemo(() => {
    if (!tenantId) return null;
    const ids = new Set<string>();
    for (const b of allBuildings) {
      if (b.tenantId === tenantId) ids.add(b.id);
    }
    return ids;
  }, [tenantId, allBuildings]);

  // Distinct store/brand names, filtered by tenant
  const operators = useMemo(() => {
    const names = new Set<string>();
    for (const m of allMeters) {
      if (m.name && (!tenantBuildingIds || tenantBuildingIds.has(m.buildingId))) {
        names.add(m.name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allMeters, tenantBuildingIds]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const matched = q ? operators.filter((n) => n.toLowerCase().includes(q)) : operators;
    return matched.slice(0, OPERATOR_PAGE_SIZE);
  }, [operators, search]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  useEffect(() => {
    if (open) { setSearch(''); inputRef.current?.focus(); }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-colors ${
          selectedName
            ? 'border-amber-400 bg-amber-50 text-amber-800'
            : 'border-pa-border bg-white text-pa-navy'
        }`}
      >
        <span className="truncate">{selectedName ?? 'Seleccionar tienda'}</span>
        <svg
          className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-pa-border bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tienda..."
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] outline-none focus:border-gray-300"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); }}
                  className={`flex w-full px-3 py-2 text-left text-[11px] transition-colors hover:bg-gray-100 ${
                    selectedName === name ? 'font-semibold text-pa-blue' : 'text-pa-text'
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}

            {filtered.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-gray-400">Sin resultados</li>
            )}

            {operators.length > OPERATOR_PAGE_SIZE && !search && (
              <li className="border-t border-gray-100 px-3 py-1.5 text-[10px] text-gray-400">
                Mostrando {OPERATOR_PAGE_SIZE} de {operators.length} — usa el buscador
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Building Switcher (for Operador: buildings where operator has meters) ── */

function BuildingSwitcher({
  selectedId,
  operatorName,
  onChange,
}: Readonly<{
  selectedId: string | null;
  operatorName: string;
  onChange: (id: string | null) => void;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const metersQuery = useMetersQuery();
  const buildingsQuery = useBuildingsQuery();
  const allMeters = metersQuery.data ?? [];
  const allBuildings = buildingsQuery.data ?? [];

  const operatorBuildingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of allMeters) {
      if (m.name === operatorName) ids.add(m.buildingId);
    }
    return ids;
  }, [allMeters, operatorName]);

  const buildings = useMemo(
    () => allBuildings.filter((b) => operatorBuildingIds.has(b.id)),
    [allBuildings, operatorBuildingIds],
  );

  const selectedName = selectedId
    ? buildings.find((b) => b.id === selectedId)?.name ?? 'Edificio'
    : 'Seleccionar edificio';

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-colors ${
          selectedId
            ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
            : 'border-pa-border bg-white text-pa-navy'
        }`}
      >
        <span className="truncate">{selectedName}</span>
        <svg
          className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-pa-border bg-white py-1 shadow-lg">
          {buildings.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => { onChange(b.id); setOpen(false); }}
                className={`flex w-full px-3 py-2 text-left text-[11px] transition-colors hover:bg-gray-100 ${
                  selectedId === b.id ? 'font-semibold text-pa-blue' : 'text-pa-text'
                }`}
              >
                {b.name}
              </button>
            </li>
          ))}
          {buildings.length === 0 && (
            <li className="px-3 py-2 text-[11px] text-gray-400">Sin edificios para esta tienda</li>
          )}
        </ul>
      )}
    </div>
  );
}
