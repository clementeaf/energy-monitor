import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/auth/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { UNIFIED_NAV, getVisibleNav, findActiveEntry } from '../../lib/unified-nav';
import { NavModuleIcon } from './sidebar-icons';
import { SidebarFlyout } from './SidebarFlyout';
import { SidebarCollapsible, SidebarReveal } from './sidebar-motion';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, selectedTenantId } = useAppStore();
  const { logout } = useAuth();
  const { hasAny } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);
  const [flyout, setFlyout] = useState<string | null>(null);

  const expanded = sidebarOpen;

  useEffect(() => {
    if (window.innerWidth < 1366 && sidebarOpen) {
      useAppStore.getState().setSidebarOpen(false);
    }
  }, []);

  const visibleNav = useMemo(
    () => getVisibleNav(hasAny, !!selectedTenantId),
    [hasAny, selectedTenantId],
  );
  const active = findActiveEntry(visibleNav, location.pathname);

  useEffect(() => { expanded && setFlyout(null); }, [expanded]);
  useEffect(() => { setFlyout(null); }, [location.pathname]);
  useEffect(() => {
    const timer = expanded ? undefined : window.setTimeout(() => setContactOpen(false), 300);
    return () => { timer && clearTimeout(timer); };
  }, [expanded]);

  const navItemClass = (isActive: boolean): string => {
    const layout = expanded ? 'gap-2.5 px-3 py-2 text-left text-sm' : 'justify-center gap-0 px-2.5 py-2.5';
    const color = isActive
      ? 'bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-fg)] font-medium'
      : 'text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-fg)]';
    return `flex w-full items-center rounded-lg transition-all duration-200 ease-out ${layout} ${color}`;
  };

  return (
    <aside
      className={`group/sidebar relative flex h-full min-h-0 shrink-0 flex-col overflow-visible bg-[var(--color-sidebar)] border-r border-[var(--color-sidebar-border)] transition-[width] duration-300 ease-in-out motion-reduce:transition-none ${
        expanded ? 'w-[210px]' : 'w-14'
      }`}
    >
      {/* Edge toggle — always visible chevron on sidebar border */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={expanded ? 'Colapsar menú' : 'Expandir menú'}
        className="absolute -right-3 top-5 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted shadow-sm transition-colors duration-200 hover:bg-surface hover:text-foreground"
      >
        <svg className={`h-3 w-3 transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M8 2L4 6l4 4" />
        </svg>
      </button>

      {/* Nav */}
      <nav className={`min-h-0 flex-1 overflow-y-auto py-3 transition-[padding] duration-300 ease-in-out ${expanded ? 'px-2' : 'px-1.5'}`}>
        {visibleNav.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
            <SidebarReveal show={expanded}>
              <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-sidebar-muted)] opacity-60">
                {group.label}
              </div>
            </SidebarReveal>
            <div className="space-y-0.5">
              {group.entries.map((entry, ei) => {
                const isActive = active?.groupIdx === gi && active?.entryIdx === ei;
                return (
                  <button
                    key={entry.basePath}
                    type="button"
                    onClick={() => navigate(entry.to)}
                    title={expanded ? undefined : entry.label}
                    className={navItemClass(isActive)}
                  >
                    <NavModuleIcon name={entry.icon} />
                    <SidebarReveal show={expanded}>
                      <span className="min-w-0 flex-1 truncate leading-tight">{entry.label}</span>
                    </SidebarReveal>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Support */}
      <div className={`shrink-0 border-t border-[var(--color-sidebar-border)] transition-[padding] duration-300 ${expanded ? 'px-3 py-3' : 'px-1.5 py-2'}`}>
        <div className="relative">
          <button type="button" title="Soporte y contacto" onClick={() => { expanded ? setContactOpen((o) => !o) : setFlyout(flyout === 'support' ? null : 'support'); }} className={`${navItemClass(contactOpen || flyout === 'support')} w-full`}>
            <NavModuleIcon name="support" className="h-[18px] w-[18px] shrink-0" />
            <SidebarReveal show={expanded}>
              <span className="flex-1 text-left">Soporte</span>
              <svg className={`h-3 w-3 shrink-0 transition-transform duration-300 ${contactOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3" /></svg>
            </SidebarReveal>
          </button>
          {!expanded && (
            <SidebarFlyout open={flyout === 'support'} onClose={() => setFlyout(null)} title="Soporte" className="w-56">
              <div className="space-y-1 p-2 text-sm">
                <p className="font-medium text-[var(--color-sidebar-fg)]">Globe Power</p>
                <a href="mailto:atencion@globepower.cl" className="block truncate text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-fg)]">atencion@globepower.cl</a>
                <a href="tel:+56227810274" className="block text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-fg)]">227810274</a>
              </div>
            </SidebarFlyout>
          )}
        </div>
        <SidebarCollapsible open={expanded && contactOpen}>
          <div className="mt-2 space-y-0.5">
            <p className="text-sm font-medium text-[var(--color-sidebar-fg)]">Globe Power</p>
            <a href="mailto:atencion@globepower.cl" className="block truncate text-sm text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-fg)]">atencion@globepower.cl</a>
            <a href="tel:+56227810274" className="block text-sm text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-fg)]">227810274</a>
          </div>
        </SidebarCollapsible>
      </div>

      {/* Logout */}
      <div className={`shrink-0 border-t border-[var(--color-sidebar-border)] transition-[padding] duration-300 ${expanded ? 'px-3 py-3' : 'px-1.5 py-2'}`}>
        <button type="button" onClick={logout} title="Cerrar sesión" className={navItemClass(false)}>
          <NavModuleIcon name="logout" className="h-[18px] w-[18px] shrink-0" />
          <SidebarReveal show={expanded}>
            <span className="flex-1 text-left text-xs">Cerrar Sesión</span>
          </SidebarReveal>
        </button>
      </div>
    </aside>
  );
}
