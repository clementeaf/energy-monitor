import { useLocation, useNavigate } from 'react-router';
import { useEmsNavItems, type EmsNavItem, type NavGroup } from '../../features/ems/navigation';
import { NavModuleIcon } from './sidebar-icons';
import { SidebarReveal } from './sidebar-motion';
import { UserMenu } from './UserMenu';

const NAV_GROUPS: NavGroup[] = ['Núcleo', 'Add-ons', 'Cuenta'];

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
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${isActive ? 'bg-primary text-primary-fg' : 'text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-fg)]'}`}
      style={{
        fontSize: '13px',
        fontWeight: isActive ? 500 : 400,
        opacity: item.isLocked && !isActive ? 0.6 : 1,
      }}
    >
      <NavModuleIcon name={item.icon} className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.isLocked && (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Módulo no contratado"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
      )}
      {item.badge > 0 && (
        <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${isActive ? 'bg-accent text-accent-ink' : 'bg-raised text-muted'}`}>{item.badge}</span>
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

export function BrandMark() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
      <svg className="h-4 w-4 text-accent-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = useEmsNavItems();

  return (
    <aside className="relative flex h-full min-h-0 w-[232px] shrink-0 flex-col rounded-2xl bg-surface">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
        <BrandMark />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-bold text-foreground">POWER Digital®</span>
          <span className="block text-[10px] text-muted">EMS</span>
        </span>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <NavGroups items={navItems} currentPath={location.pathname} onNavigate={navigate} />
      </nav>

      <div className="shrink-0 p-2">
        <UserMenu variant="card" />
      </div>
    </aside>
  );
}
