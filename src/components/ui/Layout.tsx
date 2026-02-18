import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAppStore } from '../../store/useAppStore';

const navItems = [
  { label: 'Edificios', path: '/' },
];

export function Layout() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
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
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
