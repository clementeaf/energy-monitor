import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/auth/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { EMS_ROLES } from '../../features/ems/roles';
import { useEmsRole } from '../../features/ems/useEmsRole';
import { useEmsNavItems, type EmsNavItem, type NavGroup } from '../../features/ems/navigation';
import { NavModuleIcon } from './sidebar-icons';
import { SidebarReveal } from './sidebar-motion';

const NAV_GROUPS: NavGroup[] = ['Núcleo', 'Add-ons', 'Sistema'];

function SidebarSection({ label, expanded }: { label: string; expanded: boolean }) {
  return (
    <SidebarReveal show={expanded}>
      <div className="mb-1 px-3 uppercase tracking-[0.08em]" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-sidebar-muted)' }}>
        {label}
      </div>
    </SidebarReveal>
  );
}

export function NavItem({ item, currentPath, onNavigate }: Readonly<{ item: EmsNavItem; currentPath: string; onNavigate: (to: string) => void }>) {
  const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      aria-current={isActive ? 'page' : undefined}
      className="flex w-full items-center gap-2.5 rounded-md py-2 text-left transition-colors"
      style={{
        fontSize: '13px',
        fontWeight: isActive ? 500 : 400,
        color: isActive ? 'var(--color-sidebar-fg)' : 'var(--color-sidebar-muted)',
        opacity: item.isLocked && !isActive ? 0.6 : 1,
        paddingLeft: '1.05rem',
        paddingRight: '0.75rem',
        backgroundColor: isActive ? '#9FD8381F' : 'transparent',
        borderLeft: isActive ? '3px solid #9FD838' : '3px solid transparent',
      }}
    >
      <NavModuleIcon name={item.icon} className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.isLocked && (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Módulo no contratado"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
      )}
      {item.badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{item.badge}</span>
      )}
    </button>
  );
}

export function NavGroups({ items, currentPath, onNavigate }: Readonly<{ items: EmsNavItem[]; currentPath: string; onNavigate: (to: string) => void }>) {
  return NAV_GROUPS.map((group) => {
    const groupItems = items.filter((item) => item.group === group);
    if (groupItems.length === 0) return null;
    return (
      <div key={group} className="mb-6">
        <SidebarSection label={group} expanded />
        <div className="space-y-0.5">
          {groupItems.map((item) => (
            <NavItem key={item.section} item={item} currentPath={currentPath} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    );
  });
}

export function Sidebar() {
  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();
  const role = useEmsRole();
  const navItems = useEmsNavItems();

  return (
    <aside className="relative flex h-full min-h-0 w-[240px] shrink-0 flex-col bg-[var(--color-sidebar)]">
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <NavGroups items={navItems} currentPath={location.pathname} onNavigate={navigate} />
      </nav>

      <div className="shrink-0 border-t border-[var(--color-sidebar-border)] px-3 py-3">
        <div className="mb-2 min-w-0 px-3">
          <div className="truncate text-xs font-semibold text-[var(--color-sidebar-fg)]">{user?.displayName ?? user?.email}</div>
          <div className="text-[11px] text-[var(--color-sidebar-muted)]">{role && EMS_ROLES[role].label}</div>
        </div>
        <button type="button" onClick={logout} title="Cerrar sesión" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-fg)]">
          <NavModuleIcon name="logout" className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1 text-left text-xs">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
