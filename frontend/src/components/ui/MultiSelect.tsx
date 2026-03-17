import { useState, useRef, useMemo, useEffect } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  listWidth?: string;
  align?: 'left' | 'right';
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Seleccionar...',
  listWidth = 'w-64',
  align = 'left',
}: MultiSelectProps) {
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
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const summary = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} seleccionados`;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-pa-border bg-white px-3 py-1 text-[12px] font-semibold text-pa-navy transition-colors hover:border-pa-blue"
      >
        <span className="truncate">{summary}</span>
        <svg className="h-3 w-3 shrink-0 text-pa-blue" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} z-50 mt-1.5 ${listWidth} rounded-xl border border-pa-border bg-white shadow-lg`}>
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
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-1.5 text-[12px] text-pa-text-muted">Sin resultados</li>
            )}
            {filtered.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <li key={o.value}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] transition-colors hover:bg-pa-bg-alt">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.value)}
                      className="h-3.5 w-3.5 rounded border-pa-border accent-pa-blue"
                    />
                    <span className={`truncate ${checked ? 'font-semibold text-pa-navy' : 'text-pa-text-muted'}`}>{o.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {selected.length > 0 && (
            <div className="border-t border-pa-border px-2 py-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-lg px-2 py-0.5 text-[12px] text-pa-text-muted transition-colors hover:text-pa-navy"
              >
                Limpiar selección
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
