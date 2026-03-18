import { useState, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

export function ColumnFilterDropdown({
  label,
  items,
  visible,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  label: string;
  items: string[];
  visible: Set<string>;
  onToggle: (item: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useClickOutside(ref, () => { setOpen(false); setSearch(''); }, open);

  const visibleCount = items.filter((i) => visible.has(i)).length;
  const allSelected = items.length > 0 && visibleCount === items.length;
  const filtered = search
    ? items.filter((i) => i.toLowerCase().includes(search.toLowerCase()))
    : items;

  function handleTodoChange(): void {
    if (allSelected) {
      if (onDeselectAll) onDeselectAll();
      else items.forEach((i) => { if (visible.has(i)) onToggle(i); });
    } else {
      if (onSelectAll) onSelectAll();
      else items.forEach((i) => { if (!visible.has(i)) onToggle(i); });
    }
  }

  function handleOpen() {
    setOpen((o) => {
      if (!o) setTimeout(() => inputRef.current?.focus(), 0);
      else setSearch('');
      return !o;
    });
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 whitespace-nowrap font-medium transition-colors hover:text-text"
      >
        {label}
        <svg className="h-3 w-3 shrink-0 opacity-40" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
        {!allSelected && (
          <span className="ml-0.5 text-[10px] text-blue-600">{visibleCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-60 rounded border border-border bg-white shadow-lg">
          <div className="border-b border-border/50 px-2 py-1.5">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm text-text outline-none placeholder:text-muted focus:border-blue-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {!search && (
              <li className="border-b border-border/50">
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-raised">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleTodoChange}
                    className="h-3.5 w-3.5 rounded border-border accent-blue-600"
                  />
                  <span className="text-text">Todo</span>
                </label>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">Sin resultados</li>
            )}
            {filtered.map((item) => {
              const checked = visible.has(item);
              return (
                <li key={item}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-raised">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(item)}
                      className="h-3.5 w-3.5 rounded border-border accent-blue-600"
                    />
                    <span className={checked ? 'text-text' : 'text-muted'}>{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
