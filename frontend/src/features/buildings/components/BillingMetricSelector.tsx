import { useState, useRef, useEffect } from 'react';
import type { BillingMetricKey } from './billingMetrics';
import { billingMetrics, billingMetricKeys } from './billingMetrics';

interface BillingMetricSelectorProps {
  value: BillingMetricKey;
  onChange: (key: BillingMetricKey) => void;
  onHover?: (key: BillingMetricKey | null) => void;
}

export function BillingMetricSelector({ value, onChange, onHover }: BillingMetricSelectorProps) {
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
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-pa-border bg-white px-3 py-1 text-[12px] font-semibold text-pa-navy transition-colors hover:border-pa-blue"
      >
        {billingMetrics[value].label}
        <svg className="h-3 w-3 shrink-0 text-pa-blue" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul className="absolute right-0 z-20 mt-1.5 max-h-60 w-56 overflow-y-auto rounded-xl border border-pa-border bg-white py-1 shadow-lg">
          {billingMetricKeys.map((key) => (
            <li key={key}>
              <button
                onClick={() => { onChange(key); setOpen(false); onHover?.(null); }}
                onMouseEnter={() => onHover?.(key)}
                onMouseLeave={() => onHover?.(null)}
                className={`block w-full px-3 py-1.5 text-left text-[13px] transition-colors ${
                  key === value ? 'bg-pa-bg-alt font-semibold text-pa-navy' : 'text-pa-text-muted hover:bg-pa-bg-alt hover:text-pa-navy'
                }`}
              >
                {billingMetrics[key].label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
