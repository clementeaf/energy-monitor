import { useMemo } from 'react';
import type { Alert } from '../../../types/alert';
import type { Building } from '../../../types/building';

interface Props {
  alerts: Alert[];
  buildings: Building[];
  onSelectBuilding?: (buildingId: string) => void;
}

export function RecentCriticalEvents({ alerts, buildings, onSelectBuilding }: Readonly<Props>) {
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);
  const recent = useMemo(() =>
    [...alerts]
      .filter((a) => a.severity === 'critical' || a.severity === 'high')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8),
    [alerts],
  );

  if (recent.length === 0) return <p className="text-xs text-muted">Sin eventos críticos.</p>;

  return (
    <table className="w-full text-xs">
      <tbody>
        {recent.map((a) => {
          const ago = Math.round((Date.now() - new Date(a.createdAt).getTime()) / 60_000);
          const agoLabel = ago < 60 ? `${ago}m` : `${Math.round(ago / 60)}h`;
          const name = buildingMap.get(a.buildingId) ?? '—';
          return (
            <tr
              key={a.id}
              className={onSelectBuilding ? 'cursor-pointer transition-colors hover:bg-surface' : ''}
              onClick={() => onSelectBuilding?.(a.buildingId)}
            >
              <td className="w-4 py-3 pr-1.5 align-top">
                <span className={`mt-0.5 inline-block size-1.5 rounded-full ${a.severity === 'critical' ? 'bg-danger' : 'bg-warning/60'}`} />
              </td>
              <td className="py-3 pr-2 align-top">
                <span className="font-medium text-foreground whitespace-nowrap">{name}</span>
                <span className="ml-1 uppercase text-[10px] font-semibold tracking-wide text-muted">{a.severity === 'critical' ? 'URGENTE' : 'ALERTA'}</span>
              </td>
              <td className="py-3 pr-2 align-top text-muted truncate max-w-0 w-full">{a.message}</td>
              <td className="py-3 align-top text-muted whitespace-nowrap tabular-nums">{agoLabel}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
