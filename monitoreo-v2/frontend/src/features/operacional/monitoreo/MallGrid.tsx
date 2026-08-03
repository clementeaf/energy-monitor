import { SEMAPHORE_STYLES, type MallCard } from './monitoreo-utils';

interface MallGridProps {
  mallCards: MallCard[];
  expandedMallId: string | null;
  onSelectMall: (id: string) => void;
}

export function MallGrid({ mallCards, expandedMallId, onSelectMall }: Readonly<MallGridProps>) {
  return (
    <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
      <p className="shrink-0 text-xs font-medium text-muted">Centros comerciales</p>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {mallCards.length === 0
            ? <p className="py-4 text-center text-xs text-muted">Sin centros comerciales</p>
            : mallCards.map((card) => (
                <button
                  key={card.building.id}
                  type="button"
                  onClick={() => onSelectMall(expandedMallId === card.building.id ? '' : card.building.id)}
                  className={`w-[calc(50%-0.25rem)] rounded-lg border-l-4 p-2.5 text-left transition-colors hover:bg-surface ${SEMAPHORE_STYLES[card.semaphore] ?? ''} ${expandedMallId === card.building.id ? 'ring-2 ring-foreground' : ''}`}
                >
                  <p className="truncate text-xs font-medium text-foreground">{card.building.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span>{card.building.countryCode ?? 'CL'}</span>
                    <span>{card.onlinePct.toFixed(0)}%</span>
                    <span>{card.totalMeters} med.</span>
                    {card.alertCount > 0 && <span className="rounded-full bg-danger/10 px-1 py-0.5 text-xs font-medium text-danger">{card.alertCount}</span>}
                  </div>
                </button>
              ))}
        </div>
      </div>
    </div>
  );
}
