import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore, VIEW_AS_LABELS } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useTenantsAdminQuery } from '../../hooks/queries/useTenantsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { applyTenantTheme } from '../../lib/tenant-theme';
import { getVisibleNav, findActiveEntry } from '../../lib/unified-nav';
import { ROLE_TO_PROFILE, PROFILE_LANDING } from '../../lib/profiles';
import type { RoleSlug, TenantTheme } from '../../types/auth';
import type { Tenant } from '../../types/tenant';

const VIEW_AS_ROLES: RoleSlug[] = ['super_admin', 'corp_admin', 'site_admin', 'operator', 'auditor'];

/** Permission sets per role — used only for "view as" route accessibility check */
const ROLE_PERM_SETS: Record<string, Set<string>> = {
  super_admin: new Set(['*']),
  corp_admin: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'admin_buildings:read', 'admin_meters:read',
    'alerts:read', 'billing:read', 'reports:read', 'reports:view_own',
    'integrations:read',
  ]),
  site_admin: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'admin_buildings:read', 'admin_meters:read',
    'alerts:read', 'alerts:update', 'billing:read', 'billing:update',
    'admin_users:read', 'admin_tenants_units:read', 'admin_hierarchy:read',
    'reports:read', 'data_quality:read', 'readings:read',
    'diagnostics:read', 'monitoring_faults:read',
  ]),
  operator: new Set([
    'dashboard_technical:read', 'readings:read',
    'diagnostics:read', 'admin_meters:read',
    'alerts:read', 'alerts:update', 'monitoring_faults:read',
  ]),
  auditor: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'audit:read', 'reports:read',
    'admin_buildings:read', 'admin_meters:read',
  ]),
};

function makeHasAnyForRole(role: string): (...perms: string[]) => boolean {
  const set = ROLE_PERM_SETS[role] ?? new Set<string>();
  return (...perms) => set.has('*') || perms.some((p) => set.has(p));
}

export function AdminSwitchers() {
  const { viewAsRole, setViewAsRole, selectedTenantId, setSelectedTenantId, selectedOperator, setSelectedOperator, selectedBuildingId, setSelectedBuildingId } = useAppStore();
  const { tenant } = useAuthStore();
  const { isSuperAdmin, isImpersonating } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!isSuperAdmin) return null;

  return (
    <div className="flex items-center gap-2">
      <RoleSwitcher
        value={viewAsRole ?? 'super_admin'}
        onChange={(val) => {
          const role = val === 'super_admin' ? null : val;
          setViewAsRole(role);
          const effectiveRole = role ?? 'super_admin';
          const visibleNav = getVisibleNav(makeHasAnyForRole(effectiveRole), !!selectedTenantId);
          const accessible = findActiveEntry(visibleNav, location.pathname) !== null;
          if (!accessible) {
            const profile = role ? ROLE_TO_PROFILE[role] ?? 'operacional' : 'super_admin';
            navigate(PROFILE_LANDING[profile] ?? '/');
          }
        }}
        isImpersonating={isImpersonating}
        onReset={() => {
          setViewAsRole(null);
          const visibleNav = getVisibleNav(makeHasAnyForRole('super_admin'), !!selectedTenantId);
          const accessible = findActiveEntry(visibleNav, location.pathname) !== null;
          if (!accessible) navigate(PROFILE_LANDING.super_admin);
        }}
      />
      <TenantSwitcher
        selectedId={selectedTenantId}
        onChange={(id, tenantTheme) => {
          setSelectedTenantId(id);
          queryClient.invalidateQueries({ predicate: (q) => {
            const key = q.queryKey[0];
            return typeof key === 'string' && !['user', 'session', 'auth'].includes(key);
          }});
          const theme = tenantTheme ?? (tenant || undefined);
          theme && applyTenantTheme(theme);
          if (id) {
            if (viewAsRole && viewAsRole !== 'super_admin') {
              const platformPaths = ['/dashboard/platform', '/admin/observabilidad', '/admin/config-releases', '/admin/tenants-malls', '/admin/iot-devices'];
              const onPlatformRoute = platformPaths.some((p) => location.pathname.startsWith(p));
              if (onPlatformRoute) {
                const profile = ROLE_TO_PROFILE[viewAsRole] ?? 'operacional';
                navigate(PROFILE_LANDING[profile] ?? '/');
              }
            }
          } else if (viewAsRole && viewAsRole !== 'super_admin') {
            navigate('/dashboard/platform');
          }
        }}
      />
      {(viewAsRole === 'corp_admin' || viewAsRole === 'site_admin') && (
        <>
          <BuildingSwitcher
            selectedId={selectedBuildingId}
            onChange={setSelectedBuildingId}
          />
          <OperatorSwitcher
            selectedName={selectedOperator}
            onChange={setSelectedOperator}
            buildingId={selectedBuildingId}
          />
        </>
      )}
    </div>
  );
}

