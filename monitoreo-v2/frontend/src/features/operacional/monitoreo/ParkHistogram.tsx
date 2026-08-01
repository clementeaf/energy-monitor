interface ParkHistogramProps {
  data: { label: string; pctOnline: number }[];
}

export function ParkHistogram({ data }: Readonly<ParkHistogramProps>) {
  return (
    <div className="panel flex min-w-0 flex-1 flex-col px-3 py-2.5">
      <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted">Comportamiento del parque — 24h</p>
      <p className="shrink-0 text-xs text-muted">% medidores online por hora</p>
      <div className="mt-2 flex min-h-0 flex-1 items-end gap-[1px]">
        {data.map((h) => (
          <div
            key={h.label}
            className="flex-1 rounded-t"
            style={{ height: `${Math.max(2, h.pctOnline)}%`, backgroundColor: h.pctOnline >= 90 ? '#22c55e' : h.pctOnline >= 70 ? '#f59e0b' : '#ef4444' }}
            title={`${h.label}: ${h.pctOnline.toFixed(0)}% online`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
