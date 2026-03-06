import { useMeterUptime } from '../../../hooks/queries/useMeters';
import type { UptimeSummary } from '../../../types';

function badgeColor(pct: number) {
  if (pct >= 99.5) return 'bg-green-500/20 text-green-400';
  if (pct >= 95) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
}

function Badge({ label, summary }: { label: string; summary: UptimeSummary }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${badgeColor(summary.uptimePercent)}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-bold">{summary.uptimePercent}%</div>
      {summary.downtimeEvents > 0 && (
        <div className="text-xs opacity-60">{summary.downtimeEvents} evento{summary.downtimeEvents !== 1 ? 's' : ''}</div>
      )}
    </div>
  );
}

export function UptimeBadges({ meterId }: { meterId: string }) {
  const { data, isLoading } = useMeterUptime(meterId);

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-24 animate-pulse rounded-lg bg-raised" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-3 flex gap-3">
      <Badge label="24h" summary={data.daily} />
      <Badge label="7d" summary={data.weekly} />
      <Badge label="30d" summary={data.monthly} />
    </div>
  );
}
