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
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-30 flex h-full w-56 flex-col border-r border-[#e0e0e0] bg-[#f5f5f5] transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-[#e0e0e0] px-4 py-4">
          <h2
            className="cursor-pointer text-lg font-bold text-black"
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
                  ? 'bg-[#e0e0e0] font-semibold text-black'
                  : 'text-[#666] hover:bg-[#e0e0e0]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info + logout */}
        {user && (
          <div className="border-t border-[#e0e0e0] p-3">
            <div className="flex items-center gap-2">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-7 w-7 rounded-full" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e0e0e0] text-xs font-semibold text-[#666]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-black">{user.name}</p>
                <p className="truncate text-[10px] text-[#999]">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 w-full border border-[#e0e0e0] px-2 py-1 text-xs text-[#666] transition-colors hover:bg-[#e0e0e0]"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center border-b border-[#e0e0e0] px-4 py-3 md:px-6">
          <button
            onClick={toggleSidebar}
            className="mr-3 border border-[#e0e0e0] px-2 py-1 text-sm md:hidden"
          >
            &#9776;
          </button>
          <span className="text-sm text-[#999]">Energy Monitor</span>
          {user && (
            <span className="ml-auto hidden text-xs text-[#999] md:block">
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
