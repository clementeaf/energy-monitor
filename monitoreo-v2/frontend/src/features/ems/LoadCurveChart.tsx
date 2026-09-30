import { useId } from 'react';
import type { LoadPoint } from './fleet';

export interface LoadCurveSeries {
  label: string;
  color: string;
  points: LoadPoint[];
}

const WIDTH = 700;
const HEIGHT = 200;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;
const PAD_LEFT = 40;
const X_TICKS = 8;
const DAY_MS = 86_400_000;

function formatKw(value: number): string {
  return value.toLocaleString('es-CL', { maximumFractionDigits: value < 10 ? 1 : 0 });
}

function formatTick(timestamp: number, spansDays: boolean): string {
  const date = new Date(timestamp);
  return spansDays
    ? date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
    : date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export function LoadCurveChart({ series, filled = false }: Readonly<{ series: LoadCurveSeries[]; filled?: boolean }>) {
  const gradientId = useId();
  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length < 2) {
    return <p className="py-12 text-center text-xs text-card-muted">Sin lecturas en el periodo seleccionado.</p>;
  }

  const times = allPoints.map((point) => new Date(point.timestamp).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = Math.max(maxTime - minTime, 1);
  const spansDays = timeSpan > DAY_MS;
  const maxKw = Math.max(...allPoints.map((point) => point.kw), 1);
  const chartWidth = WIDTH - PAD_LEFT;
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + chartHeight;

  const toX = (timestamp: string) => PAD_LEFT + ((new Date(timestamp).getTime() - minTime) / timeSpan) * chartWidth;
  const toY = (kw: number) => PAD_TOP + chartHeight - (kw / maxKw) * chartHeight;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = Array.from({ length: X_TICKS }, (_, i) => minTime + (i / (X_TICKS - 1)) * timeSpan);

  return (
    <>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-3 w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Curva de carga">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {yTicks.map((pct) => (
          <g key={pct}>
            <line x1={PAD_LEFT} y1={toY(maxKw * pct)} x2={WIDTH} y2={toY(maxKw * pct)} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={PAD_LEFT - 4} y={toY(maxKw * pct) + 3} textAnchor="end" fill="var(--color-muted)" fontSize="8" fontFamily="var(--font-mono)">{formatKw(maxKw * pct)}</text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text key={tick} x={PAD_LEFT + ((tick - minTime) / timeSpan) * chartWidth} y={baseline + 14} textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontFamily="var(--font-mono)">
            {formatTick(tick, spansDays)}
          </text>
        ))}
        {series.map((s) => {
          const path = s.points.map((point, i) => `${i === 0 ? 'M' : 'L'}${toX(point.timestamp)},${toY(point.kw)}`).join(' ');
          const first = s.points[0];
          const last = s.points[s.points.length - 1];
          return (
            <g key={s.label}>
              {filled && first && last && (
                <path d={`${path} L${toX(last.timestamp)},${baseline} L${toX(first.timestamp)},${baseline} Z`} fill={`url(#${gradientId})`} />
              )}
              <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 px-1">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-card-muted">{s.label}</span>
          </span>
        ))}
      </div>
    </>
  );
}
