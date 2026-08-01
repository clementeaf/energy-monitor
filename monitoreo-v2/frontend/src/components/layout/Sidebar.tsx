import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/auth/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { PROFILE_NAV, type ProfileNavEntry } from '../../lib/profile-nav';
import { NavModuleIcon } from './sidebar-icons';
import { SidebarFlyout } from './SidebarFlyout';
import { SidebarCollapsible, SidebarReveal } from './sidebar-motion';

type SidebarFlyoutId = number | 'support';

function findActiveIndex(entries: ProfileNavEntry[], pathname: string): number {
  const exact = entries.findIndex((e) => pathname === e.basePath || pathname === e.to);
  if (exact >= 0) return exact;
  return entries.findIndex((e) => {
    const matchesBase = pathname.startsWith(e.basePath + '/') || pathname === e.basePath;
    const matchesExtra = e.extraPaths?.some((p) => pathname.startsWith(p + '/') || pathname === p) ?? false;
    return matchesBase || matchesExtra;
  });
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, selectedTenantId } = useAppStore();
  const { logout } = useAuth();
  const { profile } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [flyout, setFlyout] = useState<SidebarFlyoutId | null>(null);

  const expanded = sidebarOpen;

  useEffect(() => {
    if (window.innerWidth < 1366 && sidebarOpen) {
      useAppStore.getState().setSidebarOpen(false);
    }
  }, []);

  const navEntries = useMemo(() => {
    const entries = PROFILE_NAV[profile];
    if (profile === 'super_admin') return entries;
    return selectedTenantId ? entries.filter((e) => !e.platformOnly) : entries;
  }, [profile, selectedTenantId]);
  const activeIdx = findActiveIndex(navEntries, location.pathname);

  useEffect(() => { expanded && setFlyout(null); }, [expanded]);
  useEffect(() => { setFlyout(null); }, [location.pathname]);
  useEffect(() => {
    expanded || setExpandedIdx(null);
    const timer = expanded ? undefined : window.setTimeout(() => setContactOpen(false), 300);
    return () => { timer && clearTimeout(timer); };
  }, [expanded]);

  const navItemClass = (active: boolean): string => {
    const layout = expanded ? 'gap-2.5 px-3 py-2 text-left text-[13px]' : 'justify-center gap-0 px-2.5 py-2.5';
    const color = active
      ? 'bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-fg)] font-medium'
      : 'text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-fg)]';
    return `flex w-full items-center rounded-lg transition-all duration-200 ease-out ${layout} ${color}`;
  };

  const subLinkClass = (subActive: boolean): string => {
    const color = subActive
      ? 'bg-[var(--color-sidebar-active)] font-medium text-[var(--color-sidebar-fg)]'
      : 'text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-fg)]';
    return `block rounded-md px-2.5 py-1.5 text-[12px] transition-all duration-200 ease-out ${color}`;
  };

  return (
    <aside
      className={`relative flex h-full min-h-0 shrink-0 flex-col overflow-visible bg-[var(--color-sidebar)] border-r border-[var(--color-sidebar-border)] transition-[width] duration-300 ease-in-out motion-reduce:transition-none ${
        expanded ? 'w-[210px]' : 'w-14'
      }`}
    >
      {/* Brand */}
      <div className={`flex shrink-0 items-center gap-2 border-b border-[var(--color-sidebar-border)] transition-[padding] duration-300 ${expanded ? 'px-4 py-4' : 'justify-center px-2 py-4'}`}>
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-info)]" />
        <SidebarReveal show={expanded}>
          <span className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--color-sidebar-fg)]">energy.monitor</span>
        </SidebarReveal>
      </div>

      {/* Nav */}
      <nav className={`min-h-0 flex-1 space-y-0.5 overflow-y-auto py-3 transition-[padding] duration-300 ease-in-out ${expanded ? 'px-2' : 'px-1.5'}`}>
        {navEntries.map((entry, i) => {
          const isActive = i === activeIdx;
          const isExpanded = expandedIdx === i || (expandedIdx === null && isActive);
          const hasChildren = (entry.children?.length ?? 0) > 0;

          const handleClick = (): void => {
            const collapsed = !expanded;
            if (collapsed) {
              hasChildren ? setFlyout(flyout === i ? null : i) : entry.to && navigate(entry.to);
            } else {
              hasChildren ? setExpandedIdx(isExpanded ? null : i) : entry.to && navigate(entry.to);
            }
          };

          return (
            <div key={entry.basePath} className="relative">
              <button type="button" onClick={handleClick} title={expanded ? undefined : entry.label} className={navItemClass(isActive)}>
                <NavModuleIcon name={entry.icon} />
                <SidebarReveal show={expanded}>
                  <span className="min-w-0 flex-1 truncate leading-tight">{entry.label}</span>
                  {hasChildren && (
                    <svg className={`ml-1 h-3.5 w-3.5 shrink-0 text-[var(--color-sidebar-muted)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3" /></svg>
                  )}
                </SidebarReveal>
              </button>

              {expanded && hasChildren && (
                <SidebarCollapsible open={isExpanded}>
                  <div className="ml-2 mt-0.5 space-y-0.5 border-l border-[var(--color-sidebar-border)] py-1 pl-3">
                    {entry.children!.map((sub) => (
                      <NavLink key={sub.to} to={sub.to} end={sub.end} className={({ isActive: subActive }) => subLinkClass(subActive)}>{sub.label}</NavLink>
                    ))}
                  </div>
                </SidebarCollapsible>
              )}

              {!expanded && hasChildren && (
                <SidebarFlyout open={flyout === i} onClose={() => setFlyout(null)} title={entry.label}>
                  {entry.children!.map((sub) => (
                    <NavLink key={sub.to} to={sub.to} end={sub.end} onClick={() => setFlyout(null)} className={({ isActive: subActive }) => subLinkClass(subActive)}>{sub.label}</NavLink>
                  ))}
                </SidebarFlyout>
              )}
            </div>
          );
        })}
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
              <div className="space-y-1 p-2 text-[13px]">
                <p className="font-medium text-[var(--color-sidebar-fg)]">Globe Power</p>
                <a href="mailto:atencion@globepower.cl" className="block truncate text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-fg)]">atencion@globepower.cl</a>
                <a href="tel:+56227810274" className="block text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-fg)]">227810274</a>
              </div>
            </SidebarFlyout>
          )}
        </div>
        <SidebarCollapsible open={expanded && contactOpen}>
          <div className="mt-2 space-y-0.5">
            <p className="text-[13px] font-medium text-[var(--color-sidebar-fg)]">Globe Power</p>
            <a href="mailto:atencion@globepower.cl" className="block truncate text-[13px] text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-fg)]">atencion@globepower.cl</a>
            <a href="tel:+56227810274" className="block text-[13px] text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-fg)]">227810274</a>
          </div>
        </SidebarCollapsible>
      </div>

      {/* Logout + Collapse */}
      <div className={`shrink-0 border-t border-[var(--color-sidebar-border)] transition-[padding] duration-300 ${expanded ? 'px-3 py-3' : 'px-1.5 py-2'}`}>
        <button type="button" onClick={logout} title="Cerrar sesión" className={navItemClass(false)}>
          <NavModuleIcon name="logout" className="h-[18px] w-[18px] shrink-0" />
          <SidebarReveal show={expanded}>
            <span className="flex-1 text-left text-[12px]">Cerrar Sesión</span>
          </SidebarReveal>
        </button>
        <SidebarCollapsible open={expanded}>
          <button type="button" onClick={toggleSidebar} className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-[var(--color-sidebar-muted)] transition-all duration-200 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-fg)]">
            <NavModuleIcon name="panel-left" className="h-[18px] w-[18px] shrink-0" />
            Colapsar
          </button>
        </SidebarCollapsible>
      </div>
    </aside>
  );
}
