import type { LoadPoint } from './fleet';
import { formatNumber } from './format';

export interface DemandBar {
  label: string;
  kw: number | null;
  isCurrent: boolean;
}

const HOURS_PER_DAY = 24;
const AXIS_EVERY = 6;

export function hourlyBars(points: LoadPoint[], now: Date): DemandBar[] {
  const kwByHour = new Map(points.map((point) => [new Date(point.timestamp).getHours(), point.kw]));
  return Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}:00`,
    kw: hour <= now.getHours() ? kwByHour.get(hour) ?? null : null,
    isCurrent: hour === now.getHours(),
  }));
}

export function dailyBars(points: LoadPoint[]): DemandBar[] {
  return points.map((point, index) => ({
    label: new Date(point.timestamp).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
    kw: point.kw,
    isCurrent: index === points.length - 1,
  }));
}

export function DemandBars({ bars, unit = 'kW', label = 'Demanda' }: Readonly<{ bars: DemandBar[]; unit?: string; label?: string }>) {
  const max = Math.max(...bars.map((bar) => bar.kw ?? 0), 1);
  const peak = bars.reduce<DemandBar | null>((best, bar) => ((bar.kw ?? 0) > (best?.kw ?? 0) ? bar : best), null);
  const axisStep = Math.max(1, Math.round(bars.length / (HOURS_PER_DAY / AXIS_EVERY)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-border-strong" />{label} ({unit})</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary" />Actual</span>
        {peak && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-accent" />Peak {peak.label} · {formatNumber(peak.kw, 1)} {unit}</span>}
      </div>
      <div className="flex h-44 items-end gap-1" role="img" aria-label={`${label} por período, máximo ${formatNumber(peak?.kw ?? 0, 1)} ${unit}`}>
        {bars.map((bar) => {
          const tone = bar.kw === null ? 'bg-border' : bar === peak ? 'bg-accent' : bar.isCurrent ? 'bg-primary' : 'bg-border-strong';
          const height = bar.kw === null ? 8 : Math.max(4, (bar.kw / max) * 100);
          return (
            <div key={bar.label} title={bar.kw === null ? `${bar.label} · sin dato` : `${bar.label} · ${formatNumber(bar.kw, 1)} ${unit}`}
              className={`flex-1 rounded-t-sm transition-[height] ${tone}`} style={{ height: `${height}%` }} />
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted">
        {bars.filter((_, index) => index % axisStep === 0 || index === bars.length - 1).map((bar) => <span key={bar.label}>{bar.label}</span>)}
      </div>
    </div>
  );
}
