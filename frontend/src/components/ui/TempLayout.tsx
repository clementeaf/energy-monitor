import { Outlet, useLocation, useNavigate } from 'react-router';
import { appRoutes, type AppRoute } from '../../app/appRoutes';
import paIcon from '../../assets/pa-icon.png';
import { useAppStore, USER_MODE_LABELS, type UserMode } from '../../store/useAppStore';
import { PillDropdown } from './PillDropdown';

const navItems = (Object.values(appRoutes) as AppRoute[]).filter((r) => r.showInNav);

/** Temporary layout without auth. Replace with <Layout /> when re-enabling login. */

export function TempLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userMode, setUserMode } = useAppStore();

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {/* Sidebar — PA Design System */}
      <aside className="flex h-full w-52 shrink-0 flex-col bg-pa-bg-alt">
        {/* Logo + title */}
        <div className="px-4 pt-5 pb-4">
          <button
            type="button"
            className="flex items-center gap-2.5"
            onClick={() => navigate('/')}
          >
            {/* Crop to flower only — text in PNG is white/invisible on light bg */}
            <div className="h-8 w-8 shrink-0 overflow-hidden">
              <img src={paIcon} alt="Parque Arauco" className="h-8 w-auto max-w-none" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-pa-navy">
                Parque Arauco
              </span>
              <span className="text-[11px] text-pa-text-muted">
                Energy Monitor
              </span>
            </div>
          </button>
        </div>

        {/* Mode selector */}
        <div className="px-3">
          <PillDropdown
            items={Object.entries(USER_MODE_LABELS).map(([value, label]) => ({ value: value as UserMode, label }))}
            value={userMode}
            onChange={setUserMode}
            listWidth="w-full"
          />
        </div>

        {/* Nav — PA numbered items with pill bg */}
        <nav className="flex-1 space-y-2.5 px-3 pt-4">
          {navItems.map((item, i) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path.split(':')[0]);
            const num = String(i + 1).padStart(2, '0');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-pa-blue text-white'
                    : 'bg-white text-pa-text hover:bg-gray-100'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    isActive
                      ? 'border-white/40 text-white'
                      : 'border-pa-navy/30 text-pa-navy'
                  }`}
                >
                  {num}
                </span>
                <span className="text-[13px] font-medium leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] text-pa-text-muted">Dev Mode</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
