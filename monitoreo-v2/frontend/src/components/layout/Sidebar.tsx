import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { APP_ROUTES } from '../../app/routes';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/auth/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import globeLogo from '../../assets/globe-logo.png';

interface SubItem {
  to: string;
  label: string;
  end?: boolean;
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
      { to: '/', label: 'General', end: true },
      { to: APP_ROUTES.executive, label: 'Ejecutivo' },
      { to: APP_ROUTES.compare, label: 'Comparativo' },
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
      { to: '/monitoring/generation', label: 'Generación' },
      { to: '/monitoring/modbus-map', label: 'Mapa Modbus' },
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
      { to: '/billing/approve', label: 'Aprobar' },
      { to: '/billing/history', label: 'Historial' },
      { to: '/billing/my-invoice', label: 'Mi Factura' },
      { to: '/billing/rates', label: 'Tarifas' },
    ],
  },
  {
    label: 'Reportes',
    basePath: '/reports',
    requiredPerms: ['reports:read', 'reports:view_own'],
    children: [
      { to: '/reports', label: 'Reportes', end: true },
      { to: '/reports/scheduled', label: 'Programados' },
    ],
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
      { to: '/admin/companies', label: 'Empresas' },
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

export function Sidebar() {
  const { sidebarOpen } = useAppStore();
  const { tenant } = useAuthStore();
  const { logout } = useAuth();
  const { hasAny } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const visibleEntries = NAV_ENTRIES.filter((e) => hasAny(...e.requiredPerms));

  // Auto-expand active group
  const activeIdx = visibleEntries.findIndex((e) =>
    e.basePath === '/dashboard'
      ? location.pathname === '/' || location.pathname.startsWith('/dashboard')
      : location.pathname.startsWith(e.basePath),
  );

  if (!sidebarOpen) return null;

  return (
    <aside className="flex w-52 shrink-0 flex-col bg-pa-bg-alt">
      {/* Logo + title */}
      <div className="px-4 pt-5 pb-4">
        <button
          type="button"
          className="flex items-center gap-2.5"
          onClick={() => navigate('/')}
        >
          <div className="h-8 w-8 shrink-0 overflow-hidden">
            <img src={tenant?.logoUrl ?? globeLogo} alt="Globe Power" className="h-8 w-auto max-w-none" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-pa-navy">
              {tenant?.appTitle ?? 'Globe Power'}
            </span>
            <span className="text-[11px] text-pa-text-muted">
              Energy Monitor
            </span>
          </div>
        </button>
      </div>

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
                  {entry.children!.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      end={sub.end}
                      className={({ isActive: subActive }) =>
                        `block rounded-md px-2 py-1.5 text-[12px] transition-colors ${
                          subActive
                            ? 'font-medium text-pa-blue'
                            : 'text-pa-text-muted hover:text-pa-text'
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
