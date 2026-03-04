import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/auth/useAuth';

const navItems = [
  { label: 'Edificios', path: '/' },
];

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
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
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

        {/* User info + logout */}
        {user && (
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-7 w-7 rounded-full" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-raised text-xs font-semibold text-muted">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-text">{user.name}</p>
                <p className="truncate text-[10px] text-subtle">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 w-full border border-border px-2 py-1 text-xs text-muted transition-colors hover:bg-raised"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center border-b border-border bg-surface px-4 py-3 md:px-6">
          <button
            onClick={toggleSidebar}
            className="mr-3 border border-border px-2 py-1 text-sm md:hidden"
          >
            &#9776;
          </button>
          <span className="text-sm text-subtle">Energy Monitor</span>
          {user && (
            <span className="ml-auto hidden text-xs text-subtle md:block">
              {user.name}
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
