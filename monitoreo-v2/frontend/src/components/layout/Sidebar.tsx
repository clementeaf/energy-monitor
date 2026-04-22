import { NavLink } from 'react-router';
import { APP_ROUTES } from '../../app/routes';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/auth/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useAlertsQuery } from '../../hooks/queries/useAlertsQuery';

interface NavItem {
  to: string;
  label: string;
  /** User must have at least ONE of these permissions to see this item */
  requiredPerms: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    requiredPerms: ['dashboard_executive:read', 'dashboard_technical:read'],
  },
  {
    to: APP_ROUTES.executive,
    label: 'Ejecutivo',
    requiredPerms: ['dashboard_executive:read', 'dashboard_technical:read'],
  },
  {
    to: APP_ROUTES.compare,
    label: 'Comparativo',
    requiredPerms: ['dashboard_executive:read', 'dashboard_technical:read'],
  },
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
  {
    to: '/alerts',
    label: 'Alertas',
    requiredPerms: ['alerts:read'],
  },
  {
    to: '/alerts/history',
    label: 'Historial / SLA',
    requiredPerms: ['alerts:read'],
  },
  {
    to: '/monitoring/realtime',
    label: 'Tiempo Real',
    requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'],
  },
  {
    to: '/monitoring/devices',
    label: 'Dispositivos',
    requiredPerms: ['diagnostics:read', 'admin_meters:read'],
  },
  {
    to: '/monitoring/meters/type',
    label: 'Medidores por tipo',
    requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'],
  },
  {
    to: '/monitoring/generation',
    label: 'Generacion',
    requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'],
  },
  {
    to: '/monitoring/modbus-map',
    label: 'Mapa Modbus',
    requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'],
  },
  {
    to: '/billing',
    label: 'Facturas',
    requiredPerms: ['billing:read', 'billing:view_own'],
  },
  {
    to: '/billing/approve',
    label: 'Aprobar Facturas',
    requiredPerms: ['billing:update'],
  },
  {
    to: '/billing/history',
    label: 'Historial Facturación',
    requiredPerms: ['billing:read'],
  },
  {
    to: '/billing/my-invoice',
    label: 'Mi Factura',
    requiredPerms: ['billing:view_own'],
  },
  {
    to: '/billing/rates',
    label: 'Tarifas',
    requiredPerms: ['billing:read'],
  },
  {
    to: '/reports',
    label: 'Reportes',
    requiredPerms: ['reports:read', 'reports:view_own'],
  },
  {
    to: '/reports/scheduled',
    label: 'Reportes Programados',
    requiredPerms: ['reports:update'],
  },
  {
    to: '/analytics/benchmark',
    label: 'Benchmarking',
    requiredPerms: ['dashboard_executive:read'],
  },
  {
    to: '/analytics/trends',
    label: 'Tendencias',
    requiredPerms: ['dashboard_executive:read'],
  },
  {
    to: '/analytics/patterns',
    label: 'Patrones',
    requiredPerms: ['dashboard_executive:read'],
  },
  {
    to: APP_ROUTES.integrations,
    label: 'Integraciones',
    requiredPerms: ['integrations:read'],
  },
];

const ADMIN_ITEMS: NavItem[] = [
  {
    to: '/admin/users',
    label: 'Usuarios',
    requiredPerms: ['admin_users:read'],
  },
  {
    to: '/admin/tenants',
    label: 'Locatarios',
    requiredPerms: ['admin_tenants_units:read'],
  },
  {
    to: '/admin/hierarchy',
    label: 'Jerarquia',
    requiredPerms: ['admin_hierarchy:read'],
  },
  {
    to: '/admin/audit',
    label: 'Auditoria',
    requiredPerms: ['audit:read'],
  },
  {
    to: '/admin/audit/changes',
    label: 'Log de Cambios',
    requiredPerms: ['audit:read'],
  },
  {
    to: '/admin/audit/access',
    label: 'Log de Accesos',
    requiredPerms: ['audit:read'],
  },
  {
    to: '/admin/roles',
    label: 'Roles',
    requiredPerms: ['admin_roles:read'],
  },
  {
    to: '/admin/api-keys',
    label: 'API Keys',
    requiredPerms: ['api_keys:read'],
  },
  {
    to: '/admin/settings',
    label: 'Configuracion',
    requiredPerms: ['admin_tenants:update'],
  },
];

export function Sidebar() {
  const { sidebarOpen } = useAppStore();
  const { tenant, user } = useAuthStore();
  const { logout } = useAuth();
  const { hasAny } = usePermissions();
  const activeAlertsQuery = useAlertsQuery({ status: 'active' });
  const activeAlertCount = activeAlertsQuery.data?.length ?? 0;

  const visibleNav = NAV_ITEMS.filter((item) => hasAny(...item.requiredPerms));
  const visibleAdmin = ADMIN_ITEMS.filter((item) => hasAny(...item.requiredPerms));

  if (!sidebarOpen) return null;

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        {tenant?.logoUrl && (
          <img src={tenant.logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
        )}
        <span className="text-sm font-semibold text-gray-900">{tenant?.appTitle ?? 'Energy Monitor'}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visibleNav.map(({ to, label }) => (
          <SidebarLink
            key={to}
            to={to}
            end={to === APP_ROUTES.dashboard}
            label={label}
            badge={to === '/alerts' && activeAlertCount > 0 ? activeAlertCount : undefined}
          />
        ))}

        {visibleAdmin.length > 0 && (
          <>
            <div className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-gray-400">
              Administración
            </div>
            {visibleAdmin.map(({ to, label }) => (
              <SidebarLink key={to} to={to} label={label} />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-gray-200 p-2">
        {user && (
          <div className="mb-2 px-3 py-1">
            <div className="truncate text-xs font-medium text-gray-700">{user.displayName ?? user.email}</div>
            <div className="text-xs text-gray-400">{user.role.name}</div>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

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
