import { useMemo } from 'react';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
const COMPARE_LABELS: Record<string, string> = {
  none: '',
  previous: 'Período ant.',
  yoy: 'Año ant.',
  avg: 'Promedio portafolio',
};

interface TrendSparklineProps {
  buildingId: string;
  metricVal: number;
  label: string;
  granularity?: 'monthly' | 'weekly';
  compareWith?: string;
}

export function TrendSparkline({ buildingId, granularity = 'monthly', compareWith = 'none' }: Readonly<TrendSparklineProps>) {
  const isWeekly = granularity === 'weekly';
  const slotCount = 12;

  const range = useMemo(() => {
    const now = new Date();
    const from = isWeekly
      ? new Date(now.getTime() - slotCount * 7 * 86_400_000)
      : new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return { from: from.toISOString(), to: now.toISOString() };
  }, [isWeekly]);

  const compareRange = useMemo(() => {
    if (compareWith === 'none') return null;
    if (compareWith === 'previous') {
      const duration = isWeekly ? slotCount * 7 * 86_400_000 : 365 * 86_400_000;
      const to = new Date(new Date(range.from).getTime());
      const from = new Date(to.getTime() - duration);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    if (compareWith === 'yoy') {
      const from = new Date(new Date(range.from).getTime() - 365 * 86_400_000);
      const to = new Date(new Date(range.to).getTime() - 365 * 86_400_000);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    return range;
  }, [compareWith, range, isWeekly]);

  const aggQuery = useAggregatedReadingsQuery({ ...range, interval: isWeekly ? 'daily' : 'monthly', buildingId });
  const compareQuery = useAggregatedReadingsQuery(
    { ...(compareRange ?? range), interval: isWeekly ? 'daily' : 'monthly', ...(compareWith === 'avg' ? { groupBy: 'portfolio' as const } : { buildingId }) },
    compareWith !== 'none',
  );
  const aggData = aggQuery.data ?? [];
  const compareData = compareQuery.data ?? [];

  const slots = useMemo(() => {
    const now = new Date();
    const sumEnergy = (rows: typeof aggData) => rows.reduce((s, r) => s + parseFloat(r.energy_delta_kwh ?? '0'), 0) / 1000;

    const result: { label: string; current: number; compare: number }[] = [];

    if (isWeekly) {
      for (let w = slotCount - 1; w >= 0; w--) {
        const weekEnd = new Date(now.getTime() - w * 7 * 86_400_000);
        const weekStart = new Date(weekEnd.getTime() - 7 * 86_400_000);
        const label = weekStart.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
        const inRange = (r: typeof aggData[0], start: Date, end: Date) => { const t = new Date(r.bucket).getTime(); return t >= start.getTime() && t < end.getTime(); };
        const current = sumEnergy(aggData.filter((r) => inRange(r, weekStart, weekEnd)));
        let compare = 0;
        if (compareWith === 'previous' || compareWith === 'yoy') {
          const offset = compareWith === 'yoy' ? 365 * 86_400_000 : slotCount * 7 * 86_400_000;
          compare = sumEnergy(compareData.filter((r) => inRange(r, new Date(weekStart.getTime() - offset), new Date(weekEnd.getTime() - offset))));
        } else if (compareWith === 'avg' && compareData.length > 0) {
          compare = sumEnergy(compareData.filter((r) => inRange(r, weekStart, weekEnd)));
        }
        result.push({ label, current, compare });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('es-CL', { month: 'short' });
        const matchMonth = (r: typeof aggData[0], year: number, month: number) => { const b = new Date(r.bucket); return b.getFullYear() === year && b.getMonth() === month; };
        const current = sumEnergy(aggData.filter((r) => matchMonth(r, d.getFullYear(), d.getMonth())));
        let compare = 0;
        if (compareWith === 'previous') {
          const pd = new Date(d.getFullYear(), d.getMonth() - 12, 1);
          compare = sumEnergy(compareData.filter((r) => matchMonth(r, pd.getFullYear(), pd.getMonth())));
        } else if (compareWith === 'yoy') {
          compare = sumEnergy(compareData.filter((r) => matchMonth(r, d.getFullYear() - 1, d.getMonth())));
        } else if (compareWith === 'avg' && compareData.length > 0) {
          compare = sumEnergy(compareData.filter((r) => matchMonth(r, d.getFullYear(), d.getMonth())));
        }
        result.push({ label, current, compare });
      }
    }
    return result;
  }, [aggData, compareData, isWeekly, compareWith]);

  const maxVal = Math.max(1, ...slots.flatMap((s) => [s.current, s.compare]));
  const w = 320;
  const h = 48;
  const toPath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (values.length - 1)) * w} ${h - (v / maxVal) * (h - 4)}`).join(' ');

  if (aggQuery.isPending) return <p className="text-xs text-muted">Cargando tendencia...</p>;

  const compareLabel = COMPARE_LABELS[compareWith] ?? '';

  return (
    <div className="flex items-center gap-3">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
        {compareWith !== 'none' && (
          <path d={toPath(slots.map((s) => s.compare))} fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 2" />
        )}
        <path d={toPath(slots.map((s) => s.current))} fill="none" stroke="#3b82f6" strokeWidth={2} />
      </svg>
      <div className="flex gap-3 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-info/100" /> Actual</span>
        {compareWith !== 'none' && (
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 border-t border-dashed border-border" /> {compareLabel}</span>
        )}
      </div>
    </div>
  );
}
