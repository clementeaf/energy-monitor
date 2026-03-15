import { useState, useRef, useEffect } from 'react';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = 'Seleccionar...' }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-w-[180px] items-center justify-between gap-2 rounded border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-muted"
      >
        <span className="truncate">{summary}</span>
        <span className="text-muted">{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 max-h-64 w-64 overflow-hidden rounded border border-border bg-surface shadow-lg">
          <div className="border-b border-border p-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded bg-base px-2 py-1 text-xs text-text outline-none placeholder:text-muted"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="px-2 py-1 text-xs text-muted">Sin resultados</div>
            )}
            {filtered.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-text hover:bg-base"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="accent-blue-600"
                />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded px-2 py-0.5 text-xs text-muted hover:text-text"
              >
                Limpiar seleccion
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
