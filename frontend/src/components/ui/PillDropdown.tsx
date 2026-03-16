import { useState, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface PillDropdownProps<T extends string> {
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  onHover?: (value: T | null) => void;
  displayValue?: string;
  listWidth?: string;
  align?: 'left' | 'right';
}

export function PillDropdown<T extends string>({
  items,
  value,
  onChange,
  onHover,
  displayValue,
  listWidth = 'w-56',
  align = 'right',
}: PillDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const currentLabel = displayValue ?? items.find((i) => i.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-pa-border bg-white px-3 py-1 text-[12px] font-semibold text-pa-navy transition-colors hover:border-pa-blue"
      >
        {currentLabel}
        <svg className="h-3 w-3 shrink-0 text-pa-blue" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} z-20 mt-1.5 max-h-60 ${listWidth} overflow-y-auto rounded-xl border border-pa-border bg-white py-1 shadow-lg`}>
          {items.map((item) => (
            <li key={item.value}>
              <button
                onClick={() => { onChange(item.value); setOpen(false); onHover?.(null); }}
                onMouseEnter={() => onHover?.(item.value)}
                onMouseLeave={() => onHover?.(null)}
                className={`block w-full px-3 py-1.5 text-left text-[13px] transition-colors ${
                  item.value === value ? 'bg-pa-bg-alt font-semibold text-pa-navy' : 'text-pa-text-muted hover:bg-pa-bg-alt hover:text-pa-navy'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
