import { useState, useRef, useEffect } from 'react';
import type { MeterMetricKey } from './meterMetrics';
import { meterMetrics, meterMetricKeys } from './meterMetrics';

interface MeterMetricSelectorProps {
  value: MeterMetricKey;
  onChange: (key: MeterMetricKey) => void;
  onHover?: (key: MeterMetricKey | null) => void;
}

export function MeterMetricSelector({ value, onChange, onHover }: MeterMetricSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-semibold text-text transition-colors hover:text-muted"
      >
        {meterMetrics[value].label}
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 z-20 mt-1 w-56 overflow-y-auto rounded border border-border bg-white py-1 shadow-lg">
          {meterMetricKeys.map((key) => (
            <li key={key}>
              <button
                onClick={() => { onChange(key); setOpen(false); onHover?.(null); }}
                onMouseEnter={() => onHover?.(key)}
                onMouseLeave={() => onHover?.(null)}
                className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
                  key === value ? 'bg-raised font-semibold text-text' : 'text-muted hover:bg-raised hover:text-text'
                }`}
              >
                {meterMetrics[key].label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
