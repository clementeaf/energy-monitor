import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useToastStore } from '../../store/useToastStore';
import { useEmsAlertas } from '../../features/ems/useEmsFleet';

const SEVERITY_CLS = { critica: 'text-danger', advertencia: 'text-warning', informativa: 'text-info' } as const;

export function NotificationsMenu() {
  const navigate = useNavigate();
  const { activas } = useEmsAlertas();
  const showToast = useToastStore((s) => s.showToast);
  const [isOpen, setIsOpen] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside([containerRef], () => setIsOpen(false), isOpen);
  const hasUnread = !isRead && activas.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificaciones"
        aria-expanded={isOpen}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        {hasUnread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-background shadow-float">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold text-foreground">Notificaciones</h2>
            {activas.length > 0 && (
              <button type="button" onClick={() => { setIsRead(true); showToast('Notificaciones marcadas como leídas'); }} className="text-xs text-muted hover:text-foreground">
                Marcar como leídas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {activas.length > 0 ? activas.map((alerta) => (
              <button
                key={alerta.id}
                type="button"
                onClick={() => { setIsOpen(false); navigate(`/remarcadores/${alerta.remarcadorId}`); }}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-surface ${isRead ? 'opacity-60' : ''}`}
              >
                <span className={SEVERITY_CLS[alerta.severidad]}>●</span>
                <span className="flex flex-col">
                  <span className="text-sm text-foreground">{alerta.titulo}</span>
                  <span className="text-xs text-muted">{alerta.detalle}</span>
                </span>
              </button>
            )) : (
              <p className="px-3 py-4 text-xs text-muted">Todo al día: no hay alertas activas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
