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
import { NavModuleIcon, type NavModuleIconName } from './sidebar-icons';
import { SidebarFlyout } from './SidebarFlyout';
import { SidebarCollapsible, SidebarDropdownPanel, SidebarReveal } from './sidebar-motion';
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
  /** Hide when a tenant IS selected (e.g. Platform dashboard) */
  hideWithTenant?: boolean;
}

interface NavEntry {
  label: string;
  icon: NavModuleIconName;
  /** Direct route (no children) */
  to?: string;
  /** Base path for active detection */
  basePath: string;
  /** Additional paths that also highlight this entry */
  extraPaths?: string[];
  requiredPerms: string[];
  children?: SubItem[];
}

type SidebarFlyoutId = number | 'admin' | 'support';

/**
 * Returns shared nav button classes for expanded or icon-rail mode.
 * @param active - Whether the nav item is active
 * @param expanded - Whether the sidebar is expanded
 */
function navItemClass(active: boolean, expanded: boolean): string {
  return `flex w-full items-center rounded-lg transition-all duration-300 ease-in-out motion-reduce:transition-none ${
    expanded ? 'gap-2.5 px-3 py-2 text-left text-[13px]' : 'justify-center gap-0 px-2.5 py-2.5'
  } ${
    active
      ? 'bg-surface font-medium text-foreground'
      : 'text-muted hover:bg-surface hover:text-foreground'
  }`;
}

