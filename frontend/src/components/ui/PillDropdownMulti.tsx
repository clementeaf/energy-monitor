import { useState, useRef, useMemo, useEffect } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface PillDropdownMultiProps<T extends string> {
  items: { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
  placeholder?: string;
  listWidth?: string;
  align?: 'left' | 'right';
}

export function PillDropdownMulti<T extends string>({
  items,
  selected,
  onChange,
  placeholder = 'Seleccionar...',
  listWidth = 'w-56',
  align = 'left',
}: PillDropdownMultiProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, search]);

  function toggle(value: T) {
    if (selected.includes(value)) {
      if (selected.length > 1) onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? items.find((i) => i.value === selected[0])?.label ?? selected[0]
      : `${selected.length} seleccionados`;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-pa-border bg-white px-3 py-1 text-[12px] font-semibold text-pa-navy transition-colors hover:border-pa-blue whitespace-nowrap"
      >
        <span>{label}</span>
        <svg className="h-3 w-3 shrink-0 text-pa-blue" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} z-20 mt-1.5 ${listWidth} rounded-xl border border-pa-border bg-white shadow-lg`}>
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
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-1.5 text-[12px] text-pa-text-muted">Sin resultados</li>
            )}
            {filtered.map((item) => {
              const checked = selected.includes(item.value);
              return (
                <li key={item.value}>
                  <button
                    onClick={() => toggle(item.value)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-pa-bg-alt"
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-pa-navy bg-pa-navy' : 'border-pa-border bg-white'}`}>
                      {checked && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2.5 6l2.5 2.5 4.5-5" />
                        </svg>
                      )}
                    </span>
                    <span className={`truncate ${checked ? 'font-semibold text-pa-navy' : 'text-pa-text-muted'}`} title={item.label}>
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