/* ── Shared dropdown wrapper ── */

function HeaderDropdown({
  label,
  children,
  open,
  onToggle,
  highlighted,
}: Readonly<{
  label: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  highlighted?: boolean;
}>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          highlighted
            ? 'border-danger bg-danger/10 text-danger'
            : 'border-border bg-surface text-foreground hover:bg-raised'
        }`}
      >
        <span className="whitespace-nowrap">{label}</span>
        <svg
          className={`h-3 w-3 shrink-0 opacity-50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      <div
        className={`absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-border bg-background shadow-lg transition-all duration-200 ease-out origin-top ${
          open
            ? 'scale-y-100 opacity-100'
            : 'pointer-events-none scale-y-95 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Role Switcher ── */

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
  const currentLabel = VIEW_AS_LABELS[value] ?? value;

  return (
    <div className="flex items-center gap-1">
      <HeaderDropdown
        label={`Vista: ${currentLabel}`}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        highlighted={isImpersonating}
      >
        <ul className="py-1">
          {VIEW_AS_ROLES.map((slug) => (
            <li key={slug}>
              <button
                type="button"
                onClick={() => { onChange(slug); setOpen(false); }}
                className={`flex w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                  value === slug ? 'font-semibold text-foreground' : 'text-foreground'
                }`}
              >
                {VIEW_AS_LABELS[slug]}
              </button>
            </li>
          ))}
        </ul>
      </HeaderDropdown>
      {isImpersonating && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-md bg-danger px-2 py-1 text-xs font-medium text-brand-fg hover:bg-danger/90"
        >
          Reset
        </button>
      )}
    </div>
  );
}

/* ── Tenant Switcher ── */

const TENANT_PAGE_SIZE = 10;

function TenantSwitcher({
  selectedId,
  onChange,
}: Readonly<{
  selectedId: string | null;
  onChange: (id: string | null, theme: TenantTheme | null) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tenantsQuery = useTenantsAdminQuery();
  const allTenants = tenantsQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const matched = q ? allTenants.filter((t: Tenant) => t.name.toLowerCase().includes(q)) : allTenants;
    return matched.slice(0, TENANT_PAGE_SIZE);
  }, [allTenants, search]);

  const selectedName = selectedId
    ? allTenants.find((t: Tenant) => t.id === selectedId)?.name ?? 'Empresa'
    : 'Todas las empresas';

  useEffect(() => {
    open && (setSearch(''), inputRef.current?.focus());
  }, [open]);

  return (
    <HeaderDropdown
      label={selectedName}
      open={open}
      onToggle={() => setOpen((o) => !o)}
    >
      <div>
        <div className="border-b border-border p-2">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa..."
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-foreground"
          />
        </div>
        <ul className="max-h-48 overflow-y-auto py-1">
          <li>
            <button
              type="button"
              onClick={() => { onChange(null, null); setOpen(false); }}
              className={`flex w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                !selectedId ? 'font-semibold text-foreground' : 'text-foreground'
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
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                  selectedId === t.id ? 'font-semibold text-foreground' : 'text-foreground'
                }`}
              >
                <span className="truncate">{t.name}</span>
                {!t.isActive && (
                  <span className="ml-1 shrink-0 rounded bg-surface px-1 py-0.5 text-xs text-muted">Inactiva</span>
                )}
              </button>
            </li>
          ))}
          {tenantsQuery.isLoading && <li className="px-3 py-2 text-xs text-subtle">Cargando...</li>}
          {filtered.length === 0 && !tenantsQuery.isLoading && (
            <li className="px-3 py-2 text-xs text-subtle">Sin resultados</li>
          )}
        </ul>
      </div>
    </HeaderDropdown>
  );
}

/* ── Building Switcher ── */

function BuildingSwitcher({
  selectedId,
  onChange,
}: Readonly<{
  selectedId: string | null;
  onChange: (id: string | null) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const buildingsQuery = useBuildingsQuery();
  const allBuildings = buildingsQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const matched = q ? allBuildings.filter((b) => b.name.toLowerCase().includes(q)) : allBuildings;
    return matched.slice(0, 10);
  }, [allBuildings, search]);

  const selectedName = selectedId
    ? allBuildings.find((b) => b.id === selectedId)?.name ?? 'Edificio'
    : 'Todos los edificios';

  useEffect(() => {
    open && (setSearch(''), inputRef.current?.focus());
  }, [open]);

  return (
    <HeaderDropdown
      label={selectedName}
      open={open}
      onToggle={() => setOpen((o) => !o)}
    >
      <div>
        <div className="border-b border-border p-2">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar edificio..."
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-foreground"
          />
        </div>
        <ul className="max-h-48 overflow-y-auto py-1">
          <li>
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className={`flex w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                !selectedId ? 'font-semibold text-foreground' : 'text-foreground'
              }`}
            >
              Todos los edificios
            </button>
          </li>
          {filtered.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => { onChange(b.id); setOpen(false); }}
                className={`flex w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                  selectedId === b.id ? 'font-semibold text-foreground' : 'text-foreground'
                }`}
              >
                {b.name}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-xs text-subtle">Sin edificios</li>
          )}
        </ul>
      </div>
    </HeaderDropdown>
  );
}

/* ── Operator (Tienda) Switcher ── */

const OPERATOR_PAGE_SIZE = 10;

function OperatorSwitcher({
  selectedName,
  onChange,
  buildingId,
}: Readonly<{
  selectedName: string | null;
  onChange: (name: string | null) => void;
  buildingId: string | null;
}>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const metersQuery = useMetersQuery();
  const allMeters = metersQuery.data ?? [];

  const operators = useMemo(() => {
    const names = new Set<string>();
    allMeters.forEach((m) => {
      if (m.name && (!buildingId || m.buildingId === buildingId)) names.add(m.name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allMeters, buildingId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const matched = q ? operators.filter((n) => n.toLowerCase().includes(q)) : operators;
    return matched.slice(0, OPERATOR_PAGE_SIZE);
  }, [operators, search]);

  useEffect(() => {
    open && (setSearch(''), inputRef.current?.focus());
  }, [open]);

  return (
    <HeaderDropdown
      label={selectedName ?? 'Todas las tiendas'}
      open={open}
      onToggle={() => setOpen((o) => !o)}
    >
      <div>
        <div className="border-b border-border p-2">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tienda..."
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-foreground"
          />
        </div>
        <ul className="max-h-48 overflow-y-auto py-1">
          <li>
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className={`flex w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                !selectedName ? 'font-semibold text-foreground' : 'text-foreground'
              }`}
            >
              Todas las tiendas
            </button>
          </li>
          {filtered.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => { onChange(name); setOpen(false); }}
                className={`flex w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface ${
                  selectedName === name ? 'font-semibold text-foreground' : 'text-foreground'
                }`}
              >
                {name}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-3 py-2 text-xs text-subtle">Sin resultados</li>}
        </ul>
      </div>
    </HeaderDropdown>
  );
}