const NAV_ENTRIES: NavEntry[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    basePath: '/dashboard',
    requiredPerms: ['dashboard_executive:read', 'dashboard_technical:read'],
    children: [
      { to: '/', label: 'General', end: true, requiresTenant: true },
      { to: APP_ROUTES.platform, label: 'Plataforma', superAdminOnly: true, hideWithTenant: true },
      { to: APP_ROUTES.executive, label: 'Ejecutivo', requiresTenant: true },
      { to: APP_ROUTES.compare, label: 'Comparativo', requiresTenant: true },
    ],
  },
  {
    label: 'Monitoreo',
    icon: 'monitoring',
    basePath: '/monitoring',
    extraPaths: ['/buildings', '/meters', '/map'],
    requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'],
    children: [
      { to: '/meters', label: 'Medidores' },
      { to: '/buildings', label: 'Edificios' },
      { to: '/map', label: 'Mapa' },
    ],
  },
  {
    label: 'Alertas',
    icon: 'alerts',
    basePath: '/alerts',
    requiredPerms: ['alerts:read'],
    children: [
      { to: '/alerts', label: 'Alertas', end: true },
      { to: '/alerts/history', label: 'Historial / SLA' },
    ],
  },
  {
    label: 'Facturación',
    icon: 'billing',
    basePath: '/billing',
    requiredPerms: ['billing:read', 'billing:view_own'],
    children: [
      { to: '/billing', label: 'Facturas', end: true },
      { to: '/billing/rates', label: 'Tarifas' },
    ],
  },
  {
    label: 'Reportes y Analítica',
    icon: 'analytics',
    basePath: '/reports',
    extraPaths: ['/analytics'],
    requiredPerms: ['reports:read', 'reports:view_own', 'dashboard_executive:read'],
    children: [
      { to: '/reports', label: 'Reportes', end: true },
      { to: '/analytics/benchmark', label: 'Benchmarking' },
      { to: '/analytics/trends', label: 'Tendencias' },
      { to: '/analytics/patterns', label: 'Patrones' },
    ],
  },
  {
    label: 'Integraciones',
    icon: 'integrations',
    to: APP_ROUTES.integrations,
    basePath: '/integrations',
    requiredPerms: ['integrations:read'],
  },
  {
    label: 'Administración',
    icon: 'admin',
    basePath: '/admin',
    requiredPerms: ['admin_users:read'],
    children: [
      { to: '/admin/companies', label: 'Empresas', superAdminOnly: true },
      { to: '/admin/users', label: 'Usuarios' },
      { to: '/admin/tenants', label: 'Locatarios' },
      { to: '/admin/hierarchy', label: 'Jerarquía' },
      { to: '/admin/roles', label: 'Roles' },
      { to: '/admin/api-keys', label: 'API Keys' },
      { to: '/admin/oauth-clients', label: 'OAuth Clients' },
      { to: '/admin/data-quality', label: 'Calidad de Datos' },
      { to: '/admin/register-mappings', label: 'Mapeos Registros' },
      { to: '/admin/regions', label: 'Regiones' },
      { to: '/admin/breach-reports', label: 'Brechas Seguridad' },
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
  const [flyout, setFlyout] = useState<SidebarFlyoutId | null>(null);

  const expanded = sidebarOpen;

  const visibleEntries = NAV_ENTRIES.filter((e) => hasAny(...e.requiredPerms));

  const activeIdx = visibleEntries.findIndex((e) => {
    if (e.basePath === '/dashboard') {
      return location.pathname === '/' || location.pathname.startsWith('/dashboard');
    }
    if (location.pathname.startsWith(e.basePath)) return true;
    return e.extraPaths?.some((p) => location.pathname.startsWith(p)) ?? false;
  });

  useEffect(() => {
    if (expanded) setFlyout(null);
  }, [expanded]);

  useEffect(() => {
    setFlyout(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!expanded) {
      setExpandedIdx(null);
      const timer = window.setTimeout(() => setContactOpen(false), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [expanded]);

  const filterSubItems = (entry: NavEntry): SubItem[] =>
    (entry.children ?? []).filter((sub) => {
      if (sub.superAdminOnly && !isSuperAdmin) return false;
      if (sub.requiresTenant && isSuperAdmin && !selectedTenantId) return false;
      if (sub.hideWithTenant && selectedTenantId) return false;
      return true;
    });

  const subLinkClass = (subActive: boolean): string =>
    `block rounded-md px-2.5 py-1.5 text-[12px] transition-all duration-200 ease-in-out motion-reduce:transition-none ${
      subActive
        ? 'bg-raised font-medium text-foreground'
        : 'text-muted hover:bg-surface hover:text-foreground'
    }`;

  const adminSwitchers = (
    <>
      <RoleSwitcher
        value={viewAsRole ?? 'super_admin'}
        onChange={(val) => { setViewAsRole(val === 'super_admin' ? null : val); navigate('/'); }}
        isImpersonating={isImpersonating}
        onReset={() => { setViewAsRole(null); navigate('/'); }}
      />
      <TenantSwitcher
        selectedId={selectedTenantId}
        excludeOwnerTenant
        onChange={(id, tenantTheme) => {
          setSelectedTenantId(id);
          queryClient.clear();
          if (tenantTheme) {
            applyTenantTheme(tenantTheme);
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
    </>
  );

  return (
    <aside
      className={`relative flex h-full min-h-0 shrink-0 flex-col overflow-visible border-r border-border bg-background transition-[width] duration-300 ease-in-out motion-reduce:transition-none ${
        expanded ? 'w-60' : 'w-14'
      }`}
    >
      {/* Logo / expand */}
      <div
        className={`flex shrink-0 items-center border-b border-border transition-all duration-300 ease-in-out motion-reduce:transition-none ${
          expanded ? 'px-4 py-4' : 'justify-center px-2 py-3'
        }`}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          title={expanded ? 'Colapsar menú' : 'Expandir menú'}
          className={`flex items-center transition-all duration-300 ease-in-out ${expanded ? 'gap-2.5' : 'justify-center'}`}
        >
          <img
            src={tenant?.logoUrl ?? globeLogo}
            alt="Globe Power"
            className={`object-contain transition-all duration-300 ease-in-out motion-reduce:transition-none ${
              expanded ? 'h-8 w-auto' : 'h-7 w-7'
            }`}
          />
        </button>
      </div>

      {/* Admin switchers — crossfade expanded inline vs collapsed flyout trigger */}
      {isSuperAdmin && (
        <div className="relative z-30 shrink-0 overflow-visible border-b border-border">
          <SidebarCollapsible open={expanded}>
            <div className="space-y-2 px-3 py-3">{adminSwitchers}</div>
          </SidebarCollapsible>
          <SidebarCollapsible open={!expanded}>
            <div className="relative px-2 py-2">
              <button
                type="button"
                title="Filtros de administración"
                onClick={() => setFlyout(flyout === 'admin' ? null : 'admin')}
                className={navItemClass(flyout === 'admin' || isImpersonating || selectedTenantId !== null, false)}
              >
                <NavModuleIcon name="filters" />
              </button>
              <SidebarFlyout
                open={flyout === 'admin'}
                onClose={() => setFlyout(null)}
                title="Administración"
                className="w-56"
              >
                <div className="space-y-2 p-2">{adminSwitchers}</div>
              </SidebarFlyout>
            </div>
          </SidebarCollapsible>
        </div>
      )}

      {/* Nav */}
      <nav
        className={`min-h-0 flex-1 space-y-0.5 overflow-y-auto py-3 transition-[padding] duration-300 ease-in-out motion-reduce:transition-none ${
          expanded ? 'px-2' : 'px-1.5'
        }`}
      >
        {visibleEntries.map((entry, i) => {
          const isActive = i === activeIdx;
          const isExpanded = expandedIdx === i || (expandedIdx === null && isActive);
          const hasChildren = (entry.children?.length ?? 0) > 0;
          const visibleSubs = filterSubItems(entry);

          const handleClick = (): void => {
            if (!expanded) {
              if (hasChildren) {
                setFlyout(flyout === i ? null : i);
              } else if (entry.to) {
                navigate(entry.to);
              }
              return;
            }
            if (hasChildren) {
              setExpandedIdx(isExpanded ? null : i);
            } else if (entry.to) {
              navigate(entry.to);
            }
          };

          return (
            <div key={entry.basePath} className="relative">
              <button
                type="button"
                onClick={handleClick}
                title={expanded ? undefined : entry.label}
                className={navItemClass(isActive, expanded)}
              >
                <NavModuleIcon name={entry.icon} />
                <SidebarReveal show={expanded}>
                  <span className="min-w-0 flex-1 truncate leading-tight">{entry.label}</span>
                  {hasChildren && (
                    <svg
                      className={`ml-1 h-3.5 w-3.5 shrink-0 text-subtle transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 5l3 3 3-3" />
                    </svg>
                  )}
                </SidebarReveal>
              </button>

              {/* Expanded sub-items */}
              {expanded && hasChildren && (
                <SidebarCollapsible open={isExpanded}>
                  <div className="ml-2 mt-0.5 space-y-0.5 border-l border-border py-1 pl-3">
                    {visibleSubs.map((sub) => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        end={sub.end}
                        className={({ isActive: subActive }) => subLinkClass(subActive)}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                </SidebarCollapsible>
              )}

              {/* Collapsed flyout sub-items */}
              {!expanded && hasChildren && (
                <SidebarFlyout
                  open={flyout === i}
                  onClose={() => setFlyout(null)}
                  title={entry.label}
                >
                  {visibleSubs.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      end={sub.end}
                      onClick={() => setFlyout(null)}
                      className={({ isActive: subActive }) => subLinkClass(subActive)}
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </SidebarFlyout>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={`shrink-0 border-t border-border transition-[padding] duration-300 ease-in-out motion-reduce:transition-none ${
          expanded ? 'px-3 py-3' : 'px-1.5 py-2'
        }`}
      >
        <div className="relative">
          <button
            type="button"
            title="Soporte y contacto"
            onClick={() => {
              if (expanded) {
                setContactOpen((o) => !o);
              } else {
                setFlyout(flyout === 'support' ? null : 'support');
              }
            }}
            className={`${navItemClass(contactOpen || flyout === 'support', expanded)} w-full`}
          >
            <NavModuleIcon name="support" className="h-[18px] w-[18px] shrink-0" />
            <SidebarReveal show={expanded}>
              <span className="flex-1 text-left">Soporte y Contacto</span>
              <svg
                className={`h-3 w-3 shrink-0 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
                  contactOpen ? 'rotate-180' : ''
                }`}
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 5l3 3 3-3" />
              </svg>
            </SidebarReveal>
          </button>
          {!expanded && (
            <SidebarFlyout
              open={flyout === 'support'}
              onClose={() => setFlyout(null)}
              title="Soporte"
              className="w-56"
            >
              <div className="space-y-1 p-2 text-[13px]">
                <p className="font-medium text-foreground">Globe Power</p>
                <a href="mailto:atencion@globepower.cl" className="block truncate text-muted hover:text-brand">
                  atencion@globepower.cl
                </a>
                <a href="tel:+56227810274" className="block text-muted hover:text-brand">
                  227810274
                </a>
              </div>
            </SidebarFlyout>
          )}
        </div>
        <SidebarCollapsible open={expanded && contactOpen}>
          <div className="mt-2 space-y-0.5">
            <p className="text-[13px] font-medium text-foreground">Globe Power</p>
            <a href="mailto:atencion@globepower.cl" className="block truncate text-[13px] text-muted transition-colors hover:text-brand">
              atencion@globepower.cl
            </a>
            <a href="tel:+56227810274" className="block text-[13px] text-muted transition-colors hover:text-brand">
              227810274
            </a>
          </div>
        </SidebarCollapsible>
      </div>

      <div
        className={`shrink-0 border-t border-border transition-[padding] duration-300 ease-in-out motion-reduce:transition-none ${
          expanded ? 'px-3 py-3' : 'px-1.5 py-2'
        }`}
      >
        <button
          type="button"
          onClick={logout}
          title="Cerrar sesión"
          className={navItemClass(false, expanded)}
        >
          <NavModuleIcon name="logout" className="h-[18px] w-[18px] shrink-0" />
          <SidebarReveal show={expanded}>
            <span className="flex-1 text-left text-[12px]">Cerrar Sesión</span>
          </SidebarReveal>
        </button>
        <SidebarCollapsible open={expanded}>
          <button
            type="button"
            onClick={toggleSidebar}
            className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-muted transition-all duration-300 ease-in-out hover:bg-surface hover:text-foreground motion-reduce:transition-none"
          >
            <NavModuleIcon name="panel-left" className="h-[18px] w-[18px] shrink-0" />
            Colapsar
          </button>
        </SidebarCollapsible>
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
        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-all duration-200 ease-in-out motion-reduce:transition-none ${
          isImpersonating
            ? 'border-danger bg-danger/10 text-danger'
            : 'border-border bg-surface text-foreground'
        }`}
      >
        <span className="truncate">Vista: {currentLabel}</span>
        <svg
          className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      <SidebarDropdownPanel open={open}>
        <ul>
          {VIEW_AS_ROLES.map((slug) => (
            <li key={slug}>
              <button
                type="button"
                onClick={() => { onChange(slug); setOpen(false); }}
                className={`flex w-full px-3 py-2 text-left text-[11px] transition-colors duration-200 hover:bg-surface ${
                  value === slug ? 'font-semibold text-brand' : 'text-foreground'
                }`}
              >
                {VIEW_AS_LABELS[slug]}
              </button>
            </li>
          ))}
        </ul>
      </SidebarDropdownPanel>

      {isImpersonating && (
        <button
          type="button"
          onClick={onReset}
          className="mt-1 w-full rounded-md bg-danger px-2 py-1 text-[10px] font-medium text-brand-fg hover:bg-danger/90"
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
  excludeOwnerTenant,
  onChange,
}: Readonly<{
  selectedId: string | null;
  excludeOwnerTenant?: boolean;
  onChange: (id: string | null, theme: TenantTheme | null) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tenantsQuery = useTenantsAdminQuery();
  const allTenants = useMemo(() => {
    const list = tenantsQuery.data ?? [];
    // Globe Power is the platform owner, not a selectable tenant
    return excludeOwnerTenant ? list.filter((t) => t.slug !== 'globe-power') : list;
  }, [tenantsQuery.data, excludeOwnerTenant]);

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
        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-all duration-200 ease-in-out motion-reduce:transition-none ${
          selectedId
            ? 'border-border bg-raised text-foreground'
            : 'border-border bg-surface text-foreground'
        }`}
      >
        <span className="truncate">{selectedName}</span>
        <svg
          className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      <SidebarDropdownPanel open={open}>
        <div>
          {/* Search input */}
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empresa..."
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none transition-colors focus:border-brand"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {/* "All" option */}
            <li>
              <button
                type="button"
                onClick={() => { onChange(null, null); setOpen(false); }}
                className={`flex w-full px-3 py-2 text-left text-[11px] transition-colors hover:bg-surface ${
                  !selectedId ? 'font-semibold text-brand' : 'text-foreground'
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
                    });
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[11px] transition-colors hover:bg-surface ${
                    selectedId === t.id ? 'font-semibold text-brand' : 'text-foreground'
                  }`}
                >
                  <span className="truncate">{t.name}</span>
                  {!t.isActive && (
                    <span className="ml-1 shrink-0 rounded bg-surface px-1 py-0.5 text-[9px] text-muted">
                      Inactiva
                    </span>
                  )}
                </button>
              </li>
            ))}

            {tenantsQuery.isLoading && (
              <li className="px-3 py-2 text-[11px] text-subtle">Cargando empresas...</li>
            )}

            {tenantsQuery.isError && (
              <li className="px-3 py-2 text-[11px] text-red-600">
                No se pudieron cargar las empresas. Recarga la sesión.
              </li>
            )}

            {!tenantsQuery.isLoading && !tenantsQuery.isError && allTenants.length === 0 && !search && (
              <li className="px-3 py-2 text-[11px] leading-relaxed text-subtle">
                No hay empresas cliente. Globe Power es el dueño de plataforma y no aparece aquí.
                Crea una en Admin → Empresas.
              </li>
            )}

            {!tenantsQuery.isLoading && !tenantsQuery.isError && filtered.length === 0 && (search || allTenants.length > 0) && (
              <li className="px-3 py-2 text-[11px] text-subtle">Sin resultados</li>
            )}

            {allTenants.length > TENANT_PAGE_SIZE && !search && (
              <li className="border-t border-border px-3 py-1.5 text-[10px] text-subtle">
                Mostrando {TENANT_PAGE_SIZE} de {allTenants.length} — usa el buscador
              </li>
            )}
          </ul>
        </div>
      </SidebarDropdownPanel>
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
        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-all duration-200 ease-in-out motion-reduce:transition-none ${
          selectedName
            ? 'border-border bg-raised text-foreground'
            : 'border-border bg-surface text-foreground'
        }`}
      >
        <span className="truncate">{selectedName ?? 'Seleccionar tienda'}</span>
        <svg
          className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      <SidebarDropdownPanel open={open}>
        <div>
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tienda..."
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none transition-colors focus:border-brand"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); }}
                  className={`flex w-full px-3 py-2 text-left text-[11px] transition-colors hover:bg-surface ${
                    selectedName === name ? 'font-semibold text-brand' : 'text-foreground'
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}

            {filtered.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-subtle">Sin resultados</li>
            )}

            {operators.length > OPERATOR_PAGE_SIZE && !search && (
              <li className="border-t border-border px-3 py-1.5 text-[10px] text-subtle">
                Mostrando {OPERATOR_PAGE_SIZE} de {operators.length} — usa el buscador
              </li>
            )}
          </ul>
        </div>
      </SidebarDropdownPanel>
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
        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-all duration-200 ease-in-out motion-reduce:transition-none ${
          selectedId
            ? 'border-border bg-raised text-foreground'
            : 'border-border bg-surface text-foreground'
        }`}
      >
        <span className="truncate">{selectedName}</span>
        <svg
          className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      <SidebarDropdownPanel open={open}>
        <ul className="py-1">
          {buildings.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => { onChange(b.id); setOpen(false); }}
                className={`flex w-full px-3 py-2 text-left text-[11px] transition-colors duration-200 hover:bg-surface ${
                  selectedId === b.id ? 'font-semibold text-brand' : 'text-foreground'
                }`}
              >
                {b.name}
              </button>
            </li>
          ))}
          {buildings.length === 0 && (
            <li className="px-3 py-2 text-[11px] text-subtle">Sin edificios para esta tienda</li>
          )}
        </ul>
      </SidebarDropdownPanel>
    </div>
  );
}
