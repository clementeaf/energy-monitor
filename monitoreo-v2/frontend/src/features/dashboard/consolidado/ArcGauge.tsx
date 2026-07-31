export function ArcGauge({ value, min, max, color, size = 64 }: Readonly<{ value: number; min: number; max: number; color: string; size?: number }>) {
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -225;
  const endAngle = 45;
  const range = endAngle - startAngle;
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const valueAngle = startAngle + range * pct;

  const toXY = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (start: number, end: number) => {
    const s = toXY(start);
    const e = toXY(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={describeArc(startAngle, endAngle)} fill="none" stroke="#e5e7eb" strokeWidth={5} strokeLinecap="round" />
      {pct > 0.01 && (
        <path d={describeArc(startAngle, valueAngle)} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
      )}
    </svg>
  );
}
