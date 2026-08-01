import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useClickOutside } from '../../hooks/useClickOutside';
import { AdminSwitchers } from './AdminSwitchers';

export function Header() {
  const { user } = useAuthStore();
  const { toggleSidebar, sidebarOpen } = useAppStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside([btnRef, menuRef], () => setMenuOpen(false), menuOpen);

  const initials = (user?.displayName ?? user?.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="relative z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      {/* Hamburger */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-foreground"
        aria-label={sidebarOpen ? 'Colapsar menú lateral' : 'Expandir menú lateral'}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Admin switchers */}
      <AdminSwitchers />

      <div className="flex-1" />

      {/* User menu */}
      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground transition-colors hover:bg-surface"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-muted border border-border">
            {initials}
          </span>
          <span className="hidden text-[12px] font-medium sm:inline">{user?.displayName ?? user?.email ?? 'Usuario'}</span>
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-background py-1 shadow-float"
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/profile'); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-surface"
            >
              Perfil
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/admin/settings'); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-surface"
            >
              Configuracion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
