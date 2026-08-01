import type { EnrichedBuilding } from './consolidado-utils';

const STATUS_DOT: Record<string, string> = {
  normal: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-danger',
  nodata: 'bg-subtle',
};

interface BuildingListProps {
  enriched: EnrichedBuilding[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function BuildingList({ enriched, selectedId, onSelect }: Readonly<BuildingListProps>) {
  const sorted = [...enriched].sort((a, b) => b.powerKw - a.powerKw);

  if (sorted.length === 0) {
    return <p className="py-4 text-center text-sm text-muted">Sin edificios</p>;
  }

  return (
    <div>
      {sorted.map((e) => {
        const isSelected = e.building.id === selectedId;
        const dot = STATUS_DOT[e.status] ?? 'bg-subtle';
        const alerts = e.activeAlerts.length;
        const area = e.building.areaSqm ? `${Number(e.building.areaSqm).toLocaleString()} m²` : null;
        const intensity = e.building.areaSqm && e.powerKw > 0
          ? (e.powerKw / Number(e.building.areaSqm)).toFixed(1)
          : null;
        return (
          <button
            key={e.building.id}
            type="button"
            onClick={() => onSelect(e.building.id)}
            className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 ${
              isSelected ? 'bg-surface' : 'hover:bg-surface/60'
            }`}
          >
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{e.building.name}</span>
                <span className="shrink-0 tabular-nums text-sm font-medium text-foreground">{e.powerKw.toFixed(0)} <span className="font-normal text-muted">kW</span></span>
              </div>
              {e.building.address && (
                <p className="mt-0.5 truncate text-xs text-muted">{e.building.address}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                <span>{e.meterCount} medidores</span>
                {area && <span>{area}</span>}
                {intensity && <span>{intensity} W/m²</span>}
                {alerts > 0 && (
                  <span className="font-medium text-danger">{alerts} alerta{alerts > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
