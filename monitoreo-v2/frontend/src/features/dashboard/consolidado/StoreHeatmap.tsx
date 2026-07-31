import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { getStatusStyle, type EnergyStatus } from '../../../lib/energy-status';
import type { EnrichedBuilding } from './consolidado-utils';

const HEATMAP_COLS = 6;
const HEATMAP_ROWS = 3;
const HEATMAP_TOTAL = HEATMAP_COLS * HEATMAP_ROWS;
const HEAT_COLORS = ['bg-emerald-200', 'bg-emerald-300', 'bg-yellow-200', 'bg-amber-300', 'bg-orange-300', 'bg-red-300'];

export function StoreHeatmap({ enriched }: Readonly<{ enriched: EnrichedBuilding[] }>) {
  const navigate = useNavigate();
  const cells = useMemo(() => {
    const sorted = [...enriched].sort((a, b) => b.powerKw - a.powerKw);
    const maxPower = Math.max(1, ...sorted.map((e) => e.powerKw));
    const result: { id: string | null; label: string; power: number; colorClass: string; status: EnergyStatus }[] = [];
    for (let i = 0; i < HEATMAP_TOTAL; i++) {
      if (i < sorted.length) {
        const e = sorted[i];
        const ratio = e.powerKw / maxPower;
        const colorIdx = Math.min(HEAT_COLORS.length - 1, Math.floor(ratio * HEAT_COLORS.length));
        result.push({ id: e.building.id, label: e.building.name, power: e.powerKw, colorClass: HEAT_COLORS[colorIdx], status: e.status });
      } else {
        result.push({ id: null, label: '—', power: 0, colorClass: 'bg-gray-100', status: 'nodata' as EnergyStatus });
      }
    }
    return result;
  }, [enriched]);

  return (
    <div className="grid h-full w-full content-stretch gap-1" style={{ gridTemplateColumns: `repeat(${HEATMAP_COLS}, 1fr)`, gridTemplateRows: `repeat(${HEATMAP_ROWS}, 1fr)` }}>
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`relative rounded-md px-1.5 py-2 text-center transition-opacity ${cell.colorClass} ${cell.id ? 'cursor-pointer hover:opacity-80' : ''}`}
          title={`${cell.label} — ${cell.power.toFixed(1)} kW`}
          onClick={() => cell.id && navigate(`/buildings/${cell.id}`)}
        >
          <p className="truncate text-[9px] font-medium text-foreground/80">{cell.label}</p>
          {cell.power > 0 && (
            <p className="text-[8px] text-foreground/60">{cell.power.toFixed(0)} kW</p>
          )}
        </div>
      ))}
    </div>
  );
}
