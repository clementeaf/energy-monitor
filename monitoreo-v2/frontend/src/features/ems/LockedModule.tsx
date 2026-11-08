import { useNavigate } from 'react-router';
import type { ModuloId } from '../../store/useAppStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { useToastStore } from '../../store/useToastStore';
import { ADDON_MODULES } from './modules';
import { EMS_SECTION_PATHS } from './roles';
import { useEmsRole } from './useEmsRole';

export function LockedModule({ moduloId }: Readonly<{ moduloId: ModuloId }>) {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const isAdmin = useEmsRole() === 'admin';
  const modulo = ADDON_MODULES[moduloId];
  usePageTitle(modulo.addon, `Add-ons / ${modulo.addon}`);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${modulo.colorClass}`}>
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </span>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted">Módulo no contratado</span>
        <h2 className="text-xl font-semibold text-foreground">{modulo.addon}</h2>
        <p className="max-w-md text-sm text-muted">
          {modulo.sub}. {isAdmin
            ? 'Al habilitarlo queda disponible de inmediato para los roles con permiso, sin migración ni reinstalación.'
            : 'Tu empresa aún no lo tiene. Puedes pedirle al Administrador que lo habilite.'}
        </p>
        <div className="flex gap-2">
          {isAdmin ? (
            <button type="button" onClick={() => navigate(`${EMS_SECTION_PATHS.configuracion}?tab=modulos`)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover">
              Habilitar módulo
            </button>
          ) : (
            <button type="button" onClick={() => showToast('Solicitud enviada al Administrador')} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover">
              Solicitar al administrador
            </button>
          )}
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-raised">
            Volver
          </button>
        </div>
      </div>
      <div className="grid w-full max-w-3xl gap-3 opacity-35 sm:grid-cols-3" aria-hidden="true">
        {modulo.features.map((feature) => (
          <div key={feature} className="rounded-xl bg-surface p-4">
            <p className="text-xs text-muted">{feature}</p>
            <p className="mt-2 font-mono text-2xl text-foreground">— —</p>
          </div>
        ))}
      </div>
    </div>
  );
}
