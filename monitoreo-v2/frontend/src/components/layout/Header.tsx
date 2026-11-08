import { useState } from 'react';
import { useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/useToastStore';
import { findSectionLabel } from '../../features/ems/navigation';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsMenu } from './NotificationsMenu';
import { BrandMark } from './Sidebar';
import { usePageTitleStore } from '../../store/usePageTitleStore';
import { UserMenu } from './UserMenu';

const HEADER_BUTTON_CLASS = 'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground';

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
  const pageTitle = usePageTitleStore((s) => s.pageTitle);
  const showToast = useToastStore((s) => s.showToast);
  const location = useLocation();
  const title = pageTitle?.title ?? BREADCRUMB_MAP[location.pathname] ?? findSectionLabel(location.pathname);
  const sub = pageTitle?.sub;
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const sincronizar = async () => {
    setIsSyncing(true);
    await queryClient.refetchQueries({ type: 'active' });
    setIsSyncing(false);
    showToast('Datos sincronizados');
  };

  return (
    <header className="relative z-30 flex h-[72px] shrink-0 items-center gap-2 bg-background px-4 text-foreground md:gap-3 md:px-6">
      <span className="md:hidden"><BrandMark /></span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        {sub && <p className="truncate text-[11px] text-muted">{sub}</p>}
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">{title}</h1>
      </div>

      <div className="hidden w-72 md:block">
        <GlobalSearch />
      </div>

      <button
        type="button"
        onClick={() => void sincronizar()}
        disabled={isSyncing}
        aria-label="Sincronizar datos"
        title="Sincronizar datos"
        className={`${HEADER_BUTTON_CLASS} max-md:hidden`}
      >
        <svg className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
      </button>

      <NotificationsMenu buttonClassName={HEADER_BUTTON_CLASS} />

      {pageTitle?.action}

      <span className="md:hidden"><UserMenu variant="avatar" /></span>
    </header>
  );
}
