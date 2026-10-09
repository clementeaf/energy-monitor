import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useEmsNavItems } from '../../features/ems/navigation';
import { NavModuleIcon } from './sidebar-icons';
import { NavGroups } from './Sidebar';

const BOTTOM_NAV_SIZE = 4;

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = useEmsNavItems();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const goTo = (path: string) => {
    setIsSheetOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav aria-label="Navegación principal" className="flex shrink-0 border-t border-[var(--color-sidebar-border)] bg-sidebar md:hidden">
        {navItems.slice(0, BOTTOM_NAV_SIZE).map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => goTo(item.path)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? 'text-sidebar-fg' : 'text-sidebar-muted'}`}
            >
              <NavModuleIcon name={item.icon} className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
        <button type="button" onClick={() => setIsSheetOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-sidebar-muted">
          <NavModuleIcon name="more" className="h-5 w-5" />
          Más
        </button>
      </nav>

      {isSheetOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Cerrar menú" onClick={() => setIsSheetOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-xl bg-sidebar px-2 pb-6 pt-4">
            <p className="mb-2 px-3 text-xs font-semibold text-sidebar-fg">Todas las secciones</p>
            <NavGroups items={navItems} currentPath={location.pathname} onNavigate={goTo} />
          </div>
        </div>
      )}
    </>
  );
}
