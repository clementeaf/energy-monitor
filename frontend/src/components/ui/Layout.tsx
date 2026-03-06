import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/auth/useAuth';
import { getNavItems } from '../../app/appRoutes';

function isSafeUrl(url?: string): boolean {
  if (!url) return false;
  try { return ['https:'].includes(new URL(url).protocol); }
  catch { return false; }
}

export function Layout() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-30 flex h-full w-56 flex-col border-r border-border bg-surface transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-border px-4 py-4">
          <h2
            className="cursor-pointer text-lg font-bold text-text"
            onClick={() => { navigate('/'); setSidebarOpen(false); }}
          >
            Energy Monitor
          </h2>
          {user && (
            <p className="mt-1 truncate text-xs text-subtle">{user.name}</p>
          )}
        </div>
        <nav className="flex-1 p-2">
          {(user ? getNavItems(user.role) : []).map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-sm ${
                location.pathname === item.path
                  ? 'bg-raised font-semibold text-text'
                  : 'text-muted hover:bg-raised'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        {user && (
          <div className="border-t border-border p-3">
            <button
              onClick={logout}
              className="w-full border border-border px-2 py-1 text-xs text-muted transition-colors hover:bg-raised"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header (hamburger only) */}
        <header className="flex items-center border-b border-border bg-surface px-4 py-3 md:hidden">
          <button
            onClick={toggleSidebar}
            className="border border-border px-2 py-1 text-sm"
          >
            &#9776;
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
