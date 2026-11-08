import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/auth/useAuth';
import { useClickOutside } from '../../hooks/useClickOutside';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { inicialesDe } from '../../features/ems/format';
import { EMS_ROLES, type EmsRoleId } from '../../features/ems/roles';
import { useEmsRole } from '../../features/ems/useEmsRole';

const MENU_ITEM_CLASS = 'flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-raised';

const MENU_PLACEMENT = {
  card: 'bottom-full left-0 mb-1 w-full',
  avatar: 'right-0 top-full mt-1 w-56',
};

function isDarkTheme(): boolean {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function UserMenu({ variant }: Readonly<{ variant: keyof typeof MENU_PLACEMENT }>) {
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const { setViewAsRole } = useAppStore();
  const { isSuperAdmin } = usePermissions();
  const emsRole = useEmsRole();
  const showToast = useToastStore((s) => s.showToast);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(isDarkTheme);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside([triggerRef, menuRef], () => setIsOpen(false), isOpen);

  const nombre = user?.displayName ?? user?.email ?? 'Usuario';
  const rolLabel = emsRole ? EMS_ROLES[emsRole].label : '';
  const avatar = (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-[11px] font-bold text-accent-ink">
      {inicialesDe(nombre)}
    </span>
  );

  const goTo = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const toggleTheme = () => {
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    setIsDark(!isDark);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {variant === 'card' ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Menú de ${nombre}`}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-2.5 rounded-xl bg-raised px-2.5 py-2 text-left transition-colors hover:bg-[var(--color-sidebar-hover)]"
        >
          {avatar}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-xs font-semibold text-foreground">{nombre}</span>
            <span className="block truncate text-[11px] text-muted">{rolLabel}</span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
        </button>
      ) : (
        <button ref={triggerRef} type="button" onClick={() => setIsOpen(!isOpen)} aria-label={`Menú de ${nombre}`} aria-expanded={isOpen} title={`${nombre}${rolLabel ? ` · ${rolLabel}` : ''}`} className="flex rounded-full transition-opacity hover:opacity-90">
          {avatar}
        </button>
      )}

      {isOpen && (
        <div ref={menuRef} className={`absolute z-50 rounded-lg border border-border bg-surface py-1 shadow-float ${MENU_PLACEMENT[variant]}`}>
          <button type="button" onClick={() => goTo('/profile')} className={MENU_ITEM_CLASS}>Perfil</button>
          <button type="button" onClick={() => goTo('/admin/settings')} className={MENU_ITEM_CLASS}>Configuracion</button>
          {isSuperAdmin && (
            <>
              <div className="my-1 border-t border-border" />
              <div className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Ver como</div>
              {(Object.keys(EMS_ROLES) as EmsRoleId[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  aria-pressed={emsRole === role}
                  onClick={() => {
                    setIsOpen(false);
                    setViewAsRole(role === 'admin' ? null : EMS_ROLES[role].viewAsSlug);
                    showToast(`Viendo la plataforma como ${EMS_ROLES[role].label}`);
                  }}
                  className={`${MENU_ITEM_CLASS} flex-col items-start gap-0 py-1.5`}
                  style={{ fontWeight: emsRole === role ? 600 : 400 }}
                >
                  {EMS_ROLES[role].label}
                  <span className="text-[10px] font-normal text-muted">{EMS_ROLES[role].tagline}</span>
                </button>
              ))}
            </>
          )}
          <div className="my-1 border-t border-border" />
          <button type="button" onClick={toggleTheme} className={MENU_ITEM_CLASS}>{isDark ? 'Modo claro' : 'Modo oscuro'}</button>
          <button type="button" onClick={() => { setIsOpen(false); void logout(); }} className={MENU_ITEM_CLASS}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
