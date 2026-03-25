import { NavLink } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/buildings', label: 'Edificios', icon: '🏢' },
  { to: '/alerts', label: 'Alertas', icon: '🔔' },
] as const;

export function Sidebar() {
  const { sidebarOpen } = useAppStore();
  const { tenant } = useAuthStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        {tenant?.logoUrl && (
          <img src={tenant.logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
        )}
        <span className="text-sm font-semibold text-gray-900">Energy Monitor</span>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--color-primary,#3D3BF3)]/10 font-medium text-[var(--color-primary,#3D3BF3)]'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
