import { useState, useEffect, useRef } from 'react';
import type { Alert } from '../../../types/alert';
import { SEVERITY_COLORS, SEVERITY_LABELS } from './consolidado-utils';

const PAGE_SIZE = 20;

export function AlertFeed({ alerts }: Readonly<{ alerts: Alert[] }>) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, alerts.length));
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [alerts.length]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [alerts]);

  const visible = alerts.slice(0, visibleCount);

  return (
    <div className="panel flex min-h-0 flex-1 flex-col">
      <h4 className="shrink-0 px-3 py-2 text-[12px] font-medium text-foreground">
        Alertas en vivo ({alerts.length})
      </h4>
      {alerts.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-muted">Sin alertas — operación normal.</p>
      ) : (
        <ul ref={listRef} className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {visible.map((a) => (
            <li key={a.id} className="flex items-start gap-2 px-3 py-2">
              <span className={`mt-0.5 inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[a.severity] ?? ''}`}>
                {SEVERITY_LABELS[a.severity] ?? a.severity.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-foreground">{a.message}</p>
                <p className="text-[10px] text-muted">
                  {new Date(a.createdAt).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                </p>
              </div>
            </li>
          ))}
          {visibleCount < alerts.length && (
            <li className="px-3 py-2 text-center text-[10px] text-muted">Cargando más...</li>
          )}
        </ul>
      )}
    </div>
  );
}
