import { NavLink } from 'react-router';
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
    requiredPerms: ['admin_alerts:read', 'monitoring_alerts:read'],
  },
  {
    to: '/monitoring/realtime',
    label: 'Tiempo Real',
    requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read'],
  },
  {
    to: '/monitoring/devices',
    label: 'Dispositivos',
    requiredPerms: ['admin_concentrators:read', 'admin_meters:read'],
  },
  {
    to: '/billing',
    label: 'Facturas',
    requiredPerms: ['billing_invoices:read', 'billing:read', 'billing:view_own'],
  },
  {
    to: '/billing/rates',
    label: 'Tarifas',
    requiredPerms: ['billing_tariffs:read', 'billing:read'],
  },
  {
    to: '/reports',
    label: 'Reportes',
    requiredPerms: ['reports:read', 'reports:view_own'],
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
];

export function Sidebar() {
  const { sidebarOpen } = useAppStore();
  const { tenant, user } = useAuthStore();
  const { logout } = useAuth();
  const { hasAny } = usePermissions();

  if (!sidebarOpen) return null;

  const activeAlertsQuery = useAlertsQuery({ status: 'active' });
  const activeAlertCount = activeAlertsQuery.data?.length ?? 0;

  const visibleNav = NAV_ITEMS.filter((item) => hasAny(...item.requiredPerms));
  const visibleAdmin = ADMIN_ITEMS.filter((item) => hasAny(...item.requiredPerms));

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        {tenant?.logoUrl && (
          <img src={tenant.logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
        )}
        <span className="text-sm font-semibold text-gray-900">Energy Monitor</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visibleNav.map(({ to, label }) => (
          <SidebarLink
            key={to}
            to={to}
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

function SidebarLink({ to, label, badge }: { to: string; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
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
