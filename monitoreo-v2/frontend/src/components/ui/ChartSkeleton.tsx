interface ChartSkeletonProps {
  /** Height in pixels. Defaults to 280 (same as Chart default). */
  height?: number;
}

export function ChartSkeleton({ height = 280 }: ChartSkeletonProps) {
  return (
    <div className="relative overflow-hidden rounded bg-[#fafbfc]" style={{ height }}>
      {/* Shimmer sweep */}
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
        }}
      />

      {/* Y-axis area */}
      <div className="absolute bottom-8 left-0 top-2 flex w-12 flex-col justify-between py-1">
        {['120', '90', '60', '30', '0'].map((v) => (
          <span key={v} className="text-right text-[10px] text-gray-300">{v}</span>
        ))}
      </div>

      {/* Chart area */}
      <div className="absolute bottom-8 left-12 right-2 top-2">
        {/* Horizontal grid */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <div
            key={pct}
            className="absolute left-0 right-0 border-t border-gray-100"
            style={{ top: `${pct}%` }}
          />
        ))}

        <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 200 100">
          <defs>
            <linearGradient id="skel-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M0,68 C8,65 12,58 20,55 C28,52 32,60 40,54 C48,48 52,42 60,38 C68,34 72,40 80,36 C88,32 92,28 100,30 C108,32 112,26 120,24 C128,22 132,30 140,28 C148,26 152,20 160,22 C168,24 172,18 180,20 C188,22 192,28 200,26 L200,100 L0,100 Z"
            fill="url(#skel-grad)"
          />
          <path
            d="M0,68 C8,65 12,58 20,55 C28,52 32,60 40,54 C48,48 52,42 60,38 C68,34 72,40 80,36 C88,32 92,28 100,30 C108,32 112,26 120,24 C128,22 132,30 140,28 C148,26 152,20 160,22 C168,24 172,18 180,20 C188,22 192,28 200,26"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1.2"
          />
          {/* Volume bars */}
          {[4,12,20,28,36,44,52,60,68,76,84,92,100,108,116,124,132,140,148,156,164,172,180,188,196].map((x, i) => {
            const h = [8,12,6,14,10,18,8,15,11,7,16,9,13,10,17,8,12,14,6,11,15,9,13,7,10][i];
            return (
              <rect
                key={i}
                x={x - 2}
                width="4"
                y={100 - h}
                height={h}
                rx="1"
                fill="#e5e7eb"
                opacity="0.6"
              />
            );
          })}
        </svg>

        {/* Crosshair hint */}
        <div className="absolute bottom-0 top-0 left-[62%] w-px border-l border-dashed border-gray-200" />
        <div className="absolute top-[36%] left-[62%] -translate-x-1/2 -translate-y-1/2">
          <div className="size-2 rounded-full border border-gray-300 bg-white" />
        </div>
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-12 right-2 flex justify-between px-1">
        {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((t) => (
          <span key={t} className="text-[10px] text-gray-300">{t}</span>
        ))}
      </div>
    </div>
  );
}
