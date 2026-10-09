import { useNavigate } from 'react-router';
import { useAppStore, type ModuloId } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { ADDON_MODULES } from './modules';

export function LockedModule({ moduloId }: Readonly<{ moduloId: ModuloId }>) {
  const navigate = useNavigate();
  const toggleModulo = useAppStore((s) => s.toggleModulo);
  const showToast = useToastStore((s) => s.showToast);
  const modulo = ADDON_MODULES[moduloId];

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${modulo.colorClass}`}>
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </span>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted">Módulo no contratado</span>
        <h2 className="text-xl font-semibold text-foreground">{modulo.addon}</h2>
        <p className="max-w-md text-sm text-muted">
          {modulo.sub}. Este add-on no está incluido en el plan actual. Al habilitarlo queda disponible de inmediato, sin migración ni reinstalación.
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {modulo.features.map((feature) => (
            <span key={feature} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">✓ {feature}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { toggleModulo(moduloId); showToast('Módulo habilitado'); }} className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">
            Habilitar módulo
          </button>
          <button type="button" onClick={() => navigate('/resumen')} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-raised">
            Volver al Resumen
          </button>
        </div>
      </div>
    </div>
  );
}
