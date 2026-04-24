import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
}

interface DropdownSelectProps<T extends string = string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchThreshold?: number;
}

export function DropdownSelect<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  className = '',
  searchThreshold = 8,
}: Readonly<DropdownSelectProps<T>>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;
  const showSearch = options.length > searchThreshold;

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) { setSearch(''); setHighlightIdx(-1); }
  }, [open]);

  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  const select = useCallback((val: T) => {
    onChange(val);
    setOpen(false);
  }, [onChange]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % filtered.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && filtered[highlightIdx]) select(filtered[highlightIdx].value);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  }, [open, filtered, highlightIdx, select]);

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={
          'flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ' +
          'text-left transition-all duration-150 ' +
          'hover:border-gray-400 focus:border-gray-400 focus:outline-none ' +
          (disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer')
        }
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{selectedLabel}</span>
        <svg className={`ml-2 size-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white">
          {showSearch && (
            <div className="border-b border-gray-100 p-2">
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setHighlightIdx(0); }}
                placeholder="Buscar..."
                className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none transition-all duration-150 focus:border-gray-300"
              />
            </div>
          )}
          <ul ref={listRef} className="max-h-60 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
            )}
            {filtered.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                tabIndex={0}
                onMouseEnter={() => setHighlightIdx(i)}
                onClick={() => select(opt.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt.value); } }}
                className={
                  'cursor-pointer px-3 py-2 text-sm transition-colors duration-150 ' +
                  (opt.value === value ? 'font-medium text-[var(--color-primary,#3D3BF3)]' : 'text-gray-700') + ' ' +
                  (i === highlightIdx ? 'bg-gray-100' : 'hover:bg-gray-50')
                }
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
