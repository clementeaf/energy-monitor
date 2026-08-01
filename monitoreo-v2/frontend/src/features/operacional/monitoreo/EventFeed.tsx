import { PLACEHOLDER_FEED_EVENTS, type FeedEvent } from './monitoreo-utils';

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
  const display = events.length > 0 ? events : PLACEHOLDER_FEED_EVENTS;
  const isPlaceholder = events.length === 0;

  return (
    <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
      <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted">Feed de eventos recientes</p>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        <ul className="space-y-1.5">
          {display.map((evt) => (
            <li key={evt.id} className={`flex items-start gap-2 text-xs ${isPlaceholder ? 'opacity-60' : ''}`}>
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
      </div>
    </div>
  );
}
