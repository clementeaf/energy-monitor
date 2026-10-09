import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { useClickOutside } from '../../hooks/useClickOutside';
import { usePermissions } from '../../hooks/usePermissions';
import { EMS_ROLES, type EmsRoleId } from '../../features/ems/roles';
import { useEmsRole } from '../../features/ems/useEmsRole';
import { findSectionLabel } from '../../features/ems/navigation';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsMenu } from './NotificationsMenu';

const BREADCRUMB_MAP: Record<string, string> = {
  '/calidad/datos': 'Calidad de Datos',
  '/calidad/cuadratura': 'Cuadratura de Agregación',
  '/auditoria/pista': 'Pista de Auditoría',
  '/auditoria/trazabilidad-cnr': 'Trazabilidad CNR',
  '/auditoria/cambios-maestro': 'Cambios en Maestro',
  '/auditoria/acceso-permisos': 'Acceso y Permisos',
  '/gerencial/dashboard': 'Dashboard',
  '/gerencial/consumo': 'Consumo',
  '/gerencial/equipos-zonas': 'Equipos y Zonas',
  '/gerencial/alertas': 'Alertas',
  '/gerencial/auditoria': 'Auditoría',
  '/gerencial/reportes': 'Reportes',
};
export function Header() {
  const { user } = useAuthStore();
  const { sidebarOpen, setViewAsRole } = useAppStore();
  const { isSuperAdmin } = usePermissions();
  const emsRole = useEmsRole();
  const showToast = useToastStore((s) => s.showToast);
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumb = BREADCRUMB_MAP[location.pathname] ?? findSectionLabel(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const sincronizar = async () => {
    setIsSyncing(true);
    await queryClient.refetchQueries({ type: 'active' });
    setIsSyncing(false);
    showToast('Datos sincronizados');
  };
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches));
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
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 bg-sidebar text-sidebar-fg px-4">
      <div className={`flex shrink-0 items-center gap-2.5 ${sidebarOpen ? 'md:w-[240px]' : 'md:w-14'}`}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: '#9FD838' }}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="#062C23" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
        </div>
        {sidebarOpen && <span className="text-sm font-semibold text-sidebar-fg truncate">POWER Digital</span>}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {breadcrumb && (
          <span className="text-sidebar-fg text-sm font-semibold truncate">{breadcrumb}</span>
        )}
      </div>
      <div className="flex-1" />
      <div className="hidden md:block" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 'min(636px, 40vw)' }}>
        <GlobalSearch />
      </div>

      <button
        type="button"
        onClick={() => void sincronizar()}
        disabled={isSyncing}
        aria-label="Sincronizar datos"
        title="Sincronizar datos"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg"
      >
        <svg className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
      </button>

      <NotificationsMenu />

      <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:text-sidebar-fg hover:bg-sidebar-hover shrink-0 md:flex">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
      </button>

      <span className="hidden md:inline" style={{ color: '#505955', fontSize: '20px', fontWeight: 300 }}>|</span>

      {/* User menu */}
      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground transition-colors hover:bg-surface"
        >
          <span className="flex items-center justify-center rounded-full shrink-0" style={{ width: '32px', height: '32px', backgroundColor: '#083F32', color: '#9FD838', fontWeight: 700, fontSize: '12px' }}>
            {initials}
          </span>
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#F6F8F7' }}>{user?.displayName ?? 'Usuario'}</span>
            <span style={{ fontSize: '11px', fontWeight: 400, color: '#9EA9A4' }}>{emsRole && EMS_ROLES[emsRole].label}</span>
          </div>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="#727C78" strokeWidth="1.5" strokeLinecap="round" className="hidden sm:block"><path d="M1 1l4 4 4-4" /></svg>
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-background py-1 shadow-float"
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/profile'); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-surface"
            >
              Perfil
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/admin/settings'); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-surface"
            >
              Configuracion
            </button>
            {isSuperAdmin && (
              <>
                <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                <div className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Ver como</div>
                {(Object.keys(EMS_ROLES) as EmsRoleId[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={emsRole === role}
                    onClick={() => {
                      setMenuOpen(false);
                      setViewAsRole(role === 'admin' ? null : EMS_ROLES[role].viewAsSlug);
                      showToast(`Viendo la plataforma como ${EMS_ROLES[role].label}`);
                    }}
                    className="flex w-full flex-col px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-surface"
                    style={{ fontWeight: emsRole === role ? 600 : 400 }}
                  >
                    {EMS_ROLES[role].label}
                    <span className="text-[10px] text-muted">{EMS_ROLES[role].tagline}</span>
                  </button>
                ))}
              </>
            )}
            <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
            <button
              type="button"
              onClick={() => {
                const next = isDark ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                setIsDark(!isDark);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-surface"
            >
              {isDark ? (
                <><svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg> Modo claro</>
              ) : (
                <><svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg> Modo oscuro</>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
