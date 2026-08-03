import type { FeedEvent } from './monitoreo-utils';

const EVENT_DOT: Record<string, string> = {
  alert: 'bg-danger',
  offline: 'bg-surface0',
  stale: 'bg-warning',
  backfill: 'bg-success/100',
  cnr: 'bg-info/100',
};

interface EventFeedProps {
  events: FeedEvent[];
}

export function EventFeed({ events }: Readonly<EventFeedProps>) {
  return (
    <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
      <p className="shrink-0 text-xs font-medium text-muted">Eventos recientes</p>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">Sin eventos recientes</p>
        ) : (
        <ul className="space-y-1.5">
          {events.map((evt) => (
            <li key={evt.id} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 inline-block size-2 shrink-0 rounded-full ${EVENT_DOT[evt.type] ?? 'bg-subtle'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-foreground">
                  <span className="font-medium uppercase">{evt.type}</span> · {evt.message}
                  {evt.building && <span className="text-muted"> — {evt.building}</span>}
                </p>
                <p className="text-xs text-muted">{new Date(evt.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </li>
          ))}
        </ul>
        )}
      </div>
    </div>
  );
}
