import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { APP_ROUTES } from '../../app/routes';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/auth/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useAlertsQuery } from '../../hooks/queries/useAlertsQuery';

interface NavItem {
  to: string;
  label: string;
  requiredPerms: string[];
}

interface NavGroup {
  label: string;
  basePath: string;
  children: NavItem[];
}

/* ── Standalone items (no accordion) ── */
const STANDALONE_ITEMS: NavItem[] = [
  {
    to: '/buildings',
    label: 'Edificios',
    requiredPerms: ['admin_buildings:read', 'dashboard_executive:read', 'dashboard_technical:read'],
  },
  {
    to: '/meters',
    label: 'Medidores',
    requiredPerms: ['admin_meters:read', 'dashboard_executive:read', 'dashboard_technical:read'],
  },
];

/* ── Grouped items (accordion) ── */
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Dashboard',
    basePath: '/dashboard',
    children: [
      { to: '/', label: 'General', requiredPerms: ['dashboard_executive:read', 'dashboard_technical:read'] },
      { to: APP_ROUTES.executive, label: 'Ejecutivo', requiredPerms: ['dashboard_executive:read', 'dashboard_technical:read'] },
      { to: APP_ROUTES.compare, label: 'Comparativo', requiredPerms: ['dashboard_executive:read', 'dashboard_technical:read'] },
    ],
  },
  {
    label: 'Monitoreo',
    basePath: '/monitoring',
    children: [
      { to: '/monitoring/realtime', label: 'Tiempo Real', requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'] },
      { to: '/monitoring/devices', label: 'Dispositivos', requiredPerms: ['diagnostics:read', 'admin_meters:read'] },
      { to: '/monitoring/meters/type', label: 'Medidores por tipo', requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'] },
      { to: '/monitoring/generation', label: 'Generación', requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'] },
      { to: '/monitoring/modbus-map', label: 'Mapa Modbus', requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'] },
    ],
  },
  {
    label: 'Alertas',
    basePath: '/alerts',
    children: [
      { to: '/alerts', label: 'Alertas', requiredPerms: ['alerts:read'] },
      { to: '/alerts/history', label: 'Historial / SLA', requiredPerms: ['alerts:read'] },
    ],
  },
  {
    label: 'Facturación',
    basePath: '/billing',
    children: [
      { to: '/billing', label: 'Facturas', requiredPerms: ['billing:read', 'billing:view_own'] },
      { to: '/billing/approve', label: 'Aprobar Facturas', requiredPerms: ['billing:update'] },
      { to: '/billing/history', label: 'Historial', requiredPerms: ['billing:read'] },
      { to: '/billing/my-invoice', label: 'Mi Factura', requiredPerms: ['billing:view_own'] },
      { to: '/billing/rates', label: 'Tarifas', requiredPerms: ['billing:read'] },
    ],
  },
  {
    label: 'Reportes',
    basePath: '/reports',
    children: [
      { to: '/reports', label: 'Reportes', requiredPerms: ['reports:read', 'reports:view_own'] },
      { to: '/reports/scheduled', label: 'Programados', requiredPerms: ['reports:update'] },
    ],
  },
  {
    label: 'Analítica',
    basePath: '/analytics',
    children: [
      { to: '/analytics/benchmark', label: 'Benchmarking', requiredPerms: ['dashboard_executive:read'] },
      { to: '/analytics/trends', label: 'Tendencias', requiredPerms: ['dashboard_executive:read'] },
      { to: '/analytics/patterns', label: 'Patrones', requiredPerms: ['dashboard_executive:read'] },
    ],
  },
  {
    label: 'Integraciones',
    basePath: '/integrations',
    children: [
      { to: APP_ROUTES.integrations, label: 'Integraciones', requiredPerms: ['integrations:read'] },
    ],
  },
];

/* ── Admin groups ── */
const ADMIN_ITEMS: NavItem[] = [
  { to: '/admin/users', label: 'Usuarios', requiredPerms: ['admin_users:read'] },
  { to: '/admin/tenants', label: 'Locatarios', requiredPerms: ['admin_tenants_units:read'] },
  { to: '/admin/hierarchy', label: 'Jerarquía', requiredPerms: ['admin_hierarchy:read'] },
  { to: '/admin/roles', label: 'Roles', requiredPerms: ['admin_roles:read'] },
  { to: '/admin/api-keys', label: 'API Keys', requiredPerms: ['api_keys:read'] },
  { to: '/admin/settings', label: 'Configuración', requiredPerms: ['admin_tenants:update'] },
];

const ADMIN_AUDIT_GROUP: NavGroup = {
  label: 'Auditoría',
  basePath: '/admin/audit',
  children: [
    { to: '/admin/audit', label: 'Auditoría', requiredPerms: ['audit:read'] },
    { to: '/admin/audit/changes', label: 'Log de Cambios', requiredPerms: ['audit:read'] },
    { to: '/admin/audit/access', label: 'Log de Accesos', requiredPerms: ['audit:read'] },
  ],
};

export function Sidebar() {
  const { sidebarOpen } = useAppStore();
  const { tenant, user } = useAuthStore();
  const { logout } = useAuth();
  const { hasAny } = usePermissions();
  const activeAlertsQuery = useAlertsQuery({ status: 'active' });
  const activeAlertCount = activeAlertsQuery.data?.length ?? 0;

  const visibleStandalone = STANDALONE_ITEMS.filter((item) => hasAny(...item.requiredPerms));
  const visibleAdmin = ADMIN_ITEMS.filter((item) => hasAny(...item.requiredPerms));

  if (!sidebarOpen) return null;

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200/80 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200/80 px-4">
        {tenant?.logoUrl && (
          <img src={tenant.logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
        )}
        <span className="text-sm font-semibold text-gray-900">{tenant?.appTitle ?? 'Energy Monitor'}</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {/* Accordion groups */}
        {NAV_GROUPS.map((group) => {
          const visibleChildren = group.children.filter((c) => hasAny(...c.requiredPerms));
          if (visibleChildren.length === 0) return null;

          return (
            <AccordionGroup
              key={group.label}
              label={group.label}
              basePath={group.basePath}
              alertBadge={group.basePath === '/alerts' ? activeAlertCount : undefined}
            >
              {visibleChildren.map(({ to, label }) => (
                <SidebarLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  label={label}
                  badge={to === '/alerts' && activeAlertCount > 0 ? activeAlertCount : undefined}
                />
              ))}
            </AccordionGroup>
          );
        })}

        {/* Standalone items */}
        {visibleStandalone.map(({ to, label }) => (
          <SidebarLink key={to} to={to} label={label} />
        ))}

        {/* Admin section */}
        {(visibleAdmin.length > 0 || hasAny('audit:read')) && (
          <>
            <div className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-gray-400">
              Administración
            </div>
            {visibleAdmin.map(({ to, label }) => (
              <SidebarLink key={to} to={to} label={label} />
            ))}

            {/* Audit accordion */}
            {hasAny('audit:read') && (
              <AccordionGroup label={ADMIN_AUDIT_GROUP.label} basePath={ADMIN_AUDIT_GROUP.basePath}>
                {ADMIN_AUDIT_GROUP.children.map(({ to, label }) => (
                  <SidebarLink key={to} to={to} label={label} end={to === '/admin/audit'} />
                ))}
              </AccordionGroup>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-gray-200/80 p-2">
        {user && (
          <div className="mb-2 px-3 py-1">
            <div className="truncate text-xs font-medium text-gray-700">{user.displayName ?? user.email}</div>
            <div className="text-xs text-gray-400">{user.role.name}</div>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-600 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

/* ── Accordion Group ── */
function AccordionGroup({
  label,
  basePath,
  alertBadge,
  children,
}: Readonly<{
  label: string;
  basePath: string;
  alertBadge?: number;
  children: React.ReactNode;
}>) {
  const location = useLocation();
  const isActive = basePath === '/dashboard'
    ? location.pathname === '/' || location.pathname.startsWith('/dashboard')
    : location.pathname.startsWith(basePath);

  const [open, setOpen] = useState(isActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'font-medium text-[var(--color-primary,#3D3BF3)]'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <span className="flex items-center gap-2">
          {label}
          {alertBadge != null && alertBadge > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {alertBadge > 99 ? '99+' : alertBadge}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </button>

      {open && (
        <div className="ml-3 border-l border-gray-200 pl-2 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Single link ── */
function SidebarLink({ to, label, badge, end }: Readonly<{ to: string; label: string; badge?: number; end?: boolean }>) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-[var(--color-primary,#3D3BF3)]/10 font-medium text-[var(--color-primary,#3D3BF3)]'
            : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      {label}
      {badge != null && (
        <span className="ml-auto inline-flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}
