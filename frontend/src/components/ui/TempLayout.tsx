import { Outlet, useLocation, useNavigate } from 'react-router';
import { appRoutes, type AppRoute } from '../../app/appRoutes';

const navItems = (Object.values(appRoutes) as AppRoute[]).filter((r) => r.showInNav);

/** Temporary layout without auth. Replace with <Layout /> when re-enabling login. */
export function TempLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <aside className="flex h-full w-56 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-4">
          <button type="button" className="text-lg font-bold text-text" onClick={() => navigate('/')}>
            Energy Monitor
          </button>
          <p className="mt-1 text-xs text-subtle">Dev Mode (sin auth)</p>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path.split(':')[0]);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  isActive ? 'bg-raised font-semibold text-text' : 'text-muted hover:bg-raised'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
