import { useState, useRef, useMemo, useEffect } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface PillDropdownProps<T extends string> {
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  onHover?: (value: T | null) => void;
  displayValue?: string;
  listWidth?: string;
  align?: 'left' | 'right';
  placeholder?: string;
  /** Makes button fill container width and truncates long labels */
  fullWidth?: boolean;
  /** Shows a search input at the top of the dropdown list */
  searchable?: boolean;
}

export function PillDropdown<T extends string>({
  items,
  value,
  onChange,
  onHover,
  displayValue,
  listWidth = 'w-56',
  align = 'right',
  placeholder,
  fullWidth,
  searchable,
}: PillDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const currentLabel = displayValue ?? items.find((i) => i.value === value)?.label ?? placeholder ?? value;

  // Reset search and focus input when opening
  useEffect(() => {
    if (open && searchable) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, searchable]);

  const filtered = useMemo(() => {
    if (!searchable || !search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, search, searchable]);

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'block' : 'inline-block'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-full border border-pa-border bg-white px-3 py-1 text-[12px] font-semibold text-pa-navy transition-colors hover:border-pa-blue ${fullWidth ? 'w-full' : 'whitespace-nowrap'}`}
      >
        <span className={fullWidth ? 'truncate' : ''}>{currentLabel}</span>
        <svg className="h-3 w-3 shrink-0 text-pa-blue" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} z-20 mt-1.5 ${listWidth} rounded-xl border border-pa-border bg-white shadow-lg`}>
          {searchable && (
            <div className="px-2 pt-2 pb-1">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-lg border border-pa-border px-2.5 py-1.5 text-[12px] text-pa-text outline-none focus:border-pa-blue"
              />
            </div>
          )}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-1.5 text-[12px] text-pa-text-muted">Sin resultados</li>
            )}
            {filtered.map((item) => (
              <li key={item.value}>
                <button
                  onClick={() => { onChange(item.value); setOpen(false); setSearch(''); onHover?.(null); }}
                  onMouseEnter={() => onHover?.(item.value)}
                  onMouseLeave={() => onHover?.(null)}
                  className={`block w-full truncate px-3 py-1.5 text-left text-[13px] transition-colors ${
                    item.value === value ? 'bg-pa-bg-alt font-semibold text-pa-navy' : 'text-pa-text-muted hover:bg-pa-bg-alt hover:text-pa-navy'
                  }`}
                  title={item.label}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
