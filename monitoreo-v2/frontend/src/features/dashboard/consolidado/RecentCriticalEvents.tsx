import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { Alert } from '../../../types/alert';
import type { Building } from '../../../types/building';

export function RecentCriticalEvents({ alerts, buildings }: Readonly<{ alerts: Alert[]; buildings: Building[] }>) {
  const navigate = useNavigate();
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);
  const recent = useMemo(() =>
    [...alerts]
      .filter((a) => a.severity === 'critical' || a.severity === 'high')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [alerts],
  );

  if (recent.length === 0) return <p className="text-[11px] text-muted">Sin eventos críticos.</p>;

  return (
    <ul className="space-y-0.5 text-[11px]">
      {recent.map((a) => {
        const ago = Math.round((Date.now() - new Date(a.createdAt).getTime()) / 60_000);
        const agoLabel = ago < 60 ? `${ago}m` : `${Math.round(ago / 60)}h`;
        return (
          <li
            key={a.id}
            className="flex cursor-pointer items-start gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-surface"
            onClick={() => a.meterId && navigate(`/monitoring/meter/${a.meterId}`)}
          >
            <span className={`mt-0.5 inline-block size-1.5 shrink-0 rounded-full ${a.severity === 'critical' ? 'bg-red-500' : 'bg-orange-400'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-foreground">
                <span className="truncate font-medium">{buildingMap.get(a.buildingId) ?? '—'}</span>
                <span className="shrink-0 text-muted">· {agoLabel}</span>
              </div>
              <p className="truncate text-muted">{a.message}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
